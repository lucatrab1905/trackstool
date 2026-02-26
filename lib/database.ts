import { MMKV } from 'react-native-mmkv';
import { PoopEntry, SavedLocation } from './types';

const storage = new MMKV();
const ENTRIES_KEY = 'poop_entries';
const LOCATIONS_KEY = 'saved_locations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadEntries(): PoopEntry[] {
  const json = storage.getString(ENTRIES_KEY);
  return json ? JSON.parse(json) : [];
}

function saveEntries(entries: PoopEntry[]): void {
  storage.set(ENTRIES_KEY, JSON.stringify(entries));
}

function loadLocations(): SavedLocation[] {
  const json = storage.getString(LOCATIONS_KEY);
  return json ? JSON.parse(json) : [];
}

function saveLocations(locations: SavedLocation[]): void {
  storage.set(LOCATIONS_KEY, JSON.stringify(locations));
}

// ─── Poop Entries ─────────────────────────────────────────────────────────────

export function addPoopEntry(entry: Omit<PoopEntry, 'id'>): PoopEntry {
  const entries = loadEntries();
  const id = entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1;
  const newEntry: PoopEntry = { ...entry, id };
  saveEntries([...entries, newEntry]);
  return newEntry;
}

export function getAllEntries(): PoopEntry[] {
  return loadEntries().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getEntriesForYear(year: number): PoopEntry[] {
  return loadEntries()
    .filter(e => e.timestamp.startsWith(`${year}-`))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function deleteEntry(id: number): void {
  saveEntries(loadEntries().filter(e => e.id !== id));
}

// ─── Saved Locations ──────────────────────────────────────────────────────────

export function addSavedLocation(loc: Omit<SavedLocation, 'id'>): SavedLocation {
  const locations = loadLocations();
  const id = locations.length > 0 ? Math.max(...locations.map(l => l.id)) + 1 : 1;
  const newLoc: SavedLocation = { ...loc, id };
  saveLocations([...locations, newLoc]);
  return newLoc;
}

export function getAllSavedLocations(): SavedLocation[] {
  return loadLocations().sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteSavedLocation(id: number): void {
  saveLocations(loadLocations().filter(l => l.id !== id));
}
