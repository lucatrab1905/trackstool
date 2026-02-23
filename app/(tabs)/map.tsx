import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { getAllEntries, getAllSavedLocations } from '../../lib/database';
import { PoopEntry, SavedLocation } from '../../lib/types';
import { getMostCommonBristolType, getMostCommonColor } from '../../lib/health';
import { POOP_COLORS } from '../../constants/colors';
import { BRISTOL_TYPES } from '../../constants/bristol';
import { Colors, Shadow, Radius } from '../../constants/theme';

const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
type MarkerGroup = ReturnType<typeof groupByCoords>[number];

export default function MapScreen() {
  const [entries, setEntries] = useState<PoopEntry[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MarkerGroup | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const all = getAllEntries().filter((e) => e.latitude !== null && e.longitude !== null);
      setEntries(all);
      setSavedLocations(getAllSavedLocations());
    }, [])
  );

  function goToCurrentLocation() {
    if (!currentLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...currentLocation, ...DEFAULT_DELTA }, 800);
  }

  const grouped = groupByCoords(entries);
  const initialRegion = currentLocation
    ? { ...currentLocation, ...DEFAULT_DELTA }
    : { latitude: 41.9, longitude: 12.5, ...DEFAULT_DELTA };

  // Pre-compute stats for selected group
  const selSavedLocId = selectedGroup?.entries.find(e => e.savedLocationId)?.savedLocationId;
  const selLocationName = selSavedLocId ? savedLocations.find(l => l.id === selSavedLocId)?.name : null;
  const selTopBristol = selectedGroup ? getMostCommonBristolType(selectedGroup.entries) : null;
  const selTopColorKey = selectedGroup ? getMostCommonColor(selectedGroup.entries) : null;
  const selTopColorInfo = POOP_COLORS.find(c => c.key === selTopColorKey);
  const selTimestamps = selectedGroup?.entries.map(e => new Date(e.timestamp).getTime()) ?? [];
  const selFirstDate = selTimestamps.length ? new Date(Math.min(...selTimestamps)) : null;
  const selLastDate = selTimestamps.length ? new Date(Math.max(...selTimestamps)) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Map is not available on web.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {grouped.map((group) => {
          const colorHex = POOP_COLORS.find((c) => c.key === group.entries[0].color)?.hex ?? Colors.primary;
          const isSelected = selectedGroup?.key === group.key;
          return (
            <Marker
              key={group.key}
              coordinate={{ latitude: group.latitude, longitude: group.longitude }}
              onPress={() => setSelectedGroup(isSelected ? null : group)}
            >
              <View style={[styles.markerBubble, { backgroundColor: colorHex }, isSelected && styles.markerBubbleSelected]}>
                <Text style={styles.markerCount}>{group.entries.length}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Locate me */}
      <TouchableOpacity style={styles.locateBtn} onPress={goToCurrentLocation} activeOpacity={0.85}>
        <Text style={styles.locateBtnText}>📍</Text>
      </TouchableOpacity>

      {/* Burger menu button */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.85}>
        <Text style={styles.menuBtnText}>☰</Text>
      </TouchableOpacity>

      {/* Stats panel */}
      {selectedGroup && (
        <View style={styles.statsPanel}>
          <View style={styles.statsPanelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statsPanelTitle} numberOfLines={1}>
                {selLocationName ?? `${selectedGroup.latitude.toFixed(4)}, ${selectedGroup.longitude.toFixed(4)}`}
              </Text>
              <Text style={styles.statsPanelSub}>
                {selectedGroup.entries.length} visit{selectedGroup.entries.length !== 1 ? 's' : ''}
                {selFirstDate && selLastDate
                  ? selFirstDate.toDateString() === selLastDate.toDateString()
                    ? ` · ${selFirstDate.toLocaleDateString()}`
                    : ` · ${selFirstDate.toLocaleDateString()} – ${selLastDate.toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.statsPanelCloseBtn}>
              <Text style={styles.statsPanelCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsPanelCards}>
            {selTopBristol && (
              <View style={styles.statsPanelCard}>
                <Text style={styles.statsPanelCardEmoji}>{selTopBristol.emoji}</Text>
                <Text style={styles.statsPanelCardLabel}>Top shape</Text>
                <Text style={styles.statsPanelCardSub}>{selTopBristol.label}</Text>
              </View>
            )}
            {selTopColorInfo && (
              <View style={styles.statsPanelCard}>
                <View style={[styles.statsPanelColorDot, { backgroundColor: selTopColorInfo.hex }]} />
                <Text style={styles.statsPanelCardLabel}>Top color</Text>
                <Text style={styles.statsPanelCardSub}>{selTopColorInfo.label}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.statsPanelEntries} showsVerticalScrollIndicator={false}>
            {selectedGroup.entries.slice(0, 5).map(e => {
              const bristol = BRISTOL_TYPES.find(b => b.type === e.bristolType);
              const color = POOP_COLORS.find(c => c.key === e.color);
              return (
                <View key={e.id} style={styles.statsPanelEntry}>
                  <View style={[styles.statsPanelEntryDot, { backgroundColor: color?.hex ?? Colors.primary }]} />
                  <View>
                    <Text style={styles.statsPanelEntryMain}>{bristol?.emoji} {bristol?.label} · {color?.label}</Text>
                    <Text style={styles.statsPanelEntryDate}>
                      {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Burger menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuContainer}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>Saved Places</Text>
            <ScrollView>
              {savedLocations.length === 0 ? (
                <Text style={styles.menuEmpty}>No saved places yet.</Text>
              ) : (
                savedLocations.map(loc => (
                  <TouchableOpacity
                    key={loc.id}
                    style={styles.menuItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      mapRef.current?.animateToRegion(
                        { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
                        600
                      );
                      setMenuVisible(false);
                    }}
                  >
                    <Text style={styles.menuItemIcon}>📍</Text>
                    <Text style={styles.menuItemText}>{loc.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

function groupByCoords(entries: PoopEntry[]) {
  const map = new Map<string, { key: string; latitude: number; longitude: number; entries: PoopEntry[] }>();
  for (const e of entries) {
    if (e.latitude === null || e.longitude === null) continue;
    const key = `${e.latitude.toFixed(4)},${e.longitude.toFixed(4)}`;
    if (!map.has(key)) map.set(key, { key, latitude: e.latitude, longitude: e.longitude, entries: [] });
    map.get(key)!.entries.push(e);
  }
  return Array.from(map.values());
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Shadow.card,
  },
  markerBubbleSelected: {
    borderColor: Colors.primaryDark,
    borderWidth: 3.5,
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  markerCount: { color: '#fff', fontWeight: '800', fontSize: 13 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.bg },
  fallbackText: { textAlign: 'center', color: Colors.textSub, fontSize: 15 },
  locateBtn: {
    position: 'absolute',
    bottom: 36,
    right: 20,
    backgroundColor: Colors.surface,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  locateBtnText: { fontSize: 26 },
  menuBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: Colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  menuBtnText: { fontSize: 22 },
  menuContainer: { flex: 1, flexDirection: 'row' },
  menuPanel: {
    width: 260,
    backgroundColor: Colors.surface,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  menuTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { fontSize: 15, color: Colors.text, fontWeight: '500', flex: 1 },
  menuEmpty: { color: Colors.textMuted, fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  statsPanel: {
    position: 'absolute',
    bottom: 108,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    ...Shadow.card,
  },
  statsPanelHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  statsPanelTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statsPanelSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statsPanelCloseBtn: { padding: 4, marginLeft: 8 },
  statsPanelCloseText: { fontSize: 16, color: Colors.textMuted },
  statsPanelCards: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statsPanelCard: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
  },
  statsPanelCardEmoji: { fontSize: 24 },
  statsPanelCardLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  statsPanelCardSub: { fontSize: 11, color: Colors.textSub, fontWeight: '600', marginTop: 2 },
  statsPanelColorDot: { width: 28, height: 28, borderRadius: 14 },
  statsPanelEntries: { maxHeight: 120 },
  statsPanelEntry: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  statsPanelEntryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statsPanelEntryMain: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  statsPanelEntryDate: { fontSize: 11, color: Colors.textMuted },
});
