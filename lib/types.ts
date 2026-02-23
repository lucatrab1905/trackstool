export interface PoopEntry {
  id: number;
  timestamp: string; // ISO string
  latitude: number | null;
  longitude: number | null;
  savedLocationId: number | null;
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  color: PoopColor;
  notes: string;
}

export interface SavedLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export type PoopColor =
  | 'brown'
  | 'dark_brown'
  | 'black'
  | 'green'
  | 'yellow'
  | 'red'
  | 'pale';
