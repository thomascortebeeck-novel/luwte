import {
  DEFAULT_PERMISSIONS,
  inviteCode,
  inviteExpiry,
  paths,
  type CircleMember,
  type CircleRole,
  type Invite,
  type Permissions,
} from '@luwte/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './client';

/**
 * PRD 5.3 / 6.4 — reads and writes for the circle.
 *
 * The rules are what actually enforce all of this; nothing here is a security
 * boundary. What this file owes the rules is that the app never *tries* to do
 * something they would refuse, so a refusal always means a real bug.
 */

export type CircleMemberRecord = CircleMember & { uid: string };
export type InviteRecord = Invite & { code: string };

const toDate = (value: unknown): Date | null =>
  typeof (value as { toDate?: () => Date })?.toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : value instanceof Date
      ? value
      : null;

const readMember = (uid: string, data: Record<string, unknown>): CircleMemberRecord => ({
  uid,
  role: (data.role ?? 'supporter') as CircleRole,
  relation: (data.relation ?? '') as string,
  permissions: { ...DEFAULT_PERMISSIONS, ...((data.permissions ?? {}) as Permissions) },
  grantedAt: toDate(data.grantedAt) ?? new Date(),
  revokedAt: toDate(data.revokedAt),
});

export async function readCircle(uid: string): Promise<CircleMemberRecord[]> {
  const snapshot = await getDocs(collection(db, paths.circle(uid)));
  return snapshot.docs
    .map((document) => readMember(document.id, document.data()))
    .sort((a, b) => a.grantedAt.getTime() - b.grantedAt.getTime());
}

export async function readCircleMember(
  uid: string,
  memberUid: string,
): Promise<CircleMemberRecord | null> {
  const snapshot = await getDoc(doc(db, paths.circleMember(uid, memberUid)));
  return snapshot.exists() ? readMember(snapshot.id, snapshot.data()) : null;
}

const readInvite = (code: string, data: Record<string, unknown>): InviteRecord => ({
  code,
  patientId: (data.patientId ?? '') as string,
  role: (data.role ?? 'supporter') as CircleRole,
  permissions: { ...DEFAULT_PERMISSIONS, ...((data.permissions ?? {}) as Permissions) },
  createdAt: toDate(data.createdAt) ?? new Date(),
  expiresAt: toDate(data.expiresAt) ?? new Date(0),
  usedBy: (data.usedBy ?? null) as string | null,
});

/**
 * The query filters on patientId because the rules require it to. An
 * unfiltered listing of invites is refused outright — see the `list` rule.
 */
export async function readOpenInvites(uid: string): Promise<InviteRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.invites()), where('patientId', '==', uid)),
  );
  const now = Date.now();
  return snapshot.docs
    .map((document) => readInvite(document.id, document.data()))
    .filter((invite) => invite.usedBy === null && invite.expiresAt.getTime() > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function readInviteByCode(code: string): Promise<InviteRecord | null> {
  const snapshot = await getDoc(doc(db, paths.invite(code)));
  return snapshot.exists() ? readInvite(snapshot.id, snapshot.data()) : null;
}

export async function createInvite(
  uid: string,
  values: { role: CircleRole; permissions: Permissions; relation: string },
): Promise<InviteRecord> {
  const code = inviteCode(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const invite: Invite & { relation: string } = {
    patientId: uid,
    role: values.role,
    permissions: values.permissions,
    relation: values.relation,
    createdAt: now,
    expiresAt: inviteExpiry(now),
    usedBy: null,
  };

  await setDoc(doc(db, paths.invite(code)), invite);
  return { ...invite, code };
}

/**
 * Withdrawal expires the invite rather than deleting it. Same effect for the
 * holder, and it leaves a record that the invite existed — which matters when
 * the question later is who was ever offered access.
 */
export async function withdrawInvite(code: string): Promise<void> {
  await updateDoc(doc(db, paths.invite(code)), { expiresAt: new Date(0) });
}

export async function saveMemberPermissions(
  uid: string,
  memberUid: string,
  permissions: Permissions,
): Promise<void> {
  await updateDoc(doc(db, paths.circleMember(uid, memberUid)), { permissions });
}

export async function saveMemberRelation(
  uid: string,
  memberUid: string,
  relation: string,
): Promise<void> {
  await updateDoc(doc(db, paths.circleMember(uid, memberUid)), { relation });
}

/** Access ends immediately. The card stays, so who once had access survives. */
export async function revokeMember(uid: string, memberUid: string): Promise<void> {
  await updateDoc(doc(db, paths.circleMember(uid, memberUid)), { revokedAt: serverTimestamp() });
}

/**
 * A revoked card cannot be redeemed back into life by its holder — redemption
 * is a `create`, and the document already exists. So restoring has to be
 * possible here, or revoking by accident would lock someone out permanently
 * with no way back short of the patient deleting a document they may not.
 */
export async function restoreMember(uid: string, memberUid: string): Promise<void> {
  await updateDoc(doc(db, paths.circleMember(uid, memberUid)), { revokedAt: null });
}

export type RedeemOutcome = 'joined' | 'unusable';

/**
 * Claims an invite and writes the circle entry in one transaction.
 *
 * The entry copies role and permissions straight off the invite because the
 * rules compare them field by field and refuse anything else. That is the
 * fence against a feed-only invite being redeemed into a card that sees
 * everything, and it is the reason nothing here is allowed to be clever.
 *
 * The transaction is also what makes an invite single-use under a race: the
 * invite is read inside it, so a second redemption committing first
 * invalidates this one's read set and it retries — and on the retry `usedBy`
 * names someone else, so the rules refuse it.
 */
export async function redeemInvite(code: string, uid: string): Promise<RedeemOutcome> {
  return runTransaction(db, async (tx) => {
    const inviteRef = doc(db, paths.invite(code));
    const snapshot = await tx.get(inviteRef);
    if (!snapshot.exists()) return 'unusable';

    const invite = readInvite(code, snapshot.data());
    const usable =
      (invite.usedBy === null || invite.usedBy === uid) && invite.expiresAt.getTime() > Date.now();
    if (!usable) return 'unusable';

    tx.set(doc(db, paths.circleMember(invite.patientId, uid)), {
      inviteCode: code,
      role: invite.role,
      permissions: invite.permissions,
      relation: (snapshot.data().relation ?? '') as string,
      grantedAt: new Date(),
      revokedAt: null,
    });
    tx.update(inviteRef, { usedBy: uid });
    return 'joined';
  });
}
