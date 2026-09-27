# Commute Time Tracker

A privacy-first, ultra-minimalist mobile application for tracking your daily commute times and distances.

## Features
- **Real-Time Tracking**: Start your commute and watch the elapsed time and Haversine-calculated GPS distance update in real-time.
- **Background Native Capabilities**: Powered by Capacitor, allowing seamless transition from a Next.js web application to a native Android/iOS mobile application.
- **Weekly Summaries**: Keep track of your daily averages and weekly trends.
- **Secure Local Storage**: Designed to maintain privacy and keep data close to you.

## Development

This is a Next.js (App Router) project integrated with Capacitor for mobile deployment.

### Running Locally
```bash
npm run dev
```

### Compiling Mobile Apps
Before building the APK, ensure you have successfully run the Next.js static export:
```bash
npm run build
npx cap sync android
```
Then, open Android Studio to compile your debug APK:
```bash
npx cap open android
```
