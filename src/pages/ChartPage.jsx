import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import PatientBanner from '../components/PatientBanner';
import BTGGuard from '../components/BTGGuard';

import ChartSummary from './chart/ChartSummary';
import Demographics from './chart/Demographics';
import Allergies from './chart/Allergies';
import ProblemList from './chart/ProblemList';
import Vitals from './chart/Vitals';
import Medications from './chart/Medications';
import Orders from './chart/Orders';
import Assessments from './chart/Assessments';
import Immunizations from './chart/Immunizations';
import LabResults from './chart/LabResults';
import Encounters from './chart/Encounters';

const chartTabs = [
  { key: 'summary', label: '📋 Summary', component: ChartSummary },
  { key: 'encounters', label: '🗒️ Encounters', component: Encounters },
  { key: 'demographics', label: '👤 Demographics', component: Demographics },
  { key: 'allergies', label: '⚠️ Allergies', component: Allergies },
  { key: 'problems', label: '🩺 Problems', component: ProblemList },
  { key: 'vitals', label: '💓 Vitals', component: Vitals },
  { key: 'medications', label: '💊 Medications', component: Medications },
  { key: 'orders', label: '📝 Orders', component: Orders },
  { key: 'assessments', label: '📊 Assessments', component: Assessments },
  { key: 'immunizations', label: '💉 Immunizations', component: Immunizations },
  { key: 'labs', label: '🔬 Labs', component: LabResults },
];

// Therapist gets read-only labels on clinical tabs they can view but not modify
const therapistTabLabels = {
  medications: '💊 Medications 🔒',
  orders: '📝 Orders 🔒',
  labs: '🔬 Labs 🔒',
};

