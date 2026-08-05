import {
  DEFAULT_PERMISSIONS,
  diffPermissions,
  inviteCode,
  inviteExpiry,
  paths,
  type CircleMember,
  type CircleRole,
  type Invite,
  type PermissionChange,
  type Permissions,
} from '@luwte/core';
import {
  collection,
  collectionGroup,
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
  forUid: (data.forUid ?? null) as string | null,
});

/** The patient's name, carried on the invite so the recipient sees who asked. */
export type AddressedInvite = InviteRecord & { patientName: string };

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
  values: {
    role: CircleRole;
    permissions: Permissions;
    relation: string;
    patientName: string;
    /**
     * Set when the person was found in the directory rather than handed a
     * link. The invite is then theirs alone to accept — see `forUid` on the
     * schema for why holding the code must not be enough.
     */
    forUid?: string | null;
  },
): Promise<InviteRecord> {
  const code = inviteCode(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  /*
   * `patientName` rides along so the circle entry can carry it. A member is
   * not allowed to read `patients/{pid}`, and widening that rule to show one
   * name would also hand over reminder hours and notification settings.
   */
  const invite: Invite & { relation: string; patientName: string } = {
    patientId: uid,
    role: values.role,
    permissions: values.permissions,
    relation: values.relation,
    patientName: values.patientName,
    createdAt: now,
    expiresAt: inviteExpiry(now),
    usedBy: null,
    forUid: values.forUid ?? null,
  };

  await setDoc(doc(db, paths.invite(code)), invite);
  return { ...invite, code };
}

/**
 * What has been asked of this person, and by whom.
 *
 * The query filters on `forUid` because the rules require it to — the same
 * forcing that makes the issuer's listing safe. There is no inbox collection
 * and no server: the invite the patient wrote *is* the request.
 *
 * Nothing is chased. An unanswered request simply expires after seven days
 * (PRD 8), and the person who asked is told nothing either way.
 */
export async function readAddressedInvites(uid: string): Promise<AddressedInvite[]> {
  const snapshot = await getDocs(
    query(collection(db, paths.invites()), where('forUid', '==', uid)),
  );
  const now = Date.now();
  return snapshot.docs
    .map((document) => ({
      ...readInvite(document.id, document.data()),
      patientName: (document.data().patientName ?? '') as string,
    }))
    .filter((invite) => invite.usedBy === null && invite.expiresAt.getTime() > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Withdrawal expires the invite rather than deleting it. Same effect for the
 * holder, and it leaves a record that the invite existed — which matters when
 * the question later is who was ever offered access.
 */
export async function withdrawInvite(code: string): Promise<void> {
  await updateDoc(doc(db, paths.invite(code)), { expiresAt: new Date(0) });
}

/**
 * D29 — the change, and the person's own record of it.
 *
 * The log is written next to the update rather than inside a transaction on
 * purpose: if the log write fails, the permission change must still stand.
 * A person who has decided to stop sharing something should never be told
 * "that did not work" because a history entry could not be saved.
 *
 * That ordering is also why this is honestly a record and not a control —
 * see `permissionChangeSchema`. The boundary is the circle document, which
 * only the patient may write.
 */
export async function saveMemberPermissions(
  uid: string,
  memberUid: string,
  permissions: Permissions,
  was?: { permissions: Permissions; relation?: string },
): Promise<void> {
  await updateDoc(doc(db, paths.circleMember(uid, memberUid)), { permissions });

  const changed = was ? diffPermissions(was.permissions, permissions) : null;
  if (!changed) return;
  void setDoc(doc(collection(db, paths.permissionLog(uid))), {
    memberUid,
    relation: was?.relation ?? '',
    granted: changed.granted,
    withdrawn: changed.withdrawn,
    at: serverTimestamp(),
  });
}

export type PermissionChangeRecord = PermissionChange & { id: string };

/** The person's own history. Newest first, because that is what is asked. */
export async function readPermissionLog(uid: string): Promise<PermissionChangeRecord[]> {
  const snapshot = await getDocs(collection(db, paths.permissionLog(uid)));
  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        id: document.id,
        memberUid: (data.memberUid ?? '') as string,
        relation: (data.relation ?? '') as string,
        granted: (data.granted ?? []) as PermissionChange['granted'],
        withdrawn: (data.withdrawn ?? []) as PermissionChange['withdrawn'],
        at: toDate(data.at) ?? new Date(0),
      };
    })
    .sort((a, b) => b.at.getTime() - a.at.getTime());
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

export type Membership = {
  patientId: string;
  patientName: string;
  role: CircleRole;
  permissions: Permissions;
};

/**
 * The patients who granted this person access — the console's whole list.
 *
 * A collection group query over every circle in the database, filtered to
 * this person's own cards. The filter is what makes it legal: the rule is
 * evaluated per returned document, so a query that could reach somebody
 * else's card is refused rather than trimmed.
 */
export async function readMemberships(uid: string): Promise<Membership[]> {
  const snapshot = await getDocs(
    query(collectionGroup(db, 'circle'), where('memberUid', '==', uid)),
  );

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        patientId: (data.patientId ?? document.ref.parent.parent?.id ?? '') as string,
        patientName: (data.patientName ?? '') as string,
        role: (data.role ?? 'supporter') as CircleRole,
        permissions: { ...DEFAULT_PERMISSIONS, ...((data.permissions ?? {}) as Permissions) },
        revokedAt: toDate(data.revokedAt),
      };
    })
    .filter((entry) => entry.revokedAt === null && entry.patientId !== '')
    .map(({ revokedAt: _revokedAt, ...membership }) => membership);
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
      // Both exist only so the console can list patients without reading
      // their documents. The rules refuse a memberUid that disagrees with
      // the document id.
      memberUid: uid,
      patientId: invite.patientId,
      patientName: (snapshot.data().patientName ?? '') as string,
      grantedAt: new Date(),
      revokedAt: null,
    });
    tx.update(inviteRef, { usedBy: uid });
    return 'joined';
  });
}
