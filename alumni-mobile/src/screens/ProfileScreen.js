// src/screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../api/client';
import { API_BASE_URL } from '../config';
import ProfileCompleteness from '../components/ProfileCompleteness';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

export default function ProfileScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [jobPreferences, setJobPreferences] = useState(null);
    const [hasResume, setHasResume] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
  
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/Profile');
        setProfile(res.data);
      } catch (err) {
        Alert.alert('Error', 'Could not load profile.');
      }
    }
  
    async function fetchJobPreferences() {
      try {
        const res = await apiClient.get('/Profile/job-preferences');
        if (res.data && !res.data.message) {
          setJobPreferences(res.data);
        } else {
          setJobPreferences(null);
        }
      } catch (err) {
        // Silently ignore — job preferences are optional, don't block profile loading
      }
    }

    async function fetchResumeStatus() {
      try {
        await apiClient.get('/Resume/active');
        setHasResume(true);
      } catch (err) {
        setHasResume(false);
      }
    }

    async function handleChangePicture() {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;

        const file = result.assets[0];
        if (!file.mimeType || !file.mimeType.startsWith('image/')) {
          Alert.alert('Invalid file', 'Please choose an image file.');
          return;
        }
        if (file.size && file.size > MAX_PICTURE_BYTES) {
          Alert.alert('File too large', 'Profile picture must be 5MB or smaller.');
          return;
        }

        await apiClient.uploadFile('/Profile/picture', file.uri, file.name, file.mimeType);
        await fetchProfile();
      } catch (err) {
        const message = err.response?.data?.message || 'Could not upload profile picture.';
        Alert.alert('Error', message);
      }
    }

    function confirmRemovePicture() {
      Alert.alert(
        'Remove photo',
        'Remove your profile picture and go back to the default?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: handleRemovePicture },
        ]
      );
    }

    async function handleRemovePicture() {
      try {
        await apiClient.delete('/Profile/picture');
        await fetchProfile();
      } catch (err) {
        const message = err.response?.data?.message || 'Could not remove profile picture.';
        Alert.alert('Error', message);
      }
    }
  
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      Promise.all([fetchProfile(), fetchJobPreferences(), fetchResumeStatus()]).finally(() => setIsLoading(false));
    }, [])
  );

  if (isLoading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={handleChangePicture} accessibilityLabel="Change profile picture">
        <Image
          source={
            profile.profilePictureUrl
              ? { uri: `${SERVER_ROOT}/${profile.profilePictureUrl}` }
              : require('../../assets/defaultPFP.png')
          }
          style={styles.avatar}
        />
      </TouchableOpacity>
      {profile.profilePictureUrl ? (
        <TouchableOpacity onPress={confirmRemovePicture} accessibilityLabel="Remove profile picture">
          <Text style={styles.removePhotoText}>Remove photo</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.name}>{profile.fullName}</Text>
      <Text style={styles.subtext}>{profile.studentNumber} - {profile.program}</Text>
      {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}

      <ProfileCompleteness
        profile={profile}
        jobPreferences={jobPreferences}
        hasResume={hasResume}
        navigation={navigation}
      />

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditProfile', { profile })}
      >
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.fieldLabel}>Bio</Text>
        <Text style={styles.fieldValue}>{profile.bio || 'Not set'}</Text>
        <Text style={styles.fieldLabel}>Location</Text>
        <Text style={styles.fieldValue}>{profile.location || 'Not set'}</Text>
        <Text style={styles.fieldLabel}>LinkedIn</Text>
        <Text style={styles.fieldValue}>{profile.linkedInUrl || 'Not set'}</Text>
        <Text style={styles.fieldLabel}>Phone</Text>
        <Text style={styles.fieldValue}>{profile.phone || 'Not set'}</Text>
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <Text style={styles.fieldValue}>
          {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}
        </Text>
        <Text style={styles.fieldLabel}>Address</Text>
        <Text style={styles.fieldValue}>{profile.address || 'Not set'}</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('Resume')}
      >
        <Text style={styles.buttonText}>Resume</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('CareerTab', { screen: 'MyApplications' })}
      >
        <Text style={styles.buttonText}>My Applications</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Work Experience</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditWorkExperience', {})}
          >
            <Text style={styles.editLink}>Add</Text>
          </TouchableOpacity>
        </View>
        {profile.workExperiences.length === 0 && (
          <Text style={styles.fieldValue}>No work experience added yet.</Text>
        )}
        {profile.workExperiences.map((we) => (
          <TouchableOpacity
            key={we.id}
            style={styles.itemBlock}
            onPress={() => navigation.navigate('EditWorkExperience', { workExperience: we })}
          >
            <Text style={styles.itemTitle}>{we.jobTitle} - {we.company}</Text>
            <Text style={styles.fieldValue}>{we.location}</Text>
            <Text style={styles.fieldValue}>
              {new Date(we.startDate).toLocaleDateString()} -{' '}
              {we.isCurrentJob ? 'Present' : we.endDate ? new Date(we.endDate).toLocaleDateString() : ''}
            </Text>
            {we.description ? <Text style={styles.fieldValue}>{we.description}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Education</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditEducation', {})}
          >
            <Text style={styles.editLink}>Add</Text>
          </TouchableOpacity>
        </View>
        {profile.educations.length === 0 && (
          <Text style={styles.fieldValue}>No education added yet.</Text>
        )}
        {profile.educations.map((ed) => (
          <TouchableOpacity
            key={ed.id}
            style={styles.itemBlock}
            onPress={() => navigation.navigate('EditEducation', { education: ed })}
          >
            <Text style={styles.itemTitle}>{ed.degree} - {ed.fieldOfStudy}</Text>
            <Text style={styles.fieldValue}>{ed.school}</Text>
            <Text style={styles.fieldValue}>
              {ed.startYear} - {ed.isCurrentlyStudying ? 'Present' : ed.endYear || ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditSkills', { skills: profile.skills })}
          >
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {profile.skills.length === 0 ? (
          <Text style={styles.fieldValue}>No skills added yet.</Text>
        ) : (
          <Text style={styles.fieldValue}>{profile.skills.join(', ')}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Job Preferences</Text>
          <TouchableOpacity onPress={() => navigation.navigate('JobPreferences')}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {jobPreferences ? (
          <>
            <Text style={styles.fieldLabel}>Preferred Job Title</Text>
            <Text style={styles.fieldValue}>{jobPreferences.preferredJobTitle || 'Not set'}</Text>
            <Text style={styles.fieldLabel}>Preferred Industry</Text>
            <Text style={styles.fieldValue}>{jobPreferences.preferredIndustry || 'Not set'}</Text>
            <Text style={styles.fieldLabel}>Preferred Location</Text>
            <Text style={styles.fieldValue}>{jobPreferences.preferredLocation || 'Not set'}</Text>
            <Text style={styles.fieldLabel}>Open to Work</Text>
            <Text style={styles.fieldValue}>{jobPreferences.isOpenToWork ? 'Yes' : 'No'}</Text>
          </>
        ) : (
          <Text style={styles.fieldValue}>No job preferences set yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: 4,
  },
  removePhotoText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a4fd8',
  },
  name: { fontSize: 20 },
  subtext: { fontSize: 13, marginTop: 2 },
  headline: { fontSize: 14, marginTop: 6 },
  editButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 14 },
  section: {
    marginTop: 24,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  fieldLabel: { fontSize: 11, marginTop: 8 },
  fieldValue: { fontSize: 13, marginTop: 2 },
  itemBlock: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: { fontSize: 13 },
  itemTitle: { fontSize: 13, fontWeight: '600' },
});