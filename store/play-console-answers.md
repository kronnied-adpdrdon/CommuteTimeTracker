# Play Console forms: suggested answers (draft)

Check each answer against the app before submitting: Google rejects listings whose Data safety answers don't match what the app does.

## Data safety

**Does your app collect or share any of the required user data types?** → **Yes**

What the app does with data now (rewritten 7 Oct 2026, after "Help improve MYCE" was added):
- Precise location is used only on the phone, to measure trips. Exact positions are never sent to the developer.
- Trips, Home and Office are stored on the phone. No accounts, no ads, no crash-reporting SDK.
- **"Help improve MYCE" (optional, off until the user turns it on, asked in the setup and in Settings):**
  - *Share how you use the app*: Firebase Analytics events (setup screens finished or skipped, recording choice, automatic start on/off, trip saved / edited / deleted without any times, distances or places, reminder switches, Pro button taps and purchase). Firebase adds an app-instance ID, device model, Android version, app version and country/region. Advertising ID collection is disabled and the AD_ID and ad-services permissions are removed from the manifest; Google data-sharing settings are off.
  - *Share commute times*: per trip, date, start time rounded to 15 minutes, weekday, duration, distance (0.1 km), to work / to home / other, automatic or not, edited or not, and the start and end areas as ~5 km geohash cells. Sent with a random install ID (made on the phone, no account) over HTTPS to the developer's Cloud Function in Mumbai and stored in BigQuery. Each record is deleted automatically 24 months after it arrives. Turning "Share commute times" off deletes them (hidden at once, removed within 48 hours).
- **Address search.** The typed text goes to Android's geocoder (Google) and, if needed, OpenStreetMap Nominatim, only when the user presses Search.
- **Report a bug / Send feedback.** Opens the user's own email app; the app itself transmits nothing.
- Pro ownership is checked through Google Play Billing on the phone.

**Proposed Data safety answers (confirm each against Play Console's current help text before submitting):**

| Data type | Collected / shared | Optional? | Purpose |
|---|---|---|---|
| Location → **Approximate location** | Collected, not shared | Yes | **Analytics** (shared commute times, ~5 km areas); **App functionality** (address search text) |
| App activity → **App interactions** | Collected, not shared | Yes | **Analytics** |
| App activity → **Other actions** (trip duration, distance, start time) | Collected, not shared | Yes | **Analytics** |
| Device or other IDs | Collected, not shared | Yes | **Analytics** (Firebase app-instance ID; random install ID for shared commute times) |
| Financial info → **Purchase history** | Collected, not shared | Yes | **Analytics** (Firebase Analytics records in-app purchase events by default; plus our own "Pro purchased" event) |

- Approximate location also covers Firebase Analytics' coarse location, derived from a masked IP address. Advertising ID is not collected (disabled in the manifest).
- Google (Firebase, Google Cloud) and the geocoders process data on the developer's behalf, so this is **not "shared"** in Play's sense.
- **Aggregated statistics may be sold (decided 9 Oct 2026):** only anonymised totals for groups of at least 20 people, never individual-level data. Fully anonymised data that can't be linked to a user shouldn't count as "shared"; confirm against Play Console's current help text before answering, and if in doubt declare Approximate location and Other actions as *shared* for *Analytics*.
- Nothing else is collected. Email reports are user-initiated through their own email app.
- **Is all user data encrypted in transit?** → Yes (HTTPS everywhere).
- **Can users request deletion?** → Yes: turning off "Share commute times" deletes everything shared; turning off "Share how you use the app" stops collection and resets the analytics ID; trips on the phone are deleted in the app or by uninstalling. Shared records also expire after 24 months.
- Still to confirm: whether Android backup of app data needs declaring (see Play Console's help text; if yes, add Location → Precise location, collected, App functionality).

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
> Location in the background. MYCE collects location data to start and stop your commute automatically when you leave or arrive at Home or the Office, even when the app is closed or not in use. Your location stays on this phone, unless you turn on Share commute times, which shares only the rough area (about 5 km across) where each trip starts and ends. On the next screen, choose Allow all the time. You can turn this off in Settings at any time.

**Data use:** on the phone only. Not sent to the developer or third parties (see Data safety).

**Demo video** (to record, under 30 s if possible): Settings → Automatic start and stop switch → the in-app disclosure → Continue → Android's "Allow all the time" page → back, switch on → (emulator location moved out of the Home circle) → "Trip started automatically" notification → location moved into the Office circle → notification disappears and the trip appears in History labelled "Auto".

## News app / COVID-19 / Government / Financial features declarations

All: **No** / not applicable.
