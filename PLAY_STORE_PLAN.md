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

**Tracking is native** (decided 1 Oct 2026): `TrackingService` (location foreground service, Google Fused Location via `play-services-location` 21.4.0) records trips and computes distance with `TrackerEngine` (Java port of the original TypeScript tracker, 18 JUnit tests). The app talks to it through `CommuteTrackerPlugin`; the widget and the notification start/stop it directly. Plugins: `@capacitor/preferences`, `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`; `@revenuecat/purchases-capacitor` 13.6.1 still a candidate for billing (Phase 5).

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
- [x] **Back up the keystore AND its password off this Mac**: keystore in Google Drive, password saved separately (user confirmed 1 Oct 2026)
- [ ] Host privacy policy at a public URL — generated from `src/lib/legal.ts` into `docs/privacy-policy.md` (no placeholders left; add the publisher's name on the hosted page if Play asks); host it (GitHub Pages or Google Sites are free)
- ~~Firebase project, fingerprints, test phone numbers~~ — dropped with Firebase (v2 backlog)
- ~~Account-deletion URL~~ — not required: the app has no accounts

**Exit:** Play account verified, privacy policy live.

## Phase 2 — Real tracking (Sep 30–Oct 7 minimum; polish continues)

- [x] Install `@capgo/background-geolocation` 8.4.7; set `android.useLegacyBridge: true` in `capacitor.config.ts`
- [x] Manifest: location, foreground-service and notification permissions + `foregroundServiceType="location"` come from the plugin (verified in the merged manifest); plugin's geofence receivers and `RECEIVE_BOOT_COMPLETED` removed
- [x] `com.android.vending.BILLING` (from Play Billing Library 9.1.0, in the release manifest)
- [x] **No `ACCESS_BACKGROUND_LOCATION`** — verified: the emulator's permission prompt offers only "While using the app" (**superseded 3 Oct 2026**: automatic start and stop adds it, asked for only when the user turns that feature on; see Phase 8)
- [x] Permission flow: Android prompts on first Start; refused permission / location off show a message with Open Settings
- [x] "Approximate" location, tested on the emulator: Android first offers to switch to Precise; if the user keeps Approximate, the plugin refuses to start and the app explains how to turn on Precise. A coarse-readings warning also covers the case defensively
- [x] Haversine accumulation with accuracy filter, jitter threshold and GPS-jump rejection (`src/lib/tracking/`)
- [x] Opus review of `tracker.ts`: found 3 phantom-distance bugs (glitch after parking, signal-wait drift, bad first reading). Fixed with: speed check against the latest reading, confirm-before-trust warm-up, re-anchoring on agreeing readings, out-and-back spike removal, chip-speed stationary check, 2x-accuracy jitter threshold. 48 unit tests
- [x] Chip-reported speed only overrides positions for shifts under 50 m (the emulator reports speed 0 while moving, which erased whole trips)
- [x] 1.5 km recorded as 1.4 km: emulator artifact. The emulator reports speed 0, and the test steps were exactly 50 m (49.99996 m after rounding), right at the drift limit, so the last step was ignored. With a real speed attached, a 500 m drive saved as exactly 500 m
- [ ] Tune tracker thresholds (0.5 m/s stationary, 2x accuracy, 100 m spike leg) against real tester commutes
- [x] Switched to Google Fused Location: own native recorder replaces `@capgo/background-geolocation` (needed anyway so the widget can start/stop without opening the app)
- [ ] Field-test Fused Location on real commutes (closed test) — the emulator can't show real-world accuracy
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
- [x] History redesign: 2-week summary (trips / time / distance), "Today" / "Yesterday" / "Tue, 29 Sep" headings with day totals, rows titled To work / To home with time, duration and km; same row design on Home and Reports (briefcase = to work, house = to home)
- [x] Home/Office setup redesign: place cards in Settings (status, Use current location, Last trip start / end, clear icon) and two side-by-side buttons on the Home first-launch card
- [x] Home: removed the header gear (Settings is a tab)
- [x] **Home-screen widget** (native, 4x1): status pill, live timer, live km, round Start/Stop button. **Start/Stop work without opening the app** (Android allows a location service to start from a widget tap); tapping elsewhere does nothing. Only if precise location isn't granted does Start open the app to ask. Light and dark. Verified on the emulator with the app process killed
- [x] Widget texts: "Commute" title, caption ("Tap ▶ to start your trip" / "Started at 08:05" / "Paused · tap ▶ to resume"), and a Start / Stop / Resume label under the button
- [x] Tracking notification has its own Stop button and live timer
- [x] Trips stopped from the widget or notification are queued natively and filed into History (with work/home labels) when the app next opens; instantly if it's open
- [x] Self-host Inter via `next/font` (no Google Fonts request at runtime; verified none in the build)
- [ ] Loading / empty / error states
- [x] Vitest for Haversine, tracker, duration formatting, weekly aggregation, tagging (`npm test`, 103 tests; plus 18 Java tracker tests: `./gradlew testDebugUnitTest`)

**Exit:** a real walk/drive gives plausible time + distance surviving screen lock and app restart.

> Command-line builds need Android Studio's **JDK 21** (`~/Library/Java/JavaVirtualMachines/jbr-21.0.11`). The bundled JDK 25 is too new for Gradle 8.14.

## Phase 3 — No-account cleanup and backup

- [x] Remove the `firebase` npm package — production dependencies now have 0 known vulnerabilities (3 moderate remain in the Capacitor CLI dev tool only)
- [x] Remove the login screen (`src/app/login/`) and the `/login` check in `BottomNav.tsx`
- [x] Profile tab becomes **Settings** (Home and Office, Your data / Delete all). Home screen gear icon now opens it
- [x] Settings: Your Plan (Free / Pro), Appearance, Your Data
- [x] Settings: Restore purchase
- [x] **Android Auto Backup restores trips and places** after uninstall + reinstall (tested with the emulator's local backup store; backup was ~4.3 MB of the 25 MB limit). On real phones it goes through the Google account, about daily, if Google backup is on
- [x] Update README: "Secure Local Storage" / privacy-first is accurate again

**Exit:** no login anywhere; a reinstall with backup restores trips.

## Phase 4 — Closed test + listing (**AAB uploaded by Oct 8**)

- [x] App icon (pin + clock, adaptive + Android 13 themed + legacy PNGs) and splash screen; `store/play-icon-512.png` for the listing
- [x] Release AAB builds and is signed with the upload key: `cd android && JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab` (run `npm run build:android` first)
- [ ] Upload the AAB and enable Play App Signing
- [ ] Closed testing track; **12 testers opted in by Oct 8**
- [ ] Increment `versionCode` on every upload
- [x] Privacy policy and Terms and conditions pages inside the app (Settings), offline. Text lives in `src/lib/legal.ts`; `npm run export:legal` writes `docs/privacy-policy.md` and `docs/terms.md`. **Still to do:** host `docs/privacy-policy.md` at a public URL (GitHub Pages / Google Sites) for the Play listing, and have the Terms' governing-law line (India) and the publisher's legal name reviewed
- [ ] Upgrade message when the product doesn't exist yet: say "Pro isn't available to buy yet", not "Couldn't reach Google Play"
- [ ] Decide minimum Android version (now Android 7 / API 24; only tested on the Android 17 emulator). Either test on an older emulator image or raise to Android 8 (26) or 10 (29)
- [ ] Check the new icon and splash screen on a phone
- [x] Demo APK for direct sharing: `npm run build:android:demo`, then `./gradlew assembleRelease` → `dist/CommuteTimeTracker-1.0-demo.apk` (Developer Preview on). Testers must uninstall it before installing the Play version (different signing key)
- [ ] Icon 512×512 (done: `store/play-icon-512.png`), feature graphic 1024×500, ≥2 phone screenshots, short + full description (**drafted**: `store/listing.md`)
- [ ] App access: no login, so reviewers need no credentials. Say so; mention how to unlock Pro for review if they ask
- [ ] Foreground service declaration (`location`) (**text drafted** in `store/play-console-answers.md`) + **demo video** of tapping Start and the notification appearing
- [ ] Data safety form (**redrafted 2 Oct 2026**: `store/play-console-answers.md`; address search now sends typed text to Google's geocoder / OpenStreetMap, so the recommended answer is no longer "nothing collected"; confirm each point in Play Console)
- [ ] Content rating (IARC), ads declaration, target audience
- [x] 16 KB page size: the bundle has no native libraries, so nothing to align
- [ ] Read the Pre-launch report after the first upload

**Exit:** 12 testers opted in; day 1 of 14 logged.

### Tester feedback round (2 Oct 2026)

- [x] Premium redesign, then re-themed to **"Metro Line"** (3 Oct 2026): asphalt + signal amber, Barlow Condensed/Barlow, green Start / red Stop, route line on the hero card, lane-marking dividers, road-sign distance plates, "Express" Pro styling. CSS fallbacks for old WebViews. Avoid large blurred shadows on clipped cards (dark-stripe glitch in some WebViews)
- [x] Older-phone location: falls back to Android's own GPS when Google Play services is missing or fails; start/resume no longer briefly show "Interrupted"; failure paths no longer crash the foreground service. **Not yet confirmed on a real older phone**: ask the tester to send a bug report from Settings
- [x] Report a bug (diagnostics log attached) and Send feedback (up to 3 screenshots), via the user's email app. Set `NEXT_PUBLIC_SUPPORT_EMAIL` in `.env.local` before building
- [x] Set Home/Office by address (Android Geocoder, OpenStreetMap fallback); "use current location" kept as a secondary link
- [x] First-launch Home/Office pop-up: returns on every launch until both are set; Cancel = later, "Don't ask me again" = never (quiet card stays on Home)
- [x] Notifications: time to leave, forgot to track, weekly summary (free); monthly recap, slow-day heads-up (Pro); set-up reminder after 2 and 5 days. Scheduled natively, decided when they fire
- [x] Free vs Pro shown side by side, Pro including everything in Free
- [ ] Test on an older emulator image (Android 7 to 9) and on a phone without Google Play services

## Phase 5 — Pro (₹49) and reports (Oct 8–20; **first thing cut if behind**)

- [x] Decide what Pro unlocks: **reports only** (any date range). No free preview; no ₹/km reimbursement line in v1
- [ ] Payments profile + India tax details (GST/PAN) in Play Console
- [ ] One in-app product: **Pro, ₹49, one-time (non-consumable)**
- [x] Billing decided (1 Oct 2026): **checked on the phone**, no RevenueCat. `ProBillingPlugin` (Play Billing 9.1.0): status at launch, purchase, acknowledge, restore; cached for offline
- [ ] Create the one-time product in Play Console with product ID **`pro`** at ₹49 (needs the payments profile and an uploaded AAB first)
- [ ] Add licence testers in Play Console so testers can buy without being charged
- [x] Plans screen: Free (₹0) vs Pro (₹49 one-time) comparison, reached from Reports and Settings
- [x] Upgrade → Google Play purchase sheet; Restore purchase (Plans and Settings); pending, cancelled, refunded and offline handled (unit-tested); localised price from Play when available
- [ ] Test a real purchase end to end once the product exists (licence tester)
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

## Phase 7 — Anonymous commute analytics (v1.1 or later, added 3 Oct 2026)

**Goal:** aggregate data on travel time, commute time and cost (city benchmarks, content, maybe "your commute vs the city average" later). Play Console can't provide this: it only sees installs, retention, crashes and Pro sales. **Not part of v1.** It reverses the "no Firebase" decision for this feature only, so start it once there are enough real users for the numbers to mean something. Needs trip cost first, which is already on the v2 backlog.

**Principles:** opt-in, off by default · no accounts (anonymous install ID only) · summary numbers only, never addresses or GPS points · coarse area (city) · publish no group smaller than ~20 users.

**Open question:** is the data for the owner's own insight and content (simple opt-in upload plus a spreadsheet), or shown back to users in the app (needs live aggregation and a read-only endpoint for precomputed aggregates)?

**Build list**

- [ ] Define the upload fields: duration, distance, cost, mode, time of day, day of week, coarse area (check what a `Trip` stores today)
- [ ] Trip cost and transport mode captured in the app (v2 items, prerequisites)
- [ ] Settings toggle "Share anonymous commute stats", off by default, with a plain-language consent screen
- [ ] Anonymous install ID (random UUID stored locally; reinstalling makes a new one)
- [ ] Upload job: batched, sent when online, retried on failure, no duplicates
- [ ] "Delete my shared data" button (sends the install ID to a delete endpoint, clears the flag)
- [ ] Backend (Firebase): Anonymous Auth + App Check (Play Integrity); one Cloud Function that validates ranges and rate-limits per install; Firestore write-only from the app (rules block reads); delete function
- [ ] Aggregation: scheduled medians/averages/percentiles by city, mode and time of day; minimum group size ~20; outlier filtering
- [ ] Viewing: BigQuery + Looker Studio (free) or a Google Sheet
- [x] Privacy Policy: background location section and how to turn it off (`src/lib/legal.ts`, `docs/privacy-policy.md` regenerated): what is collected, why, retention, how to opt out or delete
- [ ] Update the Play Data safety form to match (coarse location-linked data counts as sensitive; keep it coarse)
- [ ] Decide a retention period for raw records (suggested: delete after 12 months)
- [ ] Set a Google Cloud budget alert (e.g. ₹500) before enabling Blaze

**Cost (verify current Firebase pricing):** about ₹0 a month up to a few thousand opted-in users, because Auth, App Check, Functions (~2M calls/month), Firestore (~20k writes/day, 1 GB) and BigQuery (10 GB, 1 TB queries) all have free tiers. Cloud Functions needs the pay-as-you-go **Blaze** plan, so a billing card must be attached. Around 100,000 users: a few dollars to tens of dollars a month (Firestore writes ~$0.18 per 100k). Costs grow mainly from one-write-per-trip uploads, abuse, or keeping raw data for years. Other costs: legal review of the updated policy (optional, a few thousand rupees or more), and about 1–2 days of build time.

**Suggested order:** define fields → backend with fake data → app toggle and upload → legal text and Data safety form → aggregation once real data arrives.

---

## Phase 8 — Automatic start and stop (in v1, Free, designed 3 Oct 2026)

**Goal:** the commute is logged without tapping Start or Stop. **Decided 3 Oct 2026: goes into v1, and is Free.** Manual Start/Stop stays as the fallback. The Nov 1 date is dropped. Background location is Play's strictest review, so submit the declaration early. Builds on the existing Home and Office places.

**How it works (geofence + candidate trip)**

- Home and Office are registered as OS geofences (always on, near-zero battery).
- Leaving a geofence inside the user's commute window starts a **candidate trip**, saved to disk. Nothing is logged yet. The rules run in Java on the phone (`android/.../auto/AutoLogic.java`), because geofence events arrive while the app's screens aren't running.
- The candidate becomes a real trip only if it **ends inside the other place's geofence**. Start time is backdated to the exit event's timestamp; stop time is the entry event's timestamp.
- Errands never appear: a trip that doesn't reach the other place, or is under ~5 minutes, is dropped silently.
- The candidate is dropped if the user re-enters the origin geofence or the expiry passes. The window only decides whether a departure counts, so a 09:55 departure arriving at 10:30 is kept.

**Rules and defaults**

- **Window:** a departure from either place counts in either window (user-set, default Mon–Fri 7–10am and 4–8pm; a window may cross midnight for night shifts). **Changed while building (3 Oct):** outside the windows nothing is watched at all, and there is no "Log this as a commute?" prompt. Watching every departure would mean recording GPS (and showing the tracking notification) on weekend errands.
- **Expiry:** about 2.5 x the expected commute, minimum 45 min, maximum 3 h. Expected commute is estimated from distance at first, then the user's median once trips exist. Hidden default, not a setting.
- **Radius:** default 150 m, minimum 100 m (Android geofencing is only ~50–100 m accurate). Per-place slider (100 m to 1 km, no map: a map would need an online tile service), with the hint "Increase this if your office is a large campus" (campus 300–500 m). Stop means reaching the gate or car park, not the desk.
- **Stops on the way** (school drop-off, petrol): still count as one trip. Open question: show the stop time separately?
- **Visible feedback:** a notification "Trip started automatically, tap to cancel or edit", so mistakes are easy to fix.
- **Not ready:** off, Home or Office missing, or the two circles touching (crossings couldn't tell them apart) means nothing is watched. Settings warns about the last two.
- **Distance (decided 3 Oct: record GPS).** Leaving starts the normal recorder, backdated to the crossing, so distance is measured like a manual trip. The tracking notification ("Trip started automatically", with Stop and **Not a commute**) shows during errands too and disappears when the candidate is dropped. The few hundred metres inside each circle before the crossing is detected aren't measured.
- **Manual always wins:** a trip started by hand is never replaced, kept or dropped by automatic start and stop. Stopping an automatic trip by hand saves it then and stops waiting for an arrival.

**Build list**

- [x] Commute-window setting: on/off, morning and evening hours, days (Settings card, debug and demo builds only until the geofences work)
- [x] Per-place radius slider (default 150 m, 100 m to 1 km); warning when Home and Office are too close
- [x] Register Home and Office geofences (`AutoGeofences.java`, Google geofencing via Play services; re-set whenever settings or places change)
- [x] Re-register geofences after reboot, app update, app launch, and when location was switched off (`AutoReceiver.java`)
- [x] Candidate-trip state saved to disk so it survives the app being killed (`AutoStore.java`)
- [x] Complete / drop logic: arrival, re-entry to origin, expiry, 5-minute minimum, outside the window (18 Java tests)
- [x] Backdate start and stop to the geofence event timestamps; auto trips carry their direction and an "Auto" label; changing Home or Office doesn't re-label them
- [x] "Trip started automatically" notification with Stop and Not a commute (tapping it opens the app, where the trip can be edited once saved)
- [x] Median-based expiry once there are 3+ trips in that direction in the last 60 days; distance estimate before that
- [x] Background location: "Allow all the time" flow with a prominent in-app disclosure before the system prompt; "Paused" warning if the permission is taken back; message on phones without Google Play services
- [ ] Play Console: background location declaration (**text drafted** in `store/play-console-answers.md`, with a video script) + record the demo video; check the Data safety form (location still stays on the phone)
- [x] Privacy Policy: background location section and how to turn it off (`src/lib/legal.ts`, `docs/privacy-policy.md` regenerated)
- [ ] Battery-saver guidance for phones that kill background apps (Xiaomi, Samsung)
- [x] Developer tools: 6 scenarios (commute to work, commute home, errand, under 5 min, never arrives, leaves at 2 pm) through the real Java rules; all matched on the emulator
- [x] Decided: record GPS during a candidate
- [x] Circle size uses − / + buttons, not a slider (a scroll starting on a slider changed the circle by accident on the emulator)
- [x] Emulator end to end (3 Oct): left the sample Home at 16:11 → START within seconds, "Trip started automatically" notification with Stop / Not a commute → arrived at the Office → KEEP, trip saved with the app closed (4.49 km measured vs ~4.88 km straight line; the circles account for most of the gap) → History shows "To work · Auto". **Emulator catch:** fake GPS only reaches Google's location service while some app requests location, so keep Google Maps open when testing geofences on the emulator
- [ ] Emulator: an errand (leave Home, come back) and the "Not a commute" button
- [ ] Test on 2+ physical phones by walking or driving across the real radius edge (emulator fakes miss delayed events)

**Editing trips (applies to manual and automatic trips)**

- Editable: end time, start time, direction, distance (its own field, labelled "distance as measured"), delete, and add a trip by hand (marked, distance typed in or left out of distance totals).
- Guard rails: speed warning if the times and distance imply over about 120 km/h or under 2 km/h (can still save); no future times; end after start; no overlap with another trip.
- Trips that were edited get a small "edited" badge. The **original values are stored on the phone inside the trip record and are not shown to the user** (no accounts, so the developer cannot see them either). They are used for the badge and for later reports.
- No time limit on editing.

- [x] Saved original values (`original`) and `directionByUser` on `Trip` (`src/lib/trips/types.ts`). No migration needed: older trips simply have neither. Changing Home or Office no longer overwrites a direction the user picked
- [x] Edit screen: start and end time, distance field, direction (To work / To home / Other), speed warning, validation (future, 24 h or longer, overlap, unreadable distance). Untouched fields keep their exact recorded values, so saving without changes doesn't mark a trip edited
- [x] "Edited" label on trip rows (Home, History, Reports)
- [ ] Add-trip-by-hand flow (needs a decision on blank distance in totals)
- [x] Replace the note "distance stays as recorded" with a plain-language explanation
- [x] Privacy Policy: one sentence on the originals kept with edited trips (`src/lib/legal.ts`, `docs/privacy-policy.md` regenerated)
- [ ] Check the edit screen on the emulator (Developer tools → Load sample trips)

**Later:** suggest a bigger radius when real arrivals land consistently outside the circle; support more than one work place.

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
- Opt-in anonymous commute analytics, no accounts (see Phase 7)
- Google Fused Location Provider (custom native plugin)
- Automatic trip detection (needs background location: Play's strictest review; designed in Phase 8)

## Verification

- Unit: `npx vitest run`
- Build: `npm run build:android`, `npm run lint`, release `bundleRelease`
- Device: ≥2 physical phones; compare a known route against Google Maps; lock screen mid-trip; force-stop mid-trip
- Backup: `adb shell bmgr transport com.android.localtransport/.LocalTransport`, `bmgr backupnow com.commute.tracker`, uninstall, reinstall; trips come back. Switch the transport back afterwards
- Developer tools (Settings): a Free / Pro switch, **Load sample trips and addresses** (100 trips over ~10 weeks, slow Tuesdays, last month, 2 unlabelled errands, none for today), **Clear Home and Office and show the pop-up again**, and **Fire a reminder now** for each of the 6 reminders. Shown in **debug builds** (`./gradlew assembleDebug`, detected from Android's debuggable flag; Google Play is bypassed there) and in **demo builds** (`npm run build:android:demo`). Play release builds never show it (checked on the emulator). **Never upload a demo build**; release builds use `npm run build:android`
- Emulator caution: it boots from a saved quick-boot snapshot. Launched with `-no-snapshot-save`, **everything done in that session is discarded on exit** (this is what "lost" the 30 Sep test trip; the app itself keeps data through force-stop and reboot)
- Billing: licence-tester account for purchase, cancel, refund, restore on reinstall

## Sources

- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en)
- [Billing requirements in India](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en)
- [Play fee changes, June 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)
