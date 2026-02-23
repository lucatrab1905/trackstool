import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import {
  getAllSavedLocations,
  addSavedLocation,
  deleteSavedLocation,
} from '../../lib/database';
import { SavedLocation } from '../../lib/types';
import { Colors, Radius, Shadow } from '../../constants/theme';

type AddMode = 'gps' | 'search';

interface SearchResult {
  latitude: number;
  longitude: number;
  label: string;
}

export default function LocationsScreen() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('gps');
  const [placeName, setPlaceName] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsResult, setGpsResult] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  useFocusEffect(useCallback(() => { setLocations(getAllSavedLocations()); }, []));

  function resetAddPanel() {
    setAdding(false); setAddMode('gps'); setPlaceName('');
    setGpsResult(null); setSearchQuery(''); setSearchResults([]); setSelectedResult(null);
  }

  async function fetchCurrentLocation() {
    setGpsLoading(true); setGpsResult(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Location permission is required.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const reversed = await Location.reverseGeocodeAsync({ latitude, longitude });
      const r = reversed[0];
      const label = r ? [r.name, r.street, r.city, r.country].filter(Boolean).join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setGpsResult({ latitude, longitude, label });
      if (!placeName) setPlaceName(r?.name ?? '');
    } finally { setGpsLoading(false); }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true); setSearchResults([]); setSelectedResult(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&format=json&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'ja,en', 'User-Agent': 'PoopTracker/1.0' },
      });
      const data: any[] = await response.json();
      if (data.length === 0) { Alert.alert('No results', 'Try a different address.'); return; }
      const mapped: SearchResult[] = data.map((r) => ({
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        label: r.display_name,
      }));
      setSearchResults(mapped);
    } catch {
      Alert.alert('Search failed', 'Could not reach the geocoding service. Check your connection.');
    } finally { setSearchLoading(false); }
  }

  function handleSelectResult(result: SearchResult) {
    setSelectedResult(result);
    if (!placeName) setPlaceName(result.label.split(',')[0]);
  }

  function handleSave() {
    const target = addMode === 'gps' ? gpsResult : selectedResult;
    if (!target) { Alert.alert('No location', addMode === 'gps' ? 'Tap "Get my location" first.' : 'Select a result first.'); return; }
    if (!placeName.trim()) { Alert.alert('Name required', 'Please enter a name for this place.'); return; }
    addSavedLocation({ name: placeName.trim(), latitude: target.latitude, longitude: target.longitude });
    setLocations(getAllSavedLocations());
    resetAddPanel();
  }

  function handleDelete(id: number, name: string) {
    Alert.alert('Delete place', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteSavedLocation(id); setLocations(getAllSavedLocations()); } },
    ]);
  }

  const activeResult = addMode === 'gps' ? gpsResult : selectedResult;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {Platform.OS !== 'web' && locations.length > 0 && (
          <MapView
            style={styles.mapPreview}
            initialRegion={{ latitude: locations[0].latitude, longitude: locations[0].longitude, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
          >
            {locations.map((loc) => (
              <Marker key={loc.id} coordinate={{ latitude: loc.latitude, longitude: loc.longitude }} title={loc.name} />
            ))}
          </MapView>
        )}

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {!adding ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>+ Add a place</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addPanel}>
              {/* Tabs */}
              <View style={styles.tabs}>
                {(['gps', 'search'] as AddMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.tab, addMode === mode && styles.tabActive]}
                    onPress={() => setAddMode(mode)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tabText, addMode === mode && styles.tabTextActive]}>
                      {mode === 'gps' ? '📡 Current' : '🔍 Search'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* GPS */}
              {addMode === 'gps' && (
                <View>
                  <TouchableOpacity style={styles.gpsBtn} onPress={fetchCurrentLocation} disabled={gpsLoading} activeOpacity={0.85}>
                    {gpsLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.gpsBtnText}>Get my location</Text>}
                  </TouchableOpacity>
                  {gpsResult && <View style={styles.resultBox}><Text style={styles.resultLabel}>{gpsResult.label}</Text></View>}
                </View>
              )}

              {/* Search */}
              {addMode === 'search' && (
                <View>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Address or place name..."
                      placeholderTextColor={Colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searchLoading} activeOpacity={0.85}>
                      {searchLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Go</Text>}
                    </TouchableOpacity>
                  </View>
                  {searchResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.resultBox, selectedResult === r && styles.resultBoxSelected]}
                      onPress={() => handleSelectResult(r)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.resultLabel}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Name + save */}
              {activeResult && (
                <View style={styles.saveSection}>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Place name (e.g. Home, Work...)"
                    placeholderTextColor={Colors.textMuted}
                    value={placeName}
                    onChangeText={setPlaceName}
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>Save place 📍</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={resetAddPanel} style={styles.cancelRow}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {locations.length === 0 && !adding ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>No saved places yet</Text>
              <Text style={styles.emptySub}>Add places like Home or Work to quickly log there.</Text>
            </View>
          ) : (
            locations.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowIconBg}>
                  <Text style={styles.rowIcon}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowCoords}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  mapPreview: { height: 200 },
  list: { flex: 1, padding: 20 },

  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadow.card,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  addPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 20,
    ...Shadow.card,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    padding: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textSub },
  tabTextActive: { color: '#fff' },

  gpsBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'center',
  },
  gpsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  resultBox: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resultBoxSelected: { borderColor: Colors.primary, backgroundColor: '#FDF0E6' },
  resultLabel: { fontSize: 13, color: Colors.text, lineHeight: 18 },

  saveSection: { marginTop: 16, gap: 10 },
  nameInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: 15,
    alignItems: 'center',
    ...Shadow.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  cancelRow: { marginTop: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...Shadow.sm,
  },
  rowIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: { fontSize: 22 },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowCoords: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 20 },

  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, fontWeight: '700', color: Colors.textSub },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
