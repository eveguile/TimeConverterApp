// App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TimeConverterApp() {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [currentView, setCurrentView] = useState('Default');
  
  const now = new Date();
  const [viewStates, setViewStates] = useState(() => ({
    Default: {
      locations: [],
      time: now.getHours(),
      minutes: Math.floor(now.getMinutes() / 15) * 15,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  }));
  
  const [allViews, setAllViews] = useState(['Default']);
  const [showAddView, setShowAddView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [baseTime, setBaseTime] = useState(now.getHours());
  const [baseMinutes, setBaseMinutes] = useState(Math.floor(now.getMinutes() / 15) * 15);
  const [baseDate, setBaseDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [totalQuartersMoved, setTotalQuartersMoved] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [pendingQuarterChange, setPendingQuarterChange] = useState(0);

  const sliderPosition = useRef(new Animated.Value(0)).current;
  const swipePositions = useRef({}).current;

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

  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getTimeGradient = (hour, minutes) => {
    const totalMinutes = hour * 60 + minutes;
    if (totalMinutes >= 1200 || totalMinutes < 480) {
      return ['#1e3a8a', '#0f172a'];
    } else if (totalMinutes >= 480 && totalMinutes < 540) {
      const progress = (totalMinutes - 480) / 60;
      if (progress < 0.33) return ['#1e3a8a', '#1e40af'];
      else if (progress < 0.67) return ['#1e40af', '#2563eb'];
      else return ['#2563eb', '#38bdf8'];
    } else if (totalMinutes >= 540 && totalMinutes < 1140) {
      return ['#38bdf8', '#3b82f6'];
    } else {
      const progress = (totalMinutes - 1140) / 60;
      if (progress < 0.33) return ['#38bdf8', '#2563eb'];
      else if (progress < 0.67) return ['#2563eb', '#1e40af'];
      else return ['#1e40af', '#1e3a8a'];
    }
  };

  const handleAddView = () => {
    if (newViewName.trim() && !allViews.includes(newViewName.trim())) {
      const viewName = newViewName.trim();
      const now = new Date();
      setAllViews([...allViews, viewName]);
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

  const handleDeleteView = (viewName) => {
    if (allViews.length === 1) return;
    setAllViews(allViews.filter(v => v !== viewName));
    const newViewStates = { ...viewStates };
    delete newViewStates[viewName];
    setViewStates(newViewStates);
    if (currentView === viewName) {
      setCurrentView(allViews.filter(v => v !== viewName)[0]);
    }
  };

  const setCurrentTimeForLocation = () => {
    if (selectedLocations.length === 0) return;

    const now = new Date();
    const mainLocation = selectedLocations[0];
    const userLocalOffset = -now.getTimezoneOffset() / 60;
    const userLocalHour = now.getHours();
    const userLocalMinutes = now.getMinutes();
    const utcHour = userLocalHour - userLocalOffset;
    const utcMinutes = userLocalMinutes;
    const locationTotalMinutes = (utcHour * 60 + utcMinutes) + (mainLocation.utcOffset * 60);

    let locationHour = Math.floor(locationTotalMinutes / 60);
    let locationMinutes = locationTotalMinutes % 60;
    let locationDate = new Date(now);

    while (locationHour >= 24) {
      locationHour -= 24;
      locationDate.setDate(locationDate.getDate() + 1);
    }
    while (locationHour < 0) {
      locationHour += 24;
      locationDate.setDate(locationDate.getDate() - 1);
    }

    if (locationMinutes < 0) {
      locationMinutes += 60;
      locationHour -= 1;
      if (locationHour < 0) {
        locationHour += 24;
        locationDate.setDate(locationDate.getDate() - 1);
      }
    }

    const roundedMinutes = Math.floor(locationMinutes / 15) * 15;
    const quartersDiff = Math.floor((locationHour * 60 + roundedMinutes - (20 * 60)) / 15);
    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.floor((locationDate - referenceDate) / (1000 * 60 * 60 * 24));

    setBaseTime(locationHour);
    setBaseMinutes(roundedMinutes);
    setBaseDate(new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()));
    setTotalQuartersMoved(quartersDiff + (daysDiff * 96));
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowViewMenu(false);
  };

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
    setTotalQuartersMoved(Math.floor((totalMinutes - 20 * 60) / 15) + (daysDiff * 96));
  }, [currentView]);

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

  const handleLocationSelect = (location) => {
    if (!selectedLocations.find(loc => loc.city === location.city)) {
      setSelectedLocations([...selectedLocations, { ...location, id: Date.now() }]);
    }
    setShowLocationPopup(false);
    setSearchQuery('');
  };

  const calculateTimeForLocation = (location) => {
    if (!selectedLocations.length) return { hour: baseTime, minutes: baseMinutes, date: baseDate };

    const mainLocation = selectedLocations[0];
    const timeDiffHours = location.utcOffset - mainLocation.utcOffset;
    const timeDiffMinutes = timeDiffHours * 60;
    let totalMinutes = baseTime * 60 + baseMinutes + timeDiffMinutes;
    let date = new Date(baseDate);

    while (totalMinutes >= 1440) {
      totalMinutes -= 1440;
      date.setDate(date.getDate() + 1);
    }
    while (totalMinutes < 0) {
      totalMinutes += 1440;
      date.setDate(date.getDate() - 1);
    }

    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hour, minutes, date };
  };

  const getDateString = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const formatTime = (hour, minutes) => {
    const h = hour % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${h}:${m} ${ampm}`;
  };

  const getTimeDifference = (location) => {
    if (!selectedLocations.length || location.id === selectedLocations[0].id) return null;

    const mainLocation = selectedLocations[0];
    const diff = location.utcOffset - mainLocation.utcOffset;
    if (diff > 0) return `${diff} hrs Ahead`;
    if (diff < 0) return `${Math.abs(diff)} hrs Behind`;
    return 'Same Time';
  };

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setPendingQuarterChange(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaX = gestureState.dx;
        const quarterChange = -Math.round((deltaX / SCREEN_WIDTH) * 48);
        
        if (quarterChange !== pendingQuarterChange) {
          setPendingQuarterChange(quarterChange);
          triggerHaptic();
        }

        const snappedQuarters = totalQuartersMoved + quarterChange;
        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const totalMinutes = (referenceDate.getHours() * 60 + Math.floor(referenceDate.getMinutes() / 15) * 15) + (snappedQuarters * 15);
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
      onPanResponderRelease: () => {
        const targetQuarters = totalQuartersMoved + pendingQuarterChange;
        setTotalQuartersMoved(targetQuarters);

        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const totalMinutes = (referenceDate.getHours() * 60 + Math.floor(referenceDate.getMinutes() / 15) * 15) + (targetQuarters * 15);
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

  const createSwipePanResponder = (locationId) => {
    if (!swipePositions[locationId]) {
      swipePositions[locationId] = new Animated.Value(0);
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          swipePositions[locationId].setValue(Math.max(gestureState.dx, -160));
        } else if (swipePositions[locationId]._value < 0) {
          swipePositions[locationId].setValue(Math.min(gestureState.dx + swipePositions[locationId]._value, 0));
        }
      },
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

  const deleteLocation = (locationId) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.id !== locationId));
    if (swipePositions[locationId]) {
      Animated.spring(swipePositions[locationId], {
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        swipePositions[locationId].setValue(0);
      });
    }
  };

  const pinLocation = (locationId) => {
    const locationToPin = selectedLocations.find(loc => loc.id === locationId);
    const otherLocations = selectedLocations.filter(loc => loc.id !== locationId);
    setSelectedLocations([locationToPin, ...otherLocations]);

    if (swipePositions[locationId]) {
      Animated.spring(swipePositions[locationId], {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const renderSliderTicks = () => {
    const ticks = [];
    const currentTotalMinutes = baseTime * 60 + baseMinutes + (pendingQuarterChange * 15);

    for (let i = -12; i <= 12; i++) {
      const tickTotalMinutes = currentTotalMinutes + (i * 15);
      let adjustedMinutes = tickTotalMinutes % 1440;
      if (adjustedMinutes < 0) adjustedMinutes += 1440;

      const tickHour = Math.floor(adjustedMinutes / 60);
      const tickMinute = adjustedMinutes % 60;
      const isHour = tickMinute === 0;

      ticks.push({ hour: isHour ? tickHour : null, isHour, key: i });
    }

    return ticks;
  };

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

  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleAddToCalendar = async () => {
    if (selectedLocations.length === 0) return;

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Calendar permission is required to add events');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        alert('No calendar available');
        return;
      }

      const location = selectedLocations[0];
      const startDate = new Date(baseDate);
      startDate.setHours(baseTime, baseMinutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setShowViewMenu(!showViewMenu)}
        >
          <Text style={styles.viewButtonTextOrange}>{currentView}</Text>
          <Text style={styles.viewButtonTextGray}> View</Text>
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowLocationPopup(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
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
                <Animated.View
                  style={[
                    styles.locationCard,
                    {
                      transform: [{ translateX: isMain ? 0 : swipePositions[location.id] }],
                    },
                  ]}
                  {...(!isMain ? createSwipePanResponder(location.id).panHandlers : {})}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
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

                    {isMain && (
                      <>
                        {/* Slider */}
                        <View
                          style={styles.sliderContainer}
                          {...sliderPanResponder.panHandlers}
                        >
                          <View style={styles.ticksContainer}>
                            {renderSliderTicks().map((tick) => (
                              <View key={tick.key} style={styles.tickWrapper}>
                                <View style={[styles.tick, tick.isHour && styles.tickHour]} />
                                {tick.isHour && (
                                  <Text style={styles.tickLabel}>{tick.hour}</Text>
                                )}
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
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>No time zones added yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add time zones</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Buttons */}
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

      {/* View Menu Modal */}
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
              <TouchableOpacity
                style={styles.addViewMenuItem}
                onPress={() => setShowAddView(true)}
              >
                <Ionicons name="add" size={16} color="#3b82f6" />
                <Text style={styles.addViewMenuText}>Add New View</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Popup Modal */}
      <Modal
        visible={showLocationPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationPopup}>
            <View style={styles.locationPopupHeader}>
              <Text style={styles.locationPopupTitle}>Add Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPopup(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search City..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <ScrollView style={styles.locationList}>
              {locations.map((location, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location)}
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
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity
            style={styles.calendarPopup}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
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
            <View style={styles.calendarGrid}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarDayLabel}>{day}</Text>
              ))}
              {generateCalendarDays().map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarDay,
                    day && day.toDateString() === baseDate.toDateString() && styles.calendarDaySelected,
                  ]}
                  onPress={() => {
                    if (day) {
                      setBaseDate(day);
                      setShowCalendar(false);
                    }
                  }}
                  disabled={!day}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      day && day.toDateString() === baseDate.toDateString() && styles.calendarDayTextSelected,
                      !day && styles.calendarDayTextEmpty,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
  },
  viewButtonTextOrange: {
    color: '#fb923c',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButtonTextGray: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  locationContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  locationCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  cityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeDisplay: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sliderContainer: {
    height: 96,
    marginBottom: 24,
    position: 'relative',
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '100%',
  },
  tickWrapper: {
    alignItems: 'center',
  },
  tick: {
    width: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  tickHour: {
    height: 16,
  },
  tickLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  centerIndicator: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ef4444',
    borderRadius: 2,
    transform: [{ translateX: -2 }],
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: 'white',
    transform: [{ translateY: -10 }],
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dayLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayNumberSelected: {
    color: 'white',
  },
  calendarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  swipeActions: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  pinButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    paddingVertical: 12,
    borderRadius: 25,
  },
  bottomButtonDisabled: {
    opacity: 0.5,
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMenu: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 16,
    minWidth: 200,
    padding: 8,
    marginHorizontal: 20,
  },
  viewMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewMenuButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewMenuText: {
    color: '#d1d5db',
    fontSize: 16,
  },
  viewMenuTextActive: {
    color: '#fb923c',
    fontWeight: '600',
  },
  deleteViewButton: {
    padding: 12,
  },
  viewMenuDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  addViewContainer: {
    padding: 12,
  },
  addViewInput: {
    backgroundColor: '#374151',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  addViewButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addViewButtonConfirm: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  addViewButtonCancel: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  addViewButtonText: {
    color: 'white',
    fontSize: 14,
  },
  addViewMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addViewMenuText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  locationPopup: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  locationPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  locationPopupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  searchInput: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 24,
    marginTop: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  locationList: {
    maxHeight: 400,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
  },
  locationItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationItemOffset: {
    color: '#9ca3af',
    fontSize: 14,
  },
  calendarPopup: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 24,
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  calendarArrow: {
    padding: 8,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 8,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#3b82f6',
  },
  calendarDayText: {
    color: 'white',
    fontSize: 14,
  },
  calendarDayTextSelected: {
    fontWeight: 'bold',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
});