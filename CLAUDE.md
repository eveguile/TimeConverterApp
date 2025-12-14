# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (Metro bundler)
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

## Architecture Overview

### Monolithic Single-Component Design

This is a React Native/Expo app with **all application logic contained in a single 1,295-line component** ([App.js](App.js)). There are no separate component files, utility modules, or architectural layers.

**Key Architectural Characteristics:**
- Single `TimeConverterApp` function component contains entire app
- All UI sections, business logic, and state management in one file
- No code separation or modular structure
- Pure JavaScript (no TypeScript)

### State Management Pattern

Uses **19 useState hooks** with no external state management library:

**Multi-View System (lines 77-93):**
- `viewStates` object acts as in-memory database storing state per view
- Structure: `{ ViewName: { locations, time, minutes, date } }`
- Switching views loads saved state (useEffect line 196)
- Changes auto-save to current view (useEffect line 210)
- **No persistence** - all data lost on app restart

**Time Calculation System (line 230):**
- First location in `selectedLocations` is the reference/main location
- All other locations calculated relative to main location's UTC offset
- Formula: `(baseTime * 60 + baseMinutes) + timeDiffMinutes`
- Time displayed adjusts for date rollover (past midnight or before start of day)

**Gesture State (lines 277-383):**
- `sliderPanResponder` - Time slider with haptic feedback every 15 minutes
- `createSwipePanResponder(locationId)` - Per-location swipe handlers for delete/pin
- `swipePositions` ref stores Animated.Value for each location
- Swipe thresholds: >120px = delete, <-120px = pin to top

### Data Flow Patterns

**Time Gradient System (lines 97-228):**
- Dynamic background colors based on time of day
- Night (8pm-8am): `['#1e3a8a', '#0f172a']` (dark blue)
- Day (9am-7pm): `['#38bdf8', '#3b82f6']` (light blue)
- Gradual transitions during dawn/dusk hours
- Function: `getTimeGradient(hour, minutes)` returns color array

**Location Data:**
- Hardcoded `worldCities` array (lines 55-75) with 19 cities
- Each city: `{ id, city, country, timezone, flag }`
- Timezone format uses IANA database (e.g., "America/New_York")
- To add cities: modify this array directly in App.js

**Calendar Integration (lines 456-493):**
- Uses `expo-calendar` with permission handling
- Creates 1-hour event in user's default modifiable calendar
- Event includes: title, time, location name, timezone
- Requires calendar permissions configured in app.json

### Critical Implementation Details

**Time Slider Mechanics (lines 77-550):**
- **97 ticks total** (00:00 to 24:00): Includes tick 96 for midnight of next day
- **Container-aware positioning**: Accounts for 88px total padding (20px ScrollView + 24px Gradient on each side)
- **TIMELINE_CENTER calculation**: Uses `(SCREEN_WIDTH - 88) / 2` for accurate tick alignment
- **Exact time alignment**: Current time centered precisely (supports fractional positioning like 14:37)
- **Live time updates**: Dragging updates `baseTime` and `baseMinutes` to nearest 15-min interval
- **Snap-to-quarter**: Releases animate to nearest 15-minute marker with spring animation
- **Momentum scrolling**: Velocity-based deceleration with decay animation, then snap
- **Haptic feedback**: Light haptic every 15-min crossing during drag, medium haptic on snap
- **Overscroll behavior**: Allows slight overscroll with 0.3x resistance, bounces back on release
- **40px center indicator**: Red vertical bar at timeline center (50px height, positioned at 20% from top)
- **"Current Time" button**: Animates slider to exact current minute (e.g., 14:37, not rounded to 14:30)
- **First location initialization**: When first location is added, timeline initializes to that location's current time

**Swipe-to-Delete/Pin (lines 340-383):**
- Each location has its own swipe handler and animated position
- Delete threshold: swipeX > 120 (swipe right)
- Pin threshold: swipeX < -120 (swipe left)
- Cannot delete if only one location remains
- Pinning moves location to index 0 (becomes new reference time)

**Date Handling:**
- **Tick 96 date advancement**: When timeline is at 24:00 (tick 96), dates automatically show next day
- **Dynamic date calculation**: `calculateTimeForLocation` adds 1 day when `currentTickRef.current === 96`
- Week selector shows 7 days centered on `baseDate` (lines 552-571)
- `generateWeekDays()` uses next day as base when at tick 96
- Week day highlighting updates to show next day when at tick 96
- Calendar uses separate `calendarMonth` state for navigation
- Date selection updates `baseDate` which recalculates all location times
- `generateCalendarDays()` creates month grid with empty cells for alignment

### Platform Configuration

**Expo Configuration ([app.json](app.json)):**
- Expo SDK 54 with new architecture enabled (`newArchEnabled: true`)
- Portrait orientation only
- iOS: Calendar permissions via `NSCalendarsUsageDescription`
- Android: `READ_CALENDAR`, `WRITE_CALENDAR` permissions + edge-to-edge

**Key Dependencies:**
- React 19.1.0, React Native 0.81.5
- `expo-calendar` - Native calendar integration
- `expo-haptics` - Tactile feedback (won't work on web)
- `expo-linear-gradient` - Time-based gradient backgrounds
- `@expo/vector-icons` - Ionicons icon set

### Modifying the App

**Adding Features:**
- All changes go in App.js
- New UI sections add to existing monolithic structure
- New state requires additional useState hooks
- Consider refactoring into components if adding significant complexity

**Common Modification Points:**
- **Cities:** Edit `worldCities` array (lines 55-75)
- **Time intervals:** Change quarter calculation in sliderPanResponder (line 285)
- **Colors:** Modify `getTimeGradient()` function (lines 97-228)
- **Swipe thresholds:** Adjust 120px values in swipe handlers (lines 361, 365)

**State Persistence:**
- Currently no AsyncStorage or persistence layer
- To add: Import AsyncStorage, save viewStates on change, load on mount
- Consider saving to Expo SecureStore for user preferences

### Testing & Building

**No Test Infrastructure:**
- No test files, Jest config, or testing libraries
- No TypeScript for type safety
- Manual testing via Expo Go required

**Build Options:**
- Development: Expo Go app for rapid testing
- Production: Use EAS Build or eject to bare workflow
- Managed workflow (no /ios or /android folders in repo)
