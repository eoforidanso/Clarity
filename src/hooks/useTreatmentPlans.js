import { useState, useEffect } from 'react';
import { treatmentPlans as api } from '../services/api';

export function useTreatmentPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.list()
      .then(data => {
        if (!cancelled) {
          setPlans(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setPlans([]);
          setError(err?.message || 'Failed to load treatment plans');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { plans, setPlans, loading, error };
}
