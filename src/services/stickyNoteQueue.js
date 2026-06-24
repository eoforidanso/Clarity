import { patients as patientsApi } from './api';

// Module-level map — survives component mount/unmount cycles.
// Keyed by patientId so each patient has an independent 800ms debounce.
const pending = {};

export function scheduleSave(patientId, note) {
  if (pending[patientId]) clearTimeout(pending[patientId].timer);
  pending[patientId] = {
    note,
    timer: setTimeout(() => {
      patientsApi.updateStickyNote(patientId, note).catch(() => {});
      delete pending[patientId];
    }, 800),
  };
}

// Call on beforeunload — flushes every dirty patient immediately.
export function flushAll() {
  Object.entries(pending).forEach(([patientId, { note, timer }]) => {
    clearTimeout(timer);
    delete pending[patientId];
    patientsApi.updateStickyNote(patientId, note).catch(() => {});
  });
}
