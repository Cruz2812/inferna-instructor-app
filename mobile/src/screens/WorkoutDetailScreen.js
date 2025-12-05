// src/screens/WorkoutDetailScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkoutDetail } from '../store/workoutsSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

export default function WorkoutDetailScreen({ route }) {
  const { workoutId } = route.params;
  const dispatch = useDispatch();
  const { currentWorkout, loading } = useSelector((state) => state.workouts);

  useEffect(() => {
    dispatch(fetchWorkoutDetail(workoutId));
  }, [workoutId]);

  if (loading || !currentWorkout) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return COLORS.beginner;
      case 'intermediate':
        return COLORS.intermediate;
      case 'advanced':
        return COLORS.advanced;
      default:
        return COLORS.all_levels;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return COLORS.error;
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Media Section */}
      {currentWorkout.media && currentWorkout.media.length > 0 && (
        <View style={styles.mediaSection}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {currentWorkout.media.map((media, index) => (
              <View key={index} style={styles.mediaContainer}>
                {media.type === 'photo' ? (
                  <Image
                    source={{ uri: media.filePath }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={64} color={COLORS.primary} />
                    <Text style={styles.videoText}>Video</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          {currentWorkout.media.length > 1 && (
            <View style={styles.mediaDots}>
              {currentWorkout.media.map((_, index) => (
                <View key={index} style={styles.dot} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{currentWorkout.name}</Text>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(currentWorkout.difficulty) },
            ]}
          >
            <Text style={styles.difficultyText}>
              {currentWorkout.difficulty?.toUpperCase() || 'ALL'}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.description}>{currentWorkout.description}</Text>
      </View>

      {/* Meta Info */}
      <View style={styles.metaContainer}>
        <View style={styles.metaCard}>
          <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          <Text style={styles.metaValue}>
            {Math.ceil((currentWorkout.default_duration || 0) / 60)}
          </Text>
          <Text style={styles.metaLabel}>minutes</Text>
        </View>

        <View style={styles.metaCard}>
          <Ionicons name="fitness-outline" size={24} color={COLORS.primary} />
          <Text style={styles.metaValue}>
            {currentWorkout.equipment?.length || 0}
          </Text>
          <Text style={styles.metaLabel}>equipment</Text>
        </View>
      </View>

      {/* Equipment */}
      {currentWorkout.equipment && currentWorkout.equipment.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Needed</Text>
          <View style={styles.equipmentList}>
            {currentWorkout.equipment.map((item, index) => (
              <View key={index} style={styles.equipmentItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.equipmentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Injury Risks */}
      {currentWorkout.injury_risks && currentWorkout.injury_risks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Injury Risk Considerations</Text>
          {currentWorkout.injury_risks.map((risk, index) => (
            <View key={index} style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <View style={styles.riskTitleRow}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={getSeverityColor(risk.severity)}
                  />
                  <Text style={styles.riskName}>{risk.name}</Text>
                </View>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(risk.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {risk.severity?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.riskDescription}>{risk.description}</Text>
              {risk.notes && (
                <View style={styles.riskNotes}>
                  <Text style={styles.riskNotesLabel}>Notes:</Text>
                  <Text style={styles.riskNotesText}>{risk.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Tags */}
      {currentWorkout.tags && currentWorkout.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tags}>
            {currentWorkout.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Creator Info */}
      {currentWorkout.created_by_name && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Created by {currentWorkout.created_by_name}
          </Text>
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
  mediaSection: {
    height: 300,
    backgroundColor: COLORS.surface,
  },
  mediaContainer: {
    width: 400, // Adjust based on screen width
    height: 300,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  videoText: {
    color: COLORS.text,
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  mediaDots: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  header: {
    padding: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.md,
  },
  difficultyBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  difficultyText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#000',
  },
  section: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  metaValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  metaLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  equipmentList: {
    gap: SPACING.sm,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  equipmentText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  riskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  riskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  riskName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  severityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  severityText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#000',
  },
  riskDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  riskNotes: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  riskNotesLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  riskNotesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});