# Requirements Overview

## Project Purpose

TimeConverterApp is a React Native/Expo mobile application for managing and visualizing times across multiple time zones simultaneously. Users can compare times, adjust time values via an interactive slider, and add events to their device calendar.

## Functional Requirements

### Core Features
- Multi-timezone display with visual time-of-day gradients
- Interactive 24-hour timeline slider for time adjustment
- Add/remove timezone locations
- Multiple saved views for different location sets
- Calendar integration for event creation
- Swipe gestures for location management (delete/pin)

### Time Slider Component Requirements

#### 1. Visual Structure
**Markers:**
- Long markers (16px) every hour (00:00, 01:00, ..., 23:00)
- Short markers (8px) every 15 minutes (quarter hours)
- Between each pair of hour markers: three short markers at :15, :30, :45

**Labels:**
- Display under each hour marker in format "HHam" / "HHpm"
- Examples: "12am", "1am", "2pm", "11pm"
- Quarter markers have no labels

**Viewport & Spacing:**
- Fixed tick spacing of 30px - readable and interactable on all screen sizes
- No fixed viewport hours constraint - visible hours depend on device width
- Maintains consistent proportions across devices
- 97 total ticks spanning 00:00 to 24:00 (tick 96 = midnight of next day)
- Container-aware positioning accounts for 88px total horizontal padding (44px each side)

#### 2. Timeline Range
- Timeline starts at 00:00 (12am)
- Timeline ends at 24:00 (00:00 of next day)
- Hard boundaries with soft overscroll resistance (0.3x)
- No infinite looping

#### 3. Time Alignment Behavior
**On Expansion:**
- Slider automatically scrolls so exact current local time sits at center of viewport
- If current time is not on 15-minute interval, center indicator aligns with exact proportional position between markers
- Example: current time = 14:37
  - Hour markers: 14:00, 15:00
  - Quarter markers: 14:00, 14:15, 14:30, 14:45
  - 14:37 is 7 minutes past 14:30 out of 15 minutes
  - Center indicator should be 7/15 of distance toward 14:45 marker

#### 4. Pan Interaction
**During Drag:**
- User can drag left or right using horizontal pan gesture
- Timeline moves smoothly with finger
- App continuously checks which marker (or fractional time) is closest to center indicator
- Displayed time updates live to **nearest 15-minute interval**
- Exact times (like 14:37) only show when location cards expanded or "Current Time" button pressed

**Haptic Feedback:**
- Light haptic feedback every time crossing a 15-minute marker boundary
- Medium haptic feedback on snap completion

#### 5. Snapping Behavior
**On Release:**
- Calculate which 15-minute marker is closest to center
- Animate timeline with spring easing so that marker aligns exactly at center
- Animation parameters: tension 100, friction 10
- Update `baseTime` and `baseMinutes` to snapped value

**Example:**
- User stops drag at 14:37 position
- Nearest marker is 14:30 or 14:45 (whichever is closer)
- Timeline snaps to align that marker at center
- Displayed time updates to the snapped value

#### 6. Boundary Behavior
**Overscroll:**
- Allow slight overscroll beyond 00:00 and 24:00
- Apply resistance factor of 0.3x (movement reduced by 70%)
- Visual feedback that boundary has been reached

**Bounce Back:**
- On release while overscrolled, animate back to boundary
- Use spring animation (same parameters as snap)

#### 7. "Current Time" Button Behavior
- Sets time to exact current minute for main location timezone
- Example: If current time is 14:37, slider centers on exactly 14:37
- Does NOT snap to 15-minute marker
- Animates slider to exact fractional position
- Updates `baseTime` and `baseMinutes` with exact values

#### 8. Momentum Scrolling
- Tracks velocity during pan gesture using `gestureState.vx`
- Minimum velocity threshold: 0.5 to trigger momentum
- Momentum multiplier: 300px for calculating target position
- Applies `Animated.decay()` for natural deceleration (deceleration: 0.997)
- Follows with `Animated.spring()` to snap to nearest 15-minute marker
- Creates physics-based scrolling with smooth snap-to behavior

#### 9. Date Advancement at Tick 96
- When timeline reaches tick 96 (24:00), dates automatically advance by 1 day
- Location cards display next day's date
- Week selector highlights next day instead of current day
- `generateWeekDays()` uses next day as base for week display
- All date changes revert automatically when moving away from tick 96
- Handled in `calculateTimeForLocation()` via `currentTickRef.current === 96` check

#### 10. First Location Initialization
- When first location is added to an empty view, timeline initializes to that location's current time
- Calculates location's time using UTC offset: `utcTime + (location.utcOffset * 3600000)`
- Animates timeline to center on location's exact current time (not device local time)
- Updates `currentTickRef` to match initialized time
- Ensures global time travelers see their destination time immediately

## Non-Functional Requirements

### Performance
- Smooth 60fps scrolling during slider interaction
- Spring animations use native driver for optimal performance
- All 97 ticks pre-rendered (no dynamic rendering during scroll)
- Time updates only when crossing tick boundaries (not every frame)
- Velocity tracking uses lightweight ref updates

### Platform Support
- iOS: Full support with calendar permissions and haptics
- Android: Full support with calendar permissions and haptics
- Web: Visual support (haptics disabled)

### Accessibility
- Portrait orientation only
- Touch-based interactions optimized for mobile
- Visual feedback for all user actions
