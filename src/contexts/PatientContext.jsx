import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { scheduleSave, flushAll } from '../services/stickyNoteQueue';
import { medications as mockMedications } from '../data/mockData';
import { DEMO_PATIENTS, DEMO_APPOINTMENTS, DEMO_INBOX } from '../demo/demoData';
import {
  patients as patientsApi,
  allergies as allergiesApi,
  problems as problemsApi,
  vitals as vitalsApi,
  immunizations as immunApi,
  assessments as assessApi,
  medications as medsApi,
  orders as ordersApi,
  labs as labsApi,
  encounters as encountersApi,
  appointments as appointmentsApi,
  inbox as inboxApi,
  btg as btgApi,
} from '../services/api';

const PatientContext = createContext(null);

/* ── Helper: convert flat array API responses to keyed-by-patient maps ── */
function arrayToMap(patientId, arr, existing) {
  return { ...existing, [patientId]: arr };
}

export function PatientProvider({ children, demoMode = false }) {
  const { currentUser } = useAuth();

  /* ────── Core state ────── */
  const [patients, setPatients] = useState(demoMode ? DEMO_PATIENTS : []);
  const patientsRef = useRef(patients); // always current — lets callbacks read latest without being recreated
  patientsRef.current = patients;
  const [selectedPatient, setSelectedPatient] = useState(null);
  const MAX_OPEN_CHARTS = 4;
  const [openCharts, setOpenCharts] = useState([]);
  const [allergies, setAllergies] = useState({});
  const [problemList, setProblemList] = useState({});
  const [vitalSigns, setVitalSigns] = useState({});
  const [meds, setMeds] = useState({});
  const [immunizations, setImmunizations] = useState({});
  const [labResults, setLabResults] = useState({});
  const [assessmentScores, setAssessmentScores] = useState({});
  const [orders, setOrders] = useState({});
  const [inboxMessages, setInboxMessages] = useState(demoMode ? DEMO_INBOX : []);
  const [appointments, setAppointments] = useState(demoMode ? DEMO_APPOINTMENTS : []);
  const [btgAuditLog, setBtgAuditLog] = useState([]);
  const [btgAccessGranted, setBtgAccessGranted] = useState({});
  const [encounters, setEncounters] = useState({});
  const [blockedDays, setBlockedDays] = useState([]);

  /* ────── Load patients/appointments from backend when authenticated ────── */
  useEffect(() => {
    if (!currentUser?.id) return;

    (async () => {
      try {
        const apiPatients = await patientsApi.list({});
        if (Array.isArray(apiPatients)) {
          const withPhotos = apiPatients.map(p => {
            try {
              const stored = localStorage.getItem(`clarity_pt_photo_${p.id}`);
              return stored ? { ...p, photo: stored } : p;
            } catch { return p; }
          });
          setPatients(withPhotos);
        }
      } catch { /* backend unavailable */ }

      try {
        const apiApts = await appointmentsApi.list({});
        if (Array.isArray(apiApts)) setAppointments(apiApts);
      } catch { /* ignore */ }

      try {
        const apiInbox = await inboxApi.list({});
        if (Array.isArray(apiInbox)) setInboxMessages(apiInbox);
      } catch { /* ignore */ }

      try {
        const apiBlocked = await appointmentsApi.blockedDays();
        if (Array.isArray(apiBlocked)) setBlockedDays(apiBlocked);
      } catch { /* ignore */ }
    })();
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ────── Load clinical data for a patient from backend ────── */
  const loadPatientClinical = useCallback(async (patientId) => {
    if (!patientId) return;
    // Fire all requests in parallel, update state for each that succeeds
    const results = await Promise.allSettled([
      allergiesApi.list(patientId),
      problemsApi.list(patientId),
      vitalsApi.list(patientId),
      medsApi.list(patientId),
      immunApi.list(patientId),
      labsApi.list(patientId),
      assessApi.list(patientId),
      ordersApi.list(patientId),
      encountersApi.list(patientId),
    ]);

    const [rAllergies, rProblems, rVitals, rMeds, rImmun, rLabs, rAssess, rOrders, rEnc] = results;

    if (rAllergies.status === 'fulfilled')  setAllergies(prev  => arrayToMap(patientId, rAllergies.value, prev));
    if (rProblems.status === 'fulfilled')   setProblemList(prev => arrayToMap(patientId, (rProblems.value || []).map(p => ({ ...p, name: p.name || (p.code ? `${p.code} — ${p.description || ''}` : p.description || '') })), prev));
    if (rVitals.status === 'fulfilled')     setVitalSigns(prev  => arrayToMap(patientId, rVitals.value, prev));
    if (rMeds.status === 'fulfilled')       setMeds(prev => arrayToMap(patientId, rMeds.value, prev));
    else if (mockMedications[patientId])   setMeds(prev => arrayToMap(patientId, mockMedications[patientId], prev));
    if (rImmun.status === 'fulfilled')      setImmunizations(prev => arrayToMap(patientId, rImmun.value, prev));
    if (rLabs.status === 'fulfilled')       setLabResults(prev  => arrayToMap(patientId, rLabs.value, prev));
    if (rAssess.status === 'fulfilled')     setAssessmentScores(prev => arrayToMap(patientId, rAssess.value, prev));
    if (rOrders.status === 'fulfilled')     setOrders(prev      => arrayToMap(patientId, rOrders.value, prev));
    if (rEnc.status === 'fulfilled')        setEncounters(prev  => arrayToMap(patientId, rEnc.value, prev));
  }, []);

  /* ────── Select / Open / Close patient ────── */
  const selectPatient = useCallback((patientId) => {
    const p = patientsRef.current.find((pt) => pt.id === patientId);
    setSelectedPatient(p || null);
    if (p) loadPatientClinical(patientId);
  }, [loadPatientClinical]);

  const openChart = useCallback((patientId) => {
    const p = patientsRef.current.find((pt) => pt.id === patientId);
    if (!p) return;
    setSelectedPatient(p);
    setOpenCharts((prev) => {
      if (prev.some((c) => c.id === patientId)) return prev;
      const next = [...prev, p];
      if (next.length > MAX_OPEN_CHARTS) next.shift();
      return next;
    });
    loadPatientClinical(patientId);
  }, [loadPatientClinical]);

  const closeChart = useCallback((patientId) => {
    let remaining;
    setOpenCharts((prev) => {
      remaining = prev.filter((c) => c.id !== patientId);
      return remaining;
    });
    setSelectedPatient((current) => {
      if (current?.id === patientId) {
        return remaining && remaining.length > 0 ? remaining[remaining.length - 1] : null;
      }
      return current;
    });
  }, []);

  /* ────── Add patient ────── */
  const addPatient = useCallback(async (data) => {
    const created = await patientsApi.create(data);
    setPatients((prev) => [...prev, created]);
    return created;
  }, []);

  /* ────── Update patient demographics ────── */
  const updatePatient = useCallback(async (patientId, updates) => {
    const updated = await patientsApi.update(patientId, updates);
    const merged = { ...updated };
    setPatients((prev) => prev.map((p) => (p.id === patientId ? merged : p)));
    setSelectedPatient((cur) => (cur?.id === patientId ? merged : cur));
    return merged;
  }, []);

  const patchPatient = useCallback((patientId, patch) => {
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, ...patch } : p));
    setSelectedPatient((cur) => cur?.id === patientId ? { ...cur, ...patch } : cur);
  }, []);

  const updateStickyNote = useCallback((patientId, note) => {
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, stickyNote: note } : p));
    setSelectedPatient((cur) => cur?.id === patientId ? { ...cur, stickyNote: note } : cur);
    scheduleSave(patientId, note);
  }, []);

  // Flush any pending saves if the user closes/refreshes the tab
  useEffect(() => {
    window.addEventListener('beforeunload', flushAll);
    return () => window.removeEventListener('beforeunload', flushAll);
  }, []);

  // Photo stored in localStorage (base64) — no backend upload needed
  const updatePatientPhoto = useCallback((patientId, dataUrl) => {
    try { localStorage.setItem(`clarity_pt_photo_${patientId}`, dataUrl); } catch { /* storage full */ }
    const patch = { photo: dataUrl };
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, ...patch } : p));
    setSelectedPatient((cur) => cur?.id === patientId ? { ...cur, ...patch } : cur);
  }, []);

  const getPatientPhoto = useCallback((patientId) => {
    try { return localStorage.getItem(`clarity_pt_photo_${patientId}`) || null; } catch { return null; }
  }, []);

  /* ────── Allergies ────── */
  const addAllergy = useCallback(async (patientId, allergy) => {
    try {
      const created = await allergiesApi.create(patientId, allergy);
      setAllergies((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), created],
      }));
    } catch {
      // Fallback to local state
      setAllergies((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), { ...allergy, id: `a-${Date.now()}` }],
      }));
    }
  }, []);

  /* ────── Allergies (update / remove) ────── */
  const updateAllergy = useCallback((patientId, allergyId, updates) => {
    setAllergies((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map((a) => a.id === allergyId ? { ...a, ...updates } : a),
    }));
  }, []);

  const removeAllergy = useCallback((patientId, allergyId) => {
    setAllergies((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter((a) => a.id !== allergyId),
    }));
  }, []);

  /* ────── Problems ────── */
  const addProblem = useCallback(async (patientId, problem) => {
    try {
      const created = await problemsApi.create(patientId, problem);
      setProblemList((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), created],
      }));
    } catch {
      setProblemList((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), { ...problem, id: `pr-${Date.now()}` }],
      }));
    }
  }, []);

  const updateProblem = useCallback((patientId, problemId, updates) => {
    setProblemList((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map((p) => p.id === problemId ? { ...p, ...updates } : p),
    }));
  }, []);

  /* ────── Vitals ────── */
  const addVitals = useCallback(async (patientId, vital) => {
    try {
      const created = await vitalsApi.create(patientId, vital);
      setVitalSigns((prev) => ({
        ...prev,
        [patientId]: [created, ...(prev[patientId] || [])],
      }));
    } catch {
      setVitalSigns((prev) => ({
        ...prev,
        [patientId]: [{ ...vital, id: `v-${Date.now()}` }, ...(prev[patientId] || [])],
      }));
    }
  }, []);

  /* ────── Orders ────── */
  const updateOrder = useCallback((patientId, orderId, updates) => {
    setOrders((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || []).map((o) =>
        o.id === orderId ? { ...o, ...updates } : o
      ),
    }));
  }, []);

  const addOrder = useCallback(async (patientId, order) => {
    try {
      const created = await ordersApi.create(patientId, order);
      setOrders((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), created],
      }));
    } catch {
      setOrders((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), { ...order, id: `o-${Date.now()}` }],
      }));
    }
  }, []);

  /* ────── Medications ────── */
  const addMedication = useCallback(async (patientId, med) => {
    try {
      const created = await medsApi.create(patientId, med);
      setMeds((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), created],
      }));
    } catch {
      setMeds((prev) => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), { ...med, id: `m-${Date.now()}` }],
      }));
    }
  }, []);

  const updateMedication = useCallback(async (patientId, medId, updates) => {
    try {
      const updated = await medsApi.update(patientId, medId, updates);
      setMeds((prev) => ({
        ...prev,
        [patientId]: (prev[patientId] || []).map((m) =>
          m.id === medId ? updated : m
        ),
      }));
    } catch {
      setMeds((prev) => ({
        ...prev,
        [patientId]: (prev[patientId] || []).map((m) =>
          m.id === medId ? { ...m, ...updates } : m
        ),
      }));
    }
  }, []);

  const removeMedication = useCallback(async (patientId, medId) => {
    try {
      await medsApi.remove(patientId, medId);
    } catch { /* still remove locally */ }
    setMeds((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] || []).filter((m) => m.id !== medId),
    }));
  }, []);

  /* ────── Assessments ────── */
  const addAssessment = useCallback(async (patientId, assessment) => {
    try {
      const created = await assessApi.create(patientId, assessment);
      setAssessmentScores((prev) => ({
        ...prev,
        [patientId]: [created, ...(prev[patientId] || [])],
      }));
    } catch {
      setAssessmentScores((prev) => ({
        ...prev,
        [patientId]: [{ ...assessment, id: `as-${Date.now()}` }, ...(prev[patientId] || [])],
      }));
    }
  }, []);

  /* ────── Inbox messages ────── */
  const updateMessageStatus = useCallback(async (msgId, newStatus) => {
    try {
      await inboxApi.updateStatus(msgId, newStatus);
    } catch { /* update locally anyway */ }
    setInboxMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: newStatus, read: newStatus === 'Read' } : m))
    );
  }, []);

  const addInboxMessage = useCallback(async (message) => {
    try {
      const created = await inboxApi.create(message);
      setInboxMessages((prev) => [created, ...prev]);
    } catch {
      setInboxMessages((prev) => [
        { ...message, id: `msg-${Date.now()}`, read: false, status: 'Unread' },
        ...prev,
      ]);
    }
  }, []);

  /* ────── BTG (Break the Glass) ────── */
  const requestBTGAccess = useCallback(
    async (patientId, userId, userName, reason) => {
      try {
        const result = await btgApi.requestAccess(patientId, reason);
        if (result?.success) {
          setBtgAccessGranted((prev) => ({ ...prev, [patientId]: true }));
          // Refresh audit log
          try {
            const log = await btgApi.auditLog({});
            if (Array.isArray(log)) setBtgAuditLog(log);
          } catch { /* ignore */ }
          return true;
        }
      } catch { /* fall through to local */ }

      // Local fallback
      const patient = patients.find((p) => p.id === patientId);
      const entry = {
        id: `btg-${Date.now()}`,
        patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        accessedBy: userId,
        accessedByName: userName,
        reason,
        timestamp: new Date().toISOString(),
        approved: true,
      };
      setBtgAuditLog((prev) => [entry, ...prev]);
      setBtgAccessGranted((prev) => ({ ...prev, [patientId]: true }));
      return true;
    },
    [patients]
  );

  const hasBTGAccess = useCallback(
    async (patientId) => {
      try {
        const result = await btgApi.checkAccess(patientId);
        if (result?.hasAccess) {
          setBtgAccessGranted((prev) => ({ ...prev, [patientId]: true }));
          return true;
        }
      } catch { /* use local */ }
      return btgAccessGranted[patientId] === true;
    },
    [btgAccessGranted]
  );

  /* ────── Appointments ────── */
  const updateAppointmentStatus = useCallback(async (aptId, status, extra = {}) => {
    try {
      await appointmentsApi.update(aptId, { status, ...extra });
    } catch { /* update locally */ }
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status, ...extra } : a))
    );
  }, []);

  const addAppointment = useCallback(async (appointment) => {
    try {
      const created = await appointmentsApi.create(appointment);
      setAppointments((prev) => [...prev, created]);
    } catch {
      setAppointments((prev) => [
        ...prev,
        { ...appointment, id: `apt-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ]);
    }
  }, []);

  /* ────── Encounters ────── */
  const addEncounter = useCallback(async (patientId, encounter) => {
    try {
      const created = await encountersApi.create(patientId, encounter);
      setEncounters((prev) => ({
        ...prev,
        [patientId]: [created, ...(prev[patientId] || [])],
      }));
      return created;
    } catch {
      const fallback = { ...encounter, id: `enc-${Date.now()}` };
      setEncounters((prev) => ({
        ...prev,
        [patientId]: [fallback, ...(prev[patientId] || [])],
      }));
      return fallback;
    }
  }, []);

  const updateEncounter = useCallback(async (patientId, encounterId, updates) => {
    try {
      const updated = await encountersApi.update(patientId, encounterId, updates);
      setEncounters((prev) => ({
        ...prev,
        [patientId]: (prev[patientId] || []).map((e) =>
          e.id === encounterId ? updated : e
        ),
      }));
    } catch {
      setEncounters((prev) => ({
        ...prev,
        [patientId]: (prev[patientId] || []).map((e) =>
          e.id === encounterId ? { ...e, ...updates } : e
        ),
      }));
    }
  }, []);

  /* ────── Blocked days ────── */
  const addBlockedDay = useCallback(async (entry) => {
    try {
      const created = await appointmentsApi.addBlockedDay(entry);
      setBlockedDays((prev) => [...prev, created]);
    } catch {
      setBlockedDays((prev) => [...prev, { ...entry, id: `bd-${Date.now()}-${Math.random()}` }]);
    }
  }, []);

  const removeBlockedDay = useCallback(async (id) => {
    try {
      await appointmentsApi.removeBlockedDay(id);
    } catch { /* remove locally anyway */ }
    setBlockedDays((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <PatientContext.Provider
      value={{
        patients,
        selectedPatient,
        selectPatient,
        addPatient,
        updatePatient,
        patchPatient,
        updateStickyNote,
        updatePatientPhoto,
        getPatientPhoto,
        openCharts,
        openChart,
        closeChart,
        allergies,
        addAllergy,
        updateAllergy,
        removeAllergy,
        problemList,
        addProblem,
        updateProblem,
        vitalSigns,
        addVitals,
        meds,
        addMedication,
        updateMedication,
        removeMedication,
        immunizations,
        labResults,
        assessmentScores,
        addAssessment,
        orders,
        addOrder,
        updateOrder,
        inboxMessages,
        updateMessageStatus,
        addInboxMessage,
        appointments,
        updateAppointmentStatus,
        addAppointment,
        encounters,
        addEncounter,
        updateEncounter,
        blockedDays,
        addBlockedDay,
        removeBlockedDay,
        btgAuditLog,
        requestBTGAccess,
        hasBTGAccess,
        loadPatientClinical,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used within PatientProvider');
  return ctx;
}
