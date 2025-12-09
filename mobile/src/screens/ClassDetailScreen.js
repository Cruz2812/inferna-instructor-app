// src/screens/ClassDetailScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClassDetail } from '../store/classesSlice';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

export default function ClassDetailScreen({ route, navigation }) {
  const { classId } = route.params;
  const dispatch = useDispatch();
  const { currentClass, loading } = useSelector((state) => state.classes);

  useEffect(() => {
    dispatch(fetchClassDetail(classId));
  }, [classId]);

  if (loading || !currentClass) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  const handleStartClass = () => {
    const playModeWorkouts = workouts.map(w => ({
      id: w.id,
      name: w.workout_name || w.name,
      description: w.description,
      duration_seconds: w.duration_seconds || 60,
      coaching_cues: w.coaching_cues,
      media_url: w.media_url,
      media_type: w.media_type,
    }));

    navigation.navigate('PlayMode', {
      classData: { id: classData.id, name: classData.name },
      workouts: playModeWorkouts,
    });
  };

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
                  <Text style={styles.workoutName}>{workout.workout_name}</Text>
                  <Text style={styles.workoutDescription} numberOfLines={2}>
                    {workout.workout_description}
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

                {workout.transition_time > 0 && (
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
    margin: 20,
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
});