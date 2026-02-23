import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllEntries, getEntriesForYear, deleteEntry } from '../../lib/database';
import { PoopEntry } from '../../lib/types';
import { getHealthFeedback, getMostCommonBristolType, getMostCommonColor } from '../../lib/health';
import { POOP_COLORS } from '../../constants/colors';
import { BRISTOL_TYPES } from '../../constants/bristol';
import { Colors, Radius, Shadow } from '../../constants/theme';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export default function StatsScreen() {
  const [allEntries, setAllEntries] = useState<PoopEntry[]>([]);
  const [yearEntries, setYearEntries] = useState<PoopEntry[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function reload() {
    const all = getAllEntries();
    setAllEntries(all);
    setYearEntries(getEntriesForYear(calYear));
  }

  useFocusEffect(useCallback(() => { reload(); }, [calYear]));

  const feedback = getHealthFeedback(allEntries);
  const topBristol = getMostCommonBristolType(yearEntries);
  const topColor = getMostCommonColor(yearEntries);
  const topColorInfo = POOP_COLORS.find((c) => c.key === topColor);

  // Group entries by date string YYYY-MM-DD
  const entriesByDay: Record<string, PoopEntry[]> = {};
  for (const e of allEntries) {
    const day = e.timestamp.slice(0, 10);
    if (!entriesByDay[day]) entriesByDay[day] = [];
    entriesByDay[day].push(e);
  }

  // Calendar helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1);
  // getDay(): 0=Sun, 1=Mon... convert to Mon-first: Mon=0..Sun=6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  function changeMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDay(null);
    setYearEntries(getEntriesForYear(y));
  }

  function handleDeleteEntry(entry: PoopEntry) {
    Alert.alert('Delete entry', 'Remove this log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEntry(entry.id);
          reload();
          const key = entry.timestamp.slice(0, 10);
          if (entriesByDay[key]?.length <= 1) setSelectedDay(null);
        },
      },
    ]);
  }

  const selectedDayEntries = selectedDay ? (entriesByDay[selectedDay] ?? []) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Health Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>Health Score</Text>
            <Text style={styles.scoreValue}>{feedback.score}<Text style={styles.scoreMax}>/100</Text></Text>
            <Text style={styles.scoreSummary}>{feedback.summary}</Text>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>{feedback.score}</Text>
          </View>
        </View>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreBarFill, { width: `${feedback.score}%` as any }]} />
        </View>
      </View>

      {/* Tips */}
      {feedback.tips.length > 0 && (
        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>Tips</Text>
          {feedback.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Calendar */}
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calNavBtn}>
            <Text style={styles.calNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calTitle}>{MONTHS[calMonth]} {calYear}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calNavBtn}>
            <Text style={styles.calNavText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.calWeekRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={styles.calWeekDay}>{d}</Text>
          ))}
        </View>

        {/* Day cells */}
        <View style={styles.calGrid}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - startOffset + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return <View key={i} style={styles.calCell} />;
            }
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEntries = entriesByDay[dateStr] ?? [];
            const isSelected = selectedDay === dateStr;
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            return (
              <TouchableOpacity
                key={i}
                style={[styles.calCell, isSelected && styles.calCellSelected, isToday && styles.calCellToday]}
                onPress={() => setSelectedDay(isSelected ? null : dateStr)}
                activeOpacity={0.7}
              >
                <Text style={[styles.calDayNum, isSelected && styles.calDayNumSelected, isToday && styles.calDayNumToday]}>
                  {dayNum}
                </Text>
                {dayEntries.length > 0 && (
                  <View style={styles.calDots}>
                    {dayEntries.slice(0, 3).map((e, di) => {
                      const hex = POOP_COLORS.find((c) => c.key === e.color)?.hex ?? Colors.primary;
                      return <View key={di} style={[styles.calDot, { backgroundColor: hex }]} />;
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day entries */}
        {selectedDay && (
          <View style={styles.selectedDaySection}>
            <Text style={styles.selectedDayTitle}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {selectedDayEntries.length === 0 ? (
              <Text style={styles.noDayEntries}>No logs this day.</Text>
            ) : (
              selectedDayEntries.map((e) => {
                const bristol = BRISTOL_TYPES.find((b) => b.type === e.bristolType);
                const color = POOP_COLORS.find((c) => c.key === e.color);
                return (
                  <View key={e.id} style={styles.dayEntry}>
                    <View style={[styles.dayEntryDot, { backgroundColor: color?.hex ?? Colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayEntryTime}>
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.dayEntryDetail}>
                        {bristol?.emoji} {bristol?.label} · {color?.label}
                      </Text>
                      {e.notes ? <Text style={styles.dayEntryNotes}>{e.notes}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteEntry(e)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>

      {/* Year recap stats */}
      <Text style={styles.sectionTitle}>{calYear} Overview</Text>
      <View style={styles.recapRow}>
        <View style={styles.recapCard}>
          <Text style={styles.recapValue}>{yearEntries.length}</Text>
          <Text style={styles.recapLabel}>Total poops</Text>
        </View>
        {topBristol && (
          <View style={styles.recapCard}>
            <Text style={styles.recapEmoji}>{topBristol.emoji}</Text>
            <Text style={styles.recapLabel}>Top shape</Text>
            <Text style={styles.recapSub}>{topBristol.label}</Text>
          </View>
        )}
        {topColorInfo && (
          <View style={styles.recapCard}>
            <View style={[styles.colorDot, { backgroundColor: topColorInfo.hex }]} />
            <Text style={styles.recapLabel}>Top color</Text>
            <Text style={styles.recapSub}>{topColorInfo.label}</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 48 },

  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.card,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scoreLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  scoreValue: { fontSize: 48, fontWeight: '800', color: Colors.primary, lineHeight: 56 },
  scoreMax: { fontSize: 20, fontWeight: '500', color: Colors.textMuted },
  scoreSummary: { fontSize: 13, color: Colors.textSub, marginTop: 2, maxWidth: 200 },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  scoreCircleText: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  scoreBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  scoreBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    marginTop: 16,
    ...Shadow.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  tipRow: { flexDirection: 'row', marginBottom: 8 },
  tipDot: { color: Colors.primary, fontWeight: '700', marginRight: 8, fontSize: 16 },
  tipText: { flex: 1, color: Colors.textSub, fontSize: 14, lineHeight: 20 },

  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginTop: 16,
    ...Shadow.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calNavBtn: { padding: 8 },
  calNavText: { fontSize: 26, color: Colors.primary, fontWeight: '600' },
  calTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  calWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    padding: 2,
  },
  calCellSelected: { backgroundColor: Colors.primary },
  calCellToday: { backgroundColor: Colors.surfaceAlt },
  calDayNum: { fontSize: 13, fontWeight: '600', color: Colors.text },
  calDayNumSelected: { color: '#fff' },
  calDayNumToday: { color: Colors.primary },
  calDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  calDot: { width: 5, height: 5, borderRadius: 3 },

  selectedDaySection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  noDayEntries: { color: Colors.textMuted, fontSize: 13 },
  dayEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 10,
  },
  dayEntryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dayEntryTime: { fontSize: 12, color: Colors.textMuted },
  dayEntryDetail: { fontSize: 14, color: Colors.text, marginTop: 2, fontWeight: '500' },
  dayEntryNotes: { fontSize: 12, color: Colors.textSub, fontStyle: 'italic', marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 18 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  recapRow: { flexDirection: 'row', gap: 10 },
  recapCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    ...Shadow.sm,
  },
  recapValue: { fontSize: 30, fontWeight: '800', color: Colors.primary },
  recapEmoji: { fontSize: 28 },
  recapLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  recapSub: { fontSize: 12, color: Colors.textSub, fontWeight: '600', marginTop: 2 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
});
