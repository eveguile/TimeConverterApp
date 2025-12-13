// App.js
import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import styles from './styles';

export default function TimeConverterApp() {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [currentView, setCurrentView] = useState('Default');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRenameView, setShowRenameView] = useState(false);
  const [renameViewText, setRenameViewText] = useState('');

  const now = new Date();
  const [viewStates, setViewStates] = useState(() => ({
    Default: {
      locations: [],
      time: now.getHours(),
      minutes: Math.floor(now.getMinutes() / 5) * 5,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      isLive: true,
      lastManualUpdate: null
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
  const [baseMinutes, setBaseMinutes] = useState(Math.floor(now.getMinutes() / 5) * 5);
  const [baseDate, setBaseDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [totalStepsMoved, setTotalStepsMoved] = useState(0); // steps of 5-min
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [pendingStepChange, setPendingStepChange] = useState(0);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [expandedCards, setExpandedCards] = useState({});
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Animated value for smooth visual dragging
  const sliderAnim = useRef(new Animated.Value(0)).current;

  // swipe positions for per-card swipe-to-reveal
  const swipePositions = useRef({}).current;

  // picker temporary selection for multi-add
  const [pickerSelected, setPickerSelected] = useState([]);

  // measurement refs for tick container per-card
  const ticksWidthRefs = useRef({}).current; // pixel width of ticks area per card
  const pxPerStepRef = useRef({}).current; // pixel per 5-min step per card
  const sliderAreaHeights = useRef({}).current; // vertical top offset/height for slider area per card (for gesture discrimination)

  // visible steps in slider: we want +/-12 hours visible -> 24 hours window? We'll show +/-12 hours = 144 steps (5-min)
  const VISIBLE_STEPS = 144; // corresponds to 12 hours at 5-min steps each side (total span 24 hours if center-to-edge is 12h)

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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live mode baseTime update
  useEffect(() => {
    if (isLiveMode && selectedLocations.length > 0) {
      const nowDt = new Date();
      const mainLocation = selectedLocations[0];
      const userLocalOffset = -nowDt.getTimezoneOffset() / 60;
      const userLocalHour = nowDt.getHours();
      const userLocalMinutes = nowDt.getMinutes();
      const utcHour = userLocalHour - userLocalOffset;
      const utcMinutes = userLocalMinutes;
      const locationTotalMinutes = (utcHour * 60 + utcMinutes) + (mainLocation.utcOffset * 60);

      let locationHour = Math.floor(locationTotalMinutes / 60);
      let locationMinutes = locationTotalMinutes % 60;
      let locationDate = new Date(nowDt);

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

      const roundedMinutes = Math.floor(locationMinutes / 5) * 5;
      // compute steps relative to reference 20:00 as earlier logic used; keep same base
      const stepsDiff = Math.floor((locationHour * 60 + roundedMinutes - (20 * 60)) / 5);
      const referenceDate = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate());
      const daysDiff = Math.floor((locationDate - referenceDate) / (1000 * 60 * 60 * 24));

      setBaseTime(locationHour);
      setBaseMinutes(roundedMinutes);
      setBaseDate(new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()));
      setTotalStepsMoved(stepsDiff + (daysDiff * (24 * 60 / 5)));
      Animated.timing(sliderAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTime, isLiveMode, selectedLocations]);

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
      const nowDt = new Date();
      setAllViews([...allViews, viewName]);
      setViewStates(prev => ({
        ...prev,
        [viewName]: {
          locations: [],
          time: nowDt.getHours(),
          minutes: Math.floor(nowDt.getMinutes() / 5) * 5,
          date: new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate()),
          isLive: true,
          lastManualUpdate: null
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

  const handleRenameView = () => {
    if (renameViewText.trim() && !allViews.includes(renameViewText.trim())) {
      const oldName = currentView;
      const newName = renameViewText.trim();

      setAllViews(allViews.map(v => v === oldName ? newName : v));

      const newViewStates = { ...viewStates };
      newViewStates[newName] = newViewStates[oldName];
      delete newViewStates[oldName];
      setViewStates(newViewStates);

      setCurrentView(newName);
      setRenameViewText('');
      setShowRenameView(false);
      setShowSettingsMenu(false);
    }
  };

  const handleDeleteCurrentView = () => {
    if (allViews.length === 1) {
      Alert.alert('Cannot Delete', 'You must have at least one view.');
      return;
    }

    Alert.alert(
      'Delete View',
      `Are you sure you want to delete "${currentView}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleDeleteView(currentView);
            setShowSettingsMenu(false);
          }
        }
      ]
    );
  };

  const setCurrentTimeForLocation = () => {
    if (selectedLocations.length === 0) return;

    const nowDt = new Date();
    const mainLocation = selectedLocations[0];
    const userLocalOffset = -nowDt.getTimezoneOffset() / 60;
    const userLocalHour = nowDt.getHours();
    const userLocalMinutes = nowDt.getMinutes();
    const utcHour = userLocalHour - userLocalOffset;
    const utcMinutes = userLocalMinutes;
    const locationTotalMinutes = (utcHour * 60 + utcMinutes) + (mainLocation.utcOffset * 60);

    let locationHour = Math.floor(locationTotalMinutes / 60);
    let locationMinutes = locationTotalMinutes % 60;
    let locationDate = new Date(nowDt);

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

    const roundedMinutes = Math.floor(locationMinutes / 5) * 5;
    const stepsDiff = Math.floor((locationHour * 60 + roundedMinutes - (20 * 60)) / 5);
    const referenceDate = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate());
    const daysDiff = Math.floor((locationDate - referenceDate) / (1000 * 60 * 60 * 24));

    setBaseTime(locationHour);
    setBaseMinutes(roundedMinutes);
    setBaseDate(new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()));
    setTotalStepsMoved(stepsDiff + (daysDiff * (24 * 60 / 5)));
    setIsLiveMode(true);

    Animated.timing(sliderAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
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
    setIsLiveMode(currentState.isLive !== false);

    const totalMinutes = currentState.time * 60 + (currentState.minutes || 0);
    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.floor((currentState.date - referenceDate) / (1000 * 60 * 60 * 24));
    setTotalStepsMoved(Math.floor((totalMinutes - 20 * 60) / 5) + (daysDiff * (24 * 60 / 5)));
    Animated.timing(sliderAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [currentView]);

  useEffect(() => {
    setViewStates(prev => ({
      ...prev,
      [currentView]: {
        locations: selectedLocations,
        time: baseTime,
        minutes: baseMinutes,
        date: baseDate,
        isLive: isLiveMode,
        lastManualUpdate: isLiveMode ? null : new Date()
      }
    }));
  }, [selectedLocations, baseTime, baseMinutes, baseDate, currentView, isLiveMode]);

  // Picker multi-select helpers
  const togglePickerSelection = (location) => {
    const exists = pickerSelected.find(l => l.city === location.city);
    if (exists) {
      setPickerSelected(pickerSelected.filter(l => l.city !== location.city));
    } else {
      setPickerSelected([...pickerSelected, location]);
    }
  };

  const removePickerTag = (location) => {
    setPickerSelected(pickerSelected.filter(l => l.city !== location.city));
  };

  const addSelectedFromPicker = () => {
    const toAdd = pickerSelected.filter(p => !selectedLocations.find(s => s.city === p.city));
    if (toAdd.length === 0) {
      setShowLocationPopup(false);
      setPickerSelected([]);
      return;
    }
    const withIds = toAdd.map(l => ({ ...l, id: Date.now() + Math.random() }));
    setSelectedLocations([...selectedLocations, ...withIds]);
    setPickerSelected([]);
    setShowLocationPopup(false);
    setSearchQuery('');
  };

  const handleLocationSelect = (location) => {
    togglePickerSelection(location);
  };

  const calculateTimeForLocation = (location) => {
    if (!selectedLocations.length) return { hour: baseTime, minutes: baseMinutes, date: baseDate };

    const mainLocation = selectedLocations[0];

    if (isLiveMode) {
      const nowDt = new Date();
      const userLocalOffset = -nowDt.getTimezoneOffset() / 60;
      const userLocalHour = nowDt.getHours();
      const userLocalMinutes = nowDt.getMinutes();
      const utcHour = userLocalHour - userLocalOffset;
      const utcMinutes = userLocalMinutes;
      const locationTotalMinutes = (utcHour * 60 + utcMinutes) + (location.utcOffset * 60);

      let locationHour = Math.floor(locationTotalMinutes / 60);
      let locationMinutes = locationTotalMinutes % 60;
      let locationDate = new Date(nowDt);

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

      return { 
        hour: locationHour, 
        minutes: locationMinutes, 
        date: new Date(locationDate.getFullYear(), locationDate.getMonth(), locationDate.getDate()) 
      };
    } else {
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
    }
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

  // Slider pan responder - active only inside slider area (attached to inner ticks view)
  const sliderGestureState = useRef({ isActive: false }).current;

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e, gs) => {
        // slider handlers are attached only when expanded, so allow here
        return true;
      },
      onMoveShouldSetPanResponder: (e, gs) => {
        const dx = Math.abs(gs.dx);
        const dy = Math.abs(gs.dy);
        return dx > 6 && dx > dy;
      },
      onPanResponderGrant: () => {
        sliderAnim.stopAnimation();
        sliderGestureState.isActive = true;
        setPendingStepChange(0);
        setIsLiveMode(false);
      },
      onPanResponderMove: (e, gs) => {
        const dx = gs.dx;
        // map dx to steps (5-min) across screen width
        const stepsFloat = - (dx / SCREEN_WIDTH) * VISIBLE_STEPS;
        // smooth visual movement
        sliderAnim.setValue(dx);

        const stepsRounded = Math.round(stepsFloat);
        if (stepsRounded !== pendingStepChange) {
          setPendingStepChange(stepsRounded);
          triggerHaptic();
        }

        const snappedSteps = totalStepsMoved + stepsRounded;
        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const baseReferenceMinutes = (referenceDate.getHours() * 60 + Math.floor(referenceDate.getMinutes() / 5) * 5);
        const totalMinutes = baseReferenceMinutes + (snappedSteps * 5);
        let newHour = Math.floor(totalMinutes / 60) % 24;
        let newMinutes = Math.round((totalMinutes % 60) / 5) * 5;
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
        sliderGestureState.isActive = false;
        const targetSteps = totalStepsMoved + pendingStepChange;
        setTotalStepsMoved(targetSteps);

        const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const baseReferenceMinutes = (referenceDate.getHours() * 60 + Math.floor(referenceDate.getMinutes() / 5) * 5);
        const totalMinutes = baseReferenceMinutes + (targetSteps * 5);
        let newHour = Math.floor(totalMinutes / 60) % 24;
        let newMinutes = Math.round((totalMinutes % 60) / 5) * 5;
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
        setPendingStepChange(0);

        // animate sliderAnim back to center
        Animated.timing(sliderAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        setPendingStepChange(0);
        Animated.timing(sliderAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }).start();
      }
    })
  ).current;

  // Per-card swipe responder factory - improved conflict handling:
  // Only allow swipes when touch starts in the top strip of the card (prevents accidental swipes while using slider)
  const createSwipePanResponder = (locationId) => {
    if (!swipePositions[locationId]) {
      const val = new Animated.Value(0);
      val._gestureState = { wasExpanded: false };
      swipePositions[locationId] = val;
    }

    // how tall the top strip is (in px) that responds to card swiping
    const TOP_SWIPE_HEIGHT = 56;

    return PanResponder.create({
      onStartShouldSetPanResponder: (evt, gs) => {
        // disable swipe when card is expanded (prevents interference with time slider)
        if (expandedCardId === locationId) {
          return false;
        }
        // limit card-swiping to the small top strip
        const touchY = evt.nativeEvent.locationY; // position relative to card
        if (touchY > TOP_SWIPE_HEIGHT) {
          // touch started below top strip -> do not claim responder (prevents accidental swipes while adjusting slider)
          return false;
        }
        // otherwise allow swipe to start
        return true;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // disable swipe when card is expanded
        if (expandedCardId === locationId) {
          return false;
        }
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        swipePositions[locationId]._gestureState.wasExpanded = (expandedCardId === locationId);
        if (swipePositions[locationId]._gestureState.wasExpanded) {
          // collapse visually so swipe can reveal actions
          setExpandedCardId(null);
        }
      },
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
        swipePositions[locationId]._gestureState.wasExpanded = false;
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
    if (expandedCardId === locationId) setExpandedCardId(null);
  };

  const pinLocation = (locationId) => {
    const locationToPin = selectedLocations.find(loc => loc.id === locationId);
    if (!locationToPin) return;
    const otherLocations = selectedLocations.filter(loc => loc.id !== locationId);
    setSelectedLocations([locationToPin, ...otherLocations]);

    if (swipePositions[locationId]) {
      Animated.spring(swipePositions[locationId], {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  // render ticks at 5-minute steps with denser small ticks, medium 15-min, big hourly ticks with labels
  const renderSliderTicks = () => {
    const ticks = [];
    // base minutes preview
    const currentTotalMinutes = baseTime * 60 + baseMinutes + (pendingStepChange * 5);
    // show center +/- (VISIBLE_STEPS/2)
    const half = Math.floor(VISIBLE_STEPS / 2);
    for (let s = -half; s <= half; s++) {
      const tickTotalMinutes = currentTotalMinutes + (s * 5);
      let adjustedMinutes = tickTotalMinutes % 1440;
      if (adjustedMinutes < 0) adjustedMinutes += 1440;
      const tickHour = Math.floor(adjustedMinutes / 60);
      const tickMinute = adjustedMinutes % 60;
      const isHour = tickMinute === 0;
      const isQuarter = tickMinute % 15 === 0;
      ticks.push({ step: s, minute: tickMinute, hour: tickHour, isHour, isQuarter, key: s });
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

  const getPinnedLocationDateTime = () => {
    if (selectedLocations.length === 0) return null;

    const mainLocation = selectedLocations[0];
    const { hour, minutes, date } = calculateTimeForLocation(mainLocation);

    // Create a UTC date representing the exact moment in the pinned location's timezone
    // We need to work backwards from the location's local time to UTC
    const locationDateTime = new Date(date);
    locationDateTime.setHours(hour, minutes, 0, 0);

    // Calculate UTC time by subtracting the location's UTC offset
    const utcTime = new Date(locationDateTime.getTime() - (mainLocation.utcOffset * 60 * 60 * 1000));

    return utcTime;
  };

  const handleAddToCalendar = () => {
    if (selectedLocations.length === 0) return;
    setMeetingTitle('');
    setMeetingNotes('');
    setMeetingDuration(60);
    setShowCalendarModal(true);
  };

  const addToGoogleCalendar = () => {
    const eventTime = getPinnedLocationDateTime();
    if (!eventTime) return;

    const endTime = new Date(eventTime.getTime() + meetingDuration * 60000);

    const formatGoogleDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const title = meetingTitle || 'Meeting';
    const location = selectedLocations[0].city;
    const description = meetingNotes || '';

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGoogleDate(eventTime)}/${formatGoogleDate(endTime)}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(description)}&sf=true&output=xml`;

    Linking.openURL(url);
    setShowCalendarModal(false);
  };

  const addToOutlookCalendar = () => {
    const eventTime = getPinnedLocationDateTime();
    if (!eventTime) return;

    const endTime = new Date(eventTime.getTime() + meetingDuration * 60000);

    const formatOutlookDate = (date) => {
      return date.toISOString();
    };

    const title = meetingTitle || 'Meeting';
    const location = selectedLocations[0].city;
    const description = meetingNotes || '';

    const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${formatOutlookDate(eventTime)}&enddt=${formatOutlookDate(endTime)}&location=${encodeURIComponent(location)}&body=${encodeURIComponent(description)}&path=/calendar/action/compose&rru=addevent`;

    Linking.openURL(url);
    setShowCalendarModal(false);
  };

  const addToAppleCalendar = async () => {
    const eventTime = getPinnedLocationDateTime();
    if (!eventTime) return;

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Calendar permission is required to add events');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No calendar available');
        return;
      }

      const endTime = new Date(eventTime.getTime() + meetingDuration * 60000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: meetingTitle || 'Meeting',
        startDate: eventTime,
        endDate: endTime,
        location: selectedLocations[0].city,
        notes: meetingNotes || '',
        timeZone: 'default',
      });

      Alert.alert('Success', 'Event added to calendar!');
      setShowCalendarModal(false);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add event to calendar');
    }
  };

  const handleCardPress = (locationId) => {
    // tap to expand/collapse - user requested tap to expand
    if (expandedCardId === locationId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(locationId);
      // reset swipe position
      if (swipePositions[locationId]) {
        Animated.spring(swipePositions[locationId], {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
    triggerHaptic();
  };

  // compute left position in px for per-card indicator
  const computeIndicatorLeft = (cardId, stepOffset) => {
    const width = ticksWidthRefs[cardId] || 0;
    const pxPerStep = pxPerStepRef[cardId] || (width / (VISIBLE_STEPS || 1));
    const centerX = width / 2;
    return centerX + (stepOffset * pxPerStep);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setShowViewMenu(!showViewMenu)}
          >
            <Text style={styles.viewButtonTextOrange}>{currentView}</Text>
            <Text style={styles.viewButtonTextGray}> View</Text>
            <Ionicons name="chevron-down" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettingsMenu(!showSettingsMenu)}
          >
            <Ionicons name="settings-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowLocationPopup(true);
            setPickerSelected([]);
            setSearchQuery('');
          }}
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
            const isExpanded = expandedCardId === location.id;

            if (!swipePositions[location.id]) {
              const val = new Animated.Value(0);
              val._gestureState = { wasExpanded: false };
              swipePositions[location.id] = val;
            }

            // compute per-card indicator step offset (rounded to nearest 5-min step)
            let indicatorStepOffset = 0;
            if (isLiveMode) {
              // compute current time for this location (in minutes)
              const nowDt = new Date();
              const userLocalOffset = -nowDt.getTimezoneOffset() / 60;
              const utcHour = nowDt.getHours() - userLocalOffset;
              const utcMinutes = nowDt.getMinutes();
              const locationTotalMinutesRaw = (utcHour * 60 + utcMinutes) + (location.utcOffset * 60);

              // normalize into 0..1439
              let locationTotalMinutes = locationTotalMinutesRaw % 1440;
              if (locationTotalMinutes < 0) locationTotalMinutes += 1440;

              // use same rounding behavior as slider (floor to 5-min)
              const roundedLocMinutes = Math.floor((locationTotalMinutes % 60) / 5) * 5;
              const locHour = Math.floor(locationTotalMinutes / 60);
              const locTotalRounded = locHour * 60 + roundedLocMinutes;

              // compute current slider center time in total minutes (same as renderSliderTicks)
              const currentTotalMinutes = baseTime * 60 + baseMinutes + (pendingStepChange * 5);

              // difference from slider center
              let diffMinutes = locTotalRounded - currentTotalMinutes;

              // normalize to -720..720 to account for wrap-around (choose shortest direction)
              if (diffMinutes > 720) diffMinutes -= 1440;
              if (diffMinutes < -720) diffMinutes += 1440;

              indicatorStepOffset = Math.round(diffMinutes / 5);
            } else {
              const main = selectedLocations[0];
              const timeDiffHours = location.utcOffset - main.utcOffset;
              indicatorStepOffset = Math.round((timeDiffHours * 60) / 5);
            }

            return (
              <View key={location.id} style={styles.locationContainer}>
                <View style={styles.swipeActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteLocation(location.id)}
                  >
                    <Ionicons name="close" size={28} color="white" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                  {!isMain && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.pinButton]}
                      onPress={() => pinLocation(location.id)}
                    >
                      <Ionicons name="pin" size={28} color="white" />
                      <Text style={styles.actionButtonText}>Pin</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Animated.View
                  style={[
                    styles.locationCard,
                    {
                      transform: [{ translateX: swipePositions[location.id] }],
                    },
                  ]}
                  {...createSwipePanResponder(location.id).panHandlers}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleCardPress(location.id)}
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

                     {isExpanded && (
  <>
    {/* --- NEW SLIDER FROM app2.js --- */}
    <View
      style={styles.sliderContainer}
      {...sliderPanResponder.panHandlers}
    >
      <View style={styles.ticksContainer}>
        {renderSliderTicks().map((tick, index) => (
          <View
            key={index}
            style={[
              styles.tick,
              tick.isHour ? styles.tickHour : styles.tickRegular,
            ]}
          />
        ))}
      </View>

      {/* Center indicator */}
      <View style={styles.centerIndicator}>
        <View style={styles.centerDot} />
      </View>
    </View>

    {/* Weekday selector remains unchanged */}
    <View style={styles.weekContainer}>
      {generateWeekDays().map((day, idx) => {
        const isSelected = day.toDateString() === baseDate.toDateString();
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
            onPress={() => {
              setBaseDate(day);
              setIsLiveMode(false);
            }}
          >
            <Text style={styles.dayLabel}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                isSelected && styles.dayNumberSelected,
              ]}
            >
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
                  </TouchableOpacity>
                </Animated.View>
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

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bottom Buttons */}
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

      {/* Settings */}
      <Modal
        visible={showSettingsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
          <View style={styles.settingsMenu}>
            <TouchableOpacity
              style={styles.settingsMenuItem}
              onPress={() => {
                setRenameViewText(currentView);
                setShowRenameView(true);
                setShowSettingsMenu(false);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color="#3b82f6" />
              <Text style={styles.settingsMenuText}>Rename View</Text>
            </TouchableOpacity>
            <View style={styles.settingsMenuDivider} />
            <TouchableOpacity
              style={styles.settingsMenuItem}
              onPress={handleDeleteCurrentView}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.settingsMenuText, styles.settingsMenuTextDanger]}>Delete View</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename View Modal */}
      <Modal
        visible={showRenameView}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameView(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRenameView(false)}
        >
          <TouchableOpacity
            style={styles.renameViewModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.renameViewTitle}>Rename View</Text>
            <TextInput
              style={styles.renameViewInput}
              placeholder="New view name..."
              placeholderTextColor="#9ca3af"
              value={renameViewText}
              onChangeText={setRenameViewText}
              autoFocus
            />
            <View style={styles.renameViewButtons}>
              <TouchableOpacity
                style={styles.renameViewButtonCancel}
                onPress={() => {
                  setShowRenameView(false);
                  setRenameViewText('');
                }}
              >
                <Text style={styles.renameViewButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameViewButtonConfirm}
                onPress={handleRenameView}
              >
                <Text style={styles.renameViewButtonText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* View Menu */}
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

      {/* Location Popup (multi-select) */}
      <Modal
        visible={showLocationPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationPopup}>
            <View style={styles.locationPopupHeader}>
              <Text style={styles.locationPopupTitle}>Add Location(s)</Text>
              <TouchableOpacity onPress={() => setShowLocationPopup(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerTagsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pickerSelected.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.pickerTag}
                    onPress={() => removePickerTag(p)}
                  >
                    <Text style={styles.pickerTagText}>{p.city}</Text>
                    <Ionicons name="close" size={14} color="white" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search City..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.locationList}>
              {locations.map((location, idx) => {
                const isSelected = !!pickerSelected.find(l => l.city === location.city);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                    onPress={() => handleLocationSelect(location)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.citySelectIndicator, isSelected && styles.citySelectIndicatorActive]} />
                      <Text style={styles.locationItemText}>
                        {location.city}, {location.country}
                      </Text>
                    </View>
                    <Text style={styles.locationItemOffset}>
                      UTC{location.utcOffset >= 0 ? '+' : ''}{location.utcOffset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.pickerButtonsRow}>
              <TouchableOpacity
                style={styles.pickerButtonCancel}
                onPress={() => {
                  setShowLocationPopup(false);
                  setPickerSelected([]);
                }}
              >
                <Text style={styles.pickerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerButton, pickerSelected.length === 0 && styles.pickerButtonDisabled]}
                onPress={addSelectedFromPicker}
                disabled={pickerSelected.length === 0}
              >
                <Text style={styles.pickerButtonText}>Add Selected ({pickerSelected.length})</Text>
              </TouchableOpacity>
            </View>
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
                      setIsLiveMode(false);
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

      {/* Add to Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarAddPopup}>
            <View style={styles.calendarAddHeader}>
              <Text style={styles.calendarAddTitle}>Add to Calendar</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {selectedLocations.length > 0 && (
              <View style={styles.calendarAddInfo}>
                <View style={styles.calendarAddTimeRow}>
                  <Ionicons name="time-outline" size={20} color="#9ca3af" />
                  <Text style={styles.calendarAddTimeText}>
                    {(() => {
                      const location = selectedLocations[0];
                      const { hour, minutes, date } = calculateTimeForLocation(location);
                      const h = hour % 12 || 12;
                      const m = minutes.toString().padStart(2, '0');
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return `${h}:${m} ${ampm} - ${dateStr}`;
                    })()}
                  </Text>
                </View>
                <Text style={styles.calendarAddSubtext}>
                  {selectedLocations[0].city} Time
                </Text>
              </View>
            )}

            <TextInput
              style={styles.calendarAddInput}
              placeholder="Meeting Title (Optional)"
              placeholderTextColor="#9ca3af"
              value={meetingTitle}
              onChangeText={setMeetingTitle}
            />

            <TextInput
              style={[styles.calendarAddInput, styles.calendarAddNotesInput]}
              placeholder="Notes (Optional)"
              placeholderTextColor="#9ca3af"
              value={meetingNotes}
              onChangeText={setMeetingNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.calendarAddDurationContainer}>
              <Text style={styles.calendarAddLabel}>Duration</Text>
              <View style={styles.durationOptionsContainer}>
                {[15, 30, 60, 90, 120].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      meetingDuration === duration && styles.durationOptionSelected
                    ]}
                    onPress={() => setMeetingDuration(duration)}
                  >
                    <Text style={[
                      styles.durationOptionText,
                      meetingDuration === duration && styles.durationOptionTextSelected
                    ]}>
                      {duration} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.calendarAddButtons}>
              <TouchableOpacity
                style={styles.calendarAddButton}
                onPress={addToGoogleCalendar}
              >
                <Ionicons name="logo-google" size={24} color="white" />
                <Text style={styles.calendarAddButtonText}>Google Calendar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarAddButton}
                onPress={addToOutlookCalendar}
              >
                <Ionicons name="mail-outline" size={24} color="white" />
                <Text style={styles.calendarAddButtonText}>Outlook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarAddButton}
                onPress={addToAppleCalendar}
              >
                <Ionicons name="calendar" size={24} color="white" />
                <Text style={styles.calendarAddButtonText}>Apple Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}