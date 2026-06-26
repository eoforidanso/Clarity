import { useState, useCallback } from 'react';

export function useSubmitGuard() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withSubmitGuard = useCallback(async (fn) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fn();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return [isSubmitting, withSubmitGuard];
}
