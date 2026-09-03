// src/hooks/useUnsavedChangesGuard.js
import { useState, useEffect, useRef, useCallback } from 'react';

// Call this inside any edit screen to get unsaved-changes protection.
//
// Usage:
//   const { markSaved, resetDirty, discardDialog } = useUnsavedChangesGuard(navigation, [field1, field2, ...]);
//   ...
//   return (
//     <View>
//       ...screen content...
//       <DiscardDialog {...discardDialog} />
//     </View>
//   );
//
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
  const [dialogVisible, setDialogVisible] = useState(false);
  const justSavedRef = useRef(false);
  const isFirstRender = useRef(true);
  const suppressNextChangeRef = useRef(false);
  const pendingActionRef = useRef(null);

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
      pendingActionRef.current = e.data.action;
      setDialogVisible(true);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const confirmDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setDialogVisible(false);
    if (action) navigation.dispatch(action);
  }, [navigation]);

  const keepEditing = useCallback(() => {
    pendingActionRef.current = null;
    setDialogVisible(false);
  }, []);

  function markSaved() {
    justSavedRef.current = true;
  }

  // Call this right after an async fetch finishes populating the form,
  // so the values changing from empty -> loaded doesn't count as "dirty."
  function resetDirty() {
    suppressNextChangeRef.current = true;
    setIsDirty(false);
  }

  return {
    isDirty,
    markSaved,
    resetDirty,
    discardDialog: {
      visible: dialogVisible,
      onKeep: keepEditing,
      onDiscard: confirmDiscard,
    },
  };
}
