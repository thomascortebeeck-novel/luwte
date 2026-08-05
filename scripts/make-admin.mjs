#!/usr/bin/env node
/**
 * Bootstraps an admin — the one document class no client may write.
 *
 * Verification of clinicians moved into the app (D27), so `clinicians/` is now
 * written by an admin from `/admin`. That did not remove the out-of-band step,
 * it moved it here: **who is an admin can only be decided with credentials the
 * app does not have.** Everything above it rests on this staying true.
 *
 * Against the emulator:
 *   node scripts/make-admin.mjs <uid>
 *
 * Against a real project, set FIRESTORE_EMULATOR_HOST empty and provide
 * GOOGLE_APPLICATION_CREDENTIALS for a service account. Per the project rules,
 * that is a human action with an explicit go-ahead — not something a session
 * runs on its own.
 */

const uid = process.argv[2];
const project = process.env.LUWTE_PROJECT ?? 'demo-luwte';
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

if (!uid) {
  console.error('usage: node scripts/make-admin.mjs <uid>');
  process.exit(1);
}

if (!project.startsWith('demo-')) {
  console.error(
    `Refusing to write to "${project}" from this script.\n` +
      'A real project needs the Admin SDK and a service account, run by a\n' +
      'human who meant to. This path is for the emulator only.',
  );
  process.exit(1);
}

const url = `http://${host}/v1/projects/${project}/databases/(default)/documents/admins/${uid}`;

const response = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: { createdAt: { timestampValue: new Date().toISOString() } },
  }),
});

if (!response.ok) {
  console.error(`failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, uid, project }));
