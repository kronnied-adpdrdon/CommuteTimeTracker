import { isNativeApp, lazyPlugin } from '../native';

export interface AddressResult {
  /** The full address as the geocoder wrote it. */
  label: string;
  lat: number;
  lng: number;
}

export type AddressSearchErrorKind = 'too-short' | 'no-network' | 'failed';

export class AddressSearchError extends Error {
  constructor(
    public kind: AddressSearchErrorKind,
    message: string,
  ) {
    super(message);
  }
}

interface GeocoderPlugin {
  search(options: { query: string }): Promise<{ results: AddressResult[]; source: string }>;
}

const plugin = lazyPlugin<GeocoderPlugin>('Geocoder');

export const MIN_QUERY_LENGTH = 3;

/** Looks an address up. On Android this uses the phone's geocoder, then OpenStreetMap; in a browser, OpenStreetMap only. */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const text = query.trim();
  if (text.length < MIN_QUERY_LENGTH) throw new AddressSearchError('too-short', 'Type at least 3 characters.');
  try {
    if (await isNativeApp()) return (await (await plugin()).native.search({ query: text })).results;
    return await searchOpenStreetMap(text);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (error instanceof AddressSearchError) throw error;
    if (code === 'NO_NETWORK') throw new AddressSearchError('no-network', "Couldn't reach the address service. Check your connection.");
    throw new AddressSearchError('failed', 'Address search failed. Try again.');
  }
}

async function searchOpenStreetMap(query: string): Promise<AddressResult[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new AddressSearchError('failed', 'Address search failed.');
  const rows = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((row) => ({ label: row.display_name, lat: Number(row.lat), lng: Number(row.lon) }));
}
