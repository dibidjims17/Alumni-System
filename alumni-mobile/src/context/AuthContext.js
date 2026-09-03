// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null); // { id, fullName, studentNumber, program, schoolYear, mustChangePassword }
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check if we have a saved session
  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const studentJson = await AsyncStorage.getItem('studentData');
      if (token && studentJson) {
        setStudent(JSON.parse(studentJson));
      }
    } catch (err) {
      console.error('Failed to load stored session:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(identifier, password) {
    const response = await apiClient.post('/Auth/login', {
      identifier,
      password,
    });

    const { token, ...studentData } = response.data;

    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('studentData', JSON.stringify(studentData));

    setStudent(studentData);
    return studentData;
  }

  async function logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('studentData');
    setStudent(null);
  }

  // Call this after a successful password change so the app
  // stops routing to the ChangePassword screen
  async function clearMustChangePassword() {
    if (!student) return;
    const updated = { ...student, mustChangePassword: false };
    await AsyncStorage.setItem('studentData', JSON.stringify(updated));
    setStudent(updated);
  }

  async function changePassword(currentPassword, newPassword) {
    await apiClient.post('/Auth/change-password', {
      currentPassword,
      newPassword,
    });

    // Backend doesn't return the student object here, so just
    // update our local copy and persist it
    if (!student) return;
    const updated = { ...student, mustChangePassword: false };
    await AsyncStorage.setItem('studentData', JSON.stringify(updated));
    setStudent(updated);
  }

  return (
    <AuthContext.Provider
      value={{ student, isLoading, login, logout, changePassword, clearMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
  
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}