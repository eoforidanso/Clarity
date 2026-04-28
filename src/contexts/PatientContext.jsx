import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  patients as patientsData,
  allergies as allergiesData,
  problems as problemsData,
  vitals as vitalsData,
  medications as medsData,
  immunizations as immunData,
  labResults as labData,
  assessmentScores as assessData,
  orders as ordersData,
  inboxMessages as inboxData,
  appointments as aptsData,
  btgAuditLog as btgData,
  encounters as encountersData,
} from '../data/mockData';
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

/* ── Helper: try API first, fall back to mock ── */
async function tryApi(apiFn, fallback) {
  try {
    return await apiFn();
  } catch {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

/* ── Helper: convert flat array API responses to keyed-by-patient maps ── */
function arrayToMap(patientId, arr, existing) {
  return { ...existing, [patientId]: arr };
}

export function PatientProvider({ children }) {
  /* ────── Core state (initialise from mock, overwrite from API) ────── */
  const [patients, setPatients] = useState(patientsData);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const MAX_OPEN_CHARTS = 4;
  const [openCharts, setOpenCharts] = useState([]);
  const [allergies, setAllergies] = useState(allergiesData);
  const [problemList, setProblemList] = useState(problemsData);
  const [vitalSigns, setVitalSigns] = useState(vitalsData);
  const [meds, setMeds] = useState(medsData);
  const [immunizations, setImmunizations] = useState(immunData);
  const [labResults, setLabResults] = useState(labData);
  const [assessmentScores, setAssessmentScores] = useState(assessData);
  const [orders, setOrders] = useState(ordersData);
  const [inboxMessages, setInboxMessages] = useState(inboxData);
  const [appointments, setAppointments] = useState(aptsData);
  const [btgAuditLog, setBtgAuditLog] = useState(btgData);
  const [btgAccessGranted, setBtgAccessGranted] = useState({});
  const [encounters, setEncounters] = useState(encountersData);
  const [blockedDays, setBlockedDays] = useState([]);
  const [useBackend, setUseBackend] = useState(false);
  const backendChecked = useRef(false);

  /* ────── On mount: try to load patients from backend ────── */
  useEffect(() => {
    if (backendChecked.current) return;
    backendChecked.current = true;

    (async () => {
      try {
        const apiPatients = await patientsApi.list({});
        if (Array.isArray(apiPatients) && apiPatients.length > 0) {
          setPatients(apiPatients);
          setUseBackend(true);
        }
      } catch {
        // Backend not available — stay on mock data
      }

      // Also try to load appointments & inbox (global, not per-patient)
      try {
        const apiApts = await appointmentsApi.list({});
        if (Array.isArray(apiApts)) setAppointments(apiApts);
      } catch { /* use mock */ }

      try {
        const apiInbox = await inboxApi.list({});
        if (Array.isArray(apiInbox)) setInboxMessages(apiInbox);
      } catch { /* use mock */ }

      try {
        const apiBlocked = await appointmentsApi.blockedDays();
        if (Array.isArray(apiBlocked)) setBlockedDays(apiBlocked);
      } catch { /* use mock */ }
    })();
  }, []);

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
    if (rProblems.status === 'fulfilled')   setProblemList(prev => arrayToMap(patientId, rProblems.value, prev));
    if (rVitals.status === 'fulfilled')     setVitalSigns(prev  => arrayToMap(patientId, rVitals.value, prev));
    if (rMeds.status === 'fulfilled')       setMeds(prev        => arrayToMap(patientId, rMeds.value, prev));
    if (rImmun.status === 'fulfilled')      setImmunizations(prev => arrayToMap(patientId, rImmun.value, prev));
    if (rLabs.status === 'fulfilled')       setLabResults(prev  => arrayToMap(patientId, rLabs.value, prev));
    if (rAssess.status === 'fulfilled')     setAssessmentScores(prev => arrayToMap(patientId, rAssess.value, prev));
    if (rOrders.status === 'fulfilled')     setOrders(prev      => arrayToMap(patientId, rOrders.value, prev));
    if (rEnc.status === 'fulfilled')        setEncounters(prev  => arrayToMap(patientId, rEnc.value, prev));
  }, []);

  /* ────── Select / Open / Close patient ────── */
  const selectPatient = useCallback((patientId) => {
    const p = patients.find((pt) => pt.id === patientId);
    setSelectedPatient(p || null);
    if (useBackend && p) loadPatientClinical(patientId);
  }, [patients, useBackend, loadPatientClinical]);

  const openChart = useCallback((patientId) => {
    const p = patients.find((pt) => pt.id === patientId);
    if (!p) return;
    setSelectedPatient(p);
    setOpenCharts((prev) => {
      if (prev.some((c) => c.id === patientId)) return prev;
      const next = [...prev, p];
      if (next.length > MAX_OPEN_CHARTS) next.shift();
      return next;
    });
    if (useBackend) loadPatientClinical(patientId);
  }, [patients, useBackend, loadPatientClinical]);

  const closeChart = useCallback((patientId) => {
    setOpenCharts((prev) => {
      const next = prev.filter((c) => c.id !== patientId);
      return next;
    });
    setSelectedPatient((current) => {
      if (current?.id === patientId) {
        const remaining = openCharts.filter((c) => c.id !== patientId);
        return remaining.length > 0 ? remaining[remaining.length - 1] : null;
      }
      return current;
    });
  }, [openCharts]);

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
    } catch {
      setEncounters((prev) => ({
        ...prev,
        [patientId]: [{ ...encounter, id: `enc-${Date.now()}` }, ...(prev[patientId] || [])],
      }));
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
        openCharts,
        openChart,
        closeChart,
        allergies,
        addAllergy,
        problemList,
        addProblem,
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
        useBackend,
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
