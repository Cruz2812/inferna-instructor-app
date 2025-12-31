// src/screens/ClassDetailScreen.js
import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClassDetail } from '../store/classesSlice';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import api from '../services/api';

export default function ClassDetailScreen({ route, navigation }) {
  const { classId } = route.params;
  const dispatch = useDispatch();
  const { currentClass, loading } = useSelector((state) => state.classes);

  useEffect(() => {
    dispatch(fetchClassDetail(classId));
  }, [classId]);

  const handleStartClass = () => {
    // Validation: Check if workouts exist
    if (!currentClass.workouts || currentClass.workouts.length === 0) {
      Alert.alert('No Workouts', 'This class has no workouts to play.');
      return;
    }

    // Transform workouts data for Play Mode
    const playModeWorkouts = currentClass.workouts.map((w, index) => ({
      id: w.id || `workout-${index}`,
      name: w.workout_name || 'Unnamed Workout',
      description: w.workout_description || '',
      duration_seconds: w.duration_override || w.default_duration || 60,
      coaching_cues: w.instructor_cues || '',
      media_url: w.media_url || null,
      media_type: w.media_type || null,
    }));

    // Navigate to Play Mode with correct data
    navigation.navigate('PlayMode', {
      classData: {
        id: currentClass.id,
        name: currentClass.name,
        class_type: currentClass.class_type_name,
      },
      workouts: playModeWorkouts,
    });
  };

  // Add useLayoutEffect to set header button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={handleEditClass}
        >
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [currentClass]);

  const handleEditClass = () => {
    // Navigate to builder with pre-populated data
    navigation.navigate('ClassBuilder', {
      editMode: true,
      classId: currentClass.id,
      classData: currentClass,
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 16, gap: 16 }}>
          <TouchableOpacity onPress={handleEditClass}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteClass}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [currentClass]);

  const handleDeleteClass = () => {
    Alert.alert(
      'Delete Class',
      `Delete "${currentClass.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/classes/${currentClass.id}`);
              Alert.alert('Success', 'Class deleted');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 16, gap: 16 }}>
          <TouchableOpacity onPress={handleDuplicateClass}>
            <Ionicons name="copy-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditClass}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteClass}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [currentClass]);

  const handleDuplicateClass = () => {
    // Navigate to builder with class data but NO classId (so it creates new)
    navigation.navigate('ClassBuilder', {
      duplicateMode: true,
      classData: {
        ...currentClass,
        name: `${currentClass.name} (Copy)`,  // Add (Copy) to name
      },
    });
  };

  const handleSubmitForFeatured = async () => {
    Alert.alert(
      'Submit for Featured',
      'Submit this class for admin review to be featured?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              console.log('Submitting class:', currentClass.id);
              const response = await api.post(`/featured/classes/${currentClass.id}/submit`);
              console.log('Submit response:', response.data);
              Alert.alert('Success', 'Class submitted for review!');
              dispatch(fetchClassDetail(currentClass.id));
            } catch (error) {
              console.error('Submit error:', error);
              console.error('Error response:', error.response?.data);
              const errorMsg = error.response?.data?.error || 'Failed to submit class';
              Alert.alert('Error', errorMsg);
            }
          }
        }
      ]
    );
  };

  if (loading || !currentClass) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{currentClass.name}</Text>
        {currentClass.is_draft && (
          <View style={styles.draftBadge}>
            <Text style={styles.draftText}>DRAFT</Text>
          </View>
        )}
      </View>

      {/* Class Info */}
      <View style={styles.section}>
        {currentClass.class_type_name && (
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{currentClass.class_type_name}</Text>
          </View>
        )}

        {currentClass.scheduled_at && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {format(new Date(currentClass.scheduled_at), 'MMMM d, yyyy • h:mm a')}
            </Text>
          </View>
        )}

        {currentClass.room && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{currentClass.room}</Text>
          </View>
        )}

        {currentClass.total_duration && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{currentClass.total_duration} minutes</Text>
          </View>
        )}
      </View>

      {/* Workouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Workouts ({currentClass.workouts?.length || 0})
        </Text>

        {currentClass.workouts && currentClass.workouts.length > 0 ? (
          currentClass.workouts.map((workout, index) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutNumber}>
                  <Text style={styles.workoutNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>
                    {workout.workout_name || 'Unnamed Workout'}
                  </Text>
                  <Text style={styles.workoutDescription} numberOfLines={2}>
                    {workout.workout_description || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.workoutMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>
                    {Math.ceil((workout.duration_override || workout.default_duration || 0) / 60)} min
                  </Text>
                </View>

                {/* 🔧 FIX: Check if transition_time exists and is > 0 */}
                {workout.transition_time != null && workout.transition_time > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{workout.transition_time}s transition</Text>
                  </View>
                )}
              </View>

              {workout.instructor_cues && (
                <View style={styles.cuesContainer}>
                  <Text style={styles.cuesLabel}>Cues:</Text>
                  <Text style={styles.cuesText}>{workout.instructor_cues}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No workouts added yet</Text>
        )}
      </View>

      {/* Start Class Button */}
      {!currentClass.is_draft && currentClass.workouts && currentClass.workouts.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartClass}
          >
            <Ionicons name="play-circle" size={24} color="#FFF" />
            <Text style={styles.startButtonText}>Start Class</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit for Featured - Only for non-draft, non-featured classes */}
      {!currentClass.is_draft && 
      !currentClass.is_featured && 
      currentClass.featured_status !== 'pending' && (
        <TouchableOpacity
          style={styles.submitFeaturedButton}
          onPress={handleSubmitForFeatured}
        >
          <Ionicons name="star-outline" size={20} color={COLORS.primary} />
          <Text style={styles.submitFeaturedText}>Submit for Featured</Text>
        </TouchableOpacity>
      )}

      {/* Pending Review Badge */}
      {currentClass.featured_status === 'pending' && (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={16} color={COLORS.warning} />
          <Text style={styles.pendingText}>Pending Review</Text>
        </View>
      )}

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  draftBadge: {
    backgroundColor: COLORS.draft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  draftText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#000',
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  workoutDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cuesContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
  },
  cuesLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  cuesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  footer: {
    padding: SPACING.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  submitFeaturedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  submitFeaturedText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}33`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  pendingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warning,
  },

  
});