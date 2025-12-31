// src/screens/ClassBuilderScreen.js
// ============================================================================
// CLASS BUILDER - Create custom classes with drag-and-drop workouts
// ============================================================================

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api'; 
import {
  setBuilderField,
  addWorkoutToBuilder,
  removeWorkoutFromBuilder,
  reorderBuilderWorkouts,
  createClass,
  clearBuilder,
} from '../store/classesSlice';
import { fetchWorkouts } from '../store/workoutsSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { Calendar } from 'react-native-calendars';

export default function ClassBuilderScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  
  // Redux state
  const { builder } = useSelector(state => state.classes);
  const { items: allWorkouts, loading: workoutsLoading } = useSelector(state => state.workouts);
  
  // Local state
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWorkouts, setSelectedWorkouts] = useState([]); // Track multi-select
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');

  useEffect(() => {
    dispatch(fetchWorkouts());
    
    // Check if editing OR duplicating
    if (route.params?.editMode && route.params?.classData) {
      // EDIT MODE - includes classId
      loadClassData(route.params.classData);
    } else if (route.params?.duplicateMode && route.params?.classData) {
      // DUPLICATE MODE - no classId
      loadClassData(route.params.classData);
    }
  }, []);

const loadClassData = (classData) => {
  dispatch(setBuilderField({ field: 'name', value: classData.name }));
  dispatch(setBuilderField({ field: 'scheduledAt', value: classData.scheduled_at }));
  dispatch(setBuilderField({ field: 'classTypeId', value: classData.class_type_id }));
  
  const workoutsToAdd = classData.workouts?.map(w => ({
    workoutId: w.workout_id || w.id,
    workout: {
      id: w.workout_id || w.id,
      workout_name: w.workout_name,
      description: w.workout_description,
      default_duration: w.default_duration,
    },
    durationOverride: w.duration_override || w.default_duration,
    transitionTime: w.transition_time || 30,
    instructorCues: w.instructor_cues || '',
  })) || [];
  
  dispatch(setBuilderField({ field: 'workouts', value: workoutsToAdd }));
};

  // ============================================================================
  // WORKOUT MANAGEMENT
  // ============================================================================

  const handleToggleWorkoutSelection = (workout) => {
    const isSelected = selectedWorkouts.some(w => w.id === workout.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedWorkouts(selectedWorkouts.filter(w => w.id !== workout.id));
    } else {
      // Add to selection
      setSelectedWorkouts([...selectedWorkouts, workout]);
    }
  };

  const handleSplitWorkout = (index) => {
    const workout = builder.workouts[index];
    
    // Debug to see structure
    console.log('Splitting workout:', workout);
    
    Alert.alert(
      'Split into Sides',
      'This will create separate LEFT and RIGHT versions of this workout.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Split',
          onPress: () => {
            // Get name from the workout object itself
            const workoutName = workout.workout?.workout_name || 
                              workout.workout?.name || 
                              workout.workoutName ||  // Try direct property
                              'Workout';
            
            console.log('Workout name:', workoutName);
            
            const leftWorkout = {
              ...workout,
              workout: {
                ...(workout.workout || {}),
                workout_name: `${workoutName} - LEFT`,
              },
            };
            
            const rightWorkout = {
              ...workout,
              workout: {
                ...(workout.workout || {}),
                workout_name: `${workoutName} - RIGHT`,
              },
            };
            
            const updatedWorkouts = [...builder.workouts];
            updatedWorkouts.splice(index, 1, leftWorkout, rightWorkout);
            dispatch(setBuilderField({ field: 'workouts', value: updatedWorkouts }));
          }
        }
      ]
    );
  };

  const handleDoneSelectingWorkouts = () => {
    // Add all selected workouts to the builder
    selectedWorkouts.forEach(workout => {
      dispatch(addWorkoutToBuilder(workout));
    });
    
    // Clear selection and close modal
    setSelectedWorkouts([]);
    setShowWorkoutPicker(false);
    setSearchQuery('');
  };

  const getWorkoutSelectionOrder = (workoutId) => {
    const index = selectedWorkouts.findIndex(w => w.id === workoutId);
    return index >= 0 ? index + 1 : null;
  };

  const handleRemoveWorkout = (index) => {
    Alert.alert(
      'Remove Workout',
      'Remove this workout from the class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(removeWorkoutFromBuilder(index)),
        },
      ]
    );
  };

  const handleMoveWorkoutUp = (index) => {
    if (index > 0) {
      dispatch(reorderBuilderWorkouts({ fromIndex: index, toIndex: index - 1 }));
    }
  };

  const handleMoveWorkoutDown = (index) => {
    if (index < builder.workouts.length - 1) {
      dispatch(reorderBuilderWorkouts({ fromIndex: index, toIndex: index + 1 }));
    }
  };

  const handleUpdateWorkoutDuration = (index, duration) => {
    // Create a NEW array with updated workout (don't mutate)
    const updatedWorkouts = builder.workouts.map((workout, i) => {
      if (i === index) {
        return {
          ...workout,
          durationOverride: parseInt(duration) || 0,
        };
      }
      return workout;
    });
    dispatch(setBuilderField({ field: 'workouts', value: updatedWorkouts }));
  };

  const handleUpdateWorkoutCues = (index, cues) => {
    // Create a NEW array with updated workout (don't mutate)
    const updatedWorkouts = builder.workouts.map((workout, i) => {
      if (i === index) {
        return {
          ...workout,
          instructorCues: cues,
        };
      }
      return workout;
    });
    dispatch(setBuilderField({ field: 'workouts', value: updatedWorkouts }));
  };

  // ============================================================================
  // DATE/TIME HANDLING
  // ============================================================================

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // Show time picker next
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time) {
      const combined = new Date(selectedDate);
      combined.setHours(time.getHours());
      combined.setMinutes(time.getMinutes());
      dispatch(setBuilderField({ field: 'scheduledAt', value: combined.toISOString() }));
    }
  };

  // ============================================================================
  // SAVE CLASS
  // ============================================================================

  const handleSaveClass = async (isDraft) => {
    // Validation
    if (!builder.name.trim()) {
      Alert.alert('Class Name Required', 'Please enter a name for the class.');
      return;
    }

    if (builder.workouts.length === 0) {
      Alert.alert('No Workouts', 'Please add at least one workout to the class.');
      return;
    }

    // CHECK FOR DUPLICATE NAME
    try {
      console.log('Checking for duplicates...');
      const response = await api.get('/classes', { params: { tab: 'personal' } });
      console.log('Got classes:', response.data.length);
      
      const existingClasses = response.data;
      const editingClassId = route.params?.classId;
      
      const duplicateName = existingClasses.some(c => {
        const isDuplicate = c.name.toLowerCase().trim() === builder.name.toLowerCase().trim();
        const isDifferentClass = c.id !== editingClassId;
        return isDuplicate && isDifferentClass;
      });
      
      if (duplicateName) {
        Alert.alert(
          'Duplicate Name',
          'A class with this name already exists. Please choose a different name.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Continue anyway - don't block save
    }

    setSaving(true);

    try {
      const classData = {
        name: builder.name,
        classTypeId: builder.classTypeId,
        scheduledAt: builder.scheduledAt,
        isDraft: isDraft,
        workouts: builder.workouts.map((w, index) => ({
          workoutId: w.workoutId || w.workout?.id,
          durationOverride: w.durationOverride || 0,
          transitionTime: w.transitionTime || 30,
          instructorCues: w.instructorCues || '',
        })),
      };

      // CHECK IF EDITING
      if (route.params?.editMode && route.params?.classId) {
        // UPDATE existing class
        await api.put(`/classes/${route.params.classId}`, classData);
        Alert.alert('Success!', `Class "${builder.name}" updated!`);
      } else {
        // CREATE new class
        await dispatch(createClass(classData)).unwrap();
        Alert.alert('Success!', `Class "${builder.name}" ${isDraft ? 'saved as draft' : 'created'}!`);
      }

      dispatch(clearBuilder());
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error || 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // FILTERED WORKOUTS FOR PICKER
  // ============================================================================

  const filteredWorkouts = allWorkouts.filter(workout => {
    // Safety checks for undefined values
    const workoutName = workout?.workout_name || workout?.name || '';
    const matchesSearch = workoutName.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadyAdded = !builder.workouts.some(w => w.workoutId === workout.id);
    return matchesSearch && notAlreadyAdded;
  });

  // ============================================================================
  // CALCULATE TOTAL DURATION
  // ============================================================================

  const totalDuration = builder.workouts.reduce((sum, w) => {
    return sum + (w.durationOverride || 0) + (w.transitionTime || 0);
  }, 0);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Class</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Class Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Full Body Burn"
            placeholderTextColor={COLORS.textSecondary}
            value={builder.name}
            onChangeText={(text) => dispatch(setBuilderField({ field: 'name', value: text }))}
          />
        </View>

        {/* Schedule (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule (Optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateButtonText}>
              {builder.scheduledAt
                ? new Date(builder.scheduledAt).toLocaleString()
                : 'Set date and time'}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={(day) => {
                  setSelectedDate(new Date(day.dateString));
                  // Don't show time picker yet - close calendar first
                  setShowDatePicker(false);
                  // Then show time picker after a moment
                  setTimeout(() => setShowTimePicker(true), 100);
                }}
                markedDates={{
                  [selectedDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: COLORS.primary
                  }
                }}
                theme={{
                  backgroundColor: COLORS.surface,
                  calendarBackground: COLORS.surface,
                  textSectionTitleColor: COLORS.text,
                  selectedDayBackgroundColor: COLORS.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: COLORS.primary,
                  dayTextColor: COLORS.text,
                  textDisabledColor: COLORS.textSecondary,
                  monthTextColor: COLORS.text,
                  arrowColor: COLORS.primary,
                }}
              />
            </View>
          )}

          {/* Time Picker Modal - Shows AFTER date selected */}
          {showTimePicker && (
            <Modal
              visible={showTimePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.timePickerModal}>
                <View style={styles.timePickerContent}>
                  <Text style={styles.timePickerTitle}>Select Time</Text>
                  <DateTimePicker
                    value={selectedDate}
                    mode="time"
                    display="spinner"  // ✅ Scrollable!
                    onChange={(event, time) => {
                      if (event.type === 'set' && time) {
                        const combined = new Date(selectedDate);
                        combined.setHours(time.getHours());
                        combined.setMinutes(time.getMinutes());
                        dispatch(setBuilderField({ field: 'scheduledAt', value: combined.toISOString() }));
                      }
                      setShowTimePicker(false);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.timePickerCancel}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
          
          {builder.scheduledAt && (
            <TouchableOpacity
              onPress={() => dispatch(setBuilderField({ field: 'scheduledAt', value: null }))}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Workouts ({builder.workouts.length})
            </Text>
            <Text style={styles.durationText}>
              {Math.ceil(totalDuration / 60)} min total
            </Text>
          </View>

          {/* Add Workout Button */}
          <TouchableOpacity
            style={styles.addWorkoutButton}
            onPress={() => setShowWorkoutPicker(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addWorkoutText}>Add Workout</Text>
          </TouchableOpacity>

          {/* Workout List */}
          {builder.workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No workouts added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Workout" to get started</Text>
            </View>
          ) : (
            builder.workouts.map((item, index) => (
              <View key={index} style={styles.workoutCard}>
                {/* Workout Header */}
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutNumber}>
                    <Text style={styles.workoutNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>
                      {item?.workout?.workout_name || item?.workout?.name || 'Unnamed Workout'}
                    </Text>
                    <Text style={styles.workoutDescription} numberOfLines={1}>
                      {item?.workout?.description || 'No description'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveWorkout(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleSplitWorkout(index)}
                    style={styles.splitButton}
                  >
                    <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Duration Control */}
                <View style={styles.durationControl}>
                  <Text style={styles.controlLabel}>Duration (seconds):</Text>
                  <TextInput
                    style={styles.durationInput}
                    keyboardType="numeric"
                    value={String(item.durationOverride || '')}
                    onChangeText={(text) => handleUpdateWorkoutDuration(index, text)}
                    placeholder="60"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                  <Text style={styles.durationDisplay}>
                    ({Math.ceil((item.durationOverride || 0) / 60)} min)
                  </Text>
                </View>

                {/* Instructor Cues */}
                <View style={styles.cuesControl}>
                  <Text style={styles.controlLabel}>Instructor Cues:</Text>
                  <TextInput
                    style={styles.cuesInput}
                    multiline
                    placeholder="Add coaching cues for this workout..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={item.instructorCues || ''}
                    onChangeText={(text) => handleUpdateWorkoutCues(index, text)}
                  />
                </View>

                {/* Reorder Buttons */}
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                    onPress={() => handleMoveWorkoutUp(index)}
                    disabled={index === 0}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={index === 0 ? COLORS.textSecondary : COLORS.text}
                    />
                    <Text style={[styles.reorderText, index === 0 && styles.reorderTextDisabled]}>
                      Move Up
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.reorderButton,
                      index === builder.workouts.length - 1 && styles.reorderButtonDisabled,
                    ]}
                    onPress={() => handleMoveWorkoutDown(index)}
                    disabled={index === builder.workouts.length - 1}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={
                        index === builder.workouts.length - 1
                          ? COLORS.textSecondary
                          : COLORS.text
                      }
                    />
                    <Text
                      style={[
                        styles.reorderText,
                        index === builder.workouts.length - 1 && styles.reorderTextDisabled,
                      ]}
                    >
                      Move Down
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, styles.draftButton]}
          onPress={() => handleSaveClass(true)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <Ionicons name="document-outline" size={20} color={COLORS.text} />
              <Text style={styles.saveButtonText}>Save as Draft</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, styles.publishButton]}
          onPress={() => handleSaveClass(false)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={[styles.saveButtonText, { color: '#fff' }]}>Create Class</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Workout Picker Modal */}
      <Modal
        visible={showWorkoutPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkoutPicker(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.md }]}>
            <Text style={styles.modalTitle}>Add Workout</Text>
            <TouchableOpacity onPress={() => setShowWorkoutPicker(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search workouts..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Workout List */}
          {workoutsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <>
              <FlatList
                data={filteredWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const selectionOrder = getWorkoutSelectionOrder(item.id);
                  const isSelected = selectionOrder !== null;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.workoutPickerItem,
                        isSelected && styles.workoutPickerItemSelected,
                      ]}
                      onPress={() => handleToggleWorkoutSelection(item)}
                    >
                      <View style={styles.workoutPickerInfo}>
                        <Text style={styles.workoutPickerName}>
                          {item?.workout_name || item?.name || 'Unnamed Workout'}
                        </Text>
                        <Text style={styles.workoutPickerDescription} numberOfLines={2}>
                          {item?.description || 'No description'}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectionBadge}>
                          <Text style={styles.selectionBadgeText}>{selectionOrder}</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle-outline" size={28} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No workouts found' : 'No workouts available'}
                    </Text>
                  </View>
                }
              />
              
              {/* Done Button - Fixed at bottom */}
              {selectedWorkouts.length > 0 && (
                <View style={styles.doneButtonContainer}>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleDoneSelectingWorkouts}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.doneButtonText}>
                      Add {selectedWorkouts.length} Workout{selectedWorkouts.length > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  durationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Input
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  clearButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },

  // Add Workout
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  addWorkoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Workout Card
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
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
  },
  workoutDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  removeButton: {
    padding: SPACING.sm,
  },

  // Controls
  durationControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  controlLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  durationInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minWidth: 60,
    textAlign: 'center',
  },
  durationDisplay: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cuesControl: {
    marginBottom: SPACING.md,
  },
  cuesInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minHeight: 60,
    marginTop: SPACING.xs,
    textAlignVertical: 'top',
  },

  // Reorder
  reorderButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  reorderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  reorderTextDisabled: {
    color: COLORS.textSecondary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  draftButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  publishButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  workoutPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  workoutPickerItemSelected: {
    backgroundColor: COLORS.surfaceLight,
  },
  workoutPickerInfo: {
    flex: 1,
  },
  workoutPickerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  workoutPickerDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  selectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  doneButtonContainer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
  splitButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  calendarContainer: {
  marginTop: SPACING.md,
  borderRadius: BORDER_RADIUS.md,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: COLORS.border,
  },
  timePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    width: '80%',
    maxWidth: 400,
  },
  timePickerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  timePickerCancel: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
});