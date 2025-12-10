// src/navigation/MainNavigator.js
import { View, Text } from 'react-native';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Screens
import WorkoutCatalogScreen from '../screens/WorkoutCatalogScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ClassesScreen from '../screens/ClassesScreen';
import ClassDetailScreen from '../screens/ClassDetailScreen';
import PlayModeScreen from '../screens/PlayModeScreen';
import ClassBuilderScreen from '../screens/ClassBuilderScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Workout Stack
function WorkoutStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="WorkoutCatalog"
        component={WorkoutCatalogScreen}
        options={{ title: 'Workouts' }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: 'Workout Details' }}
      />
    </Stack.Navigator>
  );
}

// Classes Stack - ADD THIS
function ClassesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="ClassesList"
        component={ClassesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={{ title: 'Class Details' }}
      />
      <Stack.Screen 
        name="PlayMode" 
        component={PlayModeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClassBuilder"
        component={ClassBuilderScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Placeholder for Profile
function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name="person-circle-outline" size={64} color={COLORS.textSecondary} />
      <Text style={{ color: COLORS.text, fontSize: 18, marginTop: 16 }}>Profile Coming Soon</Text>
    </View>
  );
}

// Main Tab Navigator
export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 24, // INCREASED from 8 to 24 for better spacing
          height: 76, // INCREASED from 60 to 76
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 4, // Added margin
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Workouts"
        component={WorkoutStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Classes"
        component={ClassesStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}