import * as SQLite from 'expo-sqlite';
import { PoopEntry, SavedLocation } from './types';

const db = SQLite.openDatabaseSync('pooptracker.db');

// Initialize immediately when the module is first imported
db.execSync(`
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poop_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      saved_location_id INTEGER,
      bristol_type INTEGER NOT NULL,
      color TEXT NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (saved_location_id) REFERENCES saved_locations(id)
    );
  `);

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poop_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      saved_location_id INTEGER,
      bristol_type INTEGER NOT NULL,
      color TEXT NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (saved_location_id) REFERENCES saved_locations(id)
    );
  `);
}

// ─── Poop Entries ────────────────────────────────────────────────────────────

export function addPoopEntry(
  entry: Omit<PoopEntry, 'id'>
): PoopEntry {
  const result = db.runSync(
    `INSERT INTO poop_entries
      (timestamp, latitude, longitude, saved_location_id, bristol_type, color, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    entry.timestamp,
    entry.latitude,
    entry.longitude,
    entry.savedLocationId,
    entry.bristolType,
    entry.color,
    entry.notes
  );
  return { ...entry, id: result.lastInsertRowId };
}

export function getAllEntries(): PoopEntry[] {
  const rows = db.getAllSync<any>(`SELECT * FROM poop_entries ORDER BY timestamp DESC`);
  return rows.map(rowToEntry);
}

export function getEntriesForYear(year: number): PoopEntry[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM poop_entries WHERE timestamp LIKE ? ORDER BY timestamp ASC`,
    `${year}-%`
  );
  return rows.map(rowToEntry);
}

export function deleteEntry(id: number) {
  db.runSync(`DELETE FROM poop_entries WHERE id = ?`, id);
}

function rowToEntry(row: any): PoopEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    savedLocationId: row.saved_location_id,
    bristolType: row.bristol_type,
    color: row.color,
    notes: row.notes,
  };
}

// ─── Saved Locations ─────────────────────────────────────────────────────────

export function addSavedLocation(
  loc: Omit<SavedLocation, 'id'>
): SavedLocation {
  const result = db.runSync(
    `INSERT INTO saved_locations (name, latitude, longitude) VALUES (?, ?, ?)`,
    loc.name,
    loc.latitude,
    loc.longitude
  );
  return { ...loc, id: result.lastInsertRowId };
}

export function getAllSavedLocations(): SavedLocation[] {
  const rows = db.getAllSync<any>(`SELECT * FROM saved_locations ORDER BY name ASC`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export function deleteSavedLocation(id: number) {
  db.runSync(`DELETE FROM saved_locations WHERE id = ?`, id);
}
