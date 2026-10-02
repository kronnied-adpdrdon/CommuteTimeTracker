'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import AddressPicker from '@/components/AddressPicker';
import { commute, useCommute } from '@/lib/commute';

/**
 * Asks for the Home and Office addresses every time the app opens until both are set.
 * Cancel hides it for now; "Don't ask me again" hides it for good (it can still be set in Settings).
 */
export default function PlacesDialog() {
  const state = useCommute();
  const [open, setOpen] = useState(false);
  const [neverAsk, setNeverAsk] = useState(false);
  const bothSet = Boolean(state.places.home && state.places.office);
  const wanted = state.phase !== 'loading' && state.phase !== 'interrupted' && !state.placesPromptNeverAsk && !state.placesPromptSnoozed && !bothSet;

  // Once shown it stays up until the user closes it, so they can see the second address land.
  useEffect(() => {
    // `wanted` comes from the controller, which only exists after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted) setOpen(true);
  }, [wanted]);

  if (!open) return null;

  function close() {
    if (neverAsk && !bothSet) void commute.setPlacesPromptNeverAsk(true);
    commute.snoozePlacesPrompt();
    setOpen(false);
  }

  return (
    <div className={styles.dialogBackdrop} onClick={close}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="places-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHandle} aria-hidden />
        <h2 id="places-title" className={styles.dialogTitle}>Where do you commute?</h2>
        <p className={styles.cardText}>
          Add your Home and Office addresses so every trip is labelled &ldquo;to work&rdquo; or &ldquo;to home&rdquo;. They stay on this phone.
        </p>

        <div className={styles.dialogBody}>
          <AddressPicker kind="home" />
          <AddressPicker kind="office" />
        </div>

        {!bothSet && (
          <label className={styles.checkRow}>
            <input type="checkbox" checked={neverAsk} onChange={(e) => setNeverAsk(e.target.checked)} />
            <span>Don&apos;t ask me again</span>
          </label>
        )}

        <button className={bothSet ? 'btn-primary' : styles.secondaryButton} style={bothSet ? undefined : { marginTop: 0 }} onClick={close}>
          {bothSet ? 'Done' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
