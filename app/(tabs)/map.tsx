import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { getAllEntries } from '../../lib/database';
import { PoopEntry } from '../../lib/types';
import { POOP_COLORS } from '../../constants/colors';
import { BRISTOL_TYPES } from '../../constants/bristol';
import { Colors, Shadow, Radius } from '../../constants/theme';

const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function MapScreen() {
  const [entries, setEntries] = useState<PoopEntry[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
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
          return (
            <Marker
              key={group.key}
              coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            >
              <View style={[styles.markerBubble, { backgroundColor: colorHex }]}>
                <Text style={styles.markerCount}>{group.entries.length}</Text>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    💩 {group.entries.length} time{group.entries.length > 1 ? 's' : ''}
                  </Text>
                  {group.entries.slice(0, 3).map((e) => (
                    <Text key={e.id} style={styles.calloutRow}>
                      {BRISTOL_TYPES.find((b) => b.type === e.bristolType)?.emoji}{' '}
                      {POOP_COLORS.find((c) => c.key === e.color)?.label} — {new Date(e.timestamp).toLocaleDateString()}
                    </Text>
                  ))}
                  {group.entries.length > 3 && (
                    <Text style={styles.calloutMore}>+{group.entries.length - 3} more</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <TouchableOpacity style={styles.locateBtn} onPress={goToCurrentLocation} activeOpacity={0.85}>
        <Text style={styles.locateBtnText}>📍</Text>
      </TouchableOpacity>
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
  markerCount: { color: '#fff', fontWeight: '800', fontSize: 13 },
  callout: { minWidth: 180, padding: 10 },
  calloutTitle: { fontWeight: '700', fontSize: 14, marginBottom: 8, color: Colors.text },
  calloutRow: { fontSize: 12, color: Colors.textSub, marginBottom: 3 },
  calloutMore: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
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
});
