# Commute Time Tracker → Google Play, target live Nov 1, 2026

## Context

The repo is a **UI prototype only**: every screen is built, but the timer, distance, history and weekly stats are hardcoded. There is no GPS code, persistence, auth, payments or report generation. It has never been built (`node_modules/` missing, not a git repo).

Decisions: **Personal Play account** · **Google Play Billing in v1** · **manual start/stop tracking** (no `ACCESS_BACKGROUND_LOCATION`) · **Firebase phone OTP + Firestore**.

Plugins (all verified Capacitor 8 compatible): `@capgo/background-geolocation` 8.4.7 (needs `android.useLegacyBridge: true`), `@capacitor-firebase/authentication` 8.5.2, `@capacitor-firebase/firestore` 8.5.2, `@revenuecat/purchases-capacitor` 13.6.1.

## The Nov 1 schedule (today = Mon Sep 28)

Working backwards from the fixed constraints: production review after applying takes days (Google gives no guarantee), and the tester clock is 14 continuous days.

| Date | Milestone |
|---|---|
| Sep 28–30 | Phase 0 + Phase 1 kick-off. **Play account created, testers recruited.** |
| Oct 1–7 | Phase 2 minimum build: real tracking + local persistence + Billing permission |
| **Oct 8 (hard deadline)** | First AAB in closed test, 12 testers opted in → 14-day clock starts |
| Oct 8–22 | Auth, sync, billing, reports shipped as closed-track updates; store listing + forms |
| **Oct 22** | 14 days elapsed → apply for production access |
| Oct 23 | Submit production release |
| Oct 23–Nov 1 | Review buffer (~9 days) |

**Key insight:** the 14-day rule needs testers *opted in*, not a *finished* build. So the closed test can start on a rough build and be updated throughout the window.

**Risk: this is tight.** Zero slack before Oct 8, and a slow Play account verification or a slow production review pushes past Nov 1. **Cut line if behind: ship billing + reports in v1.1** (Phase 5 moves after launch). The Billing *permission and library* must still be in the Oct 8 build, since Play only lets you create in-app products once a build declaring billing is uploaded.

---

## Phase 0 — Make it buildable (Sep 28–29)

