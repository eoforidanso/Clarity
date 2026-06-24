import { useEffect, useRef, useState } from 'react';
import { patients as patientsApi } from '../services/api';

export function useStickyNote(selectedPatient, patchPatient) {
  const [note, setNote]         = useState('');
  const noteRef                 = useRef('');   // always current — avoids stale closures
  const lastSavedRef            = useRef('');   // value confirmed in DB
  const patientIdRef            = useRef(null); // patient the refs belong to
  const debounceId              = useRef(null);

  // Keep noteRef in sync every render (must be outside effects)
  noteRef.current = note;

  const save = (pid, text) => {
    patientsApi.updateStickyNote(pid, text).catch(() => {});
    if (patchPatient) patchPatient(pid, { stickyNote: text });
    lastSavedRef.current = text;
  };

  // 1) Hydrate when patient changes
  useEffect(() => {
    if (!selectedPatient) return;
    const incoming = selectedPatient.stickyNote ?? '';
    patientIdRef.current  = selectedPatient.id;
    lastSavedRef.current  = incoming;
    noteRef.current       = incoming;
    setNote(incoming);
  }, [selectedPatient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Debounced save while typing
  useEffect(() => {
    if (!selectedPatient || note === lastSavedRef.current) return;
    clearTimeout(debounceId.current);
    debounceId.current = setTimeout(() => {
      if (patientIdRef.current !== selectedPatient.id) return; // guard: patient changed during debounce
      save(selectedPatient.id, noteRef.current);
    }, 800);
    return () => clearTimeout(debounceId.current);
  }, [note, selectedPatient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) Flush on patient switch — cleanup runs for the PREVIOUS patient
  useEffect(() => {
    return () => {
      clearTimeout(debounceId.current);
      const pid  = patientIdRef.current;
      const text = noteRef.current;       // ref is always current, not stale
      if (pid && text !== lastSavedRef.current) save(pid, text);
    };
  }, [selectedPatient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4) Flush on full unmount (navigating away from ChartPage)
  useEffect(() => {
    return () => {
      clearTimeout(debounceId.current);
      const pid  = patientIdRef.current;
      const text = noteRef.current;       // ref is always current, not stale
      if (pid && text !== lastSavedRef.current) save(pid, text);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { note, setNote };
}
