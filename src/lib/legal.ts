/**
 * The privacy policy and terms shown in the app (Settings), and exported as Markdown for hosting
 * (`npm run export:legal`). This file is the single source of truth. Plain data and no imports, so Node can run it directly.
 * Keep it in step with what the app really does, and with store/play-console-answers.md.
 */

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = '9 October 2026';

/** Who publishes the app. Shown publicly in both documents, as Google Play requires a privacy contact. */
export const PUBLISHER_NAME = 'Kaustav Dutta';
export const CONTACT_EMAIL = 'provibsol@gmail.com';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  updated: LEGAL_UPDATED,
  intro:
    `MYCE is made by ${PUBLISHER_NAME} ("we"). It has no accounts. Your trips stay on your phone, unless you choose to help improve MYCE by sharing how you use the app or your commute times. Both are off until you turn them on. This page explains what the app uses, what leaves your phone and when, and the choices you have.`,
  sections: [
    {
      heading: 'What the app uses',
      bullets: [
        'Precise location while a trip is being recorded. Tracking begins when you tap Start (in the app or on the home-screen widget) and ends when you tap Stop (in the app, on the widget or in the notification). While tracking, the app shows a notification and may keep reading location with the screen off or the app closed. Apart from automatic start and stop (below), it does not read location at any other time, except when you choose "Use my current location" to set Home or Office.',
        'Location in the background, only if you turn on automatic start and stop. It is off until you switch it on and allow location "all the time". Your phone then tells the app when you cross a circle around your saved Home or Office, even when the app is closed. Leaving one during the commute hours you chose starts recording a trip, with the usual notification; arriving at the other saves it, and anything else (an errand, never arriving) is thrown away. Outside your commute hours, crossings are ignored. Like all trip data, this stays on your phone.',
        'Trip data: for each commute, the start and end times, duration, distance, start and end points, and whether it was to work or to home. The full route is used only to measure distance while the trip runs. It is not saved. If you edit a trip, the times, distance and direction first recorded are kept with it on your phone.',
        'Saved places: the Home and Office you set, with the address you picked.',
        'Reminder settings: which reminders you turned on and the evening time you chose.',
        'Automatic start and stop settings: whether it is on, your commute hours and days, how long your commute usually takes, and the size of the Home and Office circles.',
        'Purchase status: whether you have bought Pro. Payments are handled entirely by Google Play. We never see your card or payment details.',
      ],
    },
    {
      heading: 'What can leave your phone, and only when you act',
      bullets: [
        'Address search. When you type an address and press Search, the text you typed is sent over HTTPS to your phone\'s built-in address lookup (provided by Google on most phones) and, if that finds nothing, to OpenStreetMap\'s Nominatim service. Only the typed text is sent, and only when you press Search. We do not receive it, and those services have their own privacy policies.',
        'Bug reports and feedback. If you choose Report a bug or Send feedback, the app opens your own email app with your message, any screenshots you add and, for bug reports, a diagnostics file attached. You can read everything before you press Send, and nothing is sent unless you do. The diagnostics file lists your phone model, Android version, app version, the state of location and notification permissions, and recent app events. It does not contain your locations, addresses or trips.',
        'Google Play. Purchases and restoring a purchase go through Google Play.',
        'Google location services. On most phones, location comes from Google Play services. Google may handle it under your device\'s own location settings. If Google Play services is missing, the app uses Android\'s own GPS instead.',
      ],
    },
    {
      heading: 'Help improve MYCE (optional)',
      paragraphs: [
        'The app asks about app usage once during setup, and about commute times once on the Home screen after your third saved trip. You can change either answer any time in Settings → Help improve MYCE. Both are off unless you turn them on, and the app works the same either way. Turning either on confirms you are 18 or older.',
      ],
      bullets: [
        'Share how you use the app. The app records which features you use: setup screens finished or skipped, whether you chose automatic or manual recording, turning automatic start and stop on or off, that a trip was saved, edited or deleted (not its times, distance or places), reminder switches, and taps on the Pro button or a purchase. This uses Google Analytics for Firebase, a Google service, which also records a random app-instance ID, your phone model, Android version, app version, in-app purchase events, and an approximate location (country, region or city) worked out from a masked IP address. The advertising ID is never collected, and nothing is used for advertising. Turning this off stops it and resets the app-instance ID. Google Analytics keeps this for 14 months; our copy is kept for up to 24 months. How Google handles this data: https://www.google.com/policies/privacy/partners/',
        'Share commute times. For each trip that starts after you turn this on: the date and weekday, the start time rounded down to 15 minutes, how long it took, the distance to 0.1 km, whether it was to work, to home or neither, whether it started automatically, whether you edited it, and the areas it started and ended in, each about 5 km across. Never your exact Home, Office, addresses, route or GPS points. Each record carries a random ID made on your phone, which is not linked to your name, email, phone number or Google account. If you edit or delete a trip on your phone, the shared copy is updated or deleted too.',
        'Where it goes. Shared commute times are sent over an encrypted connection to our server in Mumbai, India (Google Cloud), and stored in Google BigQuery. Firebase App Check, using Google Play Integrity, confirms each upload comes from the genuine app. Google processes this data for us as a service provider.',
        'Why. To understand how long commutes take, by area, day and time of day, and to see which parts of the app work and which confuse people.',
        'How long. Each shared commute record is deleted automatically 24 months after it arrives.',
        'Deleting it. Turning off "Share commute times" deletes everything shared from your phone: it is hidden from us as soon as the request reaches us (straight away, or next time your phone is online) and removed within 48 hours. Turning it on again starts afresh with a new random ID. If you uninstall without turning it off, the shared records can no longer be linked to your phone, and they are deleted after 24 months.',
        'Selling or sharing statistics. We may publish, share or sell statistics built from shared commute times, for example average commute times by area, day and hour, to businesses, researchers, city planners or the public. These are always anonymised and aggregated: totals or averages for groups of at least 20 people, containing nothing that could identify anyone. We never sell, share or give anyone individual-level data: not your trips, not your random ID, and nothing linked to your phone. App-usage statistics are never sold or shared, and nothing is used for advertising.',
      ],
    },
    {
      heading: 'Reminders',
      paragraphs: [
        'If you leave notifications on, the app schedules reminders on your phone (for example a weekly summary or a note before you usually leave). They are worked out on your phone from your saved trips when they are due. Nothing is sent anywhere for this.',
      ],
    },
    {
      heading: 'Where your data is stored',
      paragraphs: [
        'Everything above is stored on your phone, except what you choose to share under "Help improve MYCE". Without that, we do not receive your trips or location.',
        'If Android backup is switched on for your Google account, Android may include the app\'s data in your device backup, stored by Google, so it can be restored on a reinstall or a new phone. This is controlled in your phone\'s settings, not by the app.',
      ],
    },
    {
      heading: 'How your data is used',
      paragraphs: [
        'To time your commutes and measure distance, label trips to work or to home, show your history and weekly summaries, send the reminders you turn on, create the reports you ask for, and unlock Pro. If you choose to share, to understand commute times and improve the app (see "Help improve MYCE"). Emails you send us are used to reply to you and to fix problems. We never sell or share personal or individual-level data, and we do not use it for advertising. Only anonymised, aggregated commute statistics may be shared or sold (see "Help improve MYCE").',
      ],
    },
    {
      heading: 'How long it is kept',
      paragraphs: [
        'Trips stay on your phone until you delete them or uninstall the app. History shows the last two weeks, and older trips are kept so they can be included in reports. Diagnostics files are created only when you ask for a report and are replaced each time. Shared commute times are kept for 24 months, and app-usage statistics as described above.',
      ],
    },
    {
      heading: 'Deleting your data',
      bullets: [
        'Delete a trip in History, or all trips at once in Settings → Your Data.',
        'Delete commute times you shared by turning off "Share commute times" in Settings → Help improve MYCE.',
        'Clear Home or Office in Settings.',
        'Delete everything by clearing the app\'s storage (phone Settings → Apps → MYCE → Storage) or by uninstalling the app.',
        'Device backups kept by Google are managed in your Google account and phone backup settings.',
      ],
    },
    {
      heading: 'Your choices',
      bullets: [
        'You can deny or take back location permission at any time in your phone\'s settings. Tracking will not work without it.',
        'You can turn automatic start and stop off in Settings at any time, or take back "Allow all the time" in your phone\'s settings. Start and Stop keep working without it.',
        'You can turn each reminder off in Settings → Notifications, or turn notifications off for the app in your phone\'s settings.',
        'You can skip address search and set Home or Office from your current location, or not set them at all.',
        'You can turn "Share how you use the app" and "Share commute times" on or off at any time in Settings → Help improve MYCE.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: ['MYCE is for adults aged 18 and over. It is not directed at children, and we do not knowingly collect data from anyone under 18.'],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: ['If our practices change, we will update this page and the date at the top.'],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `Questions about privacy, requests about your data (for example to know what was shared, correct it or delete it), or complaints: email ${PUBLISHER_NAME} at ${CONTACT_EMAIL}, or use Settings → Send feedback in the app. We reply as soon as we can, and within 90 days at the latest.`,
        'If you are not satisfied with our answer, you can complain to the Data Protection Board of India.',
      ],
    },
  ],
};

