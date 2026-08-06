# Enabling real email delivery

**This is an admin task. Claude does not configure or trigger email flows —
`CLAUDE.md` rule 5. These are the steps for a human to follow.**

Everything below is done once per Firebase project. Do `luwte-dev` first and
convince yourself the mail arrives before touching `luwte-prod`.

---

## What actually sends email

Only one thing in luwte sends email: **Firebase Authentication**, and since
the passwordless sign-in link was removed there is exactly one case left —
**a password reset**, asked for by the person, from the sign-in screen
(`resetPassword` in `apps/web/src/firebase/auth.ts`).

That one is not optional. With a password as the only address-based way in,
somebody who forgets theirs would otherwise lose months of their own record —
over the thing that illness and sedating medication make hardest.

The app sends nothing else. There are no digests, no re-engagement mails, no
notifications by email — PRD §8 rules those out, and adding one later would be
a product decision, not a config change.

**In development no mail is sent at all.** `VITE_USE_EMULATORS=true` points
the app at the Auth emulator, which prints the reset link to the emulator
console instead of delivering it.

---

## Step 1 — Turn the provider on

Firebase Console → your project → **Authentication** → **Sign-in method**.

1. Enable **Email/Password**.
2. In that same panel, switch on **Email link (passwordless sign-in)**. This
   is a separate toggle underneath and it is easy to miss — without it,
   `sendSignInLinkToEmail` fails with `auth/operation-not-allowed`.
3. Save.

Leaving "Email/Password" itself enabled is deliberate: it is the fallback
path on the sign-in screen for anyone who finds mail links awkward.

## Step 2 — Authorize the domain the link returns to

Firebase Console → **Authentication** → **Settings** → **Authorized domains**.

Add the domain the app is actually served from:

| Project | Domain to add |
|---|---|
| `luwte-dev` | `luwte-dev.web.app` |
| `luwte-prod` | `luwte-prod.web.app`, and `luwte.be` once it exists |

`localhost` is authorized by default, which is why development works with no
setup at all.

This matters because the app passes `window.location.origin` as the return
URL. If the domain is not on this list, Firebase refuses to send the link
rather than sending one that would fail on return.

## Step 3 — Rewrite the email in the brand voice

Firebase Console → **Authentication** → **Templates** → **Email address
sign-in**.

The default template is Google's, in English, and reads nothing like luwte.
Change three things: the sender name, the subject, and the body. The language
selector at the top right of the template editor sets which locale the
template applies to — set **Dutch** first, since that is what opens.

**Sender name:** `luwte`

**Subject (nl):**

```
Je link voor luwte
```

**Body (nl)** — `%LINK%` is Firebase's placeholder and must stay exactly as
written:

```
Hier is je link om je aan te melden bij luwte.

%LINK%

De link blijft een uur geldig. Heb je hem niet aangevraagd, dan mag je deze
mail negeren.
```

**Subject (en):**

```
Your link for luwte
```

**Body (en):**

```
Here is your link to sign in to luwte.

%LINK%

The link stays valid for an hour. If you didn't ask for it, you can ignore
this message.
```

No exclamation marks, no cheerfulness, `je` rather than `u`, lowercase
wordmark — the same rules `copy-lint.ts` enforces on in-app copy. Nothing
enforces them here, because the template lives in Google's console rather
than in this repo. That is worth remembering when someone edits it later.

## Step 4 — Optional: send from your own domain

By default mail arrives from `noreply@<project-id>.firebaseapp.com`, which
looks like what it is: a machine. For the family pilot that is fine.

If you want `luwte.be` on the envelope: **Templates** → the pencil icon →
**Customise domain**, then add the TXT and CNAME records Firebase shows you
at your DNS provider. Verification usually takes under an hour. Do this only
once you own the domain and have somewhere to receive replies — a from-address
that bounces is worse than an obvious no-reply.

---

## Before you point this at real people

- **Send yourself a link from `luwte-dev` first**, on a phone, and open it
  there. The link must land on an authorized domain or it dies on return.
- **Check the spam folder.** Firebase's default sender has middling
  deliverability. If mail lands in spam for the family, that is the argument
  for step 4.
- **Firebase's own sending has a daily quota** and is not intended for bulk.
  luwte sends one mail per sign-in, so this will not be the limit you hit.

## The GDPR note, for the DPIA

Sign-in mail is sent by Google's infrastructure and **is not pinned to the
EU** — the same residency gap as Firebase Auth itself (PRD §5.5). What
travels is an email address and a one-time link. **No health data is in these
messages and none should ever be put there.**

That is the whole reason Auth holds an email and nothing else: it keeps the
one component that cannot be kept in Europe holding the least possible.
Record this in the DPIA alongside the Auth residency decision.
