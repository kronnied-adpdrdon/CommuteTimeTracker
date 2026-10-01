import { LocationError } from '../tracking/locationSource';

export function errorMessage(error: LocationError): string {
  switch (error.kind) {
    case 'permission-denied':
      // Also what Android reports when the user chose "Approximate": the tracker needs precise location.
      return 'This app needs Precise location. In Settings → Permissions → Location, choose "Allow only while using the app" and turn on "Use precise location".';
    case 'location-off':
      return 'Location is switched off on this phone. Turn it on, then try again.';
    case 'approximate':
      return 'Location is set to Approximate, which is too rough to measure a commute. In Settings, turn on Precise location for this app.';
    case 'timeout':
      return "Couldn't get an accurate location. Try again near a window or outdoors.";
    case 'unavailable':
      return 'Location only works in the Android app, not in a web browser.';
    default:
      return `Something went wrong with location: ${error.message}`;
  }
}

/** Errors the user can fix in the phone's settings for this app. */
export const canOpenSettings = (error: LocationError | null) =>
  error?.kind === 'permission-denied' || error?.kind === 'location-off' || error?.kind === 'approximate';
