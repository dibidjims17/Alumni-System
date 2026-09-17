// src/navigation/AppNavigator.js
import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, Users, Briefcase, User, GraduationCap } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import YearCorrectionScreen from '../screens/YearCorrectionScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsListScreen from '../screens/NewsListScreen';
import NewsDetailScreen from '../screens/NewsDetailScreen';
import EventsListScreen from '../screens/EventsListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import DirectoryScreen from '../screens/DirectoryScreen';

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

import NotificationsScreen from '../screens/NotificationsScreen';

import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const CommunityStackNav = createNativeStackNavigator();
const CareerStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();
const YearStackNav = createNativeStackNavigator();

// Shared colors for the tab bar and stack headers.
const TAB_ICONS = {
  HomeTab: House,
  CommunityTab: Users,
  CareerTab: Briefcase,
  ProfileTab: User,
  YearTab: GraduationCap,
};

function headerOptions(c) {
  return {
    headerStyle: { backgroundColor: c.surface },
    headerTintColor: c.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.background },
    headerTitleStyle: { fontWeight: '600' },
  };
}

function HomeStack() {
  const { theme } = useTheme();
  return (
    <HomeStackNav.Navigator
      screenOptions={{ ...headerOptions(theme.colors), headerShown: false }}
    >
      <HomeStackNav.Screen name="Home" component={HomeScreen} />
      <HomeStackNav.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: true, title: 'Notifications' }}
      />
    </HomeStackNav.Navigator>
  );
}

function CommunityStack() {
  const { theme } = useTheme();
  return (
    <CommunityStackNav.Navigator
      screenOptions={{ ...headerOptions(theme.colors), headerShown: false }}
    >
      <CommunityStackNav.Screen name="NewsList" component={NewsListScreen} />
      <CommunityStackNav.Screen name="EventsList" component={EventsListScreen} />
      <CommunityStackNav.Screen name="Directory" component={DirectoryScreen} />
      <CommunityStackNav.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ headerShown: true, title: 'Event Details' }}
      />
      <CommunityStackNav.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{ headerShown: true, title: 'Post' }}
      />
    </CommunityStackNav.Navigator>
  );
}

function CareerStack() {
  const { theme } = useTheme();
  return (
    <CareerStackNav.Navigator
      screenOptions={{ ...headerOptions(theme.colors), headerShown: false }}
    >
      <CareerStackNav.Screen name="JobsList" component={JobsListScreen} />
      <CareerStackNav.Screen name="MyApplications" component={MyApplicationsScreen} />
      <CareerStackNav.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ headerShown: true, title: 'Job Details' }}
      />
    </CareerStackNav.Navigator>
  );
}

function ProfileStack() {
  const { theme } = useTheme();
  return (
    <ProfileStackNav.Navigator screenOptions={headerOptions(theme.colors)}>
      <ProfileStackNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <ProfileStackNav.Screen name="JobPreferences" component={JobPreferencesScreen} options={{ title: 'Job Preferences' }} />
      <ProfileStackNav.Screen name="EditSkills" component={EditSkillsScreen} options={{ title: 'Edit Skills' }} />
      <ProfileStackNav.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} options={{ title: 'Work Experience' }} />
      <ProfileStackNav.Screen name="EditEducation" component={EditEducationScreen} options={{ title: 'Education' }} />
      <ProfileStackNav.Screen name="Resume" component={ResumeScreen} options={{ title: 'Resume' }} />
      <ProfileStackNav.Screen name="YearCorrection" component={YearCorrectionScreen} options={{ headerShown: false }} />
      <ProfileStackNav.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={({ route }) => ({
          title: 'Change Password',
          headerLeft: route.params?.inScreenBack ? () => null : undefined,
        })}
      />
    </ProfileStackNav.Navigator>
  );
}

function YearStack() {
  const { theme } = useTheme();
  return (
    <YearStackNav.Navigator screenOptions={headerOptions(theme.colors)}>
      <YearStackNav.Screen
        name="YearCorrection"
        component={YearCorrectionScreen}
        options={{ headerShown: false }}
      />
      <YearStackNav.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password', headerLeft: () => null }}
      />
    </YearStackNav.Navigator>
  );
}

function AppTabs() {
  const { theme } = useTheme();
  const { student } = useAuth();
  const c = theme.colors;
  // Career and Profile are graduate-only; non-graduates get a dedicated
  // Year Correction tab instead. (schoolYear refreshes on next login.)
  const isGraduate = student?.schoolYear === 'Graduate';
  return (
    <Tab.Navigator
      // Back always exits toward Home first (never walks tab history), and
      // each tab resets when left — returning to a tab always lands on its
      // root screen, never a stale pushed screen like Notifications.
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        headerShown: false,
        unmountOnBlur: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
        tabBarIcon: ({ color, size }) => {
          const Icon = TAB_ICONS[route.name];
          return Icon ? <Icon size={size} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="CommunityTab" component={CommunityStack} options={{ tabBarLabel: 'Community' }} />
      {isGraduate ? (
        <>
          <Tab.Screen name="CareerTab" component={CareerStack} options={{ tabBarLabel: 'Career' }} />
          <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
        </>
      ) : (
        <Tab.Screen name="YearTab" component={YearStack} options={{ tabBarLabel: 'Correction' }} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { student, isLoading } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const authOptions = {
    ...headerOptions(c),
    headerShown: false,
    contentStyle: { backgroundColor: c.background },
  };

  return (
    <>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <NavigationContainer>
        {!student ? (
          <HomeStackNav.Navigator screenOptions={authOptions}>
            <HomeStackNav.Screen name="Login" component={LoginScreen} />
            <HomeStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <HomeStackNav.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </HomeStackNav.Navigator>
        ) : student.mustChangePassword ? (
          <HomeStackNav.Navigator screenOptions={authOptions}>
            <HomeStackNav.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </HomeStackNav.Navigator>
        ) : (
          <AppTabs />
        )}
      </NavigationContainer>
    </>
  );
}
