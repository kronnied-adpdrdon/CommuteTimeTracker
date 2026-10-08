# MYCE

A privacy-first, ultra-minimalist mobile application for tracking your daily commute times and distances.

## Features
- **Real-Time Tracking**: Tap Start and Stop; time and GPS distance update live, and tracking continues with the screen off (foreground service with a notification).
- **Trip History**: The last 3 commutes on the home screen, the last 2 weeks in History, with edit and delete. Trips are labelled "to work" or "to home" from your saved Home and Office.
- **Weekly Summaries**: Total and average commute time, compared with the previous week.
- **Private by Design**: No accounts. Trips stay on the phone; Android's own backup can restore them on a new phone. Sharing app-usage statistics and coarse commute times (to help improve MYCE) is optional and off by default; see `functions/` for the server side.
- **Pro (₹100, one-time; free for everyone's first 30 days)**: reports for any date range with PDF and CSV export, the monthly recap and slow-day alerts.

Android only, built with Next.js (static export) and Capacitor.

## Development

This is a Next.js (App Router) project integrated with Capacitor for mobile deployment.

### Running Locally
```bash
npm run dev
```

### Tests
```bash
npm test
```

### Compiling Mobile Apps
Before building the APK, ensure you have successfully run the Next.js static export:
```bash
npm run build
npx cap sync android
```
Then, open Android Studio to compile your debug APK (command-line Gradle builds need Android Studio's JDK 21, not its bundled JDK 25):
```bash
npx cap open android
```
