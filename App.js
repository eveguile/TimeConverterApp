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
      time: now.getHours(),
      minutes: Math.floor(now.getMinutes() / 15) * 15, // round to nearest 15 min
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
  const [baseTime, setBaseTime] = useState(now.getHours());
  const [baseMinutes, setBaseMinutes] = useState(Math.floor(now.getMinutes() / 15) * 15);
  const [baseDate, setBaseDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  // Tracks how much the user moved the time slider (1 unit = 15 minutes)
  const [totalQuartersMoved, setTotalQuartersMoved] = useState(0);

  // Calendar popup visibility
  const [showCalendar, setShowCalendar] = useState(false);

  // Which month is shown in the calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  // Stores temporary slider movement before the user lets go
  const [pendingQuarterChange, setPendingQuarterChange] = useState(0);

  // Animated value for the horizontal time slider
  const sliderPosition = useRef(new Animated.Value(0)).current;

  // Stores swipe positions for individual rows
  const swipePositions = useRef({}).current;

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

    // Round to nearest quarter hour
    const roundedMinutes = Math.floor(locationMinutes / 15) * 15;

    // Compute how many 15-minute steps away from reference we are
    const quartersDiff = Math.floor((locationHour * 60 + roundedMinutes - (20 * 60)) / 15);

    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.floor((locationDate - referenceDate) / (1000 * 60 * 60 * 24));

    setBaseTime(locationHour);
    setBaseMinutes(roundedMinutes);
    setBaseDate(new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()));
    setTotalQuartersMoved(quartersDiff + daysDiff * 96);
  };

  // Switches to a different saved view
  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowViewMenu(false);
  };

  // Whenever the active view changes, load its saved state
  useEffect(() => {
    const currentState = viewStates[currentView];

    setSelectedLocations(currentState.locations);
    setBaseTime(currentState.time);
    setBaseMinutes(currentState.minutes || 0);
    setBaseDate(currentState.date);
    setCalendarMonth(currentState.date);

    const totalMinutes = currentState.time * 60 + (currentState.minutes || 0);
    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.floor((currentState.date - referenceDate) / (1000 * 60 * 60 * 24));

    setTotalQuartersMoved(Math.floor((totalMinutes - 20 * 60) / 15) + daysDiff * 96);
  }, [currentView]);

  // Save current view’s state whenever time or locations change
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
      setSelectedLocations([...selectedLocations, { ...location, id: Date.now() }]);
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

    // Adjust for next/previous day if needed
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

  // Handles dragging the main timeline slider and updating the base time/date
  const sliderPanResponder = useRef(
    PanResponder.create({
      // Start responding immediately
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      // Reset temporary quarter movement on touch start
      onPanResponderGrant: () => {
        setPendingQuarterChange(0);
      },

      // Convert drag distance → 15-minute increments and preview updated time
      onPanResponderMove: (_, gestureState) => {
        const deltaX = gestureState.dx;
        const quarterChange = -Math.round((deltaX / SCREEN_WIDTH) * 48);

        if (quarterChange !== pendingQuarterChange) {
          setPendingQuarterChange(quarterChange);
          triggerHaptic(); // haptic feedback on each quarter jump
        }

        const snappedQuarters = totalQuartersMoved + quarterChange;
        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const totalMinutes =
          referenceDate.getHours() * 60 +
          Math.floor(referenceDate.getMinutes() / 15) * 15 +
          snappedQuarters * 15;

        let newHour = Math.floor(totalMinutes / 60) % 24;
        let newMinutes = Math.round((totalMinutes % 60) / 15) * 15;

        if (newMinutes === 60) {
          newMinutes = 0;
          newHour = (newHour + 1) % 24;
        }
        if (newHour < 0) newHour += 24;

        const daysOffset = Math.floor(totalMinutes / 1440);
        let newDate = new Date(referenceDate);
        newDate.setDate(newDate.getDate() + daysOffset);

        setBaseTime(newHour);
        setBaseMinutes(newMinutes);
        setBaseDate(newDate);
      },

      // Finalize the time change when user releases the drag
      onPanResponderRelease: () => {
        const targetQuarters = totalQuartersMoved + pendingQuarterChange;
        setTotalQuartersMoved(targetQuarters);

        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const totalMinutes =
          referenceDate.getHours() * 60 +
          Math.floor(referenceDate.getMinutes() / 15) * 15 +
          targetQuarters * 15;

        let newHour = Math.floor(totalMinutes / 60) % 24;
        let newMinutes = Math.round((totalMinutes % 60) / 15) * 15;

        if (newMinutes === 60) {
          newMinutes = 0;
          newHour = (newHour + 1) % 24;
        }
        if (newHour < 0) newHour += 24;

        const daysOffset = Math.floor(totalMinutes / 1440);
        let newDate = new Date(referenceDate);
        newDate.setDate(newDate.getDate() + daysOffset);

        setBaseTime(newHour);
        setBaseMinutes(newMinutes);
        setBaseDate(newDate);
        setPendingQuarterChange(0);
      },
    })
  ).current;

  // Creates a horizontal swipe gesture for each location card (delete/pin)
  const createSwipePanResponder = (locationId) => {
    if (!swipePositions[locationId]) {
      swipePositions[locationId] = new Animated.Value(0);
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      // Only activate pan when swiping horizontally
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,

      // Drag left to reveal actions (max -160px)
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          swipePositions[locationId].setValue(Math.max(gestureState.dx, -160));
        } else if (swipePositions[locationId]._value < 0) {
          swipePositions[locationId].setValue(
            Math.min(gestureState.dx + swipePositions[locationId]._value, 0)
          );
        }
      },

      // Snap open or closed depending on swipe distance
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Animated.spring(swipePositions[locationId], {
            toValue: -160,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(swipePositions[locationId], {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  };

  // Removes a location and resets swipe animation
  const deleteLocation = (locationId) => {
    setSelectedLocations(selectedLocations.filter((loc) => loc.id !== locationId));

    if (swipePositions[locationId]) {
      Animated.spring(swipePositions[locationId], {
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        swipePositions[locationId].setValue(0);
      });
    }
  };

  // Moves a location to the top (pin) and resets swipe position
  const pinLocation = (locationId) => {
    const locationToPin = selectedLocations.find((loc) => loc.id === locationId);
    const otherLocations = selectedLocations.filter((loc) => loc.id !== locationId);
    setSelectedLocations([locationToPin, ...otherLocations]);

    if (swipePositions[locationId]) {
      Animated.spring(swipePositions[locationId], {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  // Generates hour/minute tick marks for the slider timeline
  const renderSliderTicks = () => {
    const ticks = [];
    const currentTotalMinutes =
      baseTime * 60 + baseMinutes + pendingQuarterChange * 15;

    for (let i = -12; i <= 12; i++) {
      const tickTotalMinutes = currentTotalMinutes + i * 15;

      let adjustedMinutes = tickTotalMinutes % 1440;
      if (adjustedMinutes < 0) adjustedMinutes += 1440;

      const tickHour = Math.floor(adjustedMinutes / 60);
      const tickMinute = adjustedMinutes % 60;

      const isHour = tickMinute === 0; // highlight full hours

      ticks.push({ hour: isHour ? tickHour : null, isHour, key: i });
    }

    return ticks;
  };

  // Generates a 7-day range centered around the selected base date
  const generateWeekDays = () => {
    const days = [];
    const startDate = new Date(baseDate);
    startDate.setDate(baseDate.getDate() - 3);

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
      >
        {selectedLocations.length > 0 ? (
          selectedLocations.map((location, index) => {
            const { hour, minutes, date } = calculateTimeForLocation(location);
            const isMain = index === 0;
            const timeDiff = getTimeDifference(location);
            const gradient = getTimeGradient(hour, minutes);

            if (!swipePositions[location.id]) {
              swipePositions[location.id] = new Animated.Value(0);
            }

            return (
              <View key={location.id} style={styles.locationContainer}>
                {/* LOCATION CARD */}
                <Animated.View
                  style={[
                    styles.locationCard,
                    { transform: [{ translateX: isMain ? 0 : swipePositions[location.id] }] },
                  ]}
                  {...(!isMain ? createSwipePanResponder(location.id).panHandlers : {})}
                >
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

                    {/* SLIDER & WEEK SELECTOR (only for main location) */}
                    {isMain && (
                      <>
                        {/* Slider */}
                        <View style={styles.sliderContainer} {...sliderPanResponder.panHandlers}>
                          <View style={styles.ticksContainer}>
                            {renderSliderTicks().map((tick) => (
                              <View key={tick.key} style={styles.tickWrapper}>
                                <View style={[styles.tick, tick.isHour && styles.tickHour]} />
                                {tick.isHour && <Text style={styles.tickLabel}>{tick.hour}</Text>}
                              </View>
                            ))}
                          </View>
                          <View style={styles.centerIndicator}>
                            <View style={styles.centerDot} />
                          </View>
                        </View>

                        {/* Week Days */}
                        <View style={styles.weekContainer}>
                          {generateWeekDays().map((day, idx) => {
                            const isSelected = day.toDateString() === baseDate.toDateString();
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
                </Animated.View>

                {/* SWIPE ACTIONS (only for non-main locations) */}
                {!isMain && (
                  <View style={styles.swipeActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteLocation(location.id)}
                    >
                      <Ionicons name="close" size={28} color="white" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.pinButton]}
                      onPress={() => pinLocation(location.id)}
                    >
                      <Ionicons name="pin" size={28} color="white" />
                      <Text style={styles.actionButtonText}>Pin</Text>
                    </TouchableOpacity>
                  </View>
                )}
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