export default function ChartPage() {
  const { patientId, tab } = useParams();
  const { currentUser } = useAuth();
  const {
    openChart, selectedPatient, allergies, problemList, vitalSigns, meds,
    immunizations, labResults, assessmentScores, orders, addOrder, encounters,
    inboxMessages, appointments,
  } = usePatient();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'quickview' | 'ordergroup' | 'export' | 'forms'
  const menuRef = useRef(null);

  // ── Sticky Note ──────────────────────────────────────────
  const [stickyOpen, setStickyOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`sticky_open_${patientId}`)) ?? false; } catch { return false; }
  });
  const [stickyText, setStickyText] = useState(() => {
    try { return localStorage.getItem(`sticky_note_${patientId}`) || ''; } catch { return ''; }
  });
  const [stickyPos, setStickyPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`sticky_pos_${patientId}`)) || { x: 60, y: 120 }; } catch { return { x: 60, y: 120 }; }
  });
  const [stickyMinimized, setStickyMinimized] = useState(false);
  const stickyDragRef = useRef(null);
  const stickyDragging = useRef(false);
  const stickyOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try { localStorage.setItem(`sticky_note_${patientId}`, stickyText); } catch {}
  }, [stickyText, patientId]);
  useEffect(() => {
    try { localStorage.setItem(`sticky_pos_${patientId}`, JSON.stringify(stickyPos)); } catch {}
  }, [stickyPos, patientId]);
  useEffect(() => {
    try { localStorage.setItem(`sticky_open_${patientId}`, JSON.stringify(stickyOpen)); } catch {}
  }, [stickyOpen, patientId]);

  const onStickyMouseDown = (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    stickyDragging.current = true;
    stickyOffset.current = { x: e.clientX - stickyPos.x, y: e.clientY - stickyPos.y };
    document.addEventListener('mousemove', onStickyMouseMove);
    document.addEventListener('mouseup', onStickyMouseUp);
  };
  const onStickyMouseMove = (e) => {
    if (!stickyDragging.current) return;
    const newX = e.clientX - stickyOffset.current.x;
    const newY = e.clientY - stickyOffset.current.y;
    setStickyPos({
      x: Math.max(0, Math.min(newX, window.innerWidth - 260)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 200)),
    });
  };
  const onStickyMouseUp = () => {
    stickyDragging.current = false;
    document.removeEventListener('mousemove', onStickyMouseMove);
    document.removeEventListener('mouseup', onStickyMouseUp);
  };

  // ── Encounter Timer (Athena-style) ────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    setTimerRunning(false);
    clearInterval(timerRef.current);
  };
  const resetTimer = () => {
    stopTimer();
    setTimerSeconds(0);
  };
  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Auto-start timer when switching to encounters tab
  useEffect(() => {
    if (tab === 'encounters' && !timerRunning && timerSeconds === 0) {
      startTimer();
    }
  }, [tab]);

  // Cleanup timer
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Order group state ────────────────────────────────────
  const [orderGroupName, setOrderGroupName] = useState('');
  const [orderGroupItems, setOrderGroupItems] = useState([{ type: 'Lab', description: '', priority: 'Routine', notes: '' }]);
  const [orderGroupSaved, setOrderGroupSaved] = useState(false);
  const [showPatientLetter, setShowPatientLetter] = useState(false);
  const [patientLetter, setPatientLetter] = useState({ subject: '', body: '', delivery: 'portal' });
  const [letterTemplateOpen, setLetterTemplateOpen] = useState(false);
  const [letterSearch, setLetterSearch] = useState('');

  // ── Comprehensive letter templates ──────────────────────
  const getLetterTemplates = () => {
    const providerName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${currentUser?.credentials ? ', ' + currentUser.credentials : ''}`;
    const providerLicense = currentUser?.licenseNumber ? `License #: ${currentUser.licenseNumber}` : 'License #: [LICENSE NUMBER]';
    const providerNPI    = currentUser?.npi           ? `NPI: ${currentUser.npi}`               : 'NPI: [NPI NUMBER]';
    const providerDEA    = currentUser?.deaNumber     ? `DEA: ${currentUser.deaNumber}`          : 'DEA: [DEA NUMBER]';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const patName = `${p.firstName} ${p.lastName}`;
    const patDOB  = p.dob;
    const patProbs = patProblems.map(pr => pr.name || pr.problem).join(', ') || 'N/A';
    const patMedsList = patMeds.map(m => `${m.name} ${m.dose || ''}`).join(', ') || 'N/A';
    const practiceName = 'Clarity Behavioral Health';
    const practiceAddr = '1234 West State Street, Suite 200, Springfield, IL 62704';
    const practicePhone = '(217) 555-0100';
    const practiceFax   = '(217) 555-0101';
    const practiceLine  = `${practiceName} · ${practiceAddr} · Ph: ${practicePhone} · Fax: ${practiceFax}`;

    const sig = `\nSincerely,\n\n\n${providerName}\n${providerLicense}\n${providerNPI}\n${practiceLine}`;

    return [
      // ── WORKPLACE / EMPLOYMENT ──────────────────────────────────────────────
      {
        id: 'return-to-work',
        category: 'Workplace / Employment',
        icon: '💼',
        label: 'Return to Work — Full Duty',
        subject: 'Return to Work Authorization — Full Duty',
        body: `${today}\n\nRE: Return to Work Authorization\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nThis letter confirms that ${patName} has been under my psychiatric care and is medically cleared to return to work on a full-duty basis, effective [Return Date].\n\n${p.firstName} had been on a medically necessary leave of absence from [Start Date] through [End Date] due to a mental health condition. ${p.firstName} has responded well to treatment and has been assessed to be capable of performing all essential functions of their position without restriction.\n\nIf you have any questions or require additional documentation, please contact our office.${sig}`,
      },
      {
        id: 'return-to-work-restricted',
        category: 'Workplace / Employment',
        icon: '⚠️',
        label: 'Return to Work — With Restrictions',
        subject: 'Return to Work Authorization — Modified Duty',
        body: `${today}\n\nRE: Return to Work with Restrictions\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nThis letter certifies that ${patName} is medically cleared to return to work with the following temporary restrictions, effective [Return Date]:\n\nAUTHORIZED WORK RESTRICTIONS:\n• [ ] Reduced hours: _____ hours per day / _____ days per week\n• [ ] No overtime\n• [ ] Remote work/work from home as available\n• [ ] No high-stress tasks or tight deadlines until [Date]\n• [ ] Additional time for breaks as needed\n• [ ] Other: ____________________________\n\nThese restrictions are medically necessary and are expected to remain in place through [End Date], at which time ${p.firstName} will be reassessed.\n\nPlease provide reasonable accommodations as outlined above to support ${p.firstName}'s recovery and successful return to the workplace.${sig}`,
      },
      {
        id: 'work-restriction',
        category: 'Workplace / Employment',
        icon: '🚧',
        label: 'Work Restriction / Limitations',
        subject: 'Medical Work Restrictions — ${patName}',
        body: `${today}\n\nRE: Medical Work Restrictions\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am the treating psychiatrist/mental health provider for ${patName}. Based on my clinical evaluation and ongoing treatment, I am documenting the following work-related limitations that are directly related to ${p.firstName}'s medical condition:\n\nIMPOSED RESTRICTIONS (effective [Date] through [Date]):\n• [ ] Restricted from shift work / rotating shifts\n• [ ] Restricted from working alone / requires supervision or buddy system\n• [ ] Restricted from working in high-noise, high-stimulation environments\n• [ ] Restricted from tasks requiring sustained concentration exceeding _____ minutes\n• [ ] Other: ____________________________\n\nThese restrictions are medically necessary and are expected to be temporary. ${p.firstName} will be re-evaluated on [Date] to reassess functional capacity.\n\nThis letter is provided in support of any reasonable accommodation request under the ADA.${sig}`,
      },
      {
        id: 'fmla',
        category: 'Workplace / Employment',
        icon: '📋',
        label: 'FMLA / Medical Leave Certification',
        subject: 'FMLA Leave Certification — Serious Health Condition',
        body: `${today}\n\nFAMILY AND MEDICAL LEAVE ACT (FMLA) CERTIFICATION\nSERIOUS HEALTH CONDITION — WH-380-E Equivalent\n\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am the treating healthcare provider for ${patName} and I certify the following regarding their serious health condition:\n\n1. DIAGNOSIS / CONDITION:\n   ${patName} has been diagnosed with a serious mental health condition (ICD-10: [CODE]) that requires ongoing medical treatment.\n\n2. TREATMENT HISTORY:\n   ${p.firstName} has been under my care since [Date]. Treatment includes psychiatric medication management, psychotherapy, and [other modalities].\n\n3. LEAVE REQUIRED:\n   a. Continuous Leave: [Start Date] through [End Date] — estimated _____ days\n   b. Intermittent Leave: _____ episodes per [week/month], _____ hours per episode\n\n4. MEDICAL NECESSITY:\n   Leave is medically necessary because [brief clinical justification without disclosing specific diagnosis details beyond what is required].\n\n5. PROVIDER INFORMATION:\n   ${providerName}\n   ${providerLicense} | ${providerNPI}\n   ${practiceLine}${sig}`,
      },
      {
        id: 'short-term-disability',
        category: 'Workplace / Employment',
        icon: '🏥',
        label: 'Short-Term Disability Support',
        subject: 'Short-Term Disability — Medical Certification',
        body: `${today}\n\nRE: Short-Term Disability Medical Certification\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am writing to certify that ${patName} is under my psychiatric care and is currently unable to perform the material duties of their occupation due to a mental health condition, effective [Start Date].\n\nCLINICAL STATEMENT:\n• Onset of disabling condition: [Date]\n• Nature of condition: Psychiatric/mental health disorder requiring active treatment\n• Expected duration of disability: [Date range] or until [Functional milestone]\n• Treatment plan: Ongoing psychiatric medication management, individual psychotherapy, [other]\n\nFUNCTIONAL LIMITATIONS:\n${p.firstName} is unable to perform the following due to their condition:\n• Sustained concentration or focus\n• Managing workplace stress and pressure\n• Regular attendance and punctuality\n• [Other relevant limitations]\n\nExpected return to work date: [Date] (subject to clinical re-evaluation)${sig}`,
      },
      {
        id: 'fitness-for-duty',
        category: 'Workplace / Employment',
        icon: '✅',
        label: 'Fitness for Duty',
        subject: 'Fitness for Duty Evaluation — ${patName}',
        body: `${today}\n\nRE: Fitness for Duty Evaluation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI have conducted a psychiatric evaluation of ${patName} and provide the following fitness-for-duty opinion:\n\n☐  CLEARED — FULL DUTY: ${patName} is psychiatrically fit to return to and perform all essential functions of their position without restriction.\n\n☐  CLEARED — MODIFIED DUTY: See attached work restriction letter for specific limitations.\n\n☐  NOT CLEARED: ${patName} is not psychiatrically cleared for duty at this time. Re-evaluation planned for [Date].\n\nBASIS FOR DETERMINATION:\nThis opinion is based on a clinical psychiatric evaluation conducted on [Evaluation Date] and review of available treatment records.\n\nNote: This letter does not disclose specific psychiatric diagnoses in compliance with ADA and HIPAA regulations. Details are provided only to the extent necessary for this determination.${sig}`,
      },

      // ── HOUSING / ACCOMMODATIONS ────────────────────────────────────────────
      {
        id: 'esa',
        category: 'Housing / Accommodations',
        icon: '🐾',
        label: 'Emotional Support Animal (ESA)',
        subject: 'Emotional Support Animal Letter — Fair Housing Act',
        body: `${today}\n\nRE: Emotional Support Animal (ESA) — Reasonable Accommodation Request\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am writing to confirm that ${patName} is my patient and is currently under my care for a diagnosed mental health condition. I am a licensed mental health provider authorized to make this recommendation.\n\n${p.firstName} has a disability-related need for an Emotional Support Animal (ESA) as part of their ongoing treatment plan. The ESA provides therapeutic benefit by:\n• Alleviating symptoms of anxiety and depressive episodes\n• Reducing severity of panic attacks and hyperarousal\n• Improving emotional regulation and daily functioning\n• Providing a sense of security and routine\n\nUnder the Fair Housing Act (FHA), 42 U.S.C. § 3604(f)(3)(B), ${patName} is entitled to reasonable accommodation to keep an emotional support animal in their housing, including in "no pets" buildings, without being subject to pet fees, deposits, or restrictions.\n\nThis letter is valid for one (1) year from the date above. I am available to be contacted for verification.${sig}`,
      },
      {
        id: 'pet-accommodation',
        category: 'Housing / Accommodations',
        icon: '🏠',
        label: 'Pet / Service Animal Housing Accommodation',
        subject: 'Reasonable Accommodation Request — Assistance Animal',
        body: `${today}\n\nRE: Request for Reasonable Housing Accommodation — Assistance Animal\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am the treating mental health provider for ${patName}. This letter is intended to support a request for reasonable accommodation to keep an assistance animal in their place of residence.\n\n${patName} has a psychiatric disability that substantially limits one or more major life activities. The presence of an assistance animal is not merely a personal preference but is a necessary therapeutic tool that directly mitigates the functional limitations associated with ${p.firstName}'s disability.\n\nPET/ANIMAL DETAILS:\n• Type of animal: [Dog / Cat / Other]\n• Animal's name: [Name]\n• Purpose: Emotional support / psychiatric service animal\n\nAPPLICABLE LAW:\nThis request is supported under the Fair Housing Act (FHA), HUD Guidelines (FHEO-2020-01), and where applicable, Section 504 of the Rehabilitation Act of 1973.${sig}`,
      },
      {
        id: 'housing-accommodation',
        category: 'Housing / Accommodations',
        icon: '🏢',
        label: 'Disability Housing Accommodation (ADA)',
        subject: 'ADA Reasonable Housing Accommodation Request',
        body: `${today}\n\nRE: Request for Reasonable Housing Accommodation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am writing on behalf of my patient, ${patName}, who has a documented psychiatric disability that may qualify for reasonable accommodations under the Americans with Disabilities Act (ADA), the Fair Housing Act, and applicable state and local laws.\n\nACCOMMODATION REQUESTED:\n${patName} requests the following modification(s) to their housing arrangement:\n• [ ] Unit transfer to: [Location/Floor/Building specifications]\n• [ ] Structural modification: [Specify]\n• [ ] Policy exception: [Specify]\n• [ ] Other: [Specify]\n\nMEDICAL NECESSITY:\nThese accommodations are necessary due to ${p.firstName}'s psychiatric/neurological condition and are directly related to mitigating the functional limitations of their disability.\n\nThis office is available to provide additional clinical documentation as required.${sig}`,
      },

      // ── SCHOOL / EDUCATION ──────────────────────────────────────────────────
      {
        id: 'return-school',
        category: 'School / Education',
        icon: '🎓',
        label: 'Return to School / Class',
        subject: 'Return to School Authorization',
        body: `${today}\n\nRE: Medical Clearance — Return to School\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\n${patName} has been a patient under my psychiatric/mental health care. ${p.firstName} was unable to attend school/classes from [Start Date] through [End Date] due to a medical/mental health condition requiring treatment.\n\nI am pleased to confirm that ${p.firstName} is now medically cleared to return to school effective [Return Date].\n\nRECOMMENDATIONS FOR TRANSITION:\n• [ ] Gradual return schedule (e.g., half days for first 2 weeks)\n• [ ] Excused absences for outpatient appointments\n• [ ] Academic accommodations: extended deadlines, reduced workload\n• [ ] Confidential check-in with school counselor\n• [ ] 504 Plan review recommended\n\nPlease provide reasonable academic accommodations during this transition period.${sig}`,
      },
      {
        id: 'school-504',
        category: 'School / Education',
        icon: '📚',
        label: '504 Plan / Academic Accommodation Support',
        subject: 'Section 504 / ADA Academic Accommodation Support Letter',
        body: `${today}\n\nRE: Support for 504 Plan / Academic Accommodation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am writing in support of a request for academic accommodations for ${patName} under Section 504 of the Rehabilitation Act and/or Title II of the Americans with Disabilities Act (ADA).\n\n${patName} has a documented psychiatric condition (ICD-10: [CODE]) that substantially limits the major life activity of learning, concentrating, and/or communicating.\n\nRECOMMENDED ACADEMIC ACCOMMODATIONS:\n• Extended time on tests and quizzes (1.5× or 2×)\n• Preferential seating away from distractions\n• Reduced homework load or modified assignments as needed\n• Access to a quiet testing environment\n• Breaks during long tasks\n• Permission to record lectures\n• Advance notice of schedule changes\n• Flexible attendance / excused absences for treatment appointments\n• Note-taking assistance\n\nThese accommodations are medically necessary and are expected to be permanent/long-term.${sig}`,
      },
      {
        id: 'college-accommodation',
        category: 'School / Education',
        icon: '🏫',
        label: 'College / University Disability Services',
        subject: 'Documentation for Disability Services Office',
        body: `${today}\n\nRE: Documentation for Disability Services / Accommodations Office\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am providing this documentation in support of ${patName}'s request for accommodations through the Disability Services / Accessibility Office.\n\n1. DIAGNOSIS: ${patName} carries a diagnosis of [DSM-5 Diagnosis] (ICD-10: [Code]), which is chronic and substantially limits major life activities including [concentration, sleep, executive functioning, etc.].\n\n2. FUNCTIONAL IMPACT IN ACADEMIC SETTING:\n   • Difficulty with sustained attention and task initiation\n   • Sleep disturbance affecting morning scheduling\n   • Anxiety that is heightened by timed assessments\n   • [Other specific impacts]\n\n3. TREATMENT: ${p.firstName} is under active psychiatric treatment including medication management and psychotherapy.\n\n4. RECOMMENDED ACCOMMODATIONS:\n   • Extended time (2×) for exams\n   • Separate testing room\n   • Attendance flexibility for psychiatric appointments\n   • Permission to record lectures\n   • Incomplete grade option during acute episodes\n\nThis documentation is current as of today's date.${sig}`,
      },

      // ── DIAGNOSIS / CLINICAL LETTERS ────────────────────────────────────────
      {
        id: 'diagnosis-confirmation',
        category: 'Diagnosis / Clinical',
        icon: '🩺',
        label: 'Diagnosis Confirmation Letter',
        subject: 'Psychiatric Diagnosis Confirmation — ${patName}',
        body: `${today}\n\nRE: Psychiatric Diagnosis Confirmation\nPatient: ${patName} | DOB: ${patDOB} | MRN: ${p.mrn}\n\nTo Whom It May Concern,\n\nThis letter confirms that ${patName} is an established patient under my psychiatric care and carries the following active diagnoses:\n\nACTIVE PSYCHIATRIC DIAGNOSES:\n${patProblems.length > 0 ? patProblems.map((pr, i) => `  ${i + 1}. ${pr.name || pr.problem}${pr.icd10 ? '  [ICD-10: ' + pr.icd10 + ']' : ''}${pr.onset ? '  (Onset: ' + pr.onset + ')' : ''}`).join('\n') : '  [Diagnoses per clinical record]'}\n\nCURRENT TREATMENT:\n${patName} is receiving ongoing psychiatric medication management and psychotherapy. ${p.firstName} is compliant with treatment recommendations.\n\nThis letter is provided for informational purposes upon patient request. For detailed clinical information, a signed release of information is required.${sig}`,
      },
      {
        id: 'mental-health-condition',
        category: 'Diagnosis / Clinical',
        icon: '🧠',
        label: 'Mental Health Condition Letter (General)',
        subject: 'Mental Health Condition — Letter of Support',
        body: `${today}\n\nRE: Mental Health Condition Letter\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am a licensed mental health provider writing on behalf of my patient, ${patName}.\n\nThis letter confirms that ${patName} has a documented mental health condition that substantially impacts one or more major life activities. ${p.firstName} is actively engaged in treatment at our practice, which includes:\n• Psychiatric evaluation and medication management\n• Individual psychotherapy\n• [Other treatment modalities as applicable]\n\nThis condition and its associated functional limitations may entitle ${p.firstName} to reasonable accommodations under the Americans with Disabilities Act (ADA), the Fair Housing Act, and other applicable federal and state protections.\n\nAdditional documentation can be provided upon request with an appropriate signed release.${sig}`,
      },
      {
        id: 'treatment-summary',
        category: 'Diagnosis / Clinical',
        icon: '📊',
        label: 'Treatment Summary Letter',
        subject: 'Psychiatric Treatment Summary — ${patName}',
        body: `${today}\n\nPSYCHIATRIC TREATMENT SUMMARY\nPatient: ${patName} | DOB: ${patDOB} | MRN: ${p.mrn}\n\nPROVIDER: ${providerName}\nPractice: ${practiceLine}\n\nTREATMENT PERIOD: [Start Date] — Present\n\nDIAGNOSES:\n${patProblems.length > 0 ? patProblems.map((pr, i) => `  ${i + 1}. ${pr.name || pr.problem}${pr.icd10 ? '  [' + pr.icd10 + ']' : ''}`).join('\n') : '  [See clinical record]'}\n\nTREATMENT HISTORY:\n• Frequency of visits: [Frequency]\n• Modalities: Psychiatric evaluation, medication management, [psychotherapy type]\n• Response to treatment: [Describe — improved, stable, partial response]\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map((m, i) => `  ${i + 1}. ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('\n') : '  No active psychiatric medications'}\n\nCLINICAL STATUS: [Stable / Improving / Requires ongoing treatment]\n\nPROGNOSIS: [Brief, professional statement]${sig}`,
      },
      {
        id: 'continuity-of-care',
        category: 'Diagnosis / Clinical',
        icon: '🔄',
        label: 'Continuity of Care / Transition Letter',
        subject: 'Continuity of Care — ${patName}',
        body: `${today}\n\nRE: Continuity of Care Transition\nPatient: ${patName} | DOB: ${patDOB} | MRN: ${p.mrn}\n\nDear [Receiving Provider Name],\n\nI am writing to facilitate continuity of care for ${patName}, who is transitioning their psychiatric care to your practice.\n\nCLINICAL SUMMARY:\n• Active diagnoses: ${patProbs}\n• Treatment duration at our practice: [Date range]\n• Current medications: ${patMedsList}\n• Most recent visit: [Date]\n• Clinical status at transition: [Stable / Improving / Other]\n\nKEY CLINICAL CONSIDERATIONS:\n• [Relevant history, medication trials, allergies, treatment responses]\n• [Any safety concerns, prior hospitalizations, or crises]\n• [Pending labs or referrals]\n\nRECORDS:\nA copy of the medical record will be forwarded upon receipt of a signed authorization. Records include: progress notes, medication history, lab results, and assessments.\n\nPlease do not hesitate to call our office if you have questions during this transition.${sig}`,
      },
      {
        id: 'safety-plan',
        category: 'Diagnosis / Clinical',
        icon: '🛡️',
        label: 'Safety Plan Letter (Patient Copy)',
        subject: 'Your Safety Plan — ${patName}',
        body: `${today}\n\nDear ${p.firstName},\n\nThis letter contains the safety plan we developed together during your appointment. Please keep this in a safe and accessible place.\n\nYOUR PERSONAL SAFETY PLAN\n${'─'.repeat(35)}\n\n1. WARNING SIGNS that a crisis may be developing:\n   • \n   • \n   • \n\n2. INTERNAL COPING STRATEGIES (things I can do on my own):\n   • \n   • \n   • \n\n3. PEOPLE AND SOCIAL SETTINGS that provide distraction:\n   • Name: _____________ Phone: _____________\n   • Name: _____________ Phone: _____________\n\n4. PEOPLE I CAN ASK FOR HELP:\n   • Name: _____________ Phone: _____________\n   • Name: _____________ Phone: _____________\n\n5. PROFESSIONALS AND AGENCIES I CAN CONTACT:\n   • My provider: ${providerName} — ${practicePhone}\n   • 988 Suicide & Crisis Lifeline: Call or text 988\n   • Crisis Text Line: Text HOME to 741741\n   • Nearest Emergency Room: ________________\n   • 911\n\n6. MAKING MY ENVIRONMENT SAFE:\n   • \n   • \n\nRemember: You are not alone. Reaching out is a sign of strength, not weakness.\n\nYour next appointment: ${p.nextAppointment || '[Please call to schedule]'}\n\n${providerName}\n${practiceLine}`,
      },
      {
        id: 'encounter-summary',
        category: 'Diagnosis / Clinical',
        icon: '📋',
        label: 'Encounter / Visit Summary',
        subject: 'Visit Summary',
        body: `${today}\n\nDear ${p.firstName},\n\nThank you for your visit on ${today}. Below is a summary of your appointment:\n\nPATIENT: ${patName} (DOB: ${patDOB}, MRN: ${p.mrn})\n\nDIAGNOSES:\n${patProblems.length > 0 ? patProblems.map(pr => `  • ${pr.name || pr.problem}${pr.icd10 ? ' (' + pr.icd10 + ')' : ''}`).join('\n') : '  • See chart for details'}\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map(m => `  • ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('\n') : '  • No active medications'}\n\nPLAN:\n• [Treatment plan details]\n• [Medication changes if any]\n• [Follow-up instructions]\n\nNEXT APPOINTMENT: ${p.nextAppointment || '[To be scheduled]'}\n\nFor emergencies: 911 or nearest ER. Suicide & Crisis Lifeline: 988\n\n${providerName} · ${practiceLine}`,
      },
      {
        id: 'problem-list',
        category: 'Diagnosis / Clinical',
        icon: '📝',
        label: 'Patient Problem List Summary',
        subject: 'Patient Problem List Summary',
        body: `${today}\n\nPATIENT PROBLEM LIST\n${'═'.repeat(40)}\nPatient: ${patName} | DOB: ${patDOB} | MRN: ${p.mrn}\nGenerated by: ${providerName}\n\nACTIVE PROBLEMS:\n${patProblems.length > 0 ? patProblems.map((pr, i) => `  ${i + 1}. ${pr.name || pr.problem}${pr.icd10 ? '  [' + pr.icd10 + ']' : ''}${pr.onset ? '  (Onset: ' + pr.onset + ')' : ''}${pr.status ? '  Status: ' + pr.status : ''}`).join('\n') : '  No active problems documented.'}\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map((m, i) => `  ${i + 1}. ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''} ${m.prescriber ? '— Prescribed by: ' + m.prescriber : ''}`).join('\n') : '  No active medications.'}\n\nALLERGIES:\n${patAllergies.length > 0 ? patAllergies.map(a => `  • ${a.allergen || a.name || a} — ${a.reaction || 'Reaction not specified'} (${a.severity || 'Severity unknown'})`).join('\n') : '  NKDA — No Known Drug Allergies'}\n\nThis summary was generated from the EHR on the date listed above.\n— ${providerName}`,
      },

      // ── DISABILITY / LEGAL ──────────────────────────────────────────────────
      {
        id: 'disability-support',
        category: 'Disability / Legal',
        icon: '⚖️',
        label: 'Disability Support Letter (General)',
        subject: 'Disability Documentation Letter',
        body: `${today}\n\nRE: Disability Documentation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nI am writing to certify that ${patName} has been diagnosed with a psychiatric/mental health condition that constitutes a disability under applicable federal and state laws, including the Americans with Disabilities Act (ADA) and the Rehabilitation Act of 1973.\n\nNATURE OF DISABILITY:\n${patName}'s condition substantially limits the following major life activities:\n• [ ] Concentrating / thinking\n• [ ] Sleeping\n• [ ] Communicating\n• [ ] Working\n• [ ] Caring for oneself\n• [ ] Other: ____________________________\n\nTREATMENT STATUS:\n${patName} is currently under active psychiatric treatment and is engaged in their care. The disability is:\n• [ ] Permanent\n• [ ] Temporary — expected duration: ________________\n• [ ] Episodic / recurring in nature\n\nThis letter is provided for purposes of establishing disability status for benefits, accommodations, or legal proceedings as authorized by ${p.firstName}.${sig}`,
      },
      {
        id: 'ssdi',
        category: 'Disability / Legal',
        icon: '🏛️',
        label: 'Social Security Disability (SSDI) Support',
        subject: 'Medical Documentation — Social Security Disability Application',
        body: `${today}\n\nRE: Social Security Disability Insurance (SSDI) — Medical Support Documentation\nPatient: ${patName} | DOB: ${patDOB} | SSN: [Last 4 only — ****]\n\nTo the Social Security Administration,\n\nI am the treating psychiatrist/mental health provider for ${patName} and am providing this documentation in support of their application for Social Security Disability Insurance benefits.\n\n1. TREATMENT RELATIONSHIP:\n   I have treated ${patName} since [Date] for psychiatric conditions.\n\n2. DIAGNOSES (DSM-5 / ICD-10):\n   ${patProbs}\n\n3. FUNCTIONAL LIMITATIONS:\n   Based on my clinical assessments, ${patName} experiences the following limitations:\n   • Marked difficulty maintaining concentration, persistence, and pace\n   • Marked difficulty interacting with others\n   • Marked difficulty managing oneself (self-care, adaptation to change)\n   • Requires ____ absences per month due to symptoms or treatment appointments\n\n4. TREATMENT RESPONSE:\n   ${patName} has not achieved sustainable functional improvement despite adequate trials of [medications / therapies].\n\n5. PROGNOSIS:\n   The prognosis for full occupational recovery is [guarded / poor] at this time.\n\nAdditional medical records are available upon receipt of a signed authorization.${sig}`,
      },
      {
        id: 'firearm-restriction',
        category: 'Disability / Legal',
        icon: '🚫',
        label: 'Firearm / Weapons Restriction',
        subject: 'Firearm Safety Restriction Recommendation',
        body: `${today}\n\nRE: Firearm / Lethal Means Safety Recommendation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern / Household Members,\n\nAs part of ${patName}'s psychiatric treatment plan and in consideration of their current clinical condition, I am recommending the following lethal means safety measures:\n\nCLINICAL RECOMMENDATION:\nBased on my professional clinical assessment, access to firearms and other lethal means should be temporarily restricted for ${patName} during this period of treatment.\n\nREASONING:\nLimiting access to lethal means is an evidence-based component of suicide risk reduction and is recommended by the American Association for Emergency Psychiatry, the American Foundation for Suicide Prevention, and other major clinical organizations.\n\nACTION REQUESTED:\n• [ ] Remove or secure firearms from the home\n• [ ] Transfer possession to a trusted third party\n• [ ] Store at a licensed firearm dealer or storage facility\n• [ ] Other: ____________________________\n\nThis recommendation will be revisited at future clinical appointments.${sig}`,
      },

      // ── INSURANCE / MEDICAL NECESSITY ────────────────────────────────────────
      {
        id: 'medical-necessity',
        category: 'Insurance / Medical Necessity',
        icon: '🏥',
        label: 'Medical Necessity Letter',
        subject: 'Medical Necessity Documentation',
        body: `${today}\n\nRE: Medical Necessity — ${patName} | DOB: ${patDOB} | Insurance ID: [ID]\n\nTo the Medical Director / Utilization Review Department,\n\nI am writing to document the medical necessity of psychiatric services for my patient, ${patName}.\n\nDIAGNOSES:\n${patProbs}\n\nTREATMENT REQUESTED:\n[ ] Outpatient psychiatric medication management — CPT: [Code]\n[ ] Individual psychotherapy — CPT: [Code]\n[ ] Intensive Outpatient Program (IOP) — CPT: [Code]\n[ ] Partial Hospitalization Program (PHP) — CPT: [Code]\n[ ] Other: ____________________________\n\nCLINICAL JUSTIFICATION:\n${patName} requires the above level of care because:\n1. [Clinical severity and symptom burden]\n2. [Failure of lower level of care or step-down indication]\n3. [Risk factors present, e.g., safety concerns, functional impairment]\n4. [Expected benefit from requested treatment]\n\nWithout this treatment, ${p.firstName} faces significant risk of [hospitalization / clinical deterioration / harm].\n\nPlease direct any questions or requests for additional documentation to our office.${sig}`,
      },
      {
        id: 'prior-auth',
        category: 'Insurance / Medical Necessity',
        icon: '📑',
        label: 'Prior Authorization Support',
        subject: 'Prior Authorization Clinical Support — ${patName}',
        body: `${today}\n\nRE: Prior Authorization Request — Clinical Support Letter\nPatient: ${patName} | DOB: ${patDOB} | Insurance ID: [ID] | NPI: ${currentUser?.npi || '[NPI]'}\n\nTo the Prior Authorization Department,\n\nI am writing to support the prior authorization request for the following:\n\nREQUESTED SERVICE / MEDICATION:\n• Drug / Service: [Name]\n• Strength / Frequency: [Details]\n• Diagnosis: ${patProbs}\n• ICD-10 Codes: [Codes]\n• CPT Codes (if applicable): [Codes]\n\nCLINICAL JUSTIFICATION:\nStep therapy trials completed and failed:\n1. [Drug/Therapy 1] — Dates: [Date range] — Result: [Inadequate response / ADR]\n2. [Drug/Therapy 2] — Dates: [Date range] — Result: [Inadequate response / ADR]\n\nThe requested medication/service is medically necessary because:\n• [Clinical rationale — symptoms, severity, FDA indication or off-label evidence]\n• [Why alternatives are contraindicated or have failed]\n\nExpected clinical benefit: [Describe]\n\nPlease expedite this review as delay may result in clinical deterioration.${sig}`,
      },
      {
        id: 'medication-necessity',
        category: 'Insurance / Medical Necessity',
        icon: '💊',
        label: 'Prescription Necessity Letter',
        subject: 'Medical Necessity for Prescribed Medication',
        body: `${today}\n\nRE: Prescription Medical Necessity\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\nThis letter documents the medical necessity of the following prescribed medication(s) for ${patName}:\n\nPRESCRIBED MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map(m => `  • ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('\n') : '  • [Medication name, dose, frequency]'}\n\nINDICATION:\nThese medications are prescribed for the treatment of: ${patProbs}\n\nCLINICAL RATIONALE:\nThe above medications are clinically indicated, FDA-approved (or supported by strong evidence for the indicated use), and represent the current standard of care for ${p.firstName}'s condition. Alternative medications have been tried and were either ineffective or not tolerated:\n• [Prior medication, reason for discontinuation]\n\nThis prescription is an essential component of ${p.firstName}'s psychiatric treatment plan and should be covered under the patient's pharmacy benefits.${sig}`,
      },

      // ── TRAVEL / SAFETY ─────────────────────────────────────────────────────
      {
        id: 'air-travel',
        category: 'Travel / Safety',
        icon: '✈️',
        label: 'Air Travel / Medication Carry-On',
        subject: 'Medical Letter for Air Travel — Medication and Accommodations',
        body: `${today}\n\nRE: Air Travel Accommodation — Medical Letter\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern (TSA / Airline / Port of Entry),\n\nThis letter certifies that ${patName} is under my psychiatric care and requires the following accommodations during air travel:\n\nMEDICATIONS CARRIED ON PERSON:\n${patMeds.length > 0 ? patMeds.map(m => `  • ${m.name} ${m.dose || ''} — Prescribed for medical/psychiatric treatment`).join('\n') : '  • [Medication list]'}\n\nAll medications listed are prescribed by a licensed physician and are medically necessary. ${patName} must carry these medications in their original prescription bottles and have access to them during the flight.\n\nADDITIONAL ACCOMMODATIONS:\n• [ ] Pre-boarding due to anxiety/disability\n• [ ] Aisle seat for ease of movement\n• [ ] Service/emotional support animal on board (see separate ESA letter)\n• [ ] Other: ____________________________\n\nPlease provide reasonable accommodations as required under the Air Carrier Access Act (ACAA).${sig}`,
      },
      {
        id: 'driving-restriction',
        category: 'Travel / Safety',
        icon: '🚗',
        label: 'Driving Restriction Recommendation',
        subject: 'Driving Restriction — Medical Recommendation',
        body: `${today}\n\nRE: Driving Restriction Recommendation\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern / Patient and Family,\n\nBased on my clinical assessment of ${patName}, I am making the following recommendation regarding driving:\n\n☐  RESTRICTED FROM DRIVING — Reason:\n   ${patName}'s current psychiatric condition and/or medications may impair cognitive function, reaction time, or judgment in a manner that could pose a safety risk.\n\n   Restriction period: [Date] through [Date] or until next clinical evaluation.\n\n☐  CLEARED TO DRIVE WITH CAUTION — Considerations:\n   ${patName} should be aware that their medication(s) may cause sedation, particularly when first starting or dose-adjusting. ${p.firstName} should not drive until they know how their medication affects them.\n\nPHARMACOLOGIC CONSIDERATIONS:\n${patMeds.length > 0 ? patMeds.filter(m => m.name).map(m => `  • ${m.name} — [Sedation/impairment risk: Low / Moderate / High]`).join('\n') : '  See current medication list'}\n\nThis recommendation is based on clinical judgment and is provided in the interest of patient and public safety.${sig}`,
      },

      // ── GENERAL CORRESPONDENCE ───────────────────────────────────────────────
      {
        id: 'accommodation',
        category: 'General Correspondence',
        icon: '♿',
        label: 'General ADA Accommodation Letter',
        subject: 'ADA Accommodation Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nI am writing on behalf of my patient, ${patName} (DOB: ${patDOB}), who is currently under my psychiatric care.\n\nBased on my clinical evaluation, ${p.firstName} has a mental health condition that substantially limits one or more major life activities. In accordance with the Americans with Disabilities Act (ADA) and/or Section 504 of the Rehabilitation Act, I am recommending the following reasonable accommodations:\n\n• [Accommodation 1 — be specific]\n• [Accommodation 2]\n• [Accommodation 3]\n\nThese accommodations are medically necessary and directly related to ${p.firstName}'s condition. They will enable ${p.firstName} to perform essential functions and participate fully in their activities.\n\nThis letter is provided upon patient request and with appropriate authorization.${sig}`,
      },
      {
        id: 'referral',
        category: 'General Correspondence',
        icon: '↗️',
        label: 'Referral Letter',
        subject: 'Psychiatric Referral — ${patName}',
        body: `${today}\n\nDear [Receiving Provider Name],\n\nRE: Referral — ${patName} | DOB: ${patDOB} | DOB: ${patDOB} | Phone: ${p.cellPhone || p.phone || '[Phone]'}\n\nI am referring ${patName} to your practice for [REASON: specialty evaluation / therapy / higher level of care / second opinion].\n\nCLINICAL SUMMARY:\n• Active diagnoses: ${patProbs}\n• Current medications: ${patMedsList}\n• Relevant history: [Brief summary]\n\nREASON FOR REFERRAL:\n[Clinical rationale — what you are asking the receiving provider to evaluate or treat]\n\nUrgency: ☐ Routine  ☐ Urgent  ☐ Emergent\n\nRecords will be forwarded upon completion of a signed ROI. Please contact our office with any questions regarding this patient.\n\nThank you for your assistance with ${p.firstName}'s care.${sig}`,
      },
      {
        id: 'spravato',
        category: 'General Correspondence',
        icon: '💉',
        label: 'Spravato (Esketamine) Letter',
        subject: 'Spravato (Esketamine) Treatment — Medical Necessity',
        body: `${today}\n\nRE: Spravato® (Esketamine) — Medical Necessity\nPatient: ${patName} | DOB: ${patDOB}\n\nTo Whom It May Concern,\n\n${patName} has been diagnosed with Treatment-Resistant Depression (TRD) and has had an inadequate response to at least two adequate antidepressant trials:\n• [Medication 1, dose, duration, response]\n• [Medication 2, dose, duration, response]\n\nSPRAVATO TREATMENT PLAN:\n• Induction (Weeks 1–4): 56–84 mg intranasally, twice weekly\n• Maintenance: Once weekly or biweekly per response\n• All treatments in certified REMS facility with 2-hour post-dose monitoring\n\nPatient is enrolled in the Spravato REMS program and meets all eligibility criteria.\n\nCurrent medications: ${patMedsList}${sig}`,
      },
      {
        id: 'thank-you',
        category: 'General Correspondence',
        icon: '💛',
        label: 'Thank You / Follow-Up Letter',
        subject: 'Thank You for Your Visit',
        body: `${today}\n\nDear ${p.firstName},\n\nThank you for choosing our practice for your mental health care. It was a pleasure seeing you.\n\nAs a reminder:\n• Next appointment: ${p.nextAppointment || '[Please call to schedule]'}\n• Continue all medications as prescribed\n• Contact us with questions or concerns\n\nPatient portal: secure messaging, visit summaries, lab results, refill requests, and scheduling are all available.\n\nWarm regards,\n${providerName}\n${practiceLine}`,
      },
      {
        id: 'discharge',
        category: 'General Correspondence',
        icon: '📤',
        label: 'Discharge from Practice',
        subject: 'Notice of Discharge from Practice',
        body: `${today}\n\nVIA CERTIFIED MAIL / RETURN RECEIPT REQUESTED\n\nDear ${p.firstName},\n\nRE: Termination of Provider-Patient Relationship — Effective [Date + 30 days]\n\nI am writing to inform you that I will no longer be able to serve as your healthcare provider, effective [Date — minimum 30 days from today].\n\nReason: [Non-compliance / Missed appointments / Practice closing / Other]\n\nUntil the effective date, I will continue to provide necessary emergency care.\n\nTO ENSURE CONTINUITY:\n1. Find a new provider: Contact your insurance for in-network options or visit psychologytoday.com\n2. Medications: A [30/60/90]-day bridge supply will be provided\n   Current medications: ${patMedsList}\n3. Records: Submit a signed ROI to our office to transfer your records\n\nCRISIS RESOURCES:\n• 988 Suicide & Crisis Lifeline: Call or text 988\n• Crisis Text Line: Text HOME to 741741\n• Nearest ER / 911\n\n${providerName}\n${practiceLine}`,
      },
    ];
  };

  // ── Forms state ──────────────────────────────────────────
  const [formDelivery, setFormDelivery] = useState('portal');
  const [formsSent, setFormsSent] = useState(false);
  const [selectedForms, setSelectedForms] = useState([]);

  // ── Export state ─────────────────────────────────────────
  const [exportSections, setExportSections] = useState(['demographics', 'problems', 'medications', 'allergies', 'vitals', 'labs', 'assessments', 'immunizations']);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [exportStarted, setExportStarted] = useState(false);

  useEffect(() => {
    if (patientId) {
      openChart(patientId);
    }
  }, [patientId, openChart]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ESC key closes active panel
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setActivePanel(null);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!selectedPatient) {
    return (
      <div className="empty-state">
        <h3>No Patient Selected</h3>
        <p>Search for a patient to open their chart.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/patients')}>
          Search Patients
        </button>
      </div>
    );
  }

  const p = selectedPatient;
  const activeTab = tab || 'summary';
  const ActiveComponent = chartTabs.find((t) => t.key === activeTab)?.component || ChartSummary;

  const patAllergies = allergies[patientId] || [];
  const patProblems = problemList[patientId] || [];
  const patVitals = vitalSigns[patientId] || [];
  const patMeds = meds[patientId] || [];
  const patLabs = labResults[patientId] || [];
  const patAssessments = assessmentScores[patientId] || [];
  const patImmunizations = immunizations[patientId] || [];
  const patOrders = orders[patientId] || [];
  const patEncounters = encounters[patientId] || [];

  const openPanel = (panel) => {
    setActivePanel(panel);
    setMenuOpen(false);
    setOrderGroupSaved(false);
    setFormsSent(false);
    setExportStarted(false);
  };

  const closePanel = () => setActivePanel(null);

  // ── Order Group handlers ─────────────────────────────────
  const addOrderGroupItem = () => {
    setOrderGroupItems(prev => [...prev, { type: 'Lab', description: '', priority: 'Routine', notes: '' }]);
  };
  const updateOrderGroupItem = (index, field, value) => {
    setOrderGroupItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const removeOrderGroupItem = (index) => {
    setOrderGroupItems(prev => prev.filter((_, i) => i !== index));
  };
  const submitOrderGroup = () => {
    const validItems = orderGroupItems.filter(i => i.description.trim());
    if (validItems.length === 0) return;
    validItems.forEach(item => {
      addOrder(patientId, {
        ...item,
        groupName: orderGroupName || 'Untitled Group',
        status: 'Pending',
        orderedDate: new Date().toISOString().split('T')[0],
        orderedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    });
    setOrderGroupSaved(true);
    setTimeout(() => { setOrderGroupItems([{ type: 'Lab', description: '', priority: 'Routine', notes: '' }]); setOrderGroupName(''); setShowPatientLetter(false); setPatientLetter({ subject: '', body: '', delivery: 'portal' }); }, 1500);
  };

  // ── Export handler ───────────────────────────────────────
  const handleExport = () => {
    setExportStarted(true);
    // Build text content for export
    const lines = [`Chart Export — ${p.lastName}, ${p.firstName} (MRN ${p.mrn})`, `Generated: ${new Date().toLocaleString()}`, `Format: ${exportFormat}`, ''];
    if (exportSections.includes('demographics')) {
      lines.push('══ DEMOGRAPHICS ══', `Name: ${p.lastName}, ${p.firstName}`, `DOB: ${p.dob} | Age: ${p.age} | Gender: ${p.gender}`, `Phone: ${p.phone || '—'} | Email: ${p.email || '—'}`, `Insurance: ${p.insurance?.primary?.name || '—'}`, '');
    }
    if (exportSections.includes('allergies')) {
      lines.push('══ ALLERGIES ══');
      patAllergies.length ? patAllergies.forEach(a => lines.push(`  • ${a.allergen || a.name || a} (${a.severity || 'Unknown severity'}) — ${a.reaction || '—'}`)) : lines.push('  NKDA');
      lines.push('');
    }
    if (exportSections.includes('problems')) {
      lines.push('══ PROBLEM LIST ══');
      patProblems.length ? patProblems.forEach(pr => lines.push(`  • ${pr.name || pr.problem} (${pr.status || 'Active'})`)) : lines.push('  No active problems');
      lines.push('');
    }
    if (exportSections.includes('medications')) {
      lines.push('══ MEDICATIONS ══');
      patMeds.length ? patMeds.forEach(m => lines.push(`  • ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`)) : lines.push('  No active medications');
      lines.push('');
    }
    if (exportSections.includes('vitals')) {
      lines.push('══ VITALS (most recent) ══');
      const v = patVitals[0];
      v ? lines.push(`  Date: ${v.date} | BP: ${v.bp} | HR: ${v.hr} | Temp: ${v.temp}°F | SpO2: ${v.spo2}% | BMI: ${v.bmi}`) : lines.push('  No vitals recorded');
      lines.push('');
    }
    if (exportSections.includes('labs')) {
      lines.push('══ LAB RESULTS (recent) ══');
      patLabs.slice(0, 10).forEach(l => lines.push(`  • ${l.test || l.name} — ${l.result || '—'} ${l.unit || ''} (${l.date})`));
      if (!patLabs.length) lines.push('  No lab results');
      lines.push('');
    }
    if (exportSections.includes('assessments')) {
      lines.push('══ ASSESSMENTS ══');
      patAssessments.slice(0, 10).forEach(a => lines.push(`  • ${a.tool || a.name}: Score ${a.score} — ${a.interpretation} (${a.date})`));
      if (!patAssessments.length) lines.push('  No assessments');
      lines.push('');
    }
    if (exportSections.includes('immunizations')) {
      lines.push('══ IMMUNIZATIONS ══');
      patImmunizations.forEach(i => lines.push(`  • ${i.vaccine || i.name} (${i.date})`));
      if (!patImmunizations.length) lines.push('  No immunizations');
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart_export_${p.mrn}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Forms & screeners ────────────────────────────────────
  const availableForms = [
    { id: 'phq9', name: 'PHQ-9 (Depression)', icon: '📊' },
    { id: 'gad7', name: 'GAD-7 (Anxiety)', icon: '📊' },
    { id: 'cssrs', name: 'C-SSRS (Suicide Risk)', icon: '🚨' },
    { id: 'auditc', name: 'AUDIT-C (Alcohol)', icon: '📊' },
    { id: 'dast10', name: 'DAST-10 (Drug Abuse)', icon: '📊' },
    { id: 'pcl5', name: 'PCL-5 (PTSD)', icon: '📊' },
    { id: 'mdq', name: 'MDQ (Bipolar Screening)', icon: '📊' },
    { id: 'consent', name: 'Informed Consent for Treatment', icon: '📝' },
    { id: 'hipaa', name: 'HIPAA Acknowledgment', icon: '📝' },
    { id: 'roi', name: 'Release of Information', icon: '📝' },
    { id: 'intake', name: 'New Patient Intake Form', icon: '📝' },
    { id: 'telehealth-consent', name: 'Telehealth Consent', icon: '📝' },
    { id: 'safety-plan', name: 'Safety Plan Template', icon: '🛡️' },
    { id: 'med-history', name: 'Medication History Form', icon: '💊' },
    { id: 'social-det', name: 'Social Determinants of Health', icon: '🏠' },
  ];
  const toggleForm = (id) => {
    setSelectedForms(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };
  const handleSendForms = () => {
    if (selectedForms.length === 0) return;
    setFormsSent(true);
    setTimeout(() => { setSelectedForms([]); }, 2000);
  };

  // ── Shared panel styles ──────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.15s ease',
  };
  const panelStyle = {
    width: 480, maxWidth: '95vw', background: '#ffffff', height: '100%',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
    animation: 'slideInRight 0.2s ease',
  };
  const panelHeaderStyle = {
    padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };
  const panelBodyStyle = { flex: 1, overflow: 'auto', padding: '16px 20px' };

  // ── Toggle export sections ───────────────────────────────
  const toggleExportSection = (sec) => {
    setExportSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  return (
    <div className="athena-chart-layout">
      <PatientBanner />

      {/* ── Athena-style Chart Navigation Bar ─────────── */}
      <div className="athena-chart-toolbar">
        <div className="athena-chart-tabs">
          {chartTabs.map((t) => {
            const isTherapistView = currentUser?.role === 'therapist';
            const displayLabel = isTherapistView && therapistTabLabels[t.key] ? therapistTabLabels[t.key] : t.label;
            return (
              <button
                key={t.key}
                className={`athena-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => navigate(`/chart/${patientId}/${t.key}`)}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>

        {/* Actions toolbar */}
        <div className="athena-chart-actions-bar">
          {/* Encounter Timer (Athena-style) */}
          <div className="athena-timer">
            <span className={`athena-timer-dot ${timerRunning ? 'running' : ''}`} />
            <span className="athena-timer-display">{formatTimer(timerSeconds)}</span>
            {!timerRunning ? (
              <button className="athena-timer-btn" onClick={startTimer} title="Start timer">▶</button>
            ) : (
              <button className="athena-timer-btn" onClick={stopTimer} title="Pause timer">⏸</button>
            )}
            {timerSeconds > 0 && (
              <button className="athena-timer-btn" onClick={resetTimer} title="Reset timer">↺</button>
            )}
          </div>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className={`athena-toolbar-btn ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              title="Chart actions"
            >
              <span>☰</span> Actions
            </button>

            {menuOpen && (
              <div className="athena-dropdown-menu">
                {[
                  { key: 'quickview', icon: '👁️', label: 'Quick View', desc: 'At-a-glance chart snapshot' },
                  ...(currentUser?.role !== 'therapist' ? [{ key: 'ordergroup', icon: '📦', label: 'Order Group', desc: 'Batch multiple orders' }] : []),
                  { key: 'export', icon: '📤', label: 'Chart Export', desc: 'Download chart data' },
                  { key: 'forms', icon: '📨', label: 'Send Forms', desc: 'Patient forms & screeners' },
                ].map((item, i, arr) => (
                  <div
                    key={item.key}
                    className="athena-dropdown-item"
                    onClick={() => openPanel(item.key)}
                  >
                    <span className="athena-dropdown-icon">{item.icon}</span>
                    <div className="athena-dropdown-content">
                      <div className="athena-dropdown-label">{item.label}</div>
                      <div className="athena-dropdown-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart Content Area ────────────────────────── */}
      <div className="athena-chart-content">
        <BTGGuard patientId={patientId}>
          <ActiveComponent patientId={patientId} />
        </BTGGuard>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SLIDE-OUT PANELS
          ═══════════════════════════════════════════════════════ */}

      {/* ── Quick View ──────────────────────────────────────── */}
      {activePanel === 'quickview' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>👁️ Quick View — {p.lastName}, {p.firstName}</h3>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={panelBodyStyle}>
              {/* Demographics snapshot */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Demographics</div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>DOB:</span> {p.dob}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> {p.age}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Sex:</span> {p.gender}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Pronouns:</span> {p.pronouns || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {p.phone || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {p.email || '—'}</div>
                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Insurance:</span> {p.insurance?.primary?.name || '—'} ({p.insurance?.primary?.memberId || '—'})</div>
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Allergies ({patAllergies.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patAllergies.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>✅ NKDA</span>
                  ) : patAllergies.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${a.severity === 'Severe' ? 'badge-danger' : a.severity === 'Moderate' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 9 }}>{a.severity || '?'}</span>
                      <span style={{ fontWeight: 600 }}>{a.allergen || a.name || a}</span>
                      {a.reaction && <span style={{ color: 'var(--text-muted)' }}>— {a.reaction}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Problems */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Problems ({patProblems.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patProblems.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active problems</span> : patProblems.map((pr, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0' }}>
                      <span style={{ fontWeight: 600 }}>{pr.name || pr.problem}</span>
                      {pr.icd10 && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>({pr.icd10})</span>}
                      {pr.onset && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>since {pr.onset}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Medications ({patMeds.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patMeds.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active medications</span> : patMeds.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0' }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{m.dose} {m.route} {m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest Vitals */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Latest Vitals</div>
                <div className="card" style={{ padding: 12 }}>
                  {patVitals.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No vitals recorded</span> : (() => {
                    const v = patVitals[0];
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 12px', fontSize: 12 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>BP:</span> <strong>{v.bp}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>HR:</span> <strong>{v.hr}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Temp:</span> <strong>{v.temp}°F</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>SpO2:</span> <strong>{v.spo2}%</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>BMI:</span> <strong>{v.bmi}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Pain:</span> <strong>{v.pain}/10</strong></div>
                        <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>Recorded {v.date} at {v.time} by {v.takenBy}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Recent Assessments */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Assessments</div>
                <div className="card" style={{ padding: 12 }}>
                  {patAssessments.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No assessments</span> : patAssessments.slice(0, 6).map((a, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-info" style={{ fontSize: 9, flexShrink: 0 }}>{a.tool || a.name}</span>
                      <span style={{ fontWeight: 700 }}>{a.score}</span>
                      <span style={{ color: 'var(--text-muted)' }}>— {a.interpretation}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Upcoming</div>
                <div className="card" style={{ padding: 12, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Next Appointment:</span> <strong>{p.nextAppointment || '—'}</strong></div>
                  <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>PCP:</span> {p.pcp || '—'}</div>
                  <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>Pending Orders:</span> {patOrders.filter(o => o.status === 'Pending').length}</div>
                </div>
              </div>

              {/* Messaging */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💬 Messaging</div>
                <div className="card" style={{ padding: 12 }}>
                  {(() => {
                    const patMessages = inboxMessages.filter(m => m.patient === patientId).sort((a, b) => b.date > a.date ? 1 : -1);
                    const unread = patMessages.filter(m => !m.read);
                    if (patMessages.length === 0) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No messages for this patient</span>;
                    return (
                      <>
                        {unread.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 8px', background: 'var(--danger-light)', borderRadius: 6 }}>
                            <span className="badge badge-danger" style={{ fontSize: 10 }}>{unread.length} Unread</span>
                            <span style={{ fontSize: 11, color: 'var(--danger)' }}>Requires attention</span>
                          </div>
                        )}
                        {patMessages.slice(0, 4).map((msg, i) => (
                          <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: i < Math.min(patMessages.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontSize: 9, flexShrink: 0, marginTop: 2 }}>{!msg.read ? '🔴' : '✅'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className={`badge ${msg.type === 'Patient Message' ? 'badge-info' : msg.type === 'Lab Result' ? 'badge-success' : msg.type === 'Prior Authorization' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 8, flexShrink: 0 }}>{msg.type}</span>
                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject}</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{msg.from} · {msg.date}</div>
                            </div>
                          </div>
                        ))}
                        {patMessages.length > 4 && (
                          <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => { closePanel(); navigate('/inbox'); }}>
                            View all {patMessages.length} messages →
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Scheduling */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>📅 Scheduling</div>
                <div className="card" style={{ padding: 12 }}>
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const patAppts = appointments.filter(a => a.patientId === patientId).sort((a, b) => a.date > b.date ? 1 : -1);
                    const past = patAppts.filter(a => a.date < today || a.status === 'Completed').slice(-3).reverse();
                    const upcoming = patAppts.filter(a => a.date >= today && a.status !== 'Completed');
                    const noShows = patAppts.filter(a => a.status === 'No Show').length;
                    const cancelled = patAppts.filter(a => a.status === 'Cancelled').length;
                    return (
                      <>
                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{upcoming.length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Upcoming</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{patAppts.filter(a => a.status === 'Completed').length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Completed</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: noShows > 0 ? 'var(--danger-light)' : 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: noShows > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{noShows}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>No-Shows</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: cancelled > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{cancelled}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cancelled</div>
                          </div>
                        </div>

                        {/* Upcoming appointments */}
                        {upcoming.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Upcoming</div>
                            {upcoming.slice(0, 3).map((apt, i) => (
                              <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: i < Math.min(upcoming.length, 3) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{apt.visitType === 'Telehealth' ? '📹' : '🏥'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{apt.date} at {apt.time}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{apt.type} · {apt.duration}min · {apt.providerName} · {apt.room}</div>
                                </div>
                                <span className={`badge ${apt.status === 'Confirmed' ? 'badge-success' : apt.status === 'Checked In' ? 'badge-info' : 'badge-gray'}`} style={{ fontSize: 8 }}>{apt.status}</span>
                              </div>
                            ))}
                            {upcoming.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>+{upcoming.length - 3} more upcoming</div>}
                          </>
                        )}

                        {/* Past appointments */}
                        {past.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 8, color: 'var(--text-secondary)' }}>Recent Visits</div>
                            {past.map((apt, i) => (
                              <div key={i} style={{ fontSize: 12, padding: '4px 0', opacity: 0.7 }}>
                                <span>{apt.date}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{apt.type} · {apt.providerName} · {apt.reason}</span>
                              </div>
                            ))}
                          </>
                        )}

                        <div
                          style={{ fontSize: 11, color: 'var(--primary)', marginTop: 8, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => { closePanel(); navigate('/schedule'); }}
                        >
                          Open full schedule →
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Billing */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💳 Billing</div>
                <div className="card" style={{ padding: 12 }}>
                  {/* Insurance info */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Insurance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Primary:</span> <strong>{p.insurance?.primary?.name || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Member ID:</span> {p.insurance?.primary?.memberId || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Group #:</span> {p.insurance?.primary?.groupNumber || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Copay:</span> <strong>${p.insurance?.primary?.copay || '—'}</strong></div>
                    {p.insurance?.secondary && (
                      <>
                        <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Secondary:</span> <strong>{p.insurance.secondary.name}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Billing codes summary */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Common Billing Codes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {(() => {
                      const patAppts = appointments.filter(a => a.patientId === patientId);
                      const hasNewPatient = patAppts.some(a => a.type === 'New Patient');
                      const hasTelehealth = patAppts.some(a => a.visitType === 'Telehealth');
                      const isTherapistBilling = currentUser?.role === 'therapist';
                      const codes = [];
                      if (isTherapistBilling) {
                        codes.push({ code: '90202', label: 'Therapy — Low' });
                        codes.push({ code: '90203', label: 'Therapy — Moderate' });
                        codes.push({ code: '90204', label: 'Therapy — High' });
                        codes.push({ code: '90834', label: 'Psychotherapy (45 min)' });
                        codes.push({ code: '90837', label: 'Psychotherapy (53+ min)' });
                        codes.push({ code: '96127', label: 'Screening (PHQ-9/GAD-7)' });
                      } else {
                        if (hasNewPatient) codes.push({ code: '99205', label: 'New Patient Eval (60 min)' });
                        codes.push({ code: '99214', label: 'Established - Moderate' });
                        codes.push({ code: '99215', label: 'Established - High' });
                        if (hasTelehealth) codes.push({ code: '99214-95', label: 'Telehealth Modifier' });
                        codes.push({ code: '90833', label: 'Psychotherapy Add-On (30 min)' });
                        codes.push({ code: '90834', label: 'Psychotherapy (45 min)' });
                        codes.push({ code: '96127', label: 'Screening (PHQ-9/GAD-7)' });
                      }
                      return codes.map(c => (
                        <span key={c.code} className="badge badge-gray" style={{ fontSize: 9, cursor: 'default' }} title={c.label}>
                          {c.code}
                        </span>
                      ));
                    })()}
                  </div>

                  {/* Account snapshot */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Account Snapshot</div>
                  {(() => {
                    const completed = appointments.filter(a => a.patientId === patientId && a.status === 'Completed').length;
                    const estimatedCharges = completed * (p.insurance?.primary?.copay || 30);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 12 }}>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>${estimatedCharges}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Copays Collected</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{completed}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Billed Visits</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>$0</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Balance Due</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Prior auth alerts */}
                  {(() => {
                    const paMessages = inboxMessages.filter(m => m.patient === patientId && m.type === 'Prior Authorization');
                    if (paMessages.length === 0) return null;
                    return (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--warning-light, #fff7ed)', borderRadius: 6, border: '1px solid var(--warning)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', marginBottom: 2 }}>⚠️ Prior Authorization Alerts</div>
                        {paMessages.map((pm, i) => (
                          <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {pm.subject} — <span className={`badge ${pm.status === 'Completed' ? 'badge-success' : pm.status === 'In Progress' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 8 }}>{pm.status}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Order Group ──────────────────────────────── */}
      {activePanel === 'ordergroup' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📦 Create Order Group</h3>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={panelBodyStyle}>
              {orderGroupSaved ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                  <h3>Order Group Submitted</h3>
                  <p>{orderGroupItems.filter(i => i.description.trim()).length} orders placed for {p.lastName}, {p.firstName}</p>
                  {showPatientLetter && patientLetter.body.trim() && (
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>📧 Patient letter sent via {patientLetter.delivery === 'portal' ? 'Patient Portal' : patientLetter.delivery === 'email' ? 'Email' : patientLetter.delivery === 'print' ? 'Print' : 'SMS'}</p>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Group Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Quarterly Monitoring, New Patient Workup…"
                      value={orderGroupName}
                      onChange={e => setOrderGroupName(e.target.value)}
                    />
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Orders ({orderGroupItems.length})</div>

                  {orderGroupItems.map((item, i) => (
                    <div key={i} className="card" style={{ padding: 12, marginBottom: 10, background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</span>
                        <select className="form-select" value={item.type} onChange={e => updateOrderGroupItem(i, 'type', e.target.value)} style={{ fontSize: 12, flex: '0 0 100px' }}>
                          <option>Lab</option>
                          <option>Imaging</option>
                          <option>Referral</option>
                          <option>Procedure</option>
                          <option>Consult</option>
                        </select>
                        <select className="form-select" value={item.priority} onChange={e => updateOrderGroupItem(i, 'priority', e.target.value)} style={{ fontSize: 12, flex: '0 0 90px' }}>
                          <option>Routine</option>
                          <option>Urgent</option>
                          <option>STAT</option>
                        </select>
                        {orderGroupItems.length > 1 && (
                          <button onClick={() => removeOrderGroupItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--danger)', marginLeft: 'auto' }}>🗑️</button>
                        )}
                      </div>
                      <input className="form-input" placeholder="Order description…" value={item.description} onChange={e => updateOrderGroupItem(i, 'description', e.target.value)} style={{ fontSize: 12, marginBottom: 6 }} />
                      <input className="form-input" placeholder="Notes (optional)" value={item.notes} onChange={e => updateOrderGroupItem(i, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                  ))}

                  <button className="btn btn-sm btn-secondary" onClick={addOrderGroupItem} style={{ width: '100%', marginBottom: 12 }}>
                    + Add Another Order
                  </button>

                  {/* ── Patient Letter Toggle ────────────────── */}
                  {!showPatientLetter ? (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowPatientLetter(true)}
                      style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Patient Letter
                    </button>
                  ) : (
                    <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--bg)', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>✉️</span> Patient Letter
                        </div>
                        <button
                          onClick={() => { setShowPatientLetter(false); setPatientLetter({ subject: '', body: '', delivery: 'portal' }); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)' }}
                          title="Remove letter"
                        >🗑️</button>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Delivery Method</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[
                            { key: 'portal', label: '🌐 Portal' },
                            { key: 'email', label: '✉️ Email' },
                            { key: 'sms', label: '📱 SMS' },
                            { key: 'print', label: '🖨️ Print' },
                          ].map(d => (
                            <button
                              key={d.key}
                              className={`btn btn-sm ${patientLetter.delivery === d.key ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setPatientLetter(prev => ({ ...prev, delivery: d.key }))}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                            >{d.label}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                          {patientLetter.delivery === 'portal' && `Letter will appear in ${p.firstName}'s portal inbox`}
                          {patientLetter.delivery === 'email' && `Sending to: ${p.email || 'No email on file'}`}
                          {patientLetter.delivery === 'sms' && `Sending to: ${p.cellPhone || p.phone || 'No phone on file'}`}
                          {patientLetter.delivery === 'print' && 'Letter will be generated for printing'}
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Letter Template</label>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setLetterTemplateOpen(!letterTemplateOpen)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '7px 10px' }}
                        >
                          <span>📄 Choose a sample letter…</span>
                          <span style={{ fontSize: 9, opacity: 0.6 }}>{letterTemplateOpen ? '▲' : '▼'}</span>
                        </button>
                        {letterTemplateOpen && (
                          <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                              <input
                                placeholder="Search templates…"
                                value={letterSearch}
                                onChange={e => setLetterSearch(e.target.value)}
                                autoFocus
                                style={{ width: '100%', fontSize: 11.5, padding: '5px 8px', borderRadius: 5, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                              {(() => {
                                const filtered = getLetterTemplates().filter(t =>
                                  !letterSearch.trim() ||
                                  t.label.toLowerCase().includes(letterSearch.toLowerCase()) ||
                                  t.category.toLowerCase().includes(letterSearch.toLowerCase())
                                );
                                const grouped = filtered.reduce((acc, t) => {
                                  (acc[t.category] = acc[t.category] || []).push(t);
                                  return acc;
                                }, {});
                                const entries = Object.entries(grouped);
                                if (entries.length === 0) return (
                                  <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No templates match "{letterSearch}"</div>
                                );
                                return entries.map(([cat, templates]) => (
                                  <div key={cat}>
                                    <div style={{ padding: '5px 12px 3px', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0 }}>{cat}</div>
                                    {templates.map(t => (
                                      <div
                                        key={t.id}
                                        onClick={() => {
                                          setPatientLetter(prev => ({ ...prev, subject: t.subject, body: t.body }));
                                          setLetterTemplateOpen(false);
                                          setLetterSearch('');
                                        }}
                                        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', fontSize: 12 }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{t.icon}</span>
                                        <div style={{ flex: 1, fontWeight: 600 }}>{t.label}</div>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>Use →</span>
                                      </div>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Subject</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Your Lab Results, Follow-up Instructions…"
                          value={patientLetter.subject}
                          onChange={e => setPatientLetter(prev => ({ ...prev, subject: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Letter Body</label>
                        <textarea
                          className="form-input"
                          placeholder={`Dear ${p.firstName},\n\nYour provider has placed the following orders...\n\nPlease contact our office if you have any questions.`}
                          value={patientLetter.body}
                          onChange={e => setPatientLetter(prev => ({ ...prev, body: e.target.value }))}
                          style={{ fontSize: 12, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Quick insert:</span>
                        {[
                          { label: 'Greeting', text: `Dear ${p.firstName},\n\n` },
                          { label: 'Order Summary', text: `The following orders have been placed on your behalf:\n${orderGroupItems.filter(i => i.description.trim()).map(i => `  • ${i.type}: ${i.description}`).join('\n')}\n\n` },
                          { label: 'Follow-up', text: 'Please follow up with our office if you have any questions or concerns.\n' },
                          { label: 'Signature', text: `\nSincerely,\n${currentUser?.firstName} ${currentUser?.lastName}${currentUser?.credentials ? ', ' + currentUser.credentials : ''}\n` },
                        ].map(t => (
                          <button
                            key={t.label}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 10, padding: '2px 7px' }}
                            onClick={() => setPatientLetter(prev => ({ ...prev, body: prev.body + t.text }))}
                          >{t.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-primary" onClick={submitOrderGroup} style={{ width: '100%' }}>
                    Submit Order Group ({orderGroupItems.filter(i => i.description.trim()).length} orders{showPatientLetter && patientLetter.body.trim() ? ' + letter' : ''})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Chart Export ─────────────────────────────────────── */}
      {activePanel === 'export' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📤 Chart Export — {p.lastName}, {p.firstName}</h3>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={panelBodyStyle}>
              {exportStarted ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>📤</span>
                  <h3>Export Downloaded</h3>
                  <p>Chart export has been generated with {exportSections.length} sections.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setExportStarted(false)} style={{ marginTop: 12 }}>Export Again</button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Format</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['PDF', 'CCD/CDA', 'FHIR Bundle', 'Plain Text'].map(f => (
                        <button
                          key={f}
                          className={`btn btn-sm ${exportFormat === f ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setExportFormat(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Select Sections</div>
                  {[
                    { key: 'demographics', label: '👤 Demographics' },
                    { key: 'allergies', label: '⚠️ Allergies' },
                    { key: 'problems', label: '🩺 Problem List' },
                    { key: 'medications', label: '💊 Medications' },
                    { key: 'vitals', label: '💓 Vitals' },
                    { key: 'labs', label: '🔬 Lab Results' },
                    { key: 'assessments', label: '📊 Assessments' },
                    { key: 'immunizations', label: '💉 Immunizations' },
                    { key: 'encounters', label: '🗒️ Encounters' },
                    { key: 'orders', label: '📝 Orders' },
                  ].map(sec => (
                    <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={exportSections.includes(sec.key)}
                        onChange={() => toggleExportSection(sec.key)}
                      />
                      {sec.label}
                    </label>
                  ))}

                  <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    ⚠️ Export contains PHI. Handle per HIPAA/institutional policy. Audit log entry will be created.
                  </div>

                  <button className="btn btn-primary" onClick={handleExport} style={{ width: '100%', marginTop: 16 }}>
                    📤 Download Export ({exportSections.length} sections)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Send Forms & Screeners ──────────────────────────── */}
      {activePanel === 'forms' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📨 Send Forms & Screeners</h3>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={panelBodyStyle}>
              {formsSent ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                  <h3>Forms Sent</h3>
                  <p>{selectedForms.length} form(s) sent to {p.firstName} {p.lastName} via {formDelivery === 'portal' ? 'Patient Portal' : formDelivery === 'email' ? 'Email' : 'SMS'}.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Delivery Method</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { key: 'portal', label: '🌐 Patient Portal' },
                        { key: 'email', label: '✉️ Email' },
                        { key: 'sms', label: '📱 SMS' },
                      ].map(d => (
                        <button
                          key={d.key}
                          className={`btn btn-sm ${formDelivery === d.key ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFormDelivery(d.key)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formDelivery === 'portal' && `Will appear in ${p.firstName}'s portal inbox`}
                      {formDelivery === 'email' && `Sending to: ${p.email || 'No email on file'}`}
                      {formDelivery === 'sms' && `Sending to: ${p.cellPhone || p.phone || 'No phone on file'}`}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Screeners</div>
                  <div style={{ marginBottom: 16 }}>
                    {availableForms.filter(f => f.icon === '📊' || f.icon === '🚨').map(form => (
                      <label
                        key={form.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13,
                          cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                          background: selectedForms.includes(form.id) ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={() => toggleForm(form.id)} />
                        <span>{form.icon}</span>
                        <span style={{ fontWeight: selectedForms.includes(form.id) ? 700 : 400 }}>{form.name}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Forms & Consents</div>
                  <div style={{ marginBottom: 16 }}>
                    {availableForms.filter(f => f.icon !== '📊' && f.icon !== '🚨').map(form => (
                      <label
                        key={form.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13,
                          cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                          background: selectedForms.includes(form.id) ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={() => toggleForm(form.id)} />
                        <span>{form.icon}</span>
                        <span style={{ fontWeight: selectedForms.includes(form.id) ? 700 : 400 }}>{form.name}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSendForms}
                    disabled={selectedForms.length === 0}
                    style={{ width: '100%', opacity: selectedForms.length === 0 ? 0.5 : 1 }}
                  >
                    📨 Send {selectedForms.length} Form{selectedForms.length !== 1 ? 's' : ''} to {p.firstName}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Note FAB + Widget ──────────────────────── */}
      {!stickyOpen && (
        <button
          onClick={() => setStickyOpen(true)}
          title="Open Sticky Note"
          style={{
            position: 'fixed', bottom: 28, left: 310, zIndex: 900,
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#fde047', color: '#713f12',
            boxShadow: '0 3px 12px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.08)',
            fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(0,0,0,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.2)'; }}
        >
          📝
        </button>
      )}

      {stickyOpen && (
        <div
          ref={stickyDragRef}
          onMouseDown={onStickyMouseDown}
          style={{
            position: 'fixed',
            left: stickyPos.x,
            top: stickyPos.y,
            zIndex: 950,
            width: stickyMinimized ? 180 : 280,
            background: 'linear-gradient(175deg, #fef9c3 0%, #fde68a 40%, #fcd34d 100%)',
            borderRadius: '3px 3px 6px 6px',
            boxShadow: '2px 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
            fontFamily: "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
            cursor: 'grab',
            userSelect: 'none',
            transition: 'width 0.2s ease',
            /* tape strip effect at top */
          }}
        >
          {/* Tape strip */}
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 60, height: 22, borderRadius: 2,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(200,200,180,0.5) 100%)',
            border: '1px solid rgba(180,170,140,0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            zIndex: 1,
          }} />

          {/* Header bar */}
          <div style={{
            padding: '10px 10px 4px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#78350f', letterSpacing: '-0.2px',
              fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📌 <span style={{ fontSize: 12, fontWeight: 800 }}>Sticky Note</span>
              {stickyText.trim().length > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                  background: 'rgba(120,53,15,0.15)', color: '#92400e',
                }}>{stickyText.trim().split('\n').length} line{stickyText.trim().split('\n').length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setStickyMinimized(!stickyMinimized); }}
                title={stickyMinimized ? 'Expand' : 'Minimize'}
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: 'rgba(120,53,15,0.1)', color: '#78350f', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}
              >{stickyMinimized ? '⬜' : '—'}</button>
              <button
                onClick={(e) => { e.stopPropagation(); setStickyOpen(false); }}
                title="Close"
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontSize: 13, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}
              >×</button>
            </div>
          </div>

          {/* Note body */}
          {!stickyMinimized && (
            <div style={{ padding: '4px 12px 12px' }}>
              <textarea
                value={stickyText}
                onChange={(e) => setStickyText(e.target.value)}
                placeholder={"Quick notes, phone #'s, reminders...\n\ne.g.\n☎ (555) 867-5309 — mom\n⏰ Call back @ 2pm\n💊 Check lithium level"}
                style={{
                  width: '100%', minHeight: 160, maxHeight: 300, resize: 'vertical',
                  border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive",
                  fontSize: 17, lineHeight: 1.55, color: '#422006',
                  /* Ruled-line effect */
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, rgba(120,53,15,0.08) 25px, rgba(120,53,15,0.08) 26px)',
                  backgroundSize: '100% 26px',
                  backgroundPositionY: '4px',
                  padding: '4px 2px',
                  boxSizing: 'border-box',
                  cursor: 'text',
                }}
              />
              {/* Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(120,53,15,0.15)',
              }}>
                <span style={{
                  fontSize: 10, color: 'rgba(120,53,15,0.4)', fontFamily: 'Inter, sans-serif',
                  fontWeight: 600, fontStyle: 'italic',
                }}>
                  {stickyText.length > 0 ? `${stickyText.length} chars · auto-saved` : 'For this chart only'}
                </span>
                {stickyText.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Clear sticky note?')) setStickyText(''); }}
                    style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >🗑 Clear</button>
                )}
              </div>
            </div>
          )}

          {/* Minimized preview */}
          {stickyMinimized && (
            <div style={{
              padding: '2px 14px 10px', fontSize: 13, color: '#713f12',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              opacity: 0.7, fontStyle: 'italic',
            }}>
              {stickyText.trim().split('\n')[0] || 'Empty note...'}
            </div>
          )}
        </div>
      )}

      {/* Inline keyframes for slide panel animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
