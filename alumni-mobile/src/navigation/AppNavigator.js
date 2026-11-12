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
import ProfileSetupWizardScreen from '../screens/ProfileSetupWizardScreen';
import JobPreferencesScreen from '../screens/JobPreferencesScreen';
import EditSkillsScreen from '../screens/EditSkillsScreen';
import EditWorkExperienceScreen from '../screens/EditWorkExperienceScreen';
import EditEducationScreen from '../screens/EditEducationScreen';
import ResumeScreen from '../screens/ResumeScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import CareerProofScreen from '../screens/CareerProofScreen';
import TracerStudyScreen from '../screens/TracerStudyScreen';

import CareerHomeScreen from '../screens/CareerHomeScreen';
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

// CDM portal header: deep-green bar + 3px gold strip, white title.
// statusBarStyle 'light' fits every screen whose top is green; auth screens
// with a light top (Login/Forgot/Reset) override it per-screen below.
function headerOptions(c, statusBarStyle = 'light') {
  return {
    headerStyle: { backgroundColor: c.brandDeep },
    headerTintColor: '#FFFFFF',
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
    contentStyle: { backgroundColor: c.background },
    statusBarStyle,
    statusBarBackgroundColor: statusBarStyle === 'light' ? c.brandDeep : c.background,
    headerBackground: () => (
      <View
        style={{
          flex: 1,
          backgroundColor: c.brandDeep,
          borderBottomWidth: 3,
          borderBottomColor: c.gold,
        }}
      />
    ),
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
        options={{ headerShown: false }}
      />
      <CommunityStackNav.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{ headerShown: false }}
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
      <CareerStackNav.Screen name="CareerHome" component={CareerHomeScreen} />
      <CareerStackNav.Screen name="CareerProof" component={CareerProofScreen} />
      <CareerStackNav.Screen name="JobsList" component={JobsListScreen} />
      <CareerStackNav.Screen name="MyApplications" component={MyApplicationsScreen} />
      <CareerStackNav.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ headerShown: false }}
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
      <ProfileStackNav.Screen name="ProfileWizard" component={ProfileSetupWizardScreen} options={{ title: 'Complete Profile' }} />
      <ProfileStackNav.Screen name="JobPreferences" component={JobPreferencesScreen} options={{ title: 'Job Preferences' }} />
      <ProfileStackNav.Screen name="EditSkills" component={EditSkillsScreen} options={{ title: 'Edit Skills' }} />
      <ProfileStackNav.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} options={{ title: 'Work Experience' }} />
      <ProfileStackNav.Screen name="EditEducation" component={EditEducationScreen} options={{ title: 'Education' }} />
      <ProfileStackNav.Screen name="Resume" component={ResumeScreen} options={{ headerShown: false }} />
      <ProfileStackNav.Screen name="Documents" component={DocumentsScreen} options={{ title: 'My Documents' }} />
      <ProfileStackNav.Screen
        name="TracerStudy"
        component={TracerStudyScreen}
        options={{ title: 'Graduate Tracer Study (BETA)' }}
      />
      <ProfileStackNav.Screen name="YearCorrection" component={YearCorrectionScreen} options={{ headerShown: false }} />
      <ProfileStackNav.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={({ route }) => ({
          title: 'Change Password',
          headerShown: !route.params?.inScreenBack,
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
        options={{ headerShown: false }}
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarStyle: {
          backgroundColor: c.surface,
          // Signature gold edge frames the content, echoing the header strip.
          borderTopWidth: 2,
          borderTopColor: c.gold,
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

  // Tracer pre-screening gate (beta): graduates who haven't answered see the
  // questionnaire instead of the tabs. Skip/finish dismisses it for this
  // session only — the real submission flag lives on the server, so a fresh
  // login shows it again until the response is recorded.
  const [tracerDismissed, setTracerDismissed] = React.useState(false);
  const showTracerGate =
    !tracerDismissed &&
    !student?.mustChangePassword &&
    !student?.tracerCompleted &&
    student?.schoolYear === 'Graduate';

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.brandDeep }}
      >
        <StatusBar barStyle="light-content" backgroundColor={c.brandDeep} />
        <ActivityIndicator size="large" color={c.gold} />
      </View>
    );
  }

  // Screens with a light top (their background shows behind the status bar)
  // need dark icons in light mode; dark mode's top is dark → light icons.
  const lightTopOptions = {
    ...headerOptions(c, theme.mode === 'dark' ? 'light' : 'dark'),
    headerShown: false,
    contentStyle: { backgroundColor: c.background },
    // Their tops show the themed background, not green — match it exactly.
    statusBarBackgroundColor: c.background,
  };
  const authOptions = {
    ...headerOptions(c),
    headerShown: false,
    contentStyle: { backgroundColor: c.background },
  };

  return (
    <NavigationContainer>
      {!student ? (
        <HomeStackNav.Navigator screenOptions={authOptions}>
          <HomeStackNav.Screen name="Login" component={LoginScreen} options={lightTopOptions} />
          <HomeStackNav.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={lightTopOptions}
          />
          <HomeStackNav.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={lightTopOptions}
          />
        </HomeStackNav.Navigator>
      ) : student.mustChangePassword ? (
          <HomeStackNav.Navigator screenOptions={authOptions}>
            <HomeStackNav.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </HomeStackNav.Navigator>
        ) : showTracerGate ? (
          <HomeStackNav.Navigator screenOptions={authOptions}>
            <HomeStackNav.Screen name="TracerStudy" options={{ headerShown: false }}>
              {(props) => <TracerStudyScreen {...props} onExit={() => setTracerDismissed(true)} />}
            </HomeStackNav.Screen>
          </HomeStackNav.Navigator>
        ) : (
          <AppTabs />
        )}
    </NavigationContainer>
  );
}
