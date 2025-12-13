// App.js
import React, { useState, useEffect, useRef } from 'react';

// Core React Native UI components
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import styles, { SCREEN_WIDTH, SCREEN_HEIGHT } from './styles';

// Main app component
export default function TimeConverterApp() {

  // Controls visibility of the drop-down view menu
  const [showViewMenu, setShowViewMenu] = useState(false);

  // The active user-created view (e.g. "Default", "Work", etc.)
  const [currentView, setCurrentView] = useState('Default');

  const now = new Date();

  // Stores time/date/location settings for each view
  const [viewStates, setViewStates] = useState(() => ({
    Default: {
      locations: [],
      time: now.getHours(), // Initialize to current time
      minutes: now.getMinutes(),
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  }));

  // List of all saved views
  const [allViews, setAllViews] = useState(['Default']);

  // Controls “Add View” popup
  const [showAddView, setShowAddView] = useState(false);

  // New view name input
  const [newViewName, setNewViewName] = useState('');

  // Location search popup
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  // Search bar text
  const [searchQuery, setSearchQuery] = useState('');

  // Search results for world cities
  const [locations, setLocations] = useState([]);

  // List of selected cities inside the current view
  const [selectedLocations, setSelectedLocations] = useState([]);

  // The base time the whole view is calculated from
  // Initialize to current time for location cards (slider starts at 12:00am independently)
  const [baseTime, setBaseTime] = useState(now.getHours());
  const [baseMinutes, setBaseMinutes] = useState(now.getMinutes());
  const [baseDate, setBaseDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  // Calendar popup visibility
  const [showCalendar, setShowCalendar] = useState(false);

  // Which month is shown in the calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  // Timeline slider constants
  const TICKS_PER_DAY = 96; // 24 hours * 4 (15-min intervals) - 00:00 to 23:45
  const TOTAL_TICKS = 97; // Include tick 96 for 24:00 (00:00 next day)
  const TICK_SPACING = 30; // Fixed 30px spacing - readable on all screen sizes

  // Container padding constants (must match styles.js)
  const SCROLL_PADDING = 20; // styles.scrollContent.paddingHorizontal
  const GRADIENT_PADDING = 24; // styles.gradient.padding
  const TOTAL_HORIZONTAL_PADDING = SCROLL_PADDING + GRADIENT_PADDING; // 44px on each side

  // Timeline dimensions - ticks are positioned within sliderContainer
  const TIMELINE_WIDTH = SCREEN_WIDTH - (TOTAL_HORIZONTAL_PADDING * 2); // SCREEN_WIDTH - 88
  const TIMELINE_CENTER = TIMELINE_WIDTH / 2; // Center from sliderContainer's left edge

  // Initialize ticks with all 97 ticks (00:00 to 24:00)
  const initializeTicks = () => {
    const ticks = [];
    for (let tickIndex = 0; tickIndex < TOTAL_TICKS; tickIndex++) {
      ticks.push({
        id: tickIndex,
        tickIndex: tickIndex,
        x: tickIndex * TICK_SPACING
      });
    }
    return ticks;
  };

  // Timeline slider animated value
  // Formula: To center tick N, offset = TIMELINE_CENTER - (N * TICK_SPACING)
  // Initialize to current time
  const sliderOffset = useRef(
    new Animated.Value((() => {
      const totalMinutes = now.getHours() * 60 + now.getMinutes();
      const exactTickPosition = totalMinutes / 15;
      const tickPixelPosition = exactTickPosition * TICK_SPACING;
      return TIMELINE_CENTER - tickPixelPosition;
    })())
  ).current;
  const isTimelineDragging = useRef(false);
  const lastQuarterRef = useRef(null); // Track quarter crossings for haptics
  const isFirstMount = useRef(true); // Skip view-loading effect on first render
  // Track current tick position (0-96) - initialize to current time rounded to nearest quarter
  const currentTickRef = useRef(Math.round((now.getHours() * 60 + now.getMinutes()) / 15));
  // Track velocity for momentum scrolling
  const velocityRef = useRef({ vx: 0, time: 0 });

  const ticksRef = useRef(initializeTicks());
  const ticks = ticksRef.current; // No need for state - ticks are now static (all 97 ticks)

  // Single source of truth for slider offset
  // Returns the actual rendered offset that drives the transform
  const getTotalOffset = () => sliderOffset._value + sliderOffset._offset;


  // Calculate tick display data from tick index
  const getTickDisplayData = (tickIndex) => {
    // Tick 96 represents 24:00 (displayed as 12am of next day)
    if (tickIndex === 96) {
      return { hour: 0, minute: 0, isHour: true };
    }

    // Wrap to 0-95 range for time calculation
    let normalizedIndex = tickIndex % TICKS_PER_DAY;
    if (normalizedIndex < 0) normalizedIndex += TICKS_PER_DAY;

    const totalMinutes = normalizedIndex * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const isHour = minute === 0;

    return { hour, minute, isHour };
  };

  // Removed: debugInfo state - no longer needed (infinite scrolling removed)

  // Static world city list used for searching and selection
  const worldCities = [
    { city: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', utcOffset: 8 },
    { city: 'London', country: 'United Kingdom', timezone: 'Europe/London', utcOffset: 0 },
    { city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', utcOffset: 9 },
    { city: 'New York', country: 'United States', timezone: 'America/New_York', utcOffset: -5 },
    { city: 'Paris', country: 'France', timezone: 'Europe/Paris', utcOffset: 1 },
    { city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', utcOffset: 4 },
    { city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', utcOffset: 8 },
    { city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', utcOffset: 11 },
    { city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', utcOffset: -8 },
    { city: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', utcOffset: -8 },
    { city: 'Toronto', country: 'Canada', timezone: 'America/Toronto', utcOffset: -5 },
    { city: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', utcOffset: 1 },
    { city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', utcOffset: 5.5 },
    { city: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', utcOffset: 8 },
    { city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', utcOffset: 9 },
    { city: 'Moscow', country: 'Russia', timezone: 'Europe/Moscow', utcOffset: 3 },
    { city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', utcOffset: 7 },
    { city: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', utcOffset: 3 },
    { city: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', utcOffset: -6 },
  ];

  useEffect(() => {
    if (searchQuery) {
      const filtered = worldCities.filter(loc =>
        loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setLocations(filtered);
    } else {
      setLocations(worldCities);
    }
  }, [searchQuery]);

  // Plays a small "tap" vibration on supported devices
  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Returns the sky color gradient based on current time of day
  const getTimeGradient = (hour, minutes) => {
    const totalMinutes = hour * 60 + minutes;
    if (totalMinutes >= 1200 || totalMinutes < 480) {
      return ['#1e3a8a', '#0f172a']; // night
    } else if (totalMinutes >= 480 && totalMinutes < 540) {
      // sunrise transition
      const progress = (totalMinutes - 480) / 60;
      if (progress < 0.33) return ['#1e3a8a', '#1e40af'];
      else if (progress < 0.67) return ['#1e40af', '#2563eb'];
      else return ['#2563eb', '#38bdf8'];
    } else if (totalMinutes >= 540 && totalMinutes < 1140) {
      return ['#38bdf8', '#3b82f6']; // daytime
    } else {
      // sunset transition
      const progress = (totalMinutes - 1140) / 60;
      if (progress < 0.33) return ['#38bdf8', '#2563eb'];
      else if (progress < 0.67) return ['#2563eb', '#1e40af'];
      else return ['#1e40af', '#1e3a8a'];
    }
  };

  // Adds a new view
  const handleAddView = () => {
    if (newViewName.trim() && !allViews.includes(newViewName.trim())) {

      const viewName = newViewName.trim();
      const now = new Date();

      // Add new view to the list
      setAllViews([...allViews, viewName]);

      // Initialize default time/date for the view
      setViewStates(prev => ({
        ...prev,
        [viewName]: {
          locations: [],
          time: now.getHours(),
          minutes: Math.floor(now.getMinutes() / 15) * 15,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }
      }));

      setNewViewName('');
      setShowAddView(false);
    }
  };

  // Removes a view (unless it's the only one)
  const handleDeleteView = (viewName) => {
    if (allViews.length === 1) return;

    setAllViews(allViews.filter(v => v !== viewName));

    const newViewStates = { ...viewStates };
    delete newViewStates[viewName];
    setViewStates(newViewStates);

    // If user deletes the active view, switch to the next available one
    if (currentView === viewName) {
      setCurrentView(allViews.filter(v => v !== viewName)[0]);
    }
  };

  // Adjusts the base time to match the selected main location
  const setCurrentTimeForLocation = () => {
    if (selectedLocations.length === 0) return;

    const now = new Date();
    const mainLocation = selectedLocations[0];

    // Convert user's local time → UTC → mainLocation time
    const userLocalOffset = -now.getTimezoneOffset() / 60;
    const userLocalHour = now.getHours();
    const userLocalMinutes = now.getMinutes();
    const utcHour = userLocalHour - userLocalOffset;
    const utcMinutes = userLocalMinutes;
    const locationTotalMinutes = (utcHour * 60 + utcMinutes) + (mainLocation.utcOffset * 60);

    let locationHour = Math.floor(locationTotalMinutes / 60);
    let locationMinutes = locationTotalMinutes % 60;
    let locationDate = new Date(now);

    // Handle day rollover (e.g. +1 day or -1 day)
    while (locationHour >= 24) {
      locationHour -= 24;
      locationDate.setDate(locationDate.getDate() + 1);
    }
    while (locationHour < 0) {
      locationHour += 24;
      locationDate.setDate(locationDate.getDate() - 1);
    }

    // Update state with exact time (not rounded to quarter)
    setBaseTime(locationHour);
    setBaseMinutes(locationMinutes);
    setBaseDate(new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()));

    // Calculate offset to center this time
    // Formula: offset = TIMELINE_CENTER - (tickPosition * TICK_SPACING)
    const totalMinutesExact = locationHour * 60 + locationMinutes;
    const exactTickPosition = totalMinutesExact / 15; // Can be fractional
    const targetOffset = TIMELINE_CENTER - (exactTickPosition * TICK_SPACING);

    // IMPORTANT: After flattenOffset(), _offset holds absolute position.
    // All future animations must use relative toValue (target - _offset)
    sliderOffset.flattenOffset();
    const relativeOffset = targetOffset - sliderOffset._offset;
    Animated.spring(sliderOffset, {
      toValue: relativeOffset,
      useNativeDriver: true,
      tension: 100,
      friction: 10
    }).start();
  };

  // Switches to a different saved view
  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowViewMenu(false);
  };

  // Whenever the active view changes, load its saved state
  useEffect(() => {
    // Skip on first mount - initial offset already correctly set
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const currentState = viewStates[currentView];

    setSelectedLocations(currentState.locations);
    setBaseTime(currentState.time);
    setBaseMinutes(currentState.minutes || 0);
    setBaseDate(currentState.date);
    setCalendarMonth(currentState.date);

    // Animate slider to loaded time position
    // Formula: offset = TIMELINE_CENTER - (tickPosition * TICK_SPACING)
    const totalMinutes = currentState.time * 60 + (currentState.minutes || 0);
    const exactTickPosition = totalMinutes / 15;
    const targetOffset = TIMELINE_CENTER - (exactTickPosition * TICK_SPACING);

    // IMPORTANT: After flattenOffset(), _offset holds absolute position.
    // All future animations must use relative toValue (target - _offset)
    sliderOffset.flattenOffset();
    const relativeOffset = targetOffset - sliderOffset._offset;
    Animated.spring(sliderOffset, {
      toValue: relativeOffset,
      useNativeDriver: true,
      tension: 100,
      friction: 10
    }).start();
  }, [currentView]);

  // Save current view's state whenever time or locations change
  useEffect(() => {
    setViewStates(prev => ({
      ...prev,
      [currentView]: {
        locations: selectedLocations,
        time: baseTime,
        minutes: baseMinutes,
        date: baseDate
      }
    }));
  }, [selectedLocations, baseTime, baseMinutes, baseDate, currentView]);

  // Adds a new city to the selected list
  const handleLocationSelect = (location) => {
    if (!selectedLocations.find(loc => loc.city === location.city)) {
      const newLocation = { ...location, id: Date.now() };

      // If this is the first location, initialize time to the location's current time
      if (selectedLocations.length === 0) {
        const now = new Date();
        // Calculate the location's current time using UTC offset
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert to UTC
        const locationTime = new Date(utcTime + (location.utcOffset * 3600000)); // Apply location's offset

        const locationHour = locationTime.getHours();
        const locationMinutes = locationTime.getMinutes();

        // Update base time to location's current time
        setBaseTime(locationHour);
        setBaseMinutes(locationMinutes);

        // Update currentTickRef to match the new time
        const currentTick = Math.round((locationHour * 60 + locationMinutes) / 15);
        currentTickRef.current = currentTick;

        // Animate timeline to location's current time
        const totalMinutesExact = locationHour * 60 + locationMinutes;
        const exactTickPosition = totalMinutesExact / 15;
        const targetOffset = TIMELINE_CENTER - (exactTickPosition * TICK_SPACING);

        sliderOffset.flattenOffset();
        const relativeOffset = targetOffset - sliderOffset._offset;
        Animated.spring(sliderOffset, {
          toValue: relativeOffset,
          useNativeDriver: true,
          tension: 100,
          friction: 10
        }).start();
      }

      setSelectedLocations([...selectedLocations, newLocation]);
    }
    setShowLocationPopup(false);
    setSearchQuery('');
  };

  // Calculates transformed time for each additional location
  const calculateTimeForLocation = (location) => {
    if (!selectedLocations.length) {
      return { hour: baseTime, minutes: baseMinutes, date: baseDate };
    }

    const mainLocation = selectedLocations[0];
    const timeDiffMinutes = (location.utcOffset - mainLocation.utcOffset) * 60;

    let totalMinutes = baseTime * 60 + baseMinutes + timeDiffMinutes;
    let date = new Date(baseDate);

    // If at tick 96 (24:00), advance date by one day
    if (currentTickRef.current === 96) {
      date.setDate(date.getDate() + 1);
    }

    // Adjust for next/previous day if needed (timezone differences)
    while (totalMinutes >= 1440) {
      totalMinutes -= 1440;
      date.setDate(date.getDate() + 1);
    }
    while (totalMinutes < 0) {
      totalMinutes += 1440;
      date.setDate(date.getDate() - 1);
    }

    return {
      hour: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      date
    };
  };

  // Formats date as “Wed, Feb 12”
  const getDateString = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Converts 24-hour time to 12-hour format
  const formatTime = (hour, minutes) => {
    const h = hour % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${h}:${m}${ampm}`;
  };

  // Returns readable time difference compared to the first (main) selected location
  const getTimeDifference = (location) => {
    if (!selectedLocations.length || location.id === selectedLocations[0].id) return null;

    const mainLocation = selectedLocations[0];
    const diff = location.utcOffset - mainLocation.utcOffset;
    if (diff > 0) return `${diff} hrs Ahead`;
    if (diff < 0) return `${Math.abs(diff)} hrs Behind`;
    return 'Same Time';
  };

  // Removed: updateTickWindow() - no longer needed, timeline is now finite (no infinite scrolling)

  // Timeline slider pan responder
  const timelinePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only start responding if there's actual horizontal movement (not vertical)
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovement = Math.abs(gestureState.dx) > 5;
        return isHorizontal && hasMovement;
      },

      onPanResponderGrant: () => {
        // Mark that timeline dragging has started
        isTimelineDragging.current = true;
        // Extract current animated value and set it as the offset
        sliderOffset.extractOffset();
      },

      onPanResponderMove: (_, gestureState) => {
        let newOffset = gestureState.dx;
        const proposedOffset = sliderOffset._offset + newOffset;

        // Track velocity for momentum scrolling
        velocityRef.current = {
          vx: gestureState.vx,
          time: Date.now()
        };

        // Boundary constraints: offset to center tick 0 and tick 96 (24:00)
        const maxOffset = TIMELINE_CENTER; // tick 0 at center
        const minOffset = TIMELINE_CENTER - ((TOTAL_TICKS - 1) * TICK_SPACING); // tick 96 at center
        const overscrollResistance = 0.3;

        let clampedOffset = proposedOffset;
        if (proposedOffset > maxOffset) {
          const overscroll = proposedOffset - maxOffset;
          clampedOffset = maxOffset + (overscroll * overscrollResistance);
        } else if (proposedOffset < minOffset) {
          const overscroll = minOffset - proposedOffset;
          clampedOffset = minOffset - (overscroll * overscrollResistance);
        }

        sliderOffset.setValue(clampedOffset - sliderOffset._offset);

        // Calculate tick at center from single source of truth
        const totalOffset = getTotalOffset();
        const exactTickPosition = (TIMELINE_CENTER - totalOffset) / TICK_SPACING;

        // Round to nearest 15-minute interval for display (0-96, where 96 is 24:00)
        const nearestQuarter = Math.round(exactTickPosition);
        const clampedQuarter = Math.max(0, Math.min(TOTAL_TICKS - 1, nearestQuarter));

        // Only update time and trigger haptic when nearest tick changes
        if (clampedQuarter !== lastQuarterRef.current) {
          // Track current tick position
          currentTickRef.current = clampedQuarter;

          // Handle tick 96 (24:00 = 00:00 next day) - only update time, date handled in calculateTimeForLocation
          if (clampedQuarter === 96) {
            setBaseTime(0);
            setBaseMinutes(0);
          } else {
            const totalMinutesRounded = clampedQuarter * 15;
            const newHour = Math.floor(totalMinutesRounded / 60) % 24;
            const newMinute = totalMinutesRounded % 60;

            setBaseTime(newHour);
            setBaseMinutes(newMinute);
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastQuarterRef.current = clampedQuarter;
        }
      },

      onPanResponderRelease: () => {
        isTimelineDragging.current = false;

        const totalOffset = sliderOffset._offset + sliderOffset._value;

        // Apply momentum if velocity is significant
        const velocity = velocityRef.current.vx;
        const minVelocity = 0.5; // Minimum velocity to trigger momentum
        const momentumMultiplier = 300; // How far momentum carries

        let momentumOffset = 0;
        if (Math.abs(velocity) > minVelocity) {
          momentumOffset = velocity * momentumMultiplier;
        }

        // Calculate target position with momentum
        const targetOffset = totalOffset + momentumOffset;
        const exactTickPosition = (TIMELINE_CENTER - targetOffset) / TICK_SPACING;
        const nearestQuarter = Math.round(exactTickPosition);
        const clampedQuarter = Math.max(0, Math.min(TOTAL_TICKS - 1, nearestQuarter));

        // Calculate offset to center this tick: offset = TIMELINE_CENTER - (tick * TICK_SPACING)
        let finalOffset = TIMELINE_CENTER - (clampedQuarter * TICK_SPACING);

        // IMPORTANT: After flattenOffset(), _offset holds absolute position.
        // All future animations must use relative toValue (target - _offset)
        sliderOffset.flattenOffset();
        const relativeOffset = finalOffset - sliderOffset._offset;

        // Use decay animation for momentum effect, then spring to snap
        if (Math.abs(velocity) > minVelocity) {
          Animated.sequence([
            Animated.decay(sliderOffset, {
              velocity: velocity,
              deceleration: 0.997,
              useNativeDriver: true,
            }),
            Animated.spring(sliderOffset, {
              toValue: relativeOffset,
              useNativeDriver: true,
              tension: 100,
              friction: 10
            })
          ]).start();
        } else {
          Animated.spring(sliderOffset, {
            toValue: relativeOffset,
            useNativeDriver: true,
            tension: 100,
            friction: 10
          }).start();
        }

        // Track current tick position
        currentTickRef.current = clampedQuarter;

        // Update time - handle tick 96 (24:00 = 00:00 next day) - date handled in calculateTimeForLocation
        if (clampedQuarter === 96) {
          setBaseTime(0);
          setBaseMinutes(0);
        } else {
          const snappedMinutes = clampedQuarter * 15;
          const snappedHour = Math.floor(snappedMinutes / 60) % 24;
          const snappedMinute = snappedMinutes % 60;

          setBaseTime(snappedHour);
          setBaseMinutes(snappedMinute);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      onPanResponderTerminate: () => {
        // If another responder takes over, mark dragging as ended
        isTimelineDragging.current = false;
      },

      // Prevent ScrollView from taking over while timeline is being dragged
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Generates a 7-day range centered around the selected base date
  const generateWeekDays = () => {
    const days = [];
    // If at tick 96 (24:00), use next day as base
    const effectiveBaseDate = new Date(baseDate);
    if (currentTickRef.current === 96) {
      effectiveBaseDate.setDate(effectiveBaseDate.getDate() + 1);
    }

    const startDate = new Date(effectiveBaseDate);
    startDate.setDate(effectiveBaseDate.getDate() - 3);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  };

  // Generates days for the monthly calendar view
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days = [];

    // Add blank placeholders for alignment
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add actual month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Navigate calendar view to previous month
  const handlePrevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  // Navigate calendar view to next month
  const handleNextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  // Creates a system calendar event using the current location/time data
  const handleAddToCalendar = async () => {
    if (selectedLocations.length === 0) return;

    try {
      // Request OS permission
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== 'granted') {
        alert('Calendar permission is required to add events');
        return;
      }

      // Pick a calendar that supports event creation
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((cal) => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        alert('No calendar available');
        return;
      }

      // Build event time window (1 hour duration)
      const location = selectedLocations[0];
      const startDate = new Date(baseDate);
      startDate.setHours(baseTime, baseMinutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      // Create the event
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `Time in ${location.city}`,
        startDate: startDate,
        endDate: endDate,
        location: location.city,
        notes: `Current time: ${formatTime(baseTime, baseMinutes)}`,
        timeZone: location.timezone,
      });

      alert('Event added to calendar!');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      alert('Failed to add event to calendar');
    }
  };

  return (

    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        {/* Current View Selector */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setShowViewMenu(!showViewMenu)}
        >
          <Text style={styles.viewButtonTextOrange}>{currentView}</Text>
          <Text style={styles.viewButtonTextGray}> View</Text>
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* Add Location Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowLocationPopup(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE LOCATIONS */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        scrollEnabled={false}
      >
        {selectedLocations.length > 0 ? (
          selectedLocations.map((location, index) => {
            const { hour, minutes, date } = calculateTimeForLocation(location);
            const isMain = index === 0;
            const timeDiff = getTimeDifference(location);
            const gradient = getTimeGradient(hour, minutes);

            return (
              <View key={location.id} style={styles.locationContainer}>
                {/* LOCATION CARD */}
                <View style={styles.locationCard}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
                    {/* Location Header */}
                    <View style={styles.locationHeader}>
                      <View style={styles.locationInfo}>
                        <View style={styles.dot} />
                        <View>
                          <Text style={styles.cityName}>{location.city}</Text>
                          <Text style={styles.locationSubtext}>
                            {isMain ? 'Current Location' : timeDiff}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.timeDisplay}>
                        <Text style={styles.timeText}>{formatTime(hour, minutes)}</Text>
                        <Text style={styles.dateText}>{getDateString(date)}</Text>
                      </View>
                    </View>

                    {/* TIMELINE SLIDER & WEEK SELECTOR (only for main location) */}
                    {isMain && (
                      <>
                        {/* Timeline Slider */}
                        <View style={styles.sliderContainer} {...timelinePanResponder.panHandlers}>
                          {/* Fixed center indicator */}
                          <View style={styles.centerIndicator} />

                          {/* Animated tick container */}
                          <Animated.View
                            style={[
                              styles.ticksContainer,
                              {
                                position: 'absolute',
                                left: 0,
                                transform: [{ translateX: sliderOffset }],
                              },
                            ]}
                          >
                            {ticks.map((tick) => {
                              const displayData = getTickDisplayData(tick.tickIndex);

                              return (
                                <View
                                  key={tick.id}
                                  style={[
                                    styles.tickWrapper,
                                    { left: tick.x }
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.tick,
                                      displayData.isHour && styles.tickHour
                                    ]}
                                  />
                                  {displayData.isHour && (
                                    <Text style={styles.tickLabel}>
                                      {displayData.hour === 0 ? '12am' :
                                        displayData.hour < 12 ? `${displayData.hour}am` :
                                          displayData.hour === 12 ? '12pm' :
                                            `${displayData.hour - 12}pm`}
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </Animated.View>
                        </View>

                        {/* Week Days */}
                        <View style={styles.weekContainer}>
                          {generateWeekDays().map((day, idx) => {
                            // If at tick 96, compare with next day
                            const effectiveBaseDate = new Date(baseDate);
                            if (currentTickRef.current === 96) {
                              effectiveBaseDate.setDate(effectiveBaseDate.getDate() + 1);
                            }
                            const isSelected = day.toDateString() === effectiveBaseDate.toDateString();
                            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                                onPress={() => setBaseDate(day)}
                              >
                                <Text style={styles.dayLabel}>{dayNames[day.getDay()]}</Text>
                                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                                  {day.getDate()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          {/* Calendar Button */}
                          <TouchableOpacity
                            style={styles.calendarButton}
                            onPress={() => {
                              setCalendarMonth(baseDate);
                              setShowCalendar(true);
                            }}
                          >
                            <Ionicons name="calendar-outline" size={20} color="white" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </View>
              </View>
            );
          })
        ) : (
          /* EMPTY STATE */
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>No time zones added yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add time zones</Text>
          </View>
        )}
      </ScrollView>

      {/* FIXED BOTTOM BUTTONS */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, selectedLocations.length === 0 && styles.bottomButtonDisabled]}
          onPress={setCurrentTimeForLocation}
          disabled={selectedLocations.length === 0}
        >
          <Ionicons name="time-outline" size={20} color="white" />
          <Text style={styles.bottomButtonText}>Current Time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomButton, selectedLocations.length === 0 && styles.bottomButtonDisabled]}
          onPress={handleAddToCalendar}
          disabled={selectedLocations.length === 0}
        >
          <Ionicons name="calendar-outline" size={20} color="white" />
          <Text style={styles.bottomButtonText}>Add to Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* VIEW MENU MODAL */}
      <Modal
        visible={showViewMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowViewMenu(false)}
        >
          <View style={styles.viewMenu}>
            {allViews.map((view) => (
              <View key={view} style={styles.viewMenuItem}>
                <TouchableOpacity
                  style={styles.viewMenuButton}
                  onPress={() => handleViewChange(view)}
                >
                  <Text style={[styles.viewMenuText, view === currentView && styles.viewMenuTextActive]}>
                    {view}
                  </Text>
                </TouchableOpacity>
                {allViews.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteViewButton}
                    onPress={() => handleDeleteView(view)}
                  >
                    <Ionicons name="close" size={16} color="#f87171" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={styles.viewMenuDivider} />
            {showAddView ? (
              <View style={styles.addViewContainer}>
                <TextInput
                  style={styles.addViewInput}
                  placeholder="View name..."
                  placeholderTextColor="#9ca3af"
                  value={newViewName}
                  onChangeText={setNewViewName}
                  autoFocus
                />
                <View style={styles.addViewButtons}>
                  <TouchableOpacity style={styles.addViewButtonConfirm} onPress={handleAddView}>
                    <Text style={styles.addViewButtonText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addViewButtonCancel}
                    onPress={() => {
                      setShowAddView(false);
                      setNewViewName('');
                    }}
                  >
                    <Text style={styles.addViewButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addViewMenuItem} onPress={() => setShowAddView(true)}>
                <Ionicons name="add" size={16} color="#3b82f6" />
                <Text style={styles.addViewMenuText}>Add New View</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Popup Modal */}
      <Modal
        visible={showLocationPopup}        // Shows when user taps "+" to add a location
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPopup(false)} // Close on back button (Android)
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationPopup}>
            {/* Header with title and close button */}
            <View style={styles.locationPopupHeader}>
              <Text style={styles.locationPopupTitle}>Add Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPopup(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Search input to filter cities */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search City..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            {/* Scrollable list of locations */}
            <ScrollView style={styles.locationList}>
              {locations.map((location, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location)} // Adds location to selected list
                >
                  <Text style={styles.locationItemText}>
                    {location.city}, {location.country}
                  </Text>
                  <Text style={styles.locationItemOffset}>
                    UTC{location.utcOffset >= 0 ? '+' : ''}{location.utcOffset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}              // Opens when user taps calendar icon in week/day selector
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        {/* Overlay closes modal on tap outside */}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity
            style={styles.calendarPopup}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()} // Prevent tap inside popup from closing modal
          >
            {/* Calendar header: month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarArrow}>
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calendarArrow}>
                <Ionicons name="chevron-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Calendar grid: weekdays + dates */}
            <View style={styles.calendarGrid}>
              {/* Weekday labels */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarDayLabel}>{day}</Text>
              ))}

              {/* Calendar days */}
              {generateCalendarDays().map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarDay,
                    day && day.toDateString() === baseDate.toDateString() && styles.calendarDaySelected,
                  ]}
                  onPress={() => {
                    if (day) {
                      setBaseDate(day);      // Set selected date
                      setShowCalendar(false); // Close modal
                    }
                  }}
                  disabled={!day} // Disabled for placeholder days
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      day && day.toDateString() === baseDate.toDateString() && styles.calendarDayTextSelected,
                      !day && styles.calendarDayTextEmpty, // Empty text for placeholder
                    ]}
                  >
                    {day ? day.getDate() : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}