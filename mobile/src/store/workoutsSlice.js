// src/store/workoutsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchWorkouts = createAsyncThunk(
  'workouts/fetchWorkouts',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/workouts?${params.toString()}`);
      return response.data.workouts;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch workouts');
    }
  }
);

export const fetchWorkoutDetail = createAsyncThunk(
  'workouts/fetchWorkoutDetail',
  async (workoutId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workouts/${workoutId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch workout');
    }
  }
);

export const createWorkout = createAsyncThunk(
  'workouts/createWorkout',
  async (workoutData, { rejectWithValue }) => {
    try {
      const response = await api.post('/workouts', workoutData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create workout');
    }
  }
);

const workoutsSlice = createSlice({
  name: 'workouts',
  initialState: {
    items: [],
    currentWorkout: null,
    loading: false,
    error: null,
    filters: {
      search: '',
      difficulty: null,
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentWorkout: (state) => {
      state.currentWorkout = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workouts
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch workout detail
      .addCase(fetchWorkoutDetail.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWorkoutDetail.fulfilled, (state, action) => {
        state.currentWorkout = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkoutDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create workout
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { setFilters, clearCurrentWorkout } = workoutsSlice.actions;
export default workoutsSlice.reducer;