- [x] `git init` + first commit of the tree as-is
- [x] `npm install` (3 moderate audit warnings, not yet reviewed)
- [x] Read `node_modules/next/dist/docs/` (per `AGENTS.md`): `output: 'export'`, `trailingSlash`, `viewport` export — default export writes `/login.html`; `trailingSlash: true` writes `/login/index.html`. Decide on device (see last item)
- [x] Delete Finder duplicates: `ExampleUnitTest 2.java`, `ExampleInstrumentedTest 2.java`, `config 2.xml` (`cap sync` regenerated the real `config.xml`)
- [x] Delete unused `src/app/history/page.module.css` and `src/app/pricing/page.module.css`
- [x] Extend `.gitignore`: `google-services.json`, `*.keystore`, `*.jks`, `keystore.properties`, `local.properties`
- [x] `npm run build:android` produces `out/` and syncs (build + lint clean; `cap sync android` OK)
- [x] Remove unused `ReactNode` import in `BottomNav.tsx` (only lint warning)
- [x] Install Android Studio (gives JDK + SDK); project opened and synced, SDK at `~/Library/Android/sdk`
- [x] Run the prototype: no physical phone available, so use a **Pixel emulator with a Google Play image**. User reports a first run OK; routing not yet checked
- [x] Decline the Android Gradle Plugin upgrade prompt (8.13.0 is what Capacitor 8.5.2 pins; don't change one copy only)
- [x] On emulator: check direct navigation to each route and `BottomNav` active tab; if broken, set `trailingSlash: true` in `next.config.ts` and compare against `pathname === tab.path`

**Exit:** prototype runs on the emulator with working navigation. Real-world GPS accuracy can't be checked on an emulator; the closed-test testers cover that.

## Phase 1 — Accounts and paperwork (start Sep 28, runs in parallel)

- [x] **Create Play Console personal account** ($25) — account created 29 Sep 2026 (user confirmed)
- [x] Identity + address verification cleared in Play Console (user confirmed 30 Sep 2026)
- [x] **Recruit 12 testers** (user confirmed 30 Sep 2026; Gmail accounts; each must opt in and stay in 14 days). Still to do later: they must actually opt in to the closed test
- [ ] Firebase project + Android app + `google-services.json` (see Firebase guide below)
- [x] Get SHA-1/SHA-256 for debug and upload keys (`./gradlew signingReport` with Android Studio's Java)
- [ ] Add those fingerprints to Firebase (after the project exists); add Play's app-signing key later
- [ ] Firebase test phone numbers configured for reviewers
- [x] Add `signingConfigs.release` to `android/app/build.gradle` (reads gitignored `android/keystore.properties`; unsigned build if absent)
- [x] Generate upload keystore — created at `~/.commute-tracker-keys/upload-keystore.jks` (outside the repo), passwords in gitignored `android/keystore.properties`; Gradle release signing verified
- [ ] **Back up the keystore AND its password off this Mac** (e.g. password manager + cloud drive). Losing them means a support request to Google
- [ ] Host privacy policy at a public URL (must mention location, phone number, retention, deletion) — **draft written** in `docs/privacy-policy.md`; you still need to fill the `[PLACEHOLDERS]` and host it (Firebase Hosting is free)
- [ ] Host a public account-deletion URL — **draft written** in `docs/account-deletion.md`; same placeholders and hosting step

**Exit:** Play account verified, phone auth works with a test number, privacy policy live.

## Phase 2 — Real tracking (Sep 30–Oct 7 minimum; polish continues)

- [ ] Install `@capgo/background-geolocation`; set `android.useLegacyBridge: true` in `capacitor.config.ts`
- [ ] Manifest: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `foregroundServiceType="location"`, plus `com.android.vending.BILLING`
- [ ] **Do NOT add `ACCESS_BACKGROUND_LOCATION`**
- [ ] Permission flow: rationale screen, handle denied / "only this time" / location off (`openSettings()`)
- [ ] Haversine accumulation with accuracy filter and stationary-noise threshold
- [ ] `Trip` model + local storage; persist in-progress trip continuously for crash recovery
- [ ] `page.tsx`: `isActive` defaults `false`; timer derived from persisted start timestamp; real distance
- [ ] Real "This Week" totals and "Last 5 Days" bars
- [ ] `history/page.tsx`: real data grouped by day + empty state
- [ ] `profile/page.tsx`: editable fields, Home/Office location pickers
- [ ] Work/home direction tagging from saved locations, with fallback
- [ ] Edge-to-edge: `env(safe-area-inset-*)`, `dvh`, fix `BottomNav` padding
- [ ] Self-host Inter (drop the Google Fonts `@import`)
- [ ] Loading / empty / error states
- [ ] Vitest for Haversine, duration formatting, weekly aggregation, tagging

**Exit:** a real walk/drive gives plausible time + distance surviving screen lock and app restart.

## Phase 3 — Auth and sync (Oct 8–15, inside the test window)

- [ ] Wire `login/page.tsx` to `@capacitor-firebase/authentication` (today it only checks `phone.length >= 10`)
- [ ] OTP boxes: controlled state, auto-advance, paste, autofill
- [ ] Real resend cooldown and error messages
- [ ] Auth gating: redirect to `/login` when signed out
- [ ] Firestore schema `users/{uid}/trips/{tripId}` + **owner-only security rules**, tested
- [ ] App Check (Play Integrity)
- [ ] Sync: local is source of truth; push to Firestore; offline queue
- [ ] **In-app account deletion** (Firestore subtree + Auth user)

**Exit:** sign in on a fresh install and trips restore.

## Phase 4 — Closed test + listing (**AAB uploaded by Oct 8**)

- [ ] Release AAB (not APK); enable Play App Signing; add Play SHA-1/SHA-256 to Firebase
- [ ] Closed testing track; **12 testers opted in by Oct 8**
- [ ] Increment `versionCode` on every upload
- [ ] Icon 512×512, feature graphic 1024×500, ≥2 phone screenshots, short + full description
- [ ] App access instructions with a Firebase test number and OTP
- [ ] Foreground service declaration (`location`) + **demo video** of tapping Start and the notification appearing
- [ ] Data safety form (precise location, phone number, encryption in transit, deletion route) — must match code and privacy policy
- [ ] Content rating (IARC), ads declaration, target audience
- [ ] Check native libs against the 16 KB page size requirement
- [ ] Read the Pre-launch report after the first upload

**Exit:** 12 testers opted in; day 1 of 14 logged.

## Phase 5 — Billing and reports (Oct 8–20; **first thing cut if behind**)

- [ ] Payments profile + India tax details (GST/PAN)
- [ ] Create in-app products: ₹9 (1 report), ₹29 (5 reports), ₹99 (Lifetime Pro)
- [ ] Integrate RevenueCat; wire `/pricing` "Buy Now"; restore purchases; handle pending / cancelled / refunded
- [ ] Credit ledger in Firestore, written server-side from validated receipts
- [ ] Link to `/pricing` from somewhere (currently unreachable)
- [ ] Reports: real date pickers, client-side PDF, native share sheet; deduct a credit only on success
- [ ] Verify current India fee structure in Play Console before finalizing prices

**Exit:** a licence-tester purchase grants a credit that produces a PDF.

## Phase 6 — Production (Oct 22 → Nov 1)

- [ ] **Oct 22:** apply for production access
- [ ] Fix closed-test feedback (expect GPS accuracy and battery)
- [ ] Update README ("Secure Local Storage" is no longer true with Firestore)
- [ ] Add Crashlytics
- [ ] Staged rollout at ~10%; watch Android vitals
- [ ] 100% rollout

---

## Firebase project setup guide

1. **Create project** at console.firebase.google.com → Add project → name it, Analytics optional.
2. **Add Android app**: package name exactly `com.commute.tracker` → download `google-services.json` → place at `android/app/google-services.json`. `build.gradle` applies the plugin automatically when the file exists.
3. **SHA fingerprints** (after Phase 0): `cd android && ./gradlew signingReport` → copy SHA-1 and SHA-256 for `debug`, later for your release keystore → Project settings → Your apps → Add fingerprint. Add a third once Play App Signing issues its key.
4. **Authentication** → Sign-in method → enable **Phone**. Add **test phone numbers** with fixed codes.
5. **Billing plan**: Phone auth to real numbers may require upgrading to Blaze (pay-as-you-go); I believe this changed for newer projects but have not verified — check the console. Set a budget alert either way.
6. **Google Cloud**: enable the **Play Integrity API** (phone auth uses it on Android).
7. **Firestore** → Create database → production mode → region **asia-south1 (Mumbai)** for Indian users (region cannot be changed later).
8. **Security rules**: `match /users/{uid}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }`
9. **App Check** → register the app with **Play Integrity**; enforce on Firestore and Auth after testing.
10. **Real SMS to Indian numbers**: test on real numbers early; India SMS delivery can be slow or blocked without DLT registration on the sender side.

## Verification

- Unit: `npx vitest run`
- Build: `npm run build:android`, `npm run lint`, release `bundleRelease`
- Device: ≥2 physical phones; compare a known route against Google Maps; lock screen mid-trip; force-stop mid-trip
- Auth: test number sign-in; reinstall restores trips; account deletion empties Firestore and Auth
- Billing: licence-tester account for purchase, cancel, restore

## Sources

- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en)
- [Billing requirements in India](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en)
- [Play fee changes, June 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)
