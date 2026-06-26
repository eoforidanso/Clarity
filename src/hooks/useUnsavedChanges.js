import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChanges(isDirty, confirmMessage = 'You have unsaved changes. Leave anyway?') {
  // Block in-app navigation when dirty
  useBlocker(({ currentLocation, nextLocation }) => {
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  // Block browser refresh / tab close when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = confirmMessage;
      return confirmMessage;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, confirmMessage]);
}
