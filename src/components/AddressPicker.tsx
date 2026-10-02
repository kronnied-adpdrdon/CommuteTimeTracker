'use client';

import { FormEvent, useState } from 'react';
import styles from '@/app/page.module.css';
import { DirectionIcon } from '@/components/TripRow';
import { CURRENT_LOCATION_LABEL } from '@/lib/commute/controller';
import { commute, useCommute } from '@/lib/commute';
import { AddressResult, AddressSearchError, MIN_QUERY_LENGTH, searchAddress } from '@/lib/places/geocoder';
import { PlaceKind } from '@/lib/trips/edit';

const LABELS: Record<PlaceKind, string> = { home: 'Home', office: 'Office' };

const PLACEHOLDERS: Record<PlaceKind, string> = {
  home: 'Search your home address',
  office: 'Search your office address',
};

type SearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'results'; results: AddressResult[] }
  | { status: 'error'; message: string };

/**
 * Sets Home or Office by typing an address. The text is only sent to the address service when the user
 * presses Search, then they pick the right match. "Use current location" is a secondary shortcut.
 */
export default function AddressPicker({ kind }: { kind: PlaceKind }) {
  const state = useCommute();
  const place = state.places[kind];
  const label = LABELS[kind];
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ status: 'idle' });
  const [editing, setEditing] = useState(false);
  const busy = state.locating !== null || state.phase === 'loading';
  const showSearch = !place || editing;

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSearch({ status: 'error', message: 'Type at least 3 characters of the address.' });
      return;
    }
    setSearch({ status: 'searching' });
    try {
      setSearch({ status: 'results', results: await searchAddress(query) });
    } catch (error) {
      setSearch({ status: 'error', message: error instanceof AddressSearchError ? error.message : 'Address search failed. Try again.' });
    }
  }

  async function choose(result: AddressResult) {
    await commute.setPlace(kind, { lat: result.lat, lng: result.lng }, result.label);
    setSearch({ status: 'idle' });
    setQuery('');
    setEditing(false);
  }

  return (
    <div className={styles.placeCard}>
      <div className={styles.placeHeader}>
        <div className={styles.tripIcon}>
          <DirectionIcon direction={kind === 'home' ? 'home' : 'work'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.tripTitle}>{label}</div>
          <div className={`${styles.placeStatus} ${place ? styles.placeStatusSet : ''} ${styles.placeAddress}`}>
            {place ? `✓ ${place.label ?? CURRENT_LOCATION_LABEL}` : 'Not set'}
          </div>
        </div>
        {place && (
          <>
            <button className={styles.linkButton} disabled={busy} onClick={() => setEditing((e) => !e)}>
              {editing ? 'Close' : 'Change'}
            </button>
            <button aria-label={`Clear ${label}`} className={`${styles.iconButton} ${styles.iconButtonDanger}`} disabled={busy} onClick={() => commute.setPlace(kind, null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
            </button>
          </>
        )}
      </div>

      {showSearch && (
        <>
          <form className={styles.searchRow} onSubmit={runSearch}>
            <input
              className={`input-field ${styles.searchInput}`}
              type="search"
              enterKeyHint="search"
              autoComplete="street-address"
              placeholder={PLACEHOLDERS[kind]}
              aria-label={`${label} address`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className={`${styles.pillButton} ${styles.pillButtonPrimary} ${styles.searchButton}`} disabled={search.status === 'searching'}>
              {search.status === 'searching' ? '…' : 'Search'}
            </button>
          </form>

          {search.status === 'error' && <p className={styles.fieldError} role="alert">{search.message}</p>}

          {search.status === 'results' && (
            <ul className={styles.resultList} aria-label="Matching addresses">
              {search.results.length === 0 && <li className={styles.resultEmpty}>No match. Try adding the area or city.</li>}
              {search.results.map((result, i) => (
                <li key={`${result.lat},${result.lng},${i}`}>
                  <button type="button" className={styles.resultItem} onClick={() => choose(result)}>
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className={styles.linkButton} style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => commute.setPlaceHere(kind)}>
            {state.locating === kind ? 'Finding your location…' : 'Or use my current location'}
          </button>
        </>
      )}
    </div>
  );
}
