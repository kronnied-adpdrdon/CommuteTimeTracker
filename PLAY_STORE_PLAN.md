# Commute Time Tracker → Google Play, target live Nov 1, 2026

## Context

The repo is a **UI prototype only**: every screen is built, but the timer, distance, history and weekly stats are hardcoded. There is no GPS code, persistence, auth, payments or report generation. It has never been built (`node_modules/` missing, not a git repo).

Decisions: **Personal Play account** · **manual start/stop tracking** (no `ACCESS_BACKGROUND_LOCATION`) · **no app accounts, no Firebase in v1** (decided 30 Sep 2026) · **Free vs Pro (₹49 one-time) through Google Play**.

**Free vs Pro (decided 1 Oct 2026):**

| Everyone (Free) | Pro (₹49, one-time) |
|---|---|
| Unlimited tracking, edit/delete trips, Home/Office tagging | **Reports**, for any date range, including trips older than 2 weeks |
| Home: This Week stats + the **last 3 commutes** | |
| History: the **last 2 weeks** | |

Older trips are **kept on the phone, never deleted**; they're just not shown in History. Weekly stats still count them. No free report preview, no reimbursement (₹/km) line in v1.

**No accounts:** the user's Google account does the work. Google Play remembers the Pro purchase, and Android Auto Backup restores trips on a reinstall or new phone. No login screen, no account deletion flow, no SMS costs.

Plugins (all verified Capacitor 8 compatible): `@capgo/background-geolocation` 8.4.7 (needs `android.useLegacyBridge: true`), `@capacitor/preferences` 8.0.1, `@revenuecat/purchases-capacitor` 13.6.1 (billing; see Phase 5).

## The Nov 1 schedule (today = Mon Sep 28)

Working backwards from the fixed constraints: production review after applying takes days (Google gives no guarantee), and the tester clock is 14 continuous days.

