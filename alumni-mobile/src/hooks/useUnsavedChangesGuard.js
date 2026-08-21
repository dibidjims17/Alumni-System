// src/hooks/useUnsavedChangesGuard.js
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

// Call this inside any edit screen to get unsaved-changes protection.
//
// Usage:
//   const { markSaved, resetDirty } = useUnsavedChangesGuard(navigation, [field1, field2, ...]);
//   ...
//   // after an async fetch populates the form with existing data:
//   useEffect(() => { resetDirty(); }, [dataLoadedFlag]);
//   ...
//   async function handleSave() {
//     await apiClient.put(...);
//     markSaved();
//     navigation.goBack();
//   }
export function useUnsavedChangesGuard(navigation, watchedValues) {
  const [isDirty, setIsDirty] = useState(false);
  const justSavedRef = useRef(false);
  const isFirstRender = useRef(true);
  const suppressNextChangeRef = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (suppressNextChangeRef.current) {
      // This change was caused by resetDirty()'s data reload, not the user — skip it.
      suppressNextChangeRef.current = false;
      return;
    }
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watchedValues);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty || justSavedRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave without saving?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  function markSaved() {
    justSavedRef.current = true;
  }

  // Call this right after an async fetch finishes populating the form,
  // so the values changing from empty -> loaded doesn't count as "dirty."
  function resetDirty() {
    suppressNextChangeRef.current = true;
    setIsDirty(false);
  }

  return { isDirty, markSaved, resetDirty };
}