export const TERMS: LegalDocument = {
  title: 'Terms and Conditions',
  updated: LEGAL_UPDATED,
  intro:
    `These terms are the rules for using MYCE ("the app"), made by ${PUBLISHER_NAME} ("we", "us"). By installing and using the app you agree to them. If you do not agree, please do not use the app.`,
  sections: [
    {
      heading: 'What the app does',
      paragraphs: [
        'The app times your commutes, measures distance with your phone\'s location, keeps a history on your phone, and (with Pro) makes reports you can export. It is meant for personal use.',
      ],
    },
    {
      heading: 'Who can use it',
      paragraphs: ['You must be 18 or older to use the app.'],
    },
    {
      heading: 'Stay safe',
      bullets: [
        'Do not use the app while driving or riding. Start and stop a trip before you set off or after you arrive, or use the widget or notification at a safe moment.',
        'Location accuracy depends on your phone, the sky view and the surroundings. Times and distances are estimates and can be wrong.',
        'The app is not an emergency, navigation or safety tool.',
      ],
    },
    {
      heading: 'Your data',
      paragraphs: [
        'Your trips stay on your phone unless you choose to share commute times. How the app handles your information is described in the Privacy Policy, which forms part of these terms. You are responsible for keeping your phone and any exported reports safe.',
      ],
    },
    {
      heading: 'Pro',
      bullets: [
        'Everyone gets everything in Pro free for their first 30 days after installing the app. After that, they need the one-time Pro purchase.',
        'Pro is a one-time purchase made through Google Play, with no subscription. The price shown in the app is the price you pay. You can buy it at any time, including during the free month.',
        'Refunds are handled under Google Play\'s refund policy.',
        'Pro is linked to your Google account and restores on any phone signed in to it. Use "Restore purchase" in Settings if it does not appear.',
        'The features included in Free and Pro may change over time. We will not remove a feature you have already paid for without good reason.',
      ],
    },
    {
      heading: 'Reports and exports',
      paragraphs: [
        'Reports are based on what the app recorded and any edits you made. They are provided for your convenience. If you use one for a travel claim, tax or any official purpose, you are responsible for checking that it is correct and that the purpose accepts it.',
      ],
    },
    {
      heading: 'Using the app properly',
      bullets: [
        'Do not copy, reverse engineer, resell or tamper with the app, including its Pro unlock.',
        'Do not use the app for anything unlawful.',
      ],
    },
    {
      heading: 'No warranty',
      paragraphs: [
        'The app is provided "as is" and "as available". We do not promise that it will be error free, always available, or accurate. We may change or stop the app at any time.',
      ],
    },
    {
      heading: 'Limit of our responsibility',
      paragraphs: [
        'To the extent the law allows, we are not responsible for indirect or consequential loss, or for loss caused by wrong times, distances or reminders, missed trips, or lost data (for example if your phone is lost or reset). Nothing in these terms limits any right you have by law that cannot be limited.',
      ],
    },
    {
      heading: 'Ending and changes',
      paragraphs: [
        'You can stop using the app at any time by uninstalling it. We may update these terms. The date at the top shows the latest version, and using the app after a change means you accept it.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: ['These terms are governed by the laws of India, and its courts decide any dispute, unless the law where you live says otherwise.'],
    },
    {
      heading: 'Contact',
      paragraphs: [`Questions about these terms? Email ${CONTACT_EMAIL}, or use Settings → Send feedback in the app.`],
    },
  ],
};

/** The document as Markdown, for hosting on a web page (the Play Store listing needs a public privacy URL). */
export function toMarkdown(doc: LegalDocument): string {
  // Web addresses become links (<...> works in every Markdown renderer).
  const md = (text: string) => text.replace(/(https:\/\/[^\s]+[^\s.,)])/g, '<$1>');
  const lines = [`# ${doc.title} — MYCE`, '', `Last updated: ${doc.updated}`, '', md(doc.intro), ''];
  for (const section of doc.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const paragraph of section.paragraphs ?? []) lines.push(md(paragraph), '');
    for (const bullet of section.bullets ?? []) lines.push(`- ${md(bullet)}`);
    if (section.bullets?.length) lines.push('');
  }
  return lines.join('\n');
}
