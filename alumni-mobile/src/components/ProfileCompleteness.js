// src/components/ProfileCompleteness.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function isFilled(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function computeCompleteness(profile, jobPreferences, hasResume) {
  const items = [
    {
      key: 'headline',
      label: 'Add a headline',
      weight: 5,
      done: isFilled(profile?.headline),
      target: { screen: 'EditProfile', params: { profile } },
    },
    {
      key: 'bio',
      label: 'Add a bio',
      weight: 5,
      done: isFilled(profile?.bio),
      target: { screen: 'EditProfile', params: { profile } },
    },
    {
      key: 'location',
      label: 'Add your location',
      weight: 5,
      done: isFilled(profile?.location),
      target: { screen: 'EditProfile', params: { profile } },
    },
    {
      key: 'phone',
      label: 'Add your phone number',
      weight: 5,
      done: isFilled(profile?.phone),
      target: { screen: 'EditProfile', params: { profile } },
    },
    {
      key: 'education',
      label: 'Add education',
      weight: 15,
      done: (profile?.educations?.length || 0) > 0,
      target: { screen: 'EditEducation', params: {} },
    },
    {
      key: 'work',
      label: 'Add work experience',
      weight: 15,
      done: (profile?.workExperiences?.length || 0) > 0,
      target: { screen: 'EditWorkExperience', params: {} },
    },
    {
      key: 'skills',
      label: 'Add skills',
      weight: 15,
      done: (profile?.skills?.length || 0) > 0,
      target: { screen: 'EditSkills', params: { skills: profile?.skills || [] } },
    },
    {
      key: 'resume',
      label: 'Upload your resume',
      weight: 20,
      done: !!hasResume,
      target: { screen: 'Resume', params: {} },
    },
    {
      key: 'prefs',
      label: 'Set job preferences',
      weight: 15,
      done:
        !!jobPreferences &&
        (isFilled(jobPreferences.preferredJobTitle) ||
          isFilled(jobPreferences.preferredIndustry) ||
          isFilled(jobPreferences.preferredLocation) ||
          !!jobPreferences.isOpenToWork),
      target: { screen: 'JobPreferences', params: {} },
    },
  ];

  const percent = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percent, items, missing: items.filter((item) => !item.done) };
}

export default function ProfileCompleteness({ profile, jobPreferences, hasResume, navigation }) {
  const { percent, missing } = computeCompleteness(profile, jobPreferences, hasResume);

  if (percent === 100) {
    return (
      <View style={styles.completeBox}>
        <Text style={styles.completeText}>Your profile is complete.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Profile {percent}% complete</Text>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${percent}%` }]} />
      </View>
      {missing.map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => navigation.navigate(item.target.screen, item.target.params)}
        >
          <Text style={styles.missingItem}>• {item.label} (+{item.weight}%)</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
  },
  completeBox: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
  },
  completeText: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  barOuter: {
    height: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  barInner: {
    height: '100%',
    backgroundColor: '#1a4fd8',
  },
  missingItem: { fontSize: 12, marginTop: 4, color: '#1a4fd8' },
});
