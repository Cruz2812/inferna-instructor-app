// COMPLETE FIX - Timer transition working properly
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function PlayModeScreen({ route, navigation }) {
  const { classData, workouts = [] } = route.params;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showUpNext, setShowUpNext] = useState(false);
  const [isTransition, setIsTransition] = useState(false);
  const [transitionTime] = useState(10);
  
  const upNextAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef(null);
  const upNextTimeoutRef = useRef(null);
  const isTransitionRef = useRef(false);  // ✅ NEW: Ref to avoid stale closure

  const currentWorkout = workouts[currentIndex];
  const nextWorkout = workouts[currentIndex + 1];
  const isLastWorkout = currentIndex === workouts.length - 1;

  // ✅ NEW: Custom setter that updates both state and ref
  const setIsTransitionState = (value) => {
    console.log('Setting isTransition to:', value);
    isTransitionRef.current = value;
    setIsTransition(value);
  };

  // Initial workout start
  useEffect(() => {
    if (currentWorkout) {
      console.log('Initial workout load');
      startWorkout();
    }
    return () => {
      console.log('Component unmounting, cleaning up...');
      if (timerRef.current) clearInterval(timerRef.current);
      if (upNextTimeoutRef.current) clearTimeout(upNextTimeoutRef.current);
    };
  }, []);

  // Animate "Up Next" preview
  useEffect(() => {
    if (showUpNext) {
      Animated.spring(upNextAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.spring(upNextAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [showUpNext]);

  // ✅ FIXED: Handle index changes to start next workout
  useEffect(() => {
    console.log('=== INDEX CHANGED ===');
    console.log('New index:', currentIndex);
    console.log('Is transition (ref):', isTransitionRef.current);
    console.log('Workout:', workouts[currentIndex]?.name);
    
    // Only start workout if not the first (index > 0) and valid workout exists
    if (currentIndex > 0 && workouts[currentIndex]) {
      console.log('Conditions met for starting workout');
      
      // Small delay to ensure state has settled
      setTimeout(() => {
        console.log('Calling startWorkout after delay');
        startWorkout();
      }, 150);
    }
  }, [currentIndex, workouts]);

  const startWorkout = () => {
    console.log('=== START WORKOUT ===');
    console.log('Workout:', currentWorkout?.name);
    console.log('Duration:', currentWorkout?.duration_seconds);
    
    // Clear transition state
    setIsTransitionState(false);
    setIsPaused(false);
    setShowUpNext(false);
    
    // Clear any existing timers
    if (timerRef.current) {
      console.log('Clearing existing workout timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (upNextTimeoutRef.current) {
      console.log('Clearing existing up next timeout');
      clearTimeout(upNextTimeoutRef.current);
      upNextTimeoutRef.current = null;
    }
    
    const duration = currentWorkout?.duration_seconds || 60;
    console.log('Setting duration to:', duration);
    setTimeRemaining(duration);
    
    console.log('Starting timer...');
    startTimer();

    // Schedule "up next" preview
    if (duration > 15 && nextWorkout) {
      const delay = (duration - 10) * 1000;
      console.log('Scheduling up next in', delay / 1000, 'seconds');
      upNextTimeoutRef.current = setTimeout(() => {
        console.log('Showing up next preview');
        setShowUpNext(true);
      }, delay);
    }
    
    console.log('=== START WORKOUT COMPLETE ===');
  };

  const startTimer = () => {
    console.log('startTimer called');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (prev % 10 === 0) {  // Log every 10 seconds
          console.log('Timer:', newTime);
        }
        if (prev <= 1) {
          handleWorkoutComplete();
          return 0;
        }
        return newTime;
      });
      setTotalElapsed(prev => prev + 1);
    }, 1000);
    
    console.log('Timer started');
  };

  const stopTimer = () => {
    if (timerRef.current) {
      console.log('Stopping timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleWorkoutComplete = () => {
    console.log('=== WORKOUT COMPLETE ===');
    stopTimer();
    setShowUpNext(false);
    
    if (isLastWorkout) {
      console.log('Last workout, ending class');
      handleClassComplete();
    } else {
      console.log('Starting transition to next workout');
      startTransition();
    }
  };

  const startTransition = () => {
    console.log('=== START TRANSITION ===');
    console.log('Current index:', currentIndex);
    console.log('Current workout:', currentWorkout?.name);
    console.log('Next workout:', nextWorkout?.name);
    
    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (upNextTimeoutRef.current) {
      clearTimeout(upNextTimeoutRef.current);
      upNextTimeoutRef.current = null;
    }
    
    setIsTransitionState(true);
    setShowUpNext(false);
    setIsPaused(false);
    
    // Use local variable for countdown
    let transitionCountdown = transitionTime;
    setTimeRemaining(transitionCountdown);
    
    // Start transition timer
    timerRef.current = setInterval(() => {
      transitionCountdown--;
      console.log('Transition countdown:', transitionCountdown);
      setTimeRemaining(transitionCountdown);
      
      if (transitionCountdown <= 0) {
        console.log('=== TRANSITION COMPLETE ===');
        
        // Stop timer
        clearInterval(timerRef.current);
        timerRef.current = null;
        
        // Clear transition IMMEDIATELY (using ref to avoid closure issues)
        isTransitionRef.current = false;
        setIsTransition(false);
        
        // Advance to next workout
        setCurrentIndex(prev => {
          const next = prev + 1;
          console.log(`Advancing from workout ${prev} to ${next}`);
          return next;
        });
      }
    }, 1000);
  };

  const addTime = (seconds) => {
    setTimeRemaining(prev => prev + seconds);
    Alert.alert('⏱️ Time Added', `Added ${seconds} seconds`, [{ text: 'OK' }]);
  };

  const restartBlock = () => {
    Alert.alert('🔄 Restart Workout', `Restart "${currentWorkout?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        onPress: () => {
          stopTimer();
          setTimeRemaining(currentWorkout?.duration_seconds || 60);
          setShowUpNext(false);
          startTimer();
        }
      }
    ]);
  };

  const skipToNext = () => {
    if (isLastWorkout) {
      Alert.alert('Last Workout', 'This is the last workout.');
      return;
    }
    Alert.alert('Skip to Next', 'Skip to next workout?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Skip', 
        onPress: () => { 
          stopTimer(); 
          setShowUpNext(false); 
          setCurrentIndex(currentIndex + 1); 
        }
      }
    ]);
  };

  const skipToPrevious = () => {
    if (currentIndex === 0) {
      Alert.alert('First Workout', 'This is the first workout.');
      return;
    }
    stopTimer();
    setShowUpNext(false);
    setCurrentIndex(currentIndex - 1);
  };

  const togglePause = () => {
    if (isPaused) {
      startTimer();
      setIsPaused(false);
    } else {
      stopTimer();
      setIsPaused(true);
    }
  };

  const handleExit = () => {
    Alert.alert('⚠️ Exit Play Mode', 'Exit? Progress will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Exit', 
        style: 'destructive', 
        onPress: () => { 
          stopTimer(); 
          navigation.goBack(); 
        }
      }
    ]);
  };

  const handleClassComplete = () => {
    stopTimer();
    Alert.alert(
      '🎉 Class Complete!', 
      `You finished "${classData?.name}"!\n\nTotal time: ${formatTime(totalElapsed)}`, 
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return COLORS.error;
    if (timeRemaining <= 30) return COLORS.warning;
    return COLORS.text;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Exit Button */}
      <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((currentIndex + 1) / workouts.length) * 100}%` }]} />
        <Text style={styles.progressText}>{currentIndex + 1} / {workouts.length}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          {isTransition ? (
            <>
              <Text style={styles.transitionText}>TRANSITION</Text>
              <Text style={styles.workoutName}>Get Ready...</Text>
            </>
          ) : (
            <>
              <Text style={styles.workoutName}>{currentWorkout?.name || 'Workout'}</Text>
              {currentWorkout?.description && (
                <Text style={styles.workoutDescription}>{currentWorkout.description}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>
            {formatTime(timeRemaining)}
          </Text>
          {isPaused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>

        {!isTransition && currentWorkout?.media_url && (
          <View style={styles.mediaContainer}>
            <Image 
              source={{ uri: currentWorkout.media_url }} 
              style={styles.media} 
              resizeMode="contain" 
            />
          </View>
        )}

        {!isTransition && currentWorkout?.coaching_cues && (
          <View style={styles.cuesContainer}>
            <Text style={styles.cuesText}>💡 {currentWorkout.coaching_cues}</Text>
          </View>
        )}

        {showUpNext && nextWorkout && !isTransition && (
          <Animated.View 
            style={[
              styles.upNextContainer,
              { transform: [{ translateY: upNextAnim }] }
            ]}
          >
            <Text style={styles.upNextLabel}>UP NEXT</Text>
            <Text style={styles.upNextName}>{nextWorkout.name}</Text>
          </Animated.View>
        )}
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.timeAdjustRow}>
          <TouchableOpacity 
            style={styles.timeButton} 
            onPress={() => addTime(15)} 
            disabled={isTransition}
          >
            <Text style={styles.timeButtonText}>+15s</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timeButton} 
            onPress={() => addTime(30)} 
            disabled={isTransition}
          >
            <Text style={styles.timeButtonText}>+30s</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timeButton} 
            onPress={() => addTime(60)} 
            disabled={isTransition}
          >
            <Text style={styles.timeButtonText}>+60s</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.restartButton} 
            onPress={restartBlock} 
            disabled={isTransition}
          >
            <Ionicons name="reload-circle" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainControls}>
          <TouchableOpacity 
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]} 
            onPress={skipToPrevious} 
            disabled={currentIndex === 0 || isTransition}
          >
            <Ionicons 
              name="play-back-circle" 
              size={60} 
              color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : COLORS.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.playPauseButton} 
            onPress={togglePause} 
            disabled={isTransition}
          >
            <Ionicons 
              name={isPaused ? 'play-circle' : 'pause-circle'} 
              size={80} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, isLastWorkout && styles.navButtonDisabled]} 
            onPress={skipToNext} 
            disabled={isLastWorkout || isTransition}
          >
            <Ionicons 
              name="play-forward-circle" 
              size={60} 
              color={isLastWorkout ? 'rgba(255,255,255,0.3)' : COLORS.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  exitButton: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    zIndex: 100, 
    padding: 8 
  },
  progressContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    zIndex: 99 
  },
  progressBar: { 
    height: '100%', 
    backgroundColor: COLORS.primary 
  },
  progressText: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text 
  },
  contentContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 30, 
    paddingTop: 80, 
    paddingBottom: 220 
  },
  titleContainer: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  workoutName: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  workoutDescription: { 
    fontSize: 16, 
    color: COLORS.textSecondary, 
    textAlign: 'center' 
  },
  transitionText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.primary, 
    marginBottom: 8, 
    letterSpacing: 2 
  },
  timerContainer: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  timerText: { 
    fontSize: 96, 
    fontWeight: 'bold', 
    fontVariant: ['tabular-nums'] 
  },
  pausedBadge: { 
    marginTop: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    backgroundColor: `${COLORS.primary}33`, 
    borderRadius: 20 
  },
  pausedText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.primary, 
    letterSpacing: 1 
  },
  mediaContainer: { 
    width: width * 0.85, 
    height: height * 0.25, 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 20 
  },
  media: { 
    width: '100%', 
    height: '100%' 
  },
  cuesContainer: { 
    backgroundColor: COLORS.surfaceLight, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12, 
    maxWidth: width * 0.85 
  },
  cuesText: { 
    fontSize: 16, 
    color: COLORS.text, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  upNextContainer: { 
    position: 'absolute', 
    bottom: 220,  // Above control panel
    left: 30, 
    right: 30, 
    backgroundColor: `${COLORS.primary}F2`, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upNextLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: COLORS.text, 
    letterSpacing: 1, 
    marginBottom: 4 
  },
  upNextName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.text, 
    textAlign: 'center' 
  },
  controlPanel: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: COLORS.surface, 
    paddingTop: 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
    paddingHorizontal: 20, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24 
  },
  timeAdjustRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },
  timeButton: { 
    backgroundColor: COLORS.surfaceLight, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    minWidth: 70, 
    alignItems: 'center' 
  },
  timeButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text 
  },
  restartButton: { 
    backgroundColor: `${COLORS.primary}4D`, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  mainControls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 30 
  },
  navButton: { 
    padding: 8 
  },
  navButtonDisabled: { 
    opacity: 0.3 
  },
  playPauseButton: { 
    padding: 8 
  },
});