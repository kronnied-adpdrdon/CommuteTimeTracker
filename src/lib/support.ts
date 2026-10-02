import { isNativeApp, lazyPlugin } from './native';

/**
 * Where bug reports and feedback are addressed. Set `NEXT_PUBLIC_SUPPORT_EMAIL` in `.env.local` (kept out of git,
 * so a public repo doesn't publish it). Without it the email opens with no recipient and the user picks one.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

/** Hosted privacy policy. Set `NEXT_PUBLIC_PRIVACY_URL` once it is published; the Settings link appears only then. */
export const PRIVACY_POLICY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL ?? '';

export const MAX_IMAGES = 3;

export interface EmailImage {
  name: string;
  /** Base64 JPEG, without the `data:` prefix. */
  data: string;
}

export interface ComposeOptions {
  subject: string;
  body: string;
  attachLog: boolean;
  images: EmailImage[];
}

interface SupportPlugin {
  composeEmail(options: ComposeOptions & { to: string }): Promise<void>;
  log(options: { message: string }): Promise<void>;
}

const plugin = lazyPlugin<SupportPlugin>('Support');

export type SendErrorKind = 'no-email-app' | 'not-android' | 'failed';

export class SendError extends Error {
  constructor(
    public kind: SendErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** Opens the user's email app with everything attached. They review it and press Send themselves. */
export async function composeEmail(options: ComposeOptions): Promise<void> {
  if (!(await isNativeApp())) throw new SendError('not-android', 'Sending reports only works in the Android app.');
  try {
    await (await plugin()).native.composeEmail({ ...options, to: SUPPORT_EMAIL });
  } catch (error) {
    if ((error as { code?: string })?.code === 'NO_EMAIL_APP') {
      throw new SendError('no-email-app', 'No email app found. Install or set up an email app, then try again.');
    }
    throw new SendError('failed', "Couldn't open your email app. Please try again.");
  }
}

/** Adds a line to the on-phone diagnostics log that "Report a bug" attaches. Never throws. */
export async function logToDiagnostics(message: string): Promise<void> {
  try {
    if (await isNativeApp()) await (await plugin()).native.log({ message });
  } catch {
    // Logging must never break the app.
  }
}

const MAX_IMAGE_EDGE = 1280;

/** Shrinks a picked picture to a JPEG that is small enough to email, and returns it with a preview URL. */
export async function prepareImage(file: File): Promise<EmailImage & { preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read the image.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const preview = canvas.toDataURL('image/jpeg', 0.8);
  return { name: file.name, data: preview.slice(preview.indexOf(',') + 1), preview };
}
