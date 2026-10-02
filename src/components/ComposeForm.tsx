'use client';

import { ChangeEvent, useRef, useState } from 'react';
import styles from '@/app/page.module.css';
import { MAX_IMAGES, SUPPORT_EMAIL, SendError, composeEmail, prepareImage } from '@/lib/support';

type Mode = 'bug' | 'feedback';

const CATEGORIES = ['Idea', 'Something confusing', 'Something I like', 'Other'];

interface Picked {
  name: string;
  data: string;
  preview: string;
}

const COPY: Record<Mode, { label: string; placeholder: string; button: string }> = {
  bug: {
    label: 'What went wrong?',
    placeholder: 'For example: tracking never started on my Samsung phone after I tapped Start.',
    button: 'Open email with report',
  },
  feedback: {
    label: 'Your feedback',
    placeholder: 'Tell me what you think, what is missing, or what could be better.',
    button: 'Open email with feedback',
  },
};

/** The "Report a bug" and "Send feedback" form. Nothing is sent from here: it opens the user's email app to review and send. */
export default function ComposeForm({ mode }: { mode: Mode }) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const copy = COPY[mode];

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES - images.length);
    event.target.value = '';
    if (files.length === 0) return;
    setError(null);
    try {
      const prepared = await Promise.all(files.map(prepareImage));
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
    } catch {
      setError("Couldn't read one of those pictures. Try a different one.");
    }
  }

  async function send() {
    if (message.trim().length < 5) {
      setError('Please write a few words first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await composeEmail({
        subject: mode === 'bug' ? 'Commute Time Tracker: bug report' : `Commute Time Tracker: feedback (${category})`,
        body: `${message.trim()}\n\n-- Sent from Commute Time Tracker`,
        attachLog: mode === 'bug',
        images: images.map(({ name, data }) => ({ name, data })),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof SendError ? e.message : "Couldn't open your email app. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitle}>Your email app is open</div>
        <p className={styles.cardText}>
          Review the message and press <strong>Send</strong> there. Nothing is sent until you do. Thank you for helping make the app better.
        </p>
        <button className="btn-primary" onClick={() => { setDone(false); setMessage(''); setImages([]); }}>
          Write another
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {mode === 'feedback' && (
        <div className={`${styles.chips} ${styles.chipsWrap}`} role="radiogroup" aria-label="Type of feedback">
          {CATEGORIES.map((c) => (
            <button key={c} role="radio" aria-checked={category === c} className={`${styles.chip} ${category === c ? styles.chipActive : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <label className={styles.cardText} htmlFor="compose-message">{copy.label}</label>
      <textarea
        id="compose-message"
        className={`input-field ${styles.textarea}`}
        rows={6}
        placeholder={copy.placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className={styles.cardText}>Screenshots (optional, up to {MAX_IMAGES})</div>
      <div className={styles.thumbRow}>
        {images.map((image, i) => (
          <div key={i} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt={`Screenshot ${i + 1}`} />
            <button aria-label={`Remove screenshot ${i + 1}`} className={styles.thumbRemove} onClick={() => setImages((current) => current.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button className={styles.thumbAdd} onClick={() => fileInput.current?.click()}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>+</span>
            <span>Add</span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addImages} />

      {mode === 'bug' && (
        <p className={styles.cardText}>
          A small diagnostics file is attached: your phone model, Android version, location settings and recent app events. It contains no addresses, locations or trip details. You can read it before sending.
        </p>
      )}
      {!SUPPORT_EMAIL && <p className={styles.fieldError}>No support address is set in this build, so you&apos;ll choose the recipient yourself.</p>}
      {error && <p className={styles.fieldError} role="alert">{error}</p>}

      <button className="btn-primary" disabled={busy} onClick={send}>
        {busy ? 'Preparing…' : copy.button}
      </button>
    </div>
  );
}
