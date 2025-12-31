// src/screens/ClassesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClasses } from '../store/classesSlice';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';  // ✅ ADD THIS
import api from '../services/api';  // ✅ ADD THIS

export default function ClassesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('personal');
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.classes);

  useEffect(() => {
    dispatch(fetchClasses({ tab: activeTab }));
  }, [activeTab]);

  // ✅ ADD DELETE HANDLER
  const handleDeleteClass = (classId, className) => {
    Alert.alert(
      'Delete Class',
      `Delete "${className}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/classes/${classId}`);
              // Refresh list
              dispatch(fetchClasses({ tab: activeTab }));
              Alert.alert('Success', 'Class deleted');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
  };

  // ✅ RENDER VISIBLE ROW
  const renderItem = ({ item }) => (
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

      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>⭐ FEATURED</Text>
        </View>
      )}

      {item.class_type_name && (
        <Text style={styles.classType}>{item.class_type_name}</Text>
      )}

      {item.scheduled_at && (
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            {format(new Date(item.scheduled_at), 'MMM d, yyyy • h:mm a')}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.workoutCount}>
          <Ionicons name="fitness-outline" size={16} color={COLORS.text} />
          <Text style={styles.workoutCountText}>
            {item.workout_count || 0} workout{item.workout_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ✅ RENDER HIDDEN DELETE BUTTON
  const renderHiddenItem = (data, rowMap) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteClass(data.item.id, data.item.name)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.title}>Classes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ClassBuilder')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'featured' && styles.activeTab]}
          onPress={() => setActiveTab('featured')}
        >
          <Text style={[styles.tabText, activeTab === 'featured' && styles.activeTabText]}>
            Featured
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
            My Classes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Class List with Swipe */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <SwipeListView
          data={items}
          renderItem={renderItem}
          renderHiddenItem={activeTab === 'personal' ? renderHiddenItem : null}  // Only in personal tab
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          rightOpenValue={-75}  // How far to swipe
          disableRightSwipe  // Only allow swipe left
          onRefresh={() => dispatch(fetchClasses({ tab: activeTab }))}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="fitness-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {activeTab === 'featured' ? 'No featured classes yet' : 'No classes yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'featured' 
                  ? 'Check back later for featured content' 
                  : 'Tap + to create your first class'}
              </Text>
            </View>
          }
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  list: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,  // ✅ ADD THIS
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
  featuredBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
    marginTop: SPACING.xxl,
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
  rowBack: {
    alignItems: 'center',
    backgroundColor: COLORS.error,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 75,
    height: '100%',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 4,
  },
});