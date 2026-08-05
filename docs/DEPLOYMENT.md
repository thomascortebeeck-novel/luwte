# Deployment

What exists in the two real Firebase projects, how CI reaches them, and which
steps are deliberately a person's.

Local development touches neither of these. It uses `demo-luwte`, which
Firebase treats as emulator-only — see CLAUDE.md.

## The two projects

| | `luwte-dev` | `luwte-prod` |
|---|---|---|
| Purpose | deployed staging | **one family's health records** |
| Billing | Spark (free) | Blaze |
| Firestore | `eur3`, native | `eur3`, native, **delete protection on** |
| Hosting site | `luwte-dev` | `luwte-prod` |
| Deploy trigger | automatic, on push to `main` | `workflow_dispatch` **plus a required reviewer** |

`eur3` is the Europe multi-region, per PRD §4. Everything else — Functions,
Storage, Scheduler — is `europe-west1` (St. Ghislain, Belgium). Health data is
GDPR Art. 9 special category and never leaves the EU.

**A Firestore database's location cannot be changed after creation.** Both were
created deliberately in `eur3`; moving one means exporting, deleting and
re-importing.

## How CI authenticates: no key exists

Deploys use **Workload Identity Federation**. GitHub mints a short-lived OIDC
token describing the exact run; Google trades it for an access token that
expires in an hour. There is **no service account key**, in GitHub or anywhere
else — nothing to leak, nothing to rotate, nothing to forget to rotate.

Each project has its own pool, provider and deployer identity:

```
projects/{number}/locations/global/workloadIdentityPools/github/providers/luwte
deployer@{project}.iam.gserviceaccount.com
```

**Two conditions must both hold** before Google will mint a token, and the
second is the interesting one:

```
assertion.repository == 'thomascortebeeck-novel/luwte'
&& assertion.environment == 'production'      // 'development' on the dev provider
```

The repository clause is what stops any other GitHub repository assuming these
identities — a federation provider without it trusts *every* workflow on
GitHub, which is the classic way this is misconfigured.

The environment clause means **the prod identity can only be assumed by a job
running in the `production` GitHub environment**, and that environment requires
a named reviewer. So "prod deploys are admin-only" is enforced by Google IAM,
not only by GitHub's UI and everyone remembering. Remove `environment:` from
the job and the deploy stops working, which is the correct failure.

### What the deployer may do, and may not

| Granted | Why |
|---|---|
| `firebasehosting.admin` | ship the app |
| `firebaserules.admin` | ship security rules |
| `datastore.indexAdmin` | ship indexes |
| `firebase.viewer`, `serviceusage.serviceUsageConsumer` | resolve the project |

**No `datastore.owner`, no `datastore.user`.** The identity that deploys the app
cannot read or write a single check-in. A compromised CI run could serve a bad
build — bad enough — but it could not read anyone's diary.

## Deploying

**dev** deploys itself when something reaches `main`. The merge was the human
decision; the workflow only follows it.

**prod** is `workflow_dispatch` only:

1. GitHub → Actions → **deploy** → Run workflow
2. Branch `main`, target **prod**
3. The run pauses. Approve it — that approval *is* the decision.

Rules and indexes deploy **before** hosting, deliberately: better for the
database to be stricter than the app for a moment than looser.

Functions are never deployed by this workflow. They need Blaze, nothing in the
app depends on one, and `luwte-dev` deliberately has no billing.

### The failure this pipeline exists to catch

`pnpm build` reads `apps/web/.env.production`, which is **not in the
repository**. Without it Vite substitutes `undefined` for every
`VITE_FIREBASE_*`, **the build still succeeds**, and Firebase throws while its
modules evaluate — before any React error boundary exists. The deployed result
is a blank white screen.

For this app that is the worst failure there is: somebody opens luwte to write
down how their day went and gets nothing, with no way to tell whether it is
them, their phone, or us. Four things stand between that and a person:

- `client.ts` names the missing variables rather than failing deep in the SDK.
- `index.html` carries fallback markup **inside `#root`** — plain markup, not a
  script, because the CSP is `script-src 'self'`.
- The workflow writes `.env.production` from the environment's own secrets and
  fails if they are absent.
- Two greps: one asserts the built bundle carries a real project id, the other
  asserts **it is the id of the project being deployed** — so a `production`
  environment holding dev's config fails in CI rather than serving a bundle
  that talks to `luwte-dev` from the prod domain.

## Still a person's job

- **Google sign-in on prod.** Enabling it auto-creates an OAuth client and
  needs the consent screen — Firebase Console → Authentication → Sign-in
  method. Email and passwordless link are already on. The app works without
  Google; it is the second door, not the only one.
- **Auth on `luwte-dev`.** The `initializeAuth` API refuses on Spark
  (`BILLING_NOT_ENABLED`). The Console's own "Get started" does it for free.
- **Custom domain**, if the pilot wants one over `luwte-prod.web.app`.
- **Backups.** Delete protection stops the database being dropped; it is not a
  backup. Scheduled backups and PITR are both Blaze features and both cost —
  worth deciding before real records land, not after.

## Before the family arrives

Prod being live and **empty** is the right pre-pilot state. Before anybody
signs in, P8.2 needs to exist: there is currently no way to export or erase a
person's data, and Art. 15 and Art. 17 are not optional for Art. 9 records.