| Date | Milestone |
|---|---|
| Sep 28–30 | Phase 0 + Phase 1 kick-off. **Play account created, testers recruited.** |
| Oct 1–7 | Phase 2 minimum build: real tracking + local persistence + Billing permission |
| **Oct 8 (hard deadline)** | First AAB in closed test, 12 testers opted in → 14-day clock starts |
| Oct 8–22 | Settings, edit/delete trips, Pro + reports shipped as closed-track updates; store listing + forms |
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
- [x] Get SHA-1/SHA-256 for debug and upload keys (`./gradlew signingReport` with Android Studio's Java)
- [x] Add `signingConfigs.release` to `android/app/build.gradle` (reads gitignored `android/keystore.properties`; unsigned build if absent)
- [x] Generate upload keystore — created at `~/.commute-tracker-keys/upload-keystore.jks` (outside the repo), passwords in gitignored `android/keystore.properties`; Gradle release signing verified
- [ ] **Back up the keystore AND its password off this Mac** (e.g. password manager + cloud drive). Losing them means a support request to Google
- [ ] Host privacy policy at a public URL — **draft rewritten for no accounts** in `docs/privacy-policy.md`; fill the `[PLACEHOLDERS]` and host it (GitHub Pages or Google Sites are free)
- ~~Firebase project, fingerprints, test phone numbers~~ — dropped with Firebase (v2 backlog)
- ~~Account-deletion URL~~ — not required: the app has no accounts

**Exit:** Play account verified, privacy policy live.

## Phase 2 — Real tracking (Sep 30–Oct 7 minimum; polish continues)

- [x] Install `@capgo/background-geolocation` 8.4.7; set `android.useLegacyBridge: true` in `capacitor.config.ts`
- [x] Manifest: location, foreground-service and notification permissions + `foregroundServiceType="location"` come from the plugin (verified in the merged manifest); plugin's geofence receivers and `RECEIVE_BOOT_COMPLETED` removed
- [ ] Add `com.android.vending.BILLING` (comes with the billing plugin in Phase 5)
- [x] **No `ACCESS_BACKGROUND_LOCATION`** — verified: the emulator's permission prompt offers only "While using the app"
- [x] Permission flow: Android prompts on first Start; refused permission / location off show a message with Open Settings
- [x] "Approximate" location, tested on the emulator: Android first offers to switch to Precise; if the user keeps Approximate, the plugin refuses to start and the app explains how to turn on Precise. A coarse-readings warning also covers the case defensively
- [x] Haversine accumulation with accuracy filter, jitter threshold and GPS-jump rejection (`src/lib/tracking/`)
- [x] Opus review of `tracker.ts`: found 3 phantom-distance bugs (glitch after parking, signal-wait drift, bad first reading). Fixed with: speed check against the latest reading, confirm-before-trust warm-up, re-anchoring on agreeing readings, out-and-back spike removal, chip-speed stationary check, 2x-accuracy jitter threshold. 48 unit tests
- [x] Chip-reported speed only overrides positions for shifts under 50 m (the emulator reports speed 0 while moving, which erased whole trips)
- [x] 1.5 km recorded as 1.4 km: emulator artifact. The emulator reports speed 0, and the test steps were exactly 50 m (49.99996 m after rounding), right at the drift limit, so the last step was ignored. With a real speed attached, a 500 m drive saved as exactly 500 m
- [ ] Tune tracker thresholds (0.5 m/s stationary, 2x accuracy, 100 m spike leg) against real tester commutes
- [ ] Decide on Google Fused Location Provider: the chosen plugin tracks with raw GPS (`LocationManager`), not Fused. Switching means a small custom native plugin; revisit once tracking works end to end
- [x] `Trip` type (`src/lib/trips/types.ts`)
- [x] Local storage of trips (`src/lib/trips/repository.ts`, Capacitor Preferences behind a `KeyValueStore` interface). Saves only start/end points, not the full route (less sensitive data; privacy docs updated)
- [x] In-progress trip saved after every reading for crash recovery (`src/lib/trips/activeTrip.ts`): recovered trips end at the last reading; >6 h without readings = stale; same id so no duplicates; unreadable data is set aside, not overwritten
- [x] Crash-recovery prompt in the UI: Resume / Save Trip / Discard — verified on the emulator by killing the app mid-trip
- [x] `page.tsx`: real timer (from the saved start time), real distance, Start/Stop via a shared controller (`src/lib/commute/`) so tracking survives tab switches
- [x] Real "This Week" totals, trend and "Last 5 Days" bars
- [x] Home: replace "Last 5 Days" with the **last 3 commutes** (individual trips)
- [x] `history/page.tsx`: real data grouped by day + empty state (removed the chevron: there's no trip-detail screen to open)
- [x] History: show only the **last 14 days**; older trips stay stored. Add a line saying older trips are available in reports (Pro)
- [x] **First-launch setup:** card on Home ("I'm at Home now" / "I'm at the Office now" / Later). Settings also offers "Where my last trip started/ended". Setting a place re-tags all saved trips
- [x] **Edit and delete trips** in History (at minimum: delete, and change the end time)
- [x] Settings: **Delete all trips**. Needed because trips older than 2 weeks are hidden from History, so users can't delete them one by one
- [x] Work/home direction tagging (`direction.ts`; returns `unknown` rather than guessing). Wired: uses saved places (`places.ts`) when a trip finishes; needs the setup screen above to have any places
- [x] Edge-to-edge: `viewport-fit=cover`, `env(safe-area-inset-*)` padding, `dvh`, status-bar backdrop, tab bar above the gesture bar (verified on Android 17 emulator)
- [x] Dark mode: System / Light / Dark in Settings; status-bar icons follow (Capacitor 8 built-in `SystemBars`); widget has its own night colours
- [x] History: Edit and Delete buttons visible on every entry
- [x] Home: removed the header gear (Settings is a tab)
- [x] **Home-screen widget** (native): this week's time and trip count, last trip, Start / Stop button with a live timer while tracking. Buttons open the app through an explicit intent only (no public deep link). Verified on the emulator
- [ ] Self-host Inter (drop the Google Fonts `@import`)
- [ ] Loading / empty / error states
- [x] Vitest for Haversine, tracker, duration formatting, weekly aggregation, tagging (`npm test`, 128 tests)

**Exit:** a real walk/drive gives plausible time + distance surviving screen lock and app restart.

> Command-line builds need Android Studio's **JDK 21** (`~/Library/Java/JavaVirtualMachines/jbr-21.0.11`). The bundled JDK 25 is too new for Gradle 8.14.

## Phase 3 — No-account cleanup and backup

- [x] Remove the `firebase` npm package — production dependencies now have 0 known vulnerabilities (3 moderate remain in the Capacitor CLI dev tool only)
- [x] Remove the login screen (`src/app/login/`) and the `/login` check in `BottomNav.tsx`
- [x] Profile tab becomes **Settings** (Home and Office, Your data / Delete all). Home screen gear icon now opens it
- [x] Settings: Your Plan (Free / Pro), Appearance, Your Data
- [ ] Settings: Restore purchase (with Phase 5 billing)
- [x] **Android Auto Backup restores trips and places** after uninstall + reinstall (tested with the emulator's local backup store; backup was ~4.3 MB of the 25 MB limit). On real phones it goes through the Google account, about daily, if Google backup is on
- [x] Update README: "Secure Local Storage" / privacy-first is accurate again

**Exit:** no login anywhere; a reinstall with backup restores trips.

## Phase 4 — Closed test + listing (**AAB uploaded by Oct 8**)

- [ ] Release AAB (not APK); enable Play App Signing
- [ ] Closed testing track; **12 testers opted in by Oct 8**
- [ ] Increment `versionCode` on every upload
- [ ] Icon 512×512, feature graphic 1024×500, ≥2 phone screenshots, short + full description
- [ ] App access: no login, so reviewers need no credentials. Say so; mention how to unlock Pro for review if they ask
- [ ] Foreground service declaration (`location`) + **demo video** of tapping Start and the notification appearing
- [ ] Data safety form: precise location (app functionality, stored on device), purchase history (Google Play / billing provider); no accounts, no data sold — must match code and privacy policy
- [ ] Content rating (IARC), ads declaration, target audience
- [ ] Check native libs against the 16 KB page size requirement
- [ ] Read the Pre-launch report after the first upload

**Exit:** 12 testers opted in; day 1 of 14 logged.

## Phase 5 — Pro (₹49) and reports (Oct 8–20; **first thing cut if behind**)

- [x] Decide what Pro unlocks: **reports only** (any date range). No free preview; no ₹/km reimbursement line in v1
- [ ] Payments profile + India tax details (GST/PAN) in Play Console
- [ ] One in-app product: **Pro, ₹49, one-time (non-consumable)**
- [ ] Billing: RevenueCat (validates purchases without our own server) vs. checking on the phone only (recommended at ₹49). **Open question.** RevenueCat would have to be named in the privacy policy
- [x] Plans screen: Free (₹0) vs Pro (₹49 one-time) comparison, reached from Reports and Settings
- [ ] Upgrade button → Google Play purchase; Restore purchase; handle pending / cancelled / refunded (today: demo builds unlock locally, release builds say purchases open at launch)
- [x] Plans reachable from Reports (Unlock with Pro) and Settings (Your Plan)
- [x] Reports (Pro): This Week / Last Week / This Month / Last Month / Custom; summary, work vs home split, trip preview; **PDF and CSV export** through Android's share menu (verified: exported PDF opened correctly). Free users see what Pro adds and a blurred sample
- [x] PDF made by a small built-in writer (no PDF library); CSV opens in Excel / Sheets
- [ ] Verify current India fee structure in Play Console before finalizing the price

**Exit:** a licence-tester purchase unlocks Pro, survives a reinstall, and Restore works.

## Phase 6 — Production (Oct 22 → Nov 1)

- [ ] **Oct 22:** apply for production access
- [ ] Fix closed-test feedback (expect GPS accuracy and battery)
- [ ] Crash reporting: Play Console's Android vitals covers crashes with no SDK; add a crash tool only if needed (Crashlytics would bring Firebase back)
- [ ] Staged rollout at ~10%; watch Android vitals
- [ ] 100% rollout

---

## Version 2 backlog (agreed to defer, 30 Sep 2026)

- Forgot to start / stop: "Arrived? Tap to stop" prompt when still for a while or near Office/Home
- Mode of transport (car / bike / metro / bus / walk), tapped after Stop
- Insights: best departure time, worst weekday, hours per year commuting
- Commute cost (fuel price or fare)
- Reimbursement line on reports (₹/km × distance)
- Sunday weekly summary notification
- CSV export of trips
- Optional "Sign in with Google" + cloud sync through Firebase (setup guide is in git history of this file)
- Google Fused Location Provider (custom native plugin)
- Automatic trip detection (needs background location: Play's strictest review)

## Verification

- Unit: `npx vitest run`
- Build: `npm run build:android`, `npm run lint`, release `bundleRelease`
- Device: ≥2 physical phones; compare a known route against Google Maps; lock screen mid-trip; force-stop mid-trip
- Backup: `adb shell bmgr transport com.android.localtransport/.LocalTransport`, `bmgr backupnow com.commute.tracker`, uninstall, reinstall; trips come back. Switch the transport back afterwards
- Demo builds: `npm run build:android:demo` adds a **Developer Preview** switch in Settings to flip Free / Pro. **Never upload a demo build**; release builds use `npm run build:android`
- Emulator caution: it boots from a saved quick-boot snapshot. Launched with `-no-snapshot-save`, **everything done in that session is discarded on exit** (this is what "lost" the 30 Sep test trip; the app itself keeps data through force-stop and reboot)
- Billing: licence-tester account for purchase, cancel, refund, restore on reinstall

## Sources

- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en)
- [Billing requirements in India](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en)
- [Play fee changes, June 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)
