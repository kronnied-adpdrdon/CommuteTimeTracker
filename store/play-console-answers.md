# Play Console forms: suggested answers (draft)

Check each answer against the app before submitting: Google rejects listings whose Data safety answers don't match what the app does.

## Data safety

**Does your app collect or share any of the required user data types?** → **Yes** (changed in build 2: the address search sends typed text off the phone)

What the app does with data now:
- Precise location is used only on the phone, to measure trips. It is never sent to the developer.
- Trips, Home and Office are stored only on the phone. There are no servers of ours, no accounts, no ads, no analytics and no crash-reporting SDK.
- **Address search (new).** When the user types a Home or Office address and presses Search, the typed text is sent to Android's built-in geocoder (Google, on most phones) and, if that finds nothing, to OpenStreetMap's Nominatim service. Only the text is sent, only on that button press, with no user ID.
- **Reminders (new).** Scheduled and worked out on the phone from the saved trips. Nothing is sent anywhere.
- **Report a bug / Send feedback (new).** The app opens the user's own email app with a diagnostics file and any screenshots attached. The user reads it and presses Send. The app itself transmits nothing. The diagnostics file holds device model, Android version, permission and location-setting states and recent app events, never coordinates or addresses.
- Pro ownership is checked through Google Play Billing on the phone (payment data handled by Google Play needs no declaration by the developer).

**Proposed Data safety answers (confirm each against Play Console's current help text before submitting; I could not find an official Google statement for the user-initiated cases):**
- **Location → Approximate location** or **Personal info → Address**: *Collected*, not *shared* with other companies for their own use, purpose **App functionality**, optional (the user can skip address search and use GPS or nothing). Reason: typed address text is sent to a geocoding service when the user presses Search. Treat the geocoder as a service provider acting on the app's behalf.
- Nothing else is declared as collected. Email reports are user-initiated through their own email app, and Google's definition excludes data a user chooses to send themselves. If Play Console says otherwise, add **App info and performance → Diagnostics**, optional, purpose App functionality.

**Other points to confirm before submitting:**
1. **Android backup.** The app allows Android's automatic backup, which can copy app data (trips, Home/Office) to the user's Google account. If Play Console's help text says this counts as "collected", declare **Location → Precise location: collected, not shared, purpose App functionality** as well.
2. **Google's location engine.** On phones with Google Play services, location comes from the Fused Location Provider, and Google may receive location under the user's own "Google Location Accuracy" device setting. On phones without Play services (or where it fails) the app falls back to Android's own GPS. That's Google's collection under the user's control, not the app's, but if Play Console flags it, use the same fallback as point 1.

Extra answers that apply:
- Is all of the user data collected by your app encrypted in transit? → Yes (address search uses HTTPS; Android backup and Google services use encrypted connections)
- Do you provide a way for users to request that their data is deleted? → Yes: delete trips in the app, "Delete all trips" in Settings, or uninstall. Typed address text is not stored by the developer.

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
> The app records a commute, started either by the user tapping Start (in the app, on its home-screen widget, or in its notification) or, if the user has turned on "Automatic start and stop", by the phone leaving the user's saved Home or Office during the commute hours they chose. While recording, the app shows an ongoing notification with a live timer, the distance so far and a Stop button (plus "Not a commute" for automatic trips). Location is used to measure the trip's distance and continues when the screen is off or the user switches apps, so the whole commute is measured. Recording stops when the user taps Stop, or for automatic trips when the phone arrives at the other saved place.

**User impact if the task is deferred or interrupted:**
> The commute would be measured incompletely: distance travelled while the screen is off would be lost, making the trip's time and distance wrong.

**Demo video** (to record): tap Start on Home → Android's location prompt → notification appears with timer and distance → lock screen, travel → unlock, distance has increased → tap Stop in the notification → trip appears in History. Then the same from the widget.

## Location permissions (App content → Sensitive permissions → Location: background)

**Added 3 Oct 2026 for automatic start and stop.** Draft; check the form's current wording.

**Which feature uses background location?**
> Automatic start and stop of commute trips. The user saves a Home and an Office and turns the feature on in the first-time setup or in Settings (it is off by default; the setup recommends it but offers manual Start and Stop as an equal-sized alternative). The app registers a geofence around each place. When the phone leaves one during the commute hours the user chose, the app starts recording the trip; when it arrives at the other, the trip is saved to the user's history. Departures that don't end at the other place (errands) are discarded. Outside the chosen hours, geofence events are ignored.

**Why is background location needed (why not only while the app is open)?**
> The commute starts when the user walks out of the door, when the app is not open. Without background location the user has to remember to open the app and tap Start, which is the problem the feature solves. The app only receives the geofence crossings for the two saved places and records location only during a trip, with the ongoing notification showing.

**Prominent disclosure (in the app, before the system prompt):**
> Location in the background. Commute Time Tracker collects location data to start and stop your commute automatically when you leave or arrive at Home or the Office, even when the app is closed or not in use. Your location stays on this phone. On the next screen, choose Allow all the time. You can turn this off in Settings at any time.

**Data use:** on the phone only. Not sent to the developer or third parties (see Data safety).

**Demo video** (to record, under 30 s if possible): Settings → Automatic start and stop switch → the in-app disclosure → Continue → Android's "Allow all the time" page → back, switch on → (emulator location moved out of the Home circle) → "Trip started automatically" notification → location moved into the Office circle → notification disappears and the trip appears in History labelled "Auto".

## News app / COVID-19 / Government / Financial features declarations

All: **No** / not applicable.
