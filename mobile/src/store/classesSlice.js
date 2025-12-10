// src/store/classesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchClasses = createAsyncThunk(
  'classes/fetchClasses',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.scheduled) params.append('scheduled', filters.scheduled);
      
      const response = await api.get(`/classes?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch classes');
    }
  }
);

export const fetchClassDetail = createAsyncThunk(
  'classes/fetchClassDetail',
  async (classId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/classes/${classId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch class');
    }
  }
);

export const createClass = createAsyncThunk(
  'classes/createClass',
  async (classData, { rejectWithValue }) => {
    try {
      const response = await api.post('/classes', classData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create class');
    }
  }
);

const classesSlice = createSlice({
  name: 'classes',
  initialState: {
    items: [],
    currentClass: null,
    loading: false,
    error: null,
    builder: {
      name: '',
      classTypeId: null,
      scheduledAt: null,
      workouts: [],
      isDraft: true,
    },
  },
  reducers: {
    setBuilderField: (state, action) => {
      const { field, value } = action.payload;
      state.builder[field] = value;
    },
    addWorkoutToBuilder: (state, action) => {
      console.log('=== ADDING WORKOUT ===');
      console.log('Payload:', action.payload);
      console.log('ID:', action.payload.id);
      console.log('====================');
      
      state.builder.workouts.push({
        workoutId: action.payload.id,
        workout: action.payload,
        durationOverride: action.payload.default_duration,
        transitionTime: 30,
        instructorCues: '',
      });
    },
    removeWorkoutFromBuilder: (state, action) => {
      state.builder.workouts.splice(action.payload, 1);
    },
    reorderBuilderWorkouts: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      const [removed] = state.builder.workouts.splice(fromIndex, 1);
      state.builder.workouts.splice(toIndex, 0, removed);
    },
    clearBuilder: (state) => {
      state.builder = {
        name: '',
        classTypeId: null,
        scheduledAt: null,
        workouts: [],
        isDraft: true,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch classes
      .addCase(fetchClasses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch class detail
      .addCase(fetchClassDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClassDetail.fulfilled, (state, action) => {
        state.currentClass = action.payload;
        state.loading = false;
      })
      .addCase(fetchClassDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create class
      .addCase(createClass.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.builder = {
          name: '',
          classTypeId: null,
          scheduledAt: null,
          workouts: [],
          isDraft: true,
        };
      });
  },
});

export const {
  setBuilderField,
  addWorkoutToBuilder,
  removeWorkoutFromBuilder,
  reorderBuilderWorkouts,
  clearBuilder,
} = classesSlice.actions;

export default classesSlice.reducer;