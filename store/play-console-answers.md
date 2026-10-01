# Play Console forms: suggested answers (draft)

Check each answer against the app before submitting: Google rejects listings whose Data safety answers don't match what the app does.

## Data safety

**Does your app collect or share any of the required user data types?** → **No** (recommended, with two points to confirm below)

Why: Google says data that is only processed on the device and never sent off it does not count as "collected". This app:
- uses precise location only on the phone, to measure trips. It is never sent to the developer
- stores trips, Home and Office only on the phone. There are no servers of ours
- has no accounts, no ads, no analytics and no crash-reporting SDK
- checks whether Pro was bought through Google Play on the phone. Google says payment data collected by Google Play's billing system doesn't need to be declared by the developer

**Points to confirm before submitting** (couldn't find an official Google statement for these):
1. **Android backup.** The app allows Android's automatic backup, which can copy app data (trips, Home/Office) to the user's Google account. If Play Console's help text says this counts as "collected", declare **Location → Precise location: collected, not shared, purpose App functionality**, and keep everything else as below.
2. **Google's location engine.** Location comes from Google Play services' Fused Location Provider. Google may receive location under the user's own "Google Location Accuracy" device setting. That's Google's collection under the user's control, not the app's, but if Play Console flags it, use the same fallback as point 1.

If you answer Yes for either point, these extra answers apply:
- Is all of the user data collected by your app encrypted in transit? → Yes (Android backup and Google services use encrypted connections)
- Do you provide a way for users to request that their data is deleted? → Yes: delete trips in the app, "Delete all trips" in Settings, or uninstall

## App access

**All functionality is available without special access** → choose "All functionality is available without any access restrictions".
(Pro features need a purchase, not a login. If a reviewer asks, they can be added as a licence tester.)

## Ads

**Does your app contain ads?** → **No**

## Content rating (IARC questionnaire)

- Category: Utility, Productivity, Communication or Other (choose "All other app types" if offered)
- Violence, sexuality, language, controlled substances, gambling: No
- Does the app let users interact or exchange content? → No
- Does the app share the user's current physical location with other users? → No
- Does the app allow purchases of digital goods? → Yes (one-time Pro upgrade)

Expected rating: Everyone / 3+.

## Target audience and content

- Target age groups: **18 and over** (simplest; avoids the Families policy requirements)
- Appeals to children? → No

## Foreground service permissions (App content → Foreground service permissions)

**Type:** Location (`FOREGROUND_SERVICE_LOCATION`)

**Description of the feature:**
> The app records a commute the user starts by tapping Start in the app, on its home-screen widget, or in its notification. While recording, the app shows an ongoing notification with a live timer, the distance so far and a Stop button. Location is used to measure the trip's distance and continues when the screen is off or the user switches apps, so the whole commute is measured. Recording stops as soon as the user taps Stop. The app never starts recording on its own and does not use background location.

**User impact if the task is deferred or interrupted:**
> The commute would be measured incompletely: distance travelled while the screen is off would be lost, making the trip's time and distance wrong.

**Demo video** (to record): tap Start on Home → Android's location prompt → notification appears with timer and distance → lock screen, travel → unlock, distance has increased → tap Stop in the notification → trip appears in History. Then the same from the widget.

## News app / COVID-19 / Government / Financial features declarations

All: **No** / not applicable.
