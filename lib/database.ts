import AsyncStorage from '@react-native-async-storage/async-storage';
import { PoopEntry, SavedLocation } from './types';

const ENTRIES_KEY = 'poop_entries';
const LOCATIONS_KEY = 'saved_locations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadEntries(): Promise<PoopEntry[]> {
  const json = await AsyncStorage.getItem(ENTRIES_KEY);
  return json ? JSON.parse(json) : [];
}

async function saveEntries(entries: PoopEntry[]): Promise<void> {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

async function loadLocations(): Promise<SavedLocation[]> {
  const json = await AsyncStorage.getItem(LOCATIONS_KEY);
  return json ? JSON.parse(json) : [];
}

async function saveLocations(locations: SavedLocation[]): Promise<void> {
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

// ─── Poop Entries ─────────────────────────────────────────────────────────────

export async function addPoopEntry(entry: Omit<PoopEntry, 'id'>): Promise<PoopEntry> {
  const entries = await loadEntries();
  const id = entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1;
  const newEntry: PoopEntry = { ...entry, id };
  await saveEntries([...entries, newEntry]);
  return newEntry;
}

export async function getAllEntries(): Promise<PoopEntry[]> {
  const entries = await loadEntries();
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getEntriesForYear(year: number): Promise<PoopEntry[]> {
  const entries = await loadEntries();
  return entries
    .filter(e => e.timestamp.startsWith(`${year}-`))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function deleteEntry(id: number): Promise<void> {
  const entries = await loadEntries();
  await saveEntries(entries.filter(e => e.id !== id));
}

// ─── Saved Locations ──────────────────────────────────────────────────────────

export async function addSavedLocation(loc: Omit<SavedLocation, 'id'>): Promise<SavedLocation> {
  const locations = await loadLocations();
  const id = locations.length > 0 ? Math.max(...locations.map(l => l.id)) + 1 : 1;
  const newLoc: SavedLocation = { ...loc, id };
  await saveLocations([...locations, newLoc]);
  return newLoc;
}

export async function getAllSavedLocations(): Promise<SavedLocation[]> {
  const locations = await loadLocations();
  return locations.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteSavedLocation(id: number): Promise<void> {
  const locations = await loadLocations();
  await saveLocations(locations.filter(l => l.id !== id));
}
