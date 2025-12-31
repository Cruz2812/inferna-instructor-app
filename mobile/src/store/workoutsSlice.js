import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Fetch available injury risks
export const fetchInjuryRisks = createAsyncThunk(
  'workouts/fetchInjuryRisks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/workouts/injury-risks');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch injury risks' });
    }
  }
);

// Fetch workouts with optional search
export const fetchWorkouts = createAsyncThunk(
  'workouts/fetchWorkouts',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/workouts', { params: filters });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch workouts' });
    }
  }
);

// Fetch single workout (for detail view with all relations)
export const fetchWorkoutDetail = createAsyncThunk(
  'workouts/fetchWorkoutDetail',
  async (workoutId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workouts/${workoutId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch workout details' });
    }
  }
);

// Fetch single workout
export const fetchWorkoutById = createAsyncThunk(
  'workouts/fetchWorkoutById',
  async (workoutId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workouts/${workoutId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch workout' });
    }
  }
);

// Create new workout
export const createWorkout = createAsyncThunk(
  'workouts/createWorkout',
  async (workoutData, { rejectWithValue }) => {
    try {
      const response = await api.post('/workouts', workoutData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to create workout' });
    }
  }
);

// Update existing workout
export const updateWorkout = createAsyncThunk(
  'workouts/updateWorkout',
  async ({ workoutId, workoutData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/workouts/${workoutId}`, workoutData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to update workout' });
    }
  }
);

// Delete workout
export const deleteWorkout = createAsyncThunk(
  'workouts/deleteWorkout',
  async (workoutId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/workouts/${workoutId}`);
      return { id: workoutId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to delete workout' });
    }
  }
);

const workoutsSlice = createSlice({
  name: 'workouts',
  initialState: {
    items: [],
    selectedWorkout: null,
    currentWorkout: null, // For detail view
    injuryRisks: [], // Available injury risks
    loading: false,
    error: null,
    searchQuery: '',
    filters: { search: '' },
    creating: false,
    updating: false,
    deleting: false,
  },
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSelectedWorkout: (state) => {
      state.selectedWorkout = null;
    },
    clearCurrentWorkout: (state) => {
      state.currentWorkout = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch injury risks
      .addCase(fetchInjuryRisks.pending, (state) => {
        // Don't set loading for background fetch
      })
      .addCase(fetchInjuryRisks.fulfilled, (state, action) => {
        state.injuryRisks = action.payload;
      })
      .addCase(fetchInjuryRisks.rejected, (state, action) => {
        console.error('Failed to fetch injury risks:', action.payload);
      })
      
      // Fetch workouts
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch workouts';
      })
      
      // Fetch single workout
      .addCase(fetchWorkoutById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkoutById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedWorkout = action.payload;
      })
      .addCase(fetchWorkoutById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch workout';
      })
      
      // Fetch workout detail (with all relations)
      .addCase(fetchWorkoutDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkoutDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkout = action.payload;
      })
      .addCase(fetchWorkoutDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch workout details';
      })
      
      // Create workout
      .addCase(createWorkout.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.creating = false;
        state.items.push(action.payload);
        // Sort by name after adding
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(createWorkout.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload?.error || 'Failed to create workout';
      })
      
      // Update workout
      .addCase(updateWorkout.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateWorkout.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.items.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedWorkout?.id === action.payload.id) {
          state.selectedWorkout = action.payload;
        }
        // Re-sort after update
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateWorkout.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload?.error || 'Failed to update workout';
      })
      
      // Delete workout
      .addCase(deleteWorkout.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteWorkout.fulfilled, (state, action) => {
        state.deleting = false;
        state.items = state.items.filter(w => w.id !== action.payload.id);
        if (state.selectedWorkout?.id === action.payload.id) {
          state.selectedWorkout = null;
        }
      })
      .addCase(deleteWorkout.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload?.error || 'Failed to delete workout';
      });
  },
});

export const { setSearchQuery, setFilters, clearSelectedWorkout, clearCurrentWorkout, clearError } = workoutsSlice.actions;
export default workoutsSlice.reducer;