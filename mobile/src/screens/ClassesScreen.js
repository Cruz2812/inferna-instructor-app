// src/screens/ClassesScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClasses } from '../store/classesSlice';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ADD THIS

export default function ClassesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.classes);
  const insets = useSafeAreaInsets(); // ADD THIS

  useEffect(() => {
    dispatch(fetchClasses());
  }, []);

  const handleRefresh = () => {
    dispatch(fetchClasses());
  };

  const renderClass = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ClassDetail', { classId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.className}>{item.name}</Text>
        {item.is_draft && (
          <View style={styles.draftBadge}>
            <Text style={styles.draftText}>DRAFT</Text>
          </View>
        )}
      </View>

      {item.class_type_name && (
        <Text style={styles.classType}>{item.class_type_name}</Text>
      )}

      {item.scheduled_at && (
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {format(new Date(item.scheduled_at), 'MMM d, yyyy')}
          </Text>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {format(new Date(item.scheduled_at), 'h:mm a')}
          </Text>
        </View>
      )}

      {item.room && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.room}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.workoutCount}>
          <Ionicons name="fitness-outline" size={16} color={COLORS.primary} />
          <Text style={styles.workoutCountText}>
            {item.workout_count || 0} workouts
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.title}>My Classes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Temporary until we build ClassBuilder
            alert('Class Builder coming soon! This will let you create custom classes.');
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Class List */}
      {loading && items.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No classes yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to create your first class
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderClass}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  className: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  draftBadge: {
    backgroundColor: COLORS.draft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  draftText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#000',
  },
  classType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  workoutCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  workoutCountText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});