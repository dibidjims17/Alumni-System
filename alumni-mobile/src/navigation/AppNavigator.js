// src/navigation/AppNavigator.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsListScreen from '../screens/NewsListScreen';
import NewsDetailScreen from '../screens/NewsDetailScreen';

import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import JobPreferencesScreen from '../screens/JobPreferencesScreen';
import EditSkillsScreen from '../screens/EditSkillsScreen';
import EditWorkExperienceScreen from '../screens/EditWorkExperienceScreen';
import EditEducationScreen from '../screens/EditEducationScreen';
import ResumeScreen from '../screens/ResumeScreen';

import JobsListScreen from '../screens/JobsListScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import MyApplicationsScreen from '../screens/MyApplicationsScreen';

import EventsListScreen from '../screens/EventsListScreen';

import DirectoryScreen from '../screens/DirectoryScreen';

import NotificationsScreen from '../screens/NotificationsScreen';

import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
      {!student ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        </>
      ) : student.mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="NewsList" component={NewsListScreen} options={{ title: 'News' }} />
            <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: 'Post' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
            <Stack.Screen name="JobPreferences" component={JobPreferencesScreen} options={{ title: 'Job Preferences' }} />
            <Stack.Screen name="EditSkills" component={EditSkillsScreen} options={{ title: 'Edit Skills' }} />
            <Stack.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} options={{ title: 'Work Experience' }} />
            <Stack.Screen name="EditEducation" component={EditEducationScreen} options={{ title: 'Education' }} />
            <Stack.Screen name="Resume" component={ResumeScreen} options={{ title: 'Resume' }} />
            <Stack.Screen name="JobsList" component={JobsListScreen} options={{ title: 'Jobs' }} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
            <Stack.Screen name="MyApplications" component={MyApplicationsScreen} options={{ title: 'My Applications' }} />
            <Stack.Screen name="EventsList" component={EventsListScreen} options={{ title: 'Events' }} />
            <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Alumni Directory' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}