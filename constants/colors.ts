import { PoopColor } from '../lib/types';

export const POOP_COLORS: {
  key: PoopColor;
  label: string;
  hex: string;
  health: string;
}[] = [
  {
    key: 'brown',
    label: 'Brown',
    hex: '#8B4513',
    health: 'Normal and healthy',
  },
  {
    key: 'dark_brown',
    label: 'Dark Brown',
    hex: '#3B1A08',
    health: 'Could indicate dehydration',
  },
  {
    key: 'black',
    label: 'Black',
    hex: '#1A1A1A',
    health: 'See a doctor — may indicate bleeding',
  },
  {
    key: 'green',
    label: 'Green',
    hex: '#4CAF50',
    health: 'Fast transit or high vegetable diet',
  },
  {
    key: 'yellow',
    label: 'Yellow',
    hex: '#FFC107',
    health: 'Could indicate excess fat or infection',
  },
  {
    key: 'red',
    label: 'Red',
    hex: '#F44336',
    health: 'See a doctor — may indicate bleeding',
  },
  {
    key: 'pale',
    label: 'Pale / Grey',
    hex: '#BDBDBD',
    health: 'Could indicate liver or bile duct issues',
  },
];
