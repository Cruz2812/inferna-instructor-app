import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkout, updateWorkout, fetchInjuryRisks } from '../store/workoutsSlice';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', color: COLORS.beginner },
  { value: 'intermediate', label: 'Intermediate', color: COLORS.intermediate },
  { value: 'advanced', label: 'Advanced', color: COLORS.advanced },
  { value: 'all_levels', label: 'All Levels', color: COLORS.all_levels },
];

const SEVERITY_COLORS = {
  high: COLORS.error,
  medium: COLORS.warning,
  low: COLORS.success,
};

export default function WorkoutBuilderScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { creating, updating, injuryRisks } = useSelector(state => state.workouts);
  
  // Check if we're editing an existing workout
  const editMode = route.params?.workout ? true : false;
  const existingWorkout = route.params?.workout;

  // Form state
  const [workoutName, setWorkoutName] = useState(existingWorkout?.name || '');
  const [description, setDescription] = useState(existingWorkout?.description || '');
  const [difficulty, setDifficulty] = useState(existingWorkout?.difficulty || 'all_levels');
  const [durationMinutes, setDurationMinutes] = useState(
    existingWorkout?.default_duration ? String(Math.round(existingWorkout.default_duration / 60)) : ''
  );
  const [equipmentInput, setEquipmentInput] = useState(
    existingWorkout?.equipment ? existingWorkout.equipment.join(', ') : ''
  );
  const [tagsInput, setTagsInput] = useState(
    existingWorkout?.tags ? existingWorkout.tags.join(', ') : ''
  );
  const [selectedRiskIds, setSelectedRiskIds] = useState(
    existingWorkout?.injury_risks ? existingWorkout.injury_risks.map(r => r.id) : []
  );

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    navigation.setOptions({
      title: editMode ? 'Edit Workout' : 'Create Workout',
    });
    
    // Fetch injury risks if not already loaded
    if (injuryRisks.length === 0) {
      dispatch(fetchInjuryRisks());
    }
  }, [editMode, injuryRisks.length]);

  const validateForm = () => {
    const newErrors = {};

    if (!workoutName.trim()) {
      newErrors.workoutName = 'Workout name is required';
    } else if (workoutName.trim().length < 3) {
      newErrors.workoutName = 'Workout name must be at least 3 characters';
    }

    if (!durationMinutes || isNaN(durationMinutes) || parseInt(durationMinutes) <= 0) {
      newErrors.durationMinutes = 'Duration must be a number greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleRisk = (riskId) => {
    setSelectedRiskIds(prev => 
      prev.includes(riskId)
        ? prev.filter(id => id !== riskId)
        : [...prev, riskId]
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    // Parse equipment and tags
    const equipment = equipmentInput
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const workoutData = {
      name: workoutName.trim(),
      description: description.trim() || null,
      default_duration: parseInt(durationMinutes) * 60, // Convert to seconds
      difficulty,
      equipment,
      tags,
      injury_risk_ids: selectedRiskIds,
    };

    try {
      if (editMode) {
        await dispatch(updateWorkout({
          workoutId: existingWorkout.id,
          workoutData
        })).unwrap();
        Alert.alert('Success', 'Workout updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await dispatch(createWorkout(workoutData)).unwrap();
        Alert.alert('Success', 'Workout created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to save workout');
    }
  };

  const handleCancel = () => {
    if (workoutName || description) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const isLoading = creating || updating;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Workout Name *</Text>
          <TextInput
            style={[styles.input, errors.workoutName && styles.inputError]}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="e.g., Plank Hold"
            placeholderTextColor={COLORS.textSecondary}
          />
          {errors.workoutName && (
            <Text style={styles.errorText}>{errors.workoutName}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the workout..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Difficulty */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Difficulty Level *</Text>
          <View style={styles.difficultyContainer}>
            {DIFFICULTY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.difficultyButton,
                  difficulty === option.value && {
                    backgroundColor: option.color,
                    borderColor: option.color,
                  }
                ]}
                onPress={() => setDifficulty(option.value)}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    difficulty === option.value && styles.difficultyTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default Duration */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Default Duration (minutes) *</Text>
          <TextInput
            style={[styles.input, errors.durationMinutes && styles.inputError]}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="e.g., 2"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />
          {errors.durationMinutes && (
            <Text style={styles.errorText}>{errors.durationMinutes}</Text>
          )}
        </View>

        {/* Equipment */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Equipment</Text>
          <TextInput
            style={styles.input}
            value={equipmentInput}
            onChangeText={setEquipmentInput}
            placeholder="e.g., mat, resistance band, foam roller"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.helperText}>Separate items with commas</Text>
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="e.g., core, balance, warmup"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.helperText}>Separate tags with commas</Text>
        </View>

        {/* Injury Risks */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Injury Risk Considerations</Text>
          <Text style={styles.helperText}>
            Select any body areas or conditions that may be affected
          </Text>
          {injuryRisks.length === 0 ? (
            <View style={styles.loadingRisks}>
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
              <Text style={styles.loadingText}>Loading injury risks...</Text>
            </View>
          ) : (
            <View style={styles.risksList}>
              {injuryRisks.map(risk => (
                <TouchableOpacity
                  key={risk.id}
                  style={[
                    styles.riskItem,
                    selectedRiskIds.includes(risk.id) && styles.riskItemSelected
                  ]}
                  onPress={() => toggleRisk(risk.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.riskHeader}>
                    <View style={styles.riskTitleRow}>
                      <Ionicons
                        name={selectedRiskIds.includes(risk.id) ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selectedRiskIds.includes(risk.id) ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text style={[
                        styles.riskName,
                        selectedRiskIds.includes(risk.id) && styles.riskNameSelected
                      ]}>
                        {risk.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: SEVERITY_COLORS[risk.severity] || COLORS.textSecondary }
                      ]}
                    >
                      <Text style={styles.severityText}>
                        {risk.severity?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.riskDescription}>{risk.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editMode ? 'Update' : 'Create'} Workout
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  difficultyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  difficultyButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  difficultyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  difficultyTextSelected: {
    color: COLORS.text,
  },
  loadingRisks: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  risksList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  riskItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riskItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  riskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  riskName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  riskNameSelected: {
    fontWeight: '600',
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
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});