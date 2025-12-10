// ============================================================================
// ENHANCED PLAY MODE SCREEN - CUSTOMIZED FOR YOUR THEME
// Full-featured guided class delivery for instructors
// ============================================================================

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
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';  // ✅ Using YOUR theme

const { width, height } = Dimensions.get('window');

export default function PlayModeScreen({ route, navigation }) {
  const { classData, workouts = [] } = route.params;
  
  // State Management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showUpNext, setShowUpNext] = useState(false);
  const [isTransition, setIsTransition] = useState(false);
  const [transitionTime, setTransitionTime] = useState(10);
  
  // Refs
  const timerRef = useRef(null);
  const upNextTimeoutRef = useRef(null);

  const currentWorkout = workouts[currentIndex];
  const nextWorkout = workouts[currentIndex + 1];
  const isLastWorkout = currentIndex === workouts.length - 1;

  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================

  useEffect(() => {
    if (currentWorkout) {
      startWorkout();
    }
    triggerHaptic('medium');

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (upNextTimeoutRef.current) clearTimeout(upNextTimeoutRef.current);
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  // ============================================================================
  // WORKOUT CONTROL FUNCTIONS
  // ============================================================================

  const startWorkout = () => {
    setIsTransition(false);
    setIsPaused(false);
    
    const duration = currentWorkout?.duration_seconds || 60;
    setTimeRemaining(duration);
    startTimer();

    if (duration > 15 && nextWorkout) {
      upNextTimeoutRef.current = setTimeout(() => {
        setShowUpNext(true);
        triggerHaptic('light');
      }, (duration - 10) * 1000);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleWorkoutComplete();
          return 0;
        }

        if (prev === 10) {
          triggerHaptic('warning');
        }

        if (prev <= 3) {
          triggerHaptic('light');
        }

        return prev - 1;
      });

      setTotalElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleWorkoutComplete = () => {
    stopTimer();
    setShowUpNext(false);
    triggerHaptic('success');

    if (isLastWorkout) {
      handleClassComplete();
    } else {
      startTransition();
    }
  };

  const startTransition = () => {
    setIsTransition(true);
    setTimeRemaining(transitionTime);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setCurrentIndex(currentIndex + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (currentIndex > 0 && !isTransition) {
      startWorkout();
    }
  }, [currentIndex]);

  // ============================================================================
  // TIMER ADJUSTMENT FUNCTIONS
  // ============================================================================

  const addTime = (seconds) => {
    setTimeRemaining(prev => prev + seconds);
    triggerHaptic('medium');
    
    Alert.alert(
      '⏱️ Time Added',
      `Added ${seconds} seconds`,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  const restartBlock = () => {
    Alert.alert(
      '🔄 Restart Workout',
      `Restart "${currentWorkout?.name}" from the beginning?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => {
            stopTimer();
            setTimeRemaining(currentWorkout?.duration_seconds || 60);
            setShowUpNext(false);
            startTimer();
            triggerHaptic('medium');
          }
        }
      ]
    );
  };

  // ============================================================================
  // NAVIGATION FUNCTIONS
  // ============================================================================

  const skipToNext = () => {
    if (isLastWorkout) {
      Alert.alert('Last Workout', 'This is the last workout in the class.');
      return;
    }

    Alert.alert(
      'Skip to Next',
      'Skip to the next workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            stopTimer();
            setShowUpNext(false);
            setCurrentIndex(currentIndex + 1);
            triggerHaptic('medium');
          }
        }
      ]
    );
  };

  const skipToPrevious = () => {
    if (currentIndex === 0) {
      Alert.alert('First Workout', 'This is the first workout in the class.');
      return;
    }

    stopTimer();
    setShowUpNext(false);
    setCurrentIndex(currentIndex - 1);
    triggerHaptic('medium');
  };

  const togglePause = () => {
    if (isPaused) {
      startTimer();
      setIsPaused(false);
      triggerHaptic('light');
    } else {
      stopTimer();
      setIsPaused(true);
      triggerHaptic('light');
    }
  };

  // ============================================================================
  // EXIT & COMPLETION FUNCTIONS
  // ============================================================================

  const handleExit = () => {
    Alert.alert(
      '⚠️ Exit Play Mode',
      'Are you sure you want to exit? Progress will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            stopTimer();
            triggerHaptic('heavy');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleClassComplete = () => {
    stopTimer();
    triggerHaptic('success');

    Alert.alert(
      '🎉 Class Complete!',
      `You finished "${classData?.name}"!\n\nTotal time: ${formatTime(totalElapsed)}`,
      [
        {
          text: 'Done',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const triggerHaptic = (type = 'light') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    } else {
      if (type === 'success') {
        Vibration.vibrate([0, 50, 100, 50]);
      } else if (type === 'warning') {
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        Vibration.vibrate(50);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return COLORS.error;    // Red (#ff3b30)
    if (timeRemaining <= 30) return COLORS.warning;  // Orange (#ff9500)
    return COLORS.text;                               // White (#ffffff)
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <KeepAwake />
      <StatusBar hidden />

      {/* Exit Button */}
      <TouchableOpacity 
        style={styles.exitButton} 
        onPress={handleExit}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${((currentIndex + 1) / workouts.length) * 100}%` }
          ]} 
        />
        <Text style={styles.progressText}>
          {currentIndex + 1} / {workouts.length}
        </Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        
        {/* Workout Title */}
        <View style={styles.titleContainer}>
          {isTransition ? (
            <>
              <Text style={styles.transitionText}>TRANSITION</Text>
              <Text style={styles.workoutName}>Get Ready...</Text>
            </>
          ) : (
            <>
              <Text style={styles.workoutName}>
                {currentWorkout?.name || 'Workout'}
              </Text>
              {currentWorkout?.description && (
                <Text style={styles.workoutDescription}>
                  {currentWorkout.description}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Timer Display */}
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

        {/* Media Display */}
        {!isTransition && currentWorkout?.media_url && (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: currentWorkout.media_url }}
              style={styles.media}
              resizeMode="contain"
            />
            {currentWorkout.media_type === 'video' && (
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </View>
        )}

        {/* Coaching Cues */}
        {!isTransition && currentWorkout?.coaching_cues && (
          <View style={styles.cuesContainer}>
            <Text style={styles.cuesText}>
              💡 {currentWorkout.coaching_cues}
            </Text>
          </View>
        )}

        {/* "Up Next" Preview */}
        {showUpNext && nextWorkout && !isTransition && (
          <View style={styles.upNextContainer}>
            <Text style={styles.upNextLabel}>UP NEXT</Text>
            <Text style={styles.upNextName}>{nextWorkout.name}</Text>
          </View>
        )}
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        
        {/* Time Adjustment Buttons */}
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

        {/* Main Controls */}
        <View style={styles.mainControls}>
          
          {/* Previous Button */}
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

          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={togglePause}
            disabled={isTransition}
          >
            <Ionicons 
              name={isPaused ? 'play-circle' : 'pause-circle'} 
              size={80} 
              color={COLORS.primary}  // ✅ YOUR red color
            />
          </TouchableOpacity>

          {/* Next Button */}
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

// ============================================================================
// STYLES - USING YOUR THEME COLORS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,  // #000000
  },
  
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    padding: 8,
  },

  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: 99,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,  // #ff3b30 (red)
  },
  progressText: {
    position: 'absolute',
    top: 50,
    left: 20,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,  // #ffffff
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 220,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  workoutName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,  // #8e8e93
    textAlign: 'center',
  },
  transitionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,  // #ff3b30 (red)
    marginBottom: 8,
    letterSpacing: 2,
  },

  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 96,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  pausedBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: `${COLORS.primary}33`,  // primary with 20% opacity
    borderRadius: 20,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1,
  },

  mediaContainer: {
    width: width * 0.85,
    height: height * 0.25,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  cuesContainer: {
    backgroundColor: COLORS.surfaceLight,  // #2c2c2e
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: width * 0.85,
  },
  cuesText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },

  upNextContainer: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    backgroundColor: `${COLORS.primary}F2`,  // primary with 95% opacity
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upNextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  upNextName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },

  controlPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,  // #1c1c1e
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  timeAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  timeButton: {
    backgroundColor: COLORS.surfaceLight,  // #2c2c2e
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  restartButton: {
    backgroundColor: `${COLORS.primary}4D`,  // primary with 30% opacity
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  navButton: {
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  playPauseButton: {
    padding: 8,
  },
});