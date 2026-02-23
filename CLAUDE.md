# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

There are no lint or test scripts configured.

## Architecture

PoopTracker is an **Expo React Native** app (SDK 54) using **expo-router** for file-based navigation and **expo-sqlite** for local-only data persistence. The New Architecture (`newArchEnabled: true`) is enabled.

### Routing

`app/_layout.tsx` is the root layout — it calls `initDatabase()` on mount and wraps the app in a `<Stack>` with headers hidden. The only route group is `app/(tabs)/`, which defines four tabs via `app/(tabs)/_layout.tsx`:

| Tab | File | Purpose |
|-----|------|---------|
| Log | `app/(tabs)/index.tsx` | Log a new poop entry |
| Map | `app/(tabs)/map.tsx` | View all geo-tagged entries on a map |
| Stats | `app/(tabs)/stats.tsx` | Health score, calendar heatmap, year overview |
| Places | `app/(tabs)/locations.tsx` | Manage saved named locations |

### Data Layer (`lib/`)

- **`lib/database.ts`** — Opens a SQLite database (`pooptracker.db`) synchronously at module load time and initializes two tables: `poop_entries` and `saved_locations`. All DB calls are synchronous (`runSync`, `getAllSync`). The `rowToEntry` mapper handles the snake_case → camelCase conversion (`saved_location_id` → `savedLocationId`, `bristol_type` → `bristolType`).

- **`lib/types.ts`** — Defines `PoopEntry`, `SavedLocation`, and `PoopColor`. The `bristolType` field is typed as a union `1 | 2 | 3 | 4 | 5 | 6 | 7`.

- **`lib/health.ts`** — Pure functions for computing a 0–100 health score (`getHealthFeedback`) based on Bristol type distribution, color distribution, and frequency. Also exports `getMostCommonBristolType` and `getMostCommonColor`.

### Constants (`constants/`)

- **`constants/bristol.ts`** — `BRISTOL_TYPES` array (`as const`) with type, label, description, emoji, and health string for each of the 7 Bristol scale types.
- **`constants/colors.ts`** — `POOP_COLORS` array mapping each `PoopColor` key to a label, hex, and health string.
- **`constants/theme.ts`** — `Colors`, `Radius`, and `Shadow` design tokens used throughout all screens. The app uses a warm brown palette (`Colors.primary: '#8B5236'`).

### Key Patterns

- **`useFocusEffect`** (from expo-router) is used on Map and Stats screens to reload data whenever the tab is focused, keeping data fresh after logging.
- Screens read directly from the DB synchronously — there is no global state or context. Each screen manages its own local React state.
- Map markers are grouped by coordinates rounded to 4 decimal places (`groupByCoords` in `map.tsx`).
- Location can be captured via GPS (`expo-location`) or selected from a user's saved places. Saved places can be added by GPS or address search (using `Location.geocodeAsync`).
- The map tab and the map preview in Locations both render a fallback `<View>` on web, since `react-native-maps` is not available there.
