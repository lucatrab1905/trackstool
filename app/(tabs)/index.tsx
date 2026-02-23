import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { addPoopEntry, getAllSavedLocations } from '../../lib/database';
import { PoopColor, SavedLocation } from '../../lib/types';
import { BRISTOL_TYPES } from '../../constants/bristol';
import { POOP_COLORS } from '../../constants/colors';
import { Colors, Radius, Shadow } from '../../constants/theme';

export default function LogScreen() {
  const [selectedType, setSelectedType] = useState<number>(4);
  const [selectedColor, setSelectedColor] = useState<PoopColor>('brown');
  const [notes, setNotes] = useState('');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [useGps, setUseGps] = useState(true);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    setSavedLocations(getAllSavedLocations());
  }, []));

  function handleRefresh() {
    setRefreshing(true);
    setSavedLocations(getAllSavedLocations());
    setRefreshing(false);
  }

  async function handleLog() {
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (useGps && selectedLocationId === null) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } else if (selectedLocationId !== null) {
      const loc = savedLocations.find((l) => l.id === selectedLocationId);
      if (loc) { latitude = loc.latitude; longitude = loc.longitude; }
    }

    addPoopEntry({
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      savedLocationId: selectedLocationId,
      bristolType: selectedType as any,
      color: selectedColor,
      notes,
    });

    Alert.alert('Logged! 💩', 'Your poop has been recorded.', [{ text: 'OK' }]);
    setNotes('');
  }

  const selectedColorInfo = POOP_COLORS.find((c) => c.key === selectedColor);
  const selectedBristol = BRISTOL_TYPES.find((b) => b.type === selectedType);
  const selectedLocationName = selectedLocationId !== null
    ? savedLocations.find((l) => l.id === selectedLocationId)?.name
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
      }
    >

      {/* Bristol Type */}
      <Text style={styles.sectionTitle}>Shape</Text>
      <Text style={styles.sectionSub}>Bristol Stool Scale</Text>
      <View style={styles.bristolGrid}>
        {BRISTOL_TYPES.map((bt) => {
          const selected = selectedType === bt.type;
          return (
            <TouchableOpacity
              key={bt.type}
              style={[styles.bristolCard, selected && styles.bristolCardSelected]}
              onPress={() => setSelectedType(bt.type)}
              activeOpacity={0.75}
            >
              <Text style={styles.bristolEmoji}>{bt.emoji}</Text>
              <Text style={[styles.bristolLabel, selected && styles.bristolLabelSelected]}>
                {bt.label}
              </Text>
              <Text style={styles.bristolDesc}>{bt.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedBristol && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{selectedBristol.emoji} {selectedBristol.health}</Text>
        </View>
      )}

      {/* Color */}
      <Text style={styles.sectionTitle}>Color</Text>
      <View style={styles.colorGrid}>
        {POOP_COLORS.map((c) => {
          const selected = selectedColor === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setSelectedColor(c.key)}
              style={[styles.colorItem, selected && styles.colorItemSelected]}
              activeOpacity={0.75}
            >
              <View style={[styles.colorSwatch, { backgroundColor: c.hex }]} />
              <Text style={[styles.colorItemLabel, selected && styles.colorItemLabelSelected]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedColorInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>💡 {selectedColorInfo.health}</Text>
        </View>
      )}

      {/* Location */}
      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.locationRow}>
        <TouchableOpacity
          style={[styles.locationBtn, useGps && selectedLocationId === null && styles.locationBtnActive]}
          onPress={() => { setUseGps(true); setSelectedLocationId(null); }}
          activeOpacity={0.75}
        >
          <Text style={styles.locationBtnIcon}>📡</Text>
          <Text style={[styles.locationBtnText, useGps && selectedLocationId === null && styles.locationBtnTextActive]}>
            GPS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locationBtn, !useGps && selectedLocationId === null && styles.locationBtnActive]}
          onPress={() => { setUseGps(false); setSelectedLocationId(null); }}
          activeOpacity={0.75}
        >
          <Text style={styles.locationBtnIcon}>🚫</Text>
          <Text style={[styles.locationBtnText, !useGps && selectedLocationId === null && styles.locationBtnTextActive]}>
            None
          </Text>
        </TouchableOpacity>

        {savedLocations.length > 0 && (
          <TouchableOpacity
            style={[styles.locationBtn, selectedLocationId !== null && styles.locationBtnActive]}
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.locationBtnIcon}>📍</Text>
            <Text style={[styles.locationBtnText, selectedLocationId !== null && styles.locationBtnTextActive]}>
              {selectedLocationName ?? 'Saved'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      <Text style={styles.sectionTitle}>Notes</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any notes... (optional)"
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={3}
      />

      {/* Log Button */}
      <TouchableOpacity style={styles.logBtn} onPress={handleLog} activeOpacity={0.85}>
        <Text style={styles.logBtnText}>Log it 💩</Text>
      </TouchableOpacity>

      {/* Location Picker Modal */}
      <Modal visible={locationModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pick a saved place</Text>
            {savedLocations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedLocationId(loc.id);
                  setUseGps(false);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>📍  {loc.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLocationModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 48 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },

  bristolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  bristolCard: {
    width: '30%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  bristolCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FDF0E6',
  },
  bristolEmoji: { fontSize: 28 },
  bristolLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    color: Colors.textSub,
  },
  bristolLabelSelected: { color: Colors.primary },
  bristolDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 14,
  },

  infoBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 10,
  },
  infoText: { fontSize: 13, color: Colors.textSub },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  colorItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FDF0E6',
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  colorItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSub,
  },
  colorItemLabelSelected: { color: Colors.primary },

  locationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  locationBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FDF0E6',
  },
  locationBtnIcon: { fontSize: 15 },
  locationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSub,
  },
  locationBtnTextActive: { color: Colors.primary },

  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    minHeight: 80,
    marginTop: 10,
  },

  logBtn: {
    marginTop: 32,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadow.card,
  },
  logBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  modalCancelBtn: {
    marginTop: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.textSub, fontSize: 15, fontWeight: '600' },
});
