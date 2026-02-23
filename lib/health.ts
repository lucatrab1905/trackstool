import { PoopEntry, PoopColor } from './types';
import { BRISTOL_TYPES } from '../constants/bristol';

export interface HealthFeedback {
  score: number; // 0–100
  summary: string;
  tips: string[];
}

export function getHealthFeedback(entries: PoopEntry[]): HealthFeedback {
  if (entries.length === 0) {
    return {
      score: 50,
      summary: 'No data yet. Start logging to get feedback!',
      tips: ['Log your first entry to begin tracking your health.'],
    };
  }

  const tips: string[] = [];
  let score = 100;

  // ── Bristol type analysis ──────────────────────────────────────────────────
  const typeCounts: Record<number, number> = {};
  for (const e of entries) {
    typeCounts[e.bristolType] = (typeCounts[e.bristolType] || 0) + 1;
  }
  const dominantType = Object.entries(typeCounts).sort(
    ([, a], [, b]) => b - a
  )[0];
  const dominantTypeNum = Number(dominantType[0]);

  if (dominantTypeNum === 1 || dominantTypeNum === 2) {
    score -= 25;
    tips.push('You are often constipated. Drink more water and eat more fiber.');
  } else if (dominantTypeNum === 6 || dominantTypeNum === 7) {
    score -= 25;
    tips.push(
      'You often have diarrhea. Consider your diet and stress levels. If it persists, see a doctor.'
    );
  } else if (dominantTypeNum === 4 || dominantTypeNum === 3) {
    tips.push('Your stool consistency looks healthy. Keep it up!');
  }

  // ── Color analysis ────────────────────────────────────────────────────────
  const colorCounts: Record<PoopColor, number> = {} as any;
  for (const e of entries) {
    colorCounts[e.color] = (colorCounts[e.color] || 0) + 1;
  }

  if ((colorCounts['black'] || 0) > 0) {
    score -= 30;
    tips.push(
      'Black stool detected. This may indicate bleeding — consider seeing a doctor.'
    );
  }
  if ((colorCounts['red'] || 0) > 0) {
    score -= 30;
    tips.push(
      'Red stool detected. This may indicate bleeding — consider seeing a doctor.'
    );
  }
  if ((colorCounts['pale'] || 0) > entries.length * 0.3) {
    score -= 20;
    tips.push(
      'Frequent pale stool may indicate a liver or bile duct issue. See a doctor if it continues.'
    );
  }
  if ((colorCounts['yellow'] || 0) > entries.length * 0.3) {
    score -= 15;
    tips.push('Frequent yellow stool may indicate excess fat or an infection.');
  }

  // ── Frequency analysis ────────────────────────────────────────────────────
  const daysSpanned = getDaysSpanned(entries);
  const frequency = entries.length / Math.max(daysSpanned, 1);

  if (frequency < 0.5) {
    score -= 15;
    tips.push('You are going less than once every 2 days. Consider more fiber and water.');
  } else if (frequency > 3) {
    score -= 10;
    tips.push('You are going more than 3 times a day. Monitor if this is chronic.');
  } else {
    tips.push('Your frequency (1–3 times/day) is within a healthy range.');
  }

  const clampedScore = Math.max(0, Math.min(100, score));

  let summary = '';
  if (clampedScore >= 80) summary = 'Your gut health looks great!';
  else if (clampedScore >= 60) summary = 'Your gut health is decent, with some things to watch.';
  else if (clampedScore >= 40) summary = 'Your gut health needs some attention.';
  else summary = 'Your gut health needs improvement. Consider seeing a doctor.';

  return { score: clampedScore, summary, tips };
}

function getDaysSpanned(entries: PoopEntry[]): number {
  if (entries.length < 2) return 1;
  const dates = entries.map((e) => new Date(e.timestamp).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

export function getMostCommonBristolType(
  entries: PoopEntry[]
): (typeof BRISTOL_TYPES)[number] | null {
  if (!entries.length) return null;
  const counts: Record<number, number> = {};
  for (const e of entries) counts[e.bristolType] = (counts[e.bristolType] || 0) + 1;
  const top = Number(Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0]);
  return BRISTOL_TYPES.find((b) => b.type === top) ?? null;
}

export function getMostCommonColor(entries: PoopEntry[]): PoopColor | null {
  if (!entries.length) return null;
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.color] = (counts[e.color] || 0) + 1;
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0] as PoopColor;
}
