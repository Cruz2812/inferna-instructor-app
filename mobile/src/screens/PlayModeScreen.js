// ============================================================================
// ENHANCED PLAY MODE SCREEN
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
import { Video, ResizeMode } from 'expo-av';
import { KeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

const PLAY_MODE_COLORS = {
  PRIMARY: '#FF6B35',        // Your brand color
  TIMER_NORMAL: '#FFFFFF',
  TIMER_WARNING: '#FF9500',
  TIMER_DANGER: '#FF3B30',
};

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
  const [transitionTime, setTransitionTime] = useState(10); // 10-second transitions
  
  // Refs
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const upNextTimeoutRef = useRef(null);

  const currentWorkout = workouts[currentIndex];
  const nextWorkout = workouts[currentIndex + 1];
  const isLastWorkout = currentIndex === workouts.length - 1;

  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================

  useEffect(() => {
    // Start first workout
    if (currentWorkout) {
      startWorkout();
    }

    // Trigger haptic on mount
    triggerHaptic('medium');

    return () => {
      // Cleanup
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
    
    // Set time based on workout duration
    const duration = currentWorkout?.duration_seconds || 60;
    setTimeRemaining(duration);

    // Start timer
    startTimer();

    // Schedule "Up Next" preview 10 seconds before end
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
          // Timer finished
          handleWorkoutComplete();
          return 0;
        }

        // Warning haptic at 10 seconds
        if (prev === 10) {
          triggerHaptic('warning');
        }

        // Count haptic for last 3 seconds
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
      // Class finished!
      handleClassComplete();
    } else {
      // Start transition to next workout
      startTransition();
    }
  };

  const startTransition = () => {
    setIsTransition(true);
    setTimeRemaining(transitionTime);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Transition complete, move to next workout
          setCurrentIndex(currentIndex + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Watch for index changes to start next workout
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
    
    // Show feedback
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
      // Android vibration patterns
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
    if (timeRemaining <= 10) return '#FF3B30'; // Red
    if (timeRemaining <= 30) return '#FF9500'; // Orange
    return '#FFFFFF'; // White
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

        {/* Media Display (Images/Videos) */}
        {!isTransition && currentWorkout?.media_url && (
          <View style={styles.mediaContainer}>
            {currentWorkout.media_type === 'video' ? (
              <Video
                ref={videoRef}
                source={{ uri: currentWorkout.media_url }}
                style={styles.media}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={!isPaused}
                isLooping
                isMuted
              />
            ) : (
              <Image
                source={{ uri: currentWorkout.media_url }}
                style={styles.media}
                resizeMode="contain"
              />
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
            <Ionicons name="reload-circle" size={28} color="#FFF" />
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
              color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : '#FFF'} 
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
              color="#FF6B35" 
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
              color={isLastWorkout ? 'rgba(255,255,255,0.3)' : '#FFF'} 
            />
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Exit Button
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    padding: 8,
  },

  // Progress Bar
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
    backgroundColor: '#FF6B35',
  },
  progressText: {
    position: 'absolute',
    top: 50,
    left: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Content
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
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  transitionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 8,
    letterSpacing: 2,
  },

  // Timer
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
    backgroundColor: 'rgba(255,107,53,0.3)',
    borderRadius: 20,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 1,
  },

  // Media
  mediaContainer: {
    width: width * 0.85,
    height: height * 0.25,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  media: {
    width: '100%',
    height: '100%',
  },

  // Coaching Cues
  cuesContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: width * 0.85,
  },
  cuesText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Up Next
  upNextContainer: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    backgroundColor: 'rgba(255,107,53,0.95)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upNextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  upNextName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },

  // Control Panel
  controlPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,20,20,0.95)',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Time Adjustment
  timeAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  timeButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  restartButton: {
    backgroundColor: 'rgba(255,107,53,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Controls
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