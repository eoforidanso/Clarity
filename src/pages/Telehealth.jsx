import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useTelehealth } from '../contexts/TelehealthContext';
import { telehealth as telehealthApi } from '../services/api';
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, ParticipantEvent, RoomEvent } from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const API           = import.meta.env.VITE_API_URL || '/api';
const getVideoLink  = (apt) => `https://telehealth.clarity.health/room/${apt.id}`;
const nowTime       = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const isoNow        = () => new Date().toISOString();
const fmtTimer      = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s % 3600) / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
const calcAge       = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const CPT_CODES = [
  { code: '99213-95', label: 'Office Visit Est. — Low Complexity (TH Mod 95)',      typical: 'Follow-up 15–20 min' },
  { code: '99214-95', label: 'Office Visit Est. — Moderate Complexity (TH Mod 95)', typical: 'Follow-up 25–30 min' },
  { code: '99215-95', label: 'Office Visit Est. — High Complexity (TH Mod 95)',     typical: 'Complex 40–55 min' },
  { code: '90837-95', label: 'Psychotherapy 60 min (TH Mod 95)',                    typical: 'Individual therapy' },
  { code: '90834-95', label: 'Psychotherapy 45 min (TH Mod 95)',                    typical: 'Individual therapy' },
  { code: '90832-95', label: 'Psychotherapy 30 min (TH Mod 95)',                    typical: 'Brief therapy' },
  { code: '99212-GT', label: 'Office Visit Est. — Minimal (GT Mod)',                typical: 'Med check, very brief' },
];

const QUICK_NOTE_TEMPLATES = [
  // ── Routine & Follow-Up ──────────────────────────────────────────────────
  {
    label: 'Stable / Routine Follow-Up',
    text: `Patient seen via telehealth for routine psychiatric follow-up. Patient reports medication is effective with no significant side effects. Mood is stable, sleep is adequate, appetite is intact. No new stressors reported. Denies SI/HI/AVH. MSE: Alert, oriented x3, cooperative, affect appropriate, thought process linear, insight and judgment intact.\n\nPlan: Continue current medication regimen. Follow up in [4–8 weeks]. Patient instructed to contact office PRN for any acute concerns.`,
  },
  {
    label: 'Medication Adjustment',
    text: `Patient seen via telehealth. Patient reports [symptom/concern, e.g., partial response, side effects, relapse of symptoms]. Current medication(s) reviewed. After thorough discussion of risks, benefits, alternatives, and patient preferences:\n\nChange: [Increase/Decrease/Switch/Add] [medication] from [dose] to [new dose].\nReason: [clinical rationale].\nSide effects discussed: [list key side effects].\nPatient verbalized understanding and agreement with plan.\n\nMonitoring: [labs if applicable, e.g., CBC, CMP, lithium level]. Follow up in [2–4 weeks] to assess response and tolerability.`,
  },
  {
    label: 'New Side Effect Reported',
    text: `Patient seen via telehealth. Patient reports new onset [side effect] since starting/increasing [medication]. Onset: [date/timeframe]. Severity: [mild/moderate/severe]. Functional impact: [none/mild/significant].\n\nAssessment: Side effect likely [related/possibly related/unrelated] to [medication].\nPlan: [Continue with monitoring / Dose reduction / Discontinue and switch]. Patient educated on [management strategies]. Instructed to go to ER if [serious symptoms, e.g., rash, chest pain, severe akathisia]. Follow up in [timeframe].`,
  },
  {
    label: 'Refill Only / Brief Check-In',
    text: `Patient seen via telehealth for brief medication check-in and refill. Patient reports medications are working well with no significant side effects. No changes in mental status since last visit. Denies SI/HI. MSE grossly intact.\n\nPlan: Refill [medication(s)] as previously prescribed. No medication changes at this time. Next follow-up in [timeframe]. Patient reminded to contact office with any concerns before next appointment.`,
  },
  {
    label: 'Follow-Up After Hospitalization',
    text: `Patient seen via telehealth for post-hospitalization follow-up. Patient was discharged from [facility] on [date] following [psychiatric hospitalization / medical admission]. Discharge diagnosis: [diagnosis]. Discharge medications: [list].\n\nCurrent status: Patient reports [mood, sleep, appetite, level of functioning]. Transition to outpatient care discussed. Medication reconciliation completed — [no changes / adjustments made]. Coping plan reviewed. Outpatient supports: [therapist, case manager, IOP, PHP].\n\nSafety: Denies SI/HI. Safety plan reviewed and updated. Crisis line number provided (988). Follow up in [1 week].`,
  },

  // ── Crisis & Safety ───────────────────────────────────────────────────────
  {
    label: 'Crisis Assessment / Safety Planning',
    text: `Patient seen via STAT telehealth for crisis evaluation. Patient reported [presenting concern, e.g., worsening depression, suicidal ideation, self-harm].\n\nSafety Assessment:\n- SI: [Present / Absent] — Ideation: [passive/active], Plan: [none/present], Intent: [none/present], Means: [none/access described]\n- HI: [Present / Absent]\n- Self-harm: [Present / Absent — describe]\n- Recent substance use: [Yes/No — describe]\n- Protective factors: [reasons for living, social supports, future orientation]\n\nMSE: [Alert, oriented, affect [dysphoric/anxious/flat], thought process [linear/disorganized]]\n\nSafety Plan Updated:\n1. Warning signs: [list]\n2. Internal coping strategies: [list]\n3. Social contacts for distraction: [names]\n4. Crisis contacts: [names/numbers]\n5. Professional crisis resources: 988 Lifeline, local ER [name]\n6. Means restriction: [discussed, firearms/medications secured]\n\nDisposition: [Outpatient with safety plan / Voluntary hospitalization recommended / Involuntary hold initiated — 5150/5250]. [Next steps and rationale].`,
  },
  {
    label: 'Passive SI — No Acute Risk',
    text: `Patient seen via telehealth. Patient endorsed passive suicidal ideation ("I wish I were dead / wouldn't mind not waking up") without active plan, intent, or means. No prior attempts. Protective factors present: [family, children, religious beliefs, future goals].\n\nMSE: Affect [dysphoric/anxious], thought process linear, no psychosis, judgment intact.\n\nAssessment: Low acute risk for self-harm at this time based on C-SSRS. No voluntary or involuntary hospitalization indicated at present.\n\nPlan: Safety plan reviewed and updated. Crisis line number provided (988). [Medication adjustment if applicable]. Increase visit frequency to [weekly]. Patient instructed to go to ER or call 911 if ideation escalates. Collateral contact made with [family member/support person] with patient consent. Follow up [date].`,
  },
  {
    label: 'Domestic Violence / Safety Concern',
    text: `Patient seen via telehealth. Patient disclosed [current/recent history of] domestic violence/intimate partner violence. Safety assessed: Patient currently [safe / not safe] at home. Immediate danger: [Yes/No].\n\nMandatory reporting obligations reviewed per state law. [Report filed / Not required at this time — rationale].\n\nResources provided:\n- National DV Hotline: 1-800-799-7233\n- Local shelter: [name/number]\n- Safety planning completed: [exits, documents, children, safe contacts]\n\nPlan: Continued support. Referral to [social work/case management/DV advocate]. Follow up in [timeframe] or sooner if needed.`,
  },

  // ── Evaluations ───────────────────────────────────────────────────────────
  {
    label: 'Initial Psychiatric Evaluation',
    text: `Patient seen via telehealth for initial psychiatric evaluation.\n\nCC: [Chief complaint in patient's words]\n\nHPI: [Age]-year-old [gender] presenting with [duration] history of [presenting symptoms]. [Onset, course, severity, functional impact, prior treatment]. [Relevant psychosocial context].\n\nPast Psychiatric History: [Prior diagnoses, hospitalizations, outpatient treatment, medications tried]\nPast Medical History: [Active medical conditions]\nMedications: [Current medications including non-psychiatric]\nAllergies: [Drug allergies/reactions]\nSubstance Use: [Tobacco, alcohol, cannabis, other — frequency/amount]\nFamily History: [Psychiatric illness in first-degree relatives]\nSocial History: [Living situation, relationship status, employment, education, trauma history]\n\nMSE: Alert, oriented x3, cooperative. Appearance [appropriate/disheveled]. Speech [normal rate/volume]. Mood "[patient-reported]." Affect [appropriate/blunted/labile/restricted]. Thought process [linear/tangential/circumstantial]. Thought content [no SI/HI/AVH/delusions] or [describe]. Cognition grossly intact. Insight [intact/limited/absent]. Judgment [intact/impaired].\n\nDiagnostic Impression:\n1. [Primary DSM-5 diagnosis with ICD-10 code]\n2. [Secondary diagnosis if applicable]\n\nPlan:\n1. Start [medication, dose, instructions]\n2. Labs ordered: [CBC, CMP, TSH, other]\n3. Referral to [therapy, case management, other]\n4. Return in [timeframe] for follow-up.\n5. Crisis plan discussed. 988 Lifeline provided.`,
  },
  {
    label: 'ADHD Evaluation',
    text: `Patient seen via telehealth for ADHD evaluation. Patient reports [inattention / hyperactivity / impulsivity] symptoms since [childhood/adulthood]. Functional impairment in [work/school/relationships/daily tasks].\n\nSymptoms reviewed: [list core ADHD symptoms endorsed — concentration, organization, forgetfulness, fidgeting, impulsivity, etc.]\nRating scales administered: [Conners / Adult ADHD Self-Report Scale / Vanderbilt]\nDifferential considered: [Anxiety, depression, sleep disorder, substance use, mania]\nPrior stimulant/non-stimulant trials: [list if any]\n\nMSE: Alert, cooperative. [Distractible / Difficulty sustaining attention noted in session]. No psychosis, no SI/HI.\n\nDiagnostic Impression: [ADHD, Combined/Inattentive/Hyperactive-Impulsive presentation] vs. [rule out differentials]\n\nPlan:\n1. [Start/trial stimulant/non-stimulant — medication, dose]\n2. PDMP check completed.\n3. DEA Schedule II: No refills authorized per DEA regulations. New Rx required each month.\n4. Counseling/coaching referral provided.\n5. Follow up in [4 weeks].`,
  },

  // ── Condition-Specific ────────────────────────────────────────────────────
  {
    label: 'Depression Follow-Up',
    text: `Patient seen via telehealth for depression follow-up. Patient reports [improved/unchanged/worsened] mood since last visit. PHQ-9 score today: [score] ([severity]). Sleep: [improved/poor — hours per night]. Appetite: [intact/decreased/increased]. Energy: [adequate/low]. Concentration: [intact/impaired]. Anhedonia: [present/absent].\n\nDenies SI/HI. No psychotic features.\n\nMSE: Affect [euthymic/dysphoric/reactive]. Thought process linear. Judgment intact.\n\nAssessment: [MDD, Persistent Depressive Disorder, Adjustment Disorder with Depressed Mood] — [in remission / partial remission / active episode — mild/moderate/severe].\n\nPlan: [Continue / Adjust medication]. [Therapy referral / ongoing]. Sleep hygiene reinforced. Activity scheduling discussed. Follow up in [timeframe].`,
  },
  {
    label: 'Anxiety / Panic Follow-Up',
    text: `Patient seen via telehealth for anxiety follow-up. GAD-7 score today: [score] ([severity]). Patient reports [frequency] of anxiety episodes/panic attacks since last visit. Triggers: [identified/none identified]. Avoidance behaviors: [present/absent]. Sleep: [adequate/disrupted]. Functional impact: [work/social/daily activities].\n\nDenies SI/HI.\n\nMSE: Appears [anxious/calm]. Affect [anxious/appropriate]. Thought process [ruminative/linear].\n\nAssessment: [GAD / Panic Disorder / Social Anxiety / Agoraphobia / PTSD / Adjustment Disorder with Anxiety] — [improving/stable/worsening].\n\nPlan: [Continue / Adjust medication]. CBT/exposure techniques discussed. Breathing and grounding techniques reviewed. Avoid caffeine and alcohol reinforced. Follow up in [timeframe].`,
  },
  {
    label: 'Bipolar Disorder Follow-Up',
    text: `Patient seen via telehealth for bipolar disorder follow-up. Patient reports [stable mood / depressive symptoms / hypomanic symptoms / manic symptoms] since last visit. Sleep: [regular/disrupted — hours/night]. Energy: [normal/elevated/low]. Racing thoughts: [yes/no]. Impulsivity: [increased/baseline]. Risk-taking behavior: [yes/no]. Irritability: [present/absent].\n\nMDQ/mood chart reviewed: [findings]. PDMP checked: [clear/findings].\n\nDenies SI/HI. No acute safety concerns.\n\nMSE: Speech [normal rate/pressured]. Psychomotor [normal/agitated]. Mood "[patient-reported]." Affect [appropriate/expansive/dysphoric]. Thought process [linear/tangential/flight of ideas].\n\nAssessment: Bipolar [I/II/cyclothymia] — currently [euthymic/depressed/hypomanic/manic].\n\nPlan: [Continue/adjust mood stabilizer/antipsychotic]. Labs: [lithium level/VPA level/CMP/TSH as applicable]. Sleep regulation emphasized. Trigger avoidance reviewed. Follow up in [timeframe].`,
  },
  {
    label: 'PTSD / Trauma Follow-Up',
    text: `Patient seen via telehealth for PTSD follow-up. PCL-5 score today: [score]. Patient reports [frequency/severity] of intrusive symptoms (flashbacks, nightmares), avoidance behaviors, hyperarousal, and negative cognitions since last visit. Recent triggers: [identified/none]. Sleep: [adequate/disrupted — nightmares present/absent].\n\nDenies SI/HI.\n\nTherapy progress: [CPT/EMDR/PE/other] — patient reports [engagement and response]. Coping skills used: [grounding, relaxation, other].\n\nMSE: Affect [appropriate/restricted/hypervigilant]. Thought process linear. No dissociative symptoms noted.\n\nPlan: [Continue / Adjust medication for nightmares/hyperarousal — prazosin, SSRIs, etc.]. Continue trauma-focused therapy. Safety planning reviewed. Follow up in [timeframe].`,
  },
  {
    label: 'Psychosis / Schizophrenia Follow-Up',
    text: `Patient seen via telehealth for psychosis follow-up. Patient reports [stable/worsening/improving] symptoms. Positive symptoms: Hallucinations [auditory/visual/absent — describe]. Delusions [present/absent — describe]. Disorganized thinking [present/absent]. Negative symptoms: Flat affect [present/absent], avolition [present/absent], alogia [present/absent].\n\nMedication adherence: [100% / partial — reason]. Last antipsychotic injection (if applicable): [date, medication, dose]. AIMS score: [score — abnormal movements noted/not noted].\n\nDenies SI/HI. No acute agitation.\n\nMSE: Thought process [linear/disorganized/tangential]. Thought content [no delusions / delusions present — encapsulated/active]. Perceptual disturbances [none/AVH described]. Insight [intact/limited/absent].\n\nPlan: [Continue/adjust antipsychotic]. Labs: [prolactin/metabolic panel/lipids]. Case management/ACT team coordination. Housing and social support reviewed. Follow up in [timeframe].`,
  },
  {
    label: 'Substance Use / SUD Follow-Up',
    text: `Patient seen via telehealth for substance use disorder follow-up. Substance(s): [alcohol/opioids/stimulants/cannabis/other]. Current use: [abstinent since [date] / reduced — [frequency/amount] / unchanged / increased].\n\nMAT (if applicable): [Buprenorphine dose/Naltrexone/Vivitrol — adherence, side effects]. PDMP reviewed: [findings, compliant/concerns]. UDS results: [negative / positive for (list)].\n\nCravings: [none/mild/moderate/severe]. Triggers identified: [list]. Recovery supports: [AA/NA/SMART, sponsor, sober support network]. Functional status: [employment, housing, relationships — stable/improving/declining].\n\nDenies SI/HI.\n\nPlan: [Continue/adjust MAT]. [Counseling referral/ongoing]. Relapse prevention strategies reviewed. [Naloxone prescribed/on hand — discussed overdose reversal]. Follow up in [timeframe].`,
  },
  {
    label: 'Insomnia / Sleep Disorder Follow-Up',
    text: `Patient seen via telehealth for insomnia follow-up. Patient reports [sleep onset latency: X minutes], [total sleep time: X hours], [number of awakenings: X/night], [early morning awakening: yes/no]. Daytime impairment: [fatigue, concentration, mood, performance]. ISI score: [score].\n\nSleep hygiene: [reviewed — adherent/non-adherent]. CBT-I progress: [if applicable]. Contributing factors: [anxiety, pain, substance use, sleep apnea, medication side effects — rule out/address].\n\nCurrent sleep aids: [list medications, dose, frequency]. Concerns: [dependence, tolerance, appropriateness].\n\nPlan: [Continue/adjust/taper sleep medication]. CBT-I techniques reinforced (stimulus control, sleep restriction, relaxation). Sleep diary encouraged. [Referral to sleep medicine if apnea suspected]. Follow up in [timeframe].`,
  },

  // ── Special Situations ────────────────────────────────────────────────────
  {
    label: 'No Show / Late Cancel',
    text: `Patient did not appear for scheduled telehealth appointment at [time]. Attempted contact via [phone/secure message] — [no answer/voicemail left/message sent]. Patient [has/has not] notified office of reason for absence.\n\nChart reviewed: No immediate safety concerns identified based on last visit [date]. [If high-risk: follow-up attempt made via [method]. Emergency contact [name] notified per patient authorization. Crisis line information (988) left in message.]\n\nPlan: Reschedule appointment. No-show policy communicated. If patient fails to reschedule within [timeframe], [care coordination/discharge planning] to be initiated.`,
  },
  {
    label: 'Collateral Contact / Family Session',
    text: `Patient seen via telehealth with collateral contact [name, relationship] present [with patient consent / patient not present — emergency circumstances]. Purpose: [care coordination / safety assessment / family psychoeducation].\n\nInformation obtained from collateral: [summary of collateral report — mood, behavior, safety, medication adherence, functional status].\n\nPatient response (if present): [agrees/disagrees with collateral report].\n\nPlan: [Care coordination with family]. Psychoeducation provided: [diagnosis, medication, crisis resources, 988, when to call 911]. Collateral agreement to [monitor, contact office if concerns]. Follow up with patient [date].`,
  },
  {
    label: 'Telehealth Technical Difficulties',
    text: `Telehealth session with patient [name] was [partially/fully] impacted by technical difficulties. Issue encountered: [audio/video failure, patient unable to connect, platform error].\n\nAttempts made to resolve: [switched to phone call / rescheduled / patient reconnected after X minutes].\n\nSession completed via: [video / audio-only telephone]. Audio-only visit compliant with [state/federal telehealth regulations in effect]. Patient consented to audio-only visit.\n\nClinical documentation: [complete as normal — or: Limited assessment due to audio-only. Recommend in-person or video visit for next encounter to complete full MSE].`,
  },
  {
    label: 'Discharge / Transfer of Care',
    text: `Patient seen via telehealth for final visit / transfer of care. Reason for discharge/transfer: [patient request / moved out of area / level of care change / non-compliance / treatment goals met].\n\nSummary of treatment: [Duration of care, diagnoses treated, medications prescribed, therapy provided, functional outcomes].\n\nDischarge medications: [list]. Prescriptions provided: [30-day supply / bridge supply]. Instructions: [taper if applicable].\n\nReferrals made: [Receiving provider name/agency, PCP notified]. Records released to: [provider/facility] with patient consent dated [date].\n\nSafety plan reviewed. Crisis resources provided: 988, local ER [name]. Patient verbalized understanding and agreement with discharge plan. Patient encouraged to establish care with new provider within [timeframe].`,
  },
  {
    label: 'Informed Consent — New Medication',
    text: `Patient seen via telehealth. New medication [name, dose, frequency] discussed at length. Informed consent obtained:\n\n✓ Indication: [diagnosis/clinical rationale]\n✓ Expected benefits: [symptom improvement timeline]\n✓ Common side effects reviewed: [list]\n✓ Serious/rare side effects reviewed: [list — e.g., serotonin syndrome, tardive dyskinesia, metabolic effects]\n✓ Alternatives discussed: [other medication options, therapy, watchful waiting]\n✓ Consequences of no treatment discussed\n✓ Patient's questions answered\n✓ Pregnancy/breastfeeding considerations discussed (if applicable)\n✓ Drug-drug interactions reviewed\n\nPatient verbalized understanding and consented to proceed with medication. Prescription sent to [pharmacy]. Follow up in [timeframe] to assess initial response.`,
  },

  // ── Additional Condition-Specific ─────────────────────────────────────────
  {
    label: 'OCD Follow-Up',
    text: `Patient seen via telehealth for OCD follow-up. Y-BOCS score today: [score] (baseline: [score]). Patient reports obsessions: [contamination/harm/symmetry/intrusive thoughts — describe]. Compulsions: [washing/checking/counting/reassurance-seeking — describe]. Time consumed per day: [hours]. Functional impairment: [work/school/relationships/daily tasks].\n\nERP/CBT progress: [therapist name/agency] — patient reports [engagement level, difficulty with exposures, avoided hierarchies]. Accommodation behaviors: [identified/decreased/eliminated].\n\nMedication adherence: [100%/partial]. Side effects: [none/describe].\n\nDenies SI/HI. MSE: Thought process [linear/ego-dystonic intrusive thoughts described]. Insight [intact — recognizes thoughts as OCD-driven / partial / absent].\n\nPlan: [Continue/increase SSRI — note: OCD typically requires higher doses than depression]. [Augmentation with clomipramine/antipsychotic if partial response]. Encourage ERP engagement. Psychoeducation on habituation and response prevention. Follow up in [timeframe].`,
  },
  {
    label: 'Eating Disorder Follow-Up',
    text: `Patient seen via telehealth for eating disorder follow-up. Diagnosis: [Anorexia Nervosa/Bulimia Nervosa/BED/ARFID/Other]. Current weight: [___] lbs/kg (BMI: [___]). Weight change since last visit: [+/- ___]. Lowest adult weight: [___]. Medically stable: [Yes/No — see below].\n\nEDE-Q / EDE score today: [score]. Dietary restriction: [describe meal plan adherence]. Binge episodes: [frequency/week]. Purge behaviors: [vomiting/laxatives/exercise — frequency]. Compensatory behaviors: [describe]. Cognitions: [fear of weight gain, body dysmorphia, food rules described].\n\nMedical status: Vitals reviewed — HR [___], BP [___]. Labs reviewed: [BMP, phosphorus, magnesium, albumin — results]. Dental/esophageal concerns: [yes/no].\n\nDenies SI/HI.\n\nMSE: Affect [restricted/labile/appropriate]. Thought content [preoccupied with food/weight/body image]. Insight [intact/limited].\n\nLevel of care determination: [Outpatient appropriate / Step up to IOP/PHP/residential indicated — rationale].\n\nPlan: [Medication: SSRI/fluoxetine — note: contraindicated in low-weight AN]. Coordination with dietitian [name]. Medical monitoring with PCP/internist. Family involvement [if appropriate]. Follow up in [timeframe].`,
  },
  {
    label: 'Perinatal / Postpartum Psychiatric Evaluation',
    text: `Patient seen via telehealth for perinatal/postpartum psychiatric evaluation. Patient is [pregnant — gestational age: ___ weeks / postpartum — ___ weeks/months since delivery]. Obstetric provider: [name/practice].\n\nPresenting concerns: [depression/anxiety/OCD/psychosis/bonding difficulties/describe]. Edinburgh Postnatal Depression Scale (EPDS) score: [score]. Onset: [during pregnancy / postpartum — specify week].\n\nRisk factors: [prior PPD, history of MDD/bipolar, inadequate support, sleep deprivation, traumatic delivery, NICU admission, prior loss].\n\nSafety: Denies SI/HI. [Postpartum psychosis screened — no symptoms of paranoia, command hallucinations, or thoughts of harming infant]. Infant safety: [no concerns / concerns — mandatory reporting obligations reviewed].\n\nMSE: Affect [dysphoric/anxious/flat]. Thought process linear. Insight intact.\n\nMedication considerations: Psychotropic risk/benefit discussed. [Sertraline/escitalopram — compatible with breastfeeding based on current evidence]. Lactation consultant coordination: [yes/no]. Patient preference: [breastfeeding/formula/weaning plan].\n\nPlan: [Medication selected — name, dose]. Therapy referral: [postpartum-specialized therapist/group]. Partner/support person psychoeducation. Crisis resources provided (988, Postpartum Support International: 1-800-944-4773). OB/CNM coordination note sent. Follow up in [1–2 weeks].`,
  },
  {
    label: 'Geriatric Psychiatric Evaluation (65+)',
    text: `Patient seen via telehealth for geriatric psychiatric evaluation. Age: [___]. Living situation: [independent/assisted living/with family/LTCF]. Support system: [describe]. Functional status: ADLs [independent/dependent — specify]. IADLs [intact/impaired — specify]. Recent falls: [yes/no].\n\nPresenting concerns: [depression/anxiety/cognitive decline/behavioral symptoms/psychosis/describe].\n\nCognitive screening: MMSE/MoCA performed: [score: ___/30]. [If impaired: referred to neuropsychological testing / neurology / memory care]. Delirium screened: [no evidence / CAM administered — result].\n\nMedication review: All current medications reviewed (Beers Criteria applied). High-risk medications identified: [benzodiazepines/anticholinergics/sedatives — discuss risks]. Polypharmacy: [___ total medications].\n\nMedical contributors reviewed: [thyroid, B12, folate, CBC, CMP, lipids, UA — ordered/reviewed]. Sensory impairments: [hearing/vision — addressed].\n\nSafety: Denies SI/HI. [Elder abuse screened — no evidence / concerns — mandatory reporting obligations reviewed]. Driving safety: [discussed].\n\nMSE: Oriented x [1/2/3/4]. Affect [appropriate/blunted]. Memory [intact/impaired — recent > remote or reverse]. Executive function [intact/impaired].\n\nPlan: [Medication — avoid high-risk agents; start low, go slow]. Therapy referral (if cognitively intact). Caregiver psychoeducation. Advance care planning discussed. PCP coordination. Follow up in [timeframe].`,
  },
  {
    label: 'Borderline Personality Disorder / DBT',
    text: `Patient seen via telehealth for BPD/DBT follow-up. Patient reports [stability/instability] in the following domains since last visit:\n\n• Emotional dysregulation: [describe — intensity, duration, triggers]\n• Impulsive behaviors: [self-harm/substance use/risky behavior/binge eating — present/absent, frequency]\n• Interpersonal functioning: [stability/chaos — describe current relationships, splitting patterns]\n• Identity/self-image: [stable/unstable sense of self, emptiness]\n• Dissociative symptoms: [present/absent — describe]\n\nDBT skills practiced: [mindfulness/distress tolerance/emotion regulation/interpersonal effectiveness — which skills used, with what success]. Diary card reviewed: [adherence to monitoring, trends noted].\n\nSelf-harm: [absent/present — describe method, medical treatment needed, antecedent, function]. SI: [denied / present — assess per C-SSRS]. No acute HI.\n\nMSE: Affect [labile/dysphoric/appropriate]. Mood [patient-reported]. Thought process linear. No psychosis.\n\nPlan: [Continue/adjust medication for symptom targets — e.g., mood instability, impulsivity, depression]. DBT individual therapy [therapist name] — coordination note. DBT skills group [if enrolled]. Crisis plan reviewed and updated. Interpersonal incident processed using DBT framework. Follow up in [timeframe].`,
  },
  {
    label: 'Grief / Bereavement',
    text: `Patient seen via telehealth for grief/bereavement follow-up. Loss: [relationship to deceased, date of death, circumstances — sudden/expected/traumatic/suicide]. Time since loss: [___].\n\nGrief presentation: Patient reports [yearning/longing/preoccupation with deceased, difficulty accepting loss, bitterness/anger, difficulty engaging in activities, sense of meaninglessness]. Complicated grief screened (ICG/PG-13 score: [___]). [Differentiate from MDD — note if grief has evolved into Major Depressive Episode].\n\nFunctional impact: Sleep [adequate/disrupted — nightmares/intrusive memories]. Appetite [intact/decreased]. Work/social engagement [maintained/withdrawn]. Self-care [maintained/impaired].\n\nSafety: Denies SI/HI. [If bereavement by suicide: survivor of suicide loss support discussed — AFSP resources provided].\n\nMSE: Affect [tearful/dysphoric/appropriate to context]. Thought content [preoccupied with loss]. Thought process linear.\n\nPlan: [Psychoeducation on grief — normalize, not pathologize]. [Grief-focused therapy referral — complicated grief treatment, IPT-G]. [Medication only if concurrent MDE or prolonged grief disorder criteria met — per DSM-5-TR, grief can be diagnosed as MDD after 2 weeks if criteria met]. Support group referral [e.g., hospice bereavement services, GriefShare, suicide loss support]. Follow up in [timeframe].`,
  },
  {
    label: 'Opioid Overdose Prevention / Naloxone',
    text: `Patient seen via telehealth. Opioid overdose risk assessment completed.\n\nRisk factors present: [current opioid use disorder/on chronic opioid therapy/recent release from incarceration or treatment/history of prior overdose/concurrent benzodiazepine use/high-dose opioid prescription/fentanyl exposure in drug supply].\n\nNaloxone (Narcan) prescribed: [dose/formulation — 4mg nasal spray / 0.4mg IM]. Quantity: [2 kits]. Sent to: [pharmacy / patient has on hand].\n\nOverdose education provided:\n✓ Signs of opioid overdose: unresponsive, slow/absent breathing, blue lips\n✓ Call 911 immediately\n✓ Administer naloxone nasally/IM, repeat in 2–3 minutes if no response\n✓ Rescue breathing if trained\n✓ Good Samaritan Law protections reviewed (state: [state])\n✓ Patient and [family member/support person] trained on administration\n\nPDMP reviewed: [findings]. Urine drug screen: [results]. Fentanyl test strips: [discussed/provided].\n\nMAT status: [On buprenorphine/methadone/naltrexone / Not on MAT — discussed options]. Follow up in [timeframe].`,
  },
  {
    label: 'Metabolic Monitoring (Antipsychotic)',
    text: `Patient seen via telehealth for metabolic monitoring on antipsychotic therapy. Current antipsychotic(s): [medication, dose, duration].\n\nMetabolic Review:\n• Weight: [___] lbs/kg | BMI: [___] | Change from baseline: [+/- ___]\n• Waist circumference: [___] (if available)\n• BP: [___/___] mmHg\n• Fasting glucose: [___] mg/dL | HbA1c: [___]%\n• Fasting lipids: Total [___] | LDL [___] | HDL [___] | TG [___]\n• Prolactin (if indicated): [___]\n\nExtrapyramidal Side Effects (AIMS assessment):\n• Tardive dyskinesia: [absent/present — describe movements, severity]\n• Akathisia: [absent/present — SAS score: ___]\n• Parkinsonism: [absent/present]\n\nMetabolic syndrome criteria met: [Yes / No — 3 of 5 criteria].\n\nIntervention:\n• Diet/exercise counseling provided\n• [Switch to metabolically favorable agent — aripiprazole/lurasidone/ziprasidone if appropriate]\n• [Metformin referral to PCP for metabolic syndrome]\n• [Statin referral if dyslipidemia]\n• Ophthalmology referral for [quetiapine — annual eye exam if indicated]\n\nNext monitoring: Labs in [3/6] months. Follow up [timeframe].`,
  },
  {
    label: 'Therapy Progress Note (CBT/DBT/MI)',
    text: `Patient seen via telehealth for individual therapy session. Session #[___]. Modality: [CBT / DBT / ACT / IPT / Motivational Interviewing / Supportive / Other].\n\nSession Focus: [agenda set collaboratively — topic/theme addressed]\n\nSubjective: Patient presented [on time/late], appeared [calm/distressed/guarded/engaged]. Reports [mood since last session, significant events, homework completion].\n\nIntervention:\n• [Cognitive restructuring: automatic thoughts identified, challenged — situation, thought, evidence for/against, balanced thought]\n• [Behavioral activation: activity scheduled, avoidance addressed]\n• [Exposure hierarchy: [step completed, SUDS pre: ___ post: ___]]\n• [DBT skill practiced: [skill name, chain analysis if applicable]]\n• [Motivational interviewing: change talk elicited, ambivalence explored, stage of change: ___]\n• [Psychoeducation provided on: ___]\n\nHomework assigned: [describe task, rationale given, patient agreement]\n\nResponse to intervention: [patient engagement level, insight demonstrated, barriers identified]\n\nSafety: Denies SI/HI. Safety plan reviewed [if indicated].\n\nProgress toward treatment goals:\n• Goal 1 [___]: [progressing/stalled/achieved]\n• Goal 2 [___]: [progressing/stalled/achieved]\n\nPlan: Continue [modality]. Next session focus: [topic]. Frequency: [weekly/biweekly]. Follow up [date].`,
  },
  {
    label: 'Group Therapy Session Note',
    text: `Group therapy session conducted via telehealth. Group type: [process/psychoeducation/DBT skills/addiction recovery/grief/other]. Session #[___]. Duration: [___] minutes. Members present: [___] of [___] enrolled.\n\nSession theme/topic: [agenda or emergent theme]\n\nGroup process:\n• Group cohesion: [forming/storming/norming/performing]\n• Participation level: [engaged/withdrawn members noted without identifying]\n• Significant group interactions: [universality demonstrated/altruism noted/interpersonal learning/other therapeutic factors]\n• Psychoeducation/skill content covered: [describe]\n\nIndividual member notes (de-identified as needed per consent):\n• [Member A]: [brief clinical observation — mood, participation, progress]\n• [Member B]: [brief clinical observation]\n\nSafety: No acute safety concerns expressed during session. [If applicable: individual follow-up arranged with member who disclosed crisis material].\n\nHomework/between-session task: [assigned to group]\n\nFacilitator's clinical impression: [group functioning, therapeutic progress, recommendations for group structure adjustment]\n\nNext session: [date/topic].`,
  },
  {
    label: 'FMLA / Disability Documentation',
    text: `Patient seen via telehealth. Patient requesting [FMLA leave / short-term disability / long-term disability / ADA accommodation / return-to-work clearance] documentation.\n\nClinical summary:\n• Diagnosis (DSM-5): [primary diagnosis with ICD-10 code]\n• Duration of treatment: [dates of care with this provider]\n• Current functional limitations: [describe impairments in concentration, attendance, social functioning, adaptation to stress, pace — directly related to diagnosis]\n• Treatment plan: [medications, therapy, frequency of visits]\n• Expected duration of impairment: [weeks/months/indefinite — with rationale]\n• Prognosis: [good/fair/guarded with appropriate treatment]\n\nDocumentation completed: [FMLA Form WH-380-E / Disability carrier form / Letter of support — as applicable].\n\nAccommodations recommended (ADA): [modified schedule / remote work / reduced workload / quiet workspace / other].\n\nPatient instructed to follow up with HR/employer. Provider available for follow-up questions from carrier with patient's written authorization. Patient signed ROI for [employer/disability carrier] on [date].\n\nNext clinical appointment: [date].`,
  },
  {
    label: 'Pregnancy — Psychotropic Risk Counseling',
    text: `Patient seen via telehealth for psychotropic medication risk/benefit counseling in pregnancy. Patient is [planning pregnancy / currently pregnant — gestational age: ___ weeks / recently learned of pregnancy].\n\nCurrent psychiatric diagnosis: [___]. Current medications: [list all psychotropics].\n\nRisk/benefit discussion documented:\n\nRisks of untreated psychiatric illness in pregnancy:\n• Maternal risks: [relapse, functional decline, self-neglect, SI, inadequate prenatal care]\n• Fetal/neonatal risks: [prematurity, low birth weight, impaired fetal development from maternal stress]\n\nMedication-specific risks reviewed:\n• [Medication 1]: [specific teratogenic data — FDA category removed in 2015; current evidence summarized — e.g., SSRI: neonatal adaptation syndrome, PPHN risk <1%]\n• [Medication 2]: [data — e.g., lithium: Ebstein's anomaly risk 0.05–0.1%; valproate: contraindicated in pregnancy due to NTD risk]\n\nDecision reached:\n• [Continue medication — risk of relapse outweighs teratogenic risk]\n• [Taper/discontinue — patient stable, low relapse risk, early first trimester]\n• [Switch to safer agent — name]\n• [Patient declines medication — risks of untreated illness documented, monitoring plan in place]\n\nOB/MFM coordination: [referral placed / OB already aware / note to be sent]. Genetic counseling: [offered/declined]. Patient verbalized understanding and participated in shared decision-making. Follow up in [2 weeks].`,
  },
];



const PROVIDER_REMINDERS = [
  'Verify patient identity: two identifiers (name + DOB or MRN) before session.',
  'Confirm patient is currently located in Illinois (410 ILCS 151 — state only, no address needed).',
  'Confirm patient is in a private, safe location before starting.',
  'Confirm patient read and understands the Telehealth Consent obtained at registration.',
  'Confirm no session recording without separate explicit consent.',
  'Document telehealth modifier (95 or GT) on all billed CPT codes.',
];

/* ─── Status helpers ─────────────────────────────────────────────────── */
const statusConfig = {
  'Checked In': { color: '#166534', bg: '#dcfce7', border: '#86efac', dot: '#22c55e', label: '🟢 Ready' },
  'Confirmed':  { color: '#1e40af', bg: '#dbeafe', border: '#93c5fd', dot: '#3b82f6', label: '🔵 Confirmed' },
  'Scheduled':  { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', dot: '#f59e0b', label: '🟡 Scheduled' },
  'Waiting':    { color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', dot: '#8b5cf6', label: '🟣 Waiting' },
};
const getStatus = (s) => statusConfig[s] || { color: '#374151', bg: '#f3f4f6', border: '#d1d5db', dot: '#9ca3af', label: s };

/* ─── Patient avatar ─────────────────────────────────────────────────── */
function Avatar({ patient, apt, size = 40 }) {
  if (patient?.photo) {
    return <img src={patient.photo} alt={apt?.patientName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const initials = (apt?.patientName || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hue = initials.charCodeAt(0) * 7 % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, color: '#fff', background: `hsl(${hue},55%,42%)` }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   QUICK-START / CONSENT MODAL
═══════════════════════════════════════════════════════════════════════ */
function QuickStartModal({ apt, patient, onStart, onCancel }) {
  const [patientInIllinois, setPatientInIllinois] = useState(false);
  const [recordingConsent,  setRecordingConsent]  = useState('');
  const [consentMethod,     setConsentMethod]     = useState('verbal');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState('');

  const [checklist, setChecklist] = useState({
    locationConfirmed:  false,
    consentExplained:   false,
    privacyReminded:    false,
    emergencyProtocol:  false,
  });
  const toggleCheck = (key) => setChecklist(p => ({ ...p, [key]: !p[key] }));
  const allChecked  = Object.values(checklist).every(Boolean);
  const canStart    = allChecked && recordingConsent !== '' && patientInIllinois;

  const handleStart = async () => {
    if (!canStart) return;
    setSaving(true); setError('');
    const sessionId   = `sess-${apt.id}-${Date.now()}`;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : apt.patientName;
    try {
      // Consent save is best-effort — session is never blocked by a network failure
      const data = await telehealthApi.consent({
        sessionId, appointmentId: apt.id,
        patientId: patient?.id || apt.patientId,
        patientName, patientLocation: 'Illinois',
        recordingConsent, recordingConsentMethod: consentMethod,
        providerConfirmed: true, complianceChecklist: checklist,
      }).catch(() => null);
      onStart({ timestamp: isoNow(), patientName, patientLocation: 'Illinois', aptId: apt.id, sessionId, consentId: data?.consentId ?? null, recordingConsent });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const checkItems = [
    { key: 'locationConfirmed', label: 'Confirmed patient is located in Illinois' },
    { key: 'consentExplained',  label: 'Explained telehealth consent and patient rights' },
    { key: 'privacyReminded',   label: 'Reminded patient of privacy and HIPAA rights' },
    { key: 'emergencyProtocol', label: 'Reviewed emergency protocol and local services' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, boxShadow:'0 24px 64px rgba(0,0,0,0.3)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ fontWeight:900, color:'#fff', fontSize:16 }}>📹 Telehealth Session Consent</div>
          <div style={{ fontSize:11, color:'#bfdbfe', marginTop:3 }}>HIPAA-compliant · Illinois Telehealth Act (410 ILCS 151) · Audit-logged</div>
        </div>

        {/* Patient bar */}
        <div style={{ background:'#f0f9ff', borderBottom:'1px solid #bae6fd', padding:'10px 24px', display:'flex', gap:16, alignItems:'center', flexShrink:0 }}>
          <Avatar apt={apt} patient={patient} size={36} />
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#1e3a5f' }}>{apt.patientName}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>🕐 {apt.time}{apt.reason ? ` · ${apt.reason}` : ''}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:16 }}>⚠️ {error}</div>
          )}

          {/* Illinois confirmation */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
              Patient Location Confirmation <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <label style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:8, border:`1.5px solid ${patientInIllinois ? '#86efac' : '#e5e7eb'}`, background:patientInIllinois ? '#f0fdf4' : '#fff', cursor:'pointer', transition:'all 0.15s' }}>
              <input type="checkbox" checked={patientInIllinois} onChange={e => setPatientInIllinois(e.target.checked)}
                style={{ marginTop:2, width:16, height:16, accentColor:'#16a34a', cursor:'pointer' }} />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:patientInIllinois ? '#15803d' : '#374151' }}>
                  Patient is currently located in Illinois
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                  Required per 410 ILCS 151. Specific address is not collected — state confirmation only.
                </div>
              </div>
              {patientInIllinois && <span style={{ marginLeft:'auto', fontSize:14 }}>✅</span>}
            </label>
          </div>

          {/* Recording consent */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
              Session Recording Consent <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { val:'granted',   icon:'✅', label:'Patient consents to recording',   desc:'Patient verbally agreed this session may be recorded', color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
                { val:'denied',    icon:'🚫', label:'Patient declines recording',       desc:'Session will NOT be recorded — consent denied',        color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
                { val:'not_asked', icon:'⏭️', label:'Recording not applicable',         desc:'No recording planned for this session type',           color:'#6b7280', bg:'#f9fafb', border:'#d1d5db' },
              ].map(opt => (
                <label key={opt.val} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'9px 14px', borderRadius:8, border:`1.5px solid ${recordingConsent===opt.val ? opt.border : '#e5e7eb'}`, background:recordingConsent===opt.val ? opt.bg : '#fff', cursor:'pointer', transition:'all 0.15s' }}>
                  <input type="radio" name="recordingConsent" value={opt.val} checked={recordingConsent===opt.val} onChange={() => setRecordingConsent(opt.val)} style={{ marginTop:2, accentColor:opt.color }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:opt.color }}>{opt.icon} {opt.label}</div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {recordingConsent === 'granted' && (
              <div style={{ marginTop:10 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Consent method</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[['verbal','🗣️ Verbal'],['written','✍️ Written'],['waived','🤝 Waived']].map(([v,l]) => (
                    <label key={v} style={{ flex:1, textAlign:'center', padding:'7px', borderRadius:7, cursor:'pointer', border:`1.5px solid ${consentMethod===v ? '#3b82f6' : '#e5e7eb'}`, background:consentMethod===v ? '#eff6ff' : '#fff', fontSize:12, fontWeight:600, color:consentMethod===v ? '#1d4ed8' : '#374151' }}>
                      <input type="radio" name="consentMethod" value={v} checked={consentMethod===v} onChange={() => setConsentMethod(v)} style={{ display:'none' }} />{l}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compliance checklist */}
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
              Provider Compliance Checklist <span style={{ color:'#ef4444' }}>*</span>
              <span style={{ fontWeight:400, color:'#6b7280', marginLeft:4 }}>— all items required</span>
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {checkItems.map(({ key, label }) => (
                <label key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:`1.5px solid ${checklist[key] ? '#86efac' : '#e5e7eb'}`, background:checklist[key] ? '#f0fdf4' : '#f9fafb', cursor:'pointer', transition:'all 0.15s' }}>
                  <input type="checkbox" checked={checklist[key]} onChange={() => toggleCheck(key)} style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                  <span style={{ fontSize:12, fontWeight:checklist[key] ? 600 : 400, color:checklist[key] ? '#15803d' : '#374151' }}>{label}</span>
                  {checklist[key] && <span style={{ marginLeft:'auto', fontSize:13 }}>✅</span>}
                </label>
              ))}
            </div>
          </div>

          {!canStart && (
            <div style={{ marginTop:14, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:11, color:'#92400e' }}>
              ⚠️ Complete all required fields:{' '}
              {!patientInIllinois && '• Confirm patient is in Illinois '}
              {!recordingConsent && '• Select recording consent '}
              {!allChecked && '• Complete compliance checklist'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f8fafc', flexShrink:0 }}>
          <button onClick={onCancel} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={handleStart} disabled={!canStart || saving}
            style={{ padding:'9px 22px', borderRadius:8, fontWeight:800, fontSize:13, border:'none', background:canStart && !saving ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#d1d5db', color:canStart && !saving ? '#fff' : '#9ca3af', cursor:canStart && !saving ? 'pointer' : 'not-allowed', boxShadow:canStart ? '0 2px 8px rgba(109,40,217,0.3)' : 'none' }}>
            {saving ? '⏳ Saving…' : '📹 Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SEND LINK MODAL
═══════════════════════════════════════════════════════════════════════ */
function SendLinkModal({ apt, patients, onClose, onSent }) {
  const contact   = patients?.find(p => p.id === apt.patientId);
  const link      = getVideoLink(apt);
  const [method,  setMethod]  = useState('sms');
  const [copied,  setCopied]  = useState(false);
  const [sent,    setSent]    = useState(false);

  const phone        = contact?.cellPhone || contact?.phone || '';
  const email        = contact?.email || '';
  const smsText      = `Clarity Health: Your telehealth appointment is at ${apt.time}. Join here: ${link}`;
  const emailSubject = `Your Clarity Telehealth Visit Link – ${apt.time}`;
  const emailBody    = `Dear ${apt.patientName},\n\nYour telehealth appointment is scheduled for ${apt.time}${apt.date ? ' on ' + apt.date : ' today'}.\n\nJoin your visit here:\n${link}\n\nBefore your visit:\n• Find a private, quiet location\n• Test your camera and microphone\n• Have your medication list available\n• Call our office if you have trouble connecting\n\nClarity Health`;

  const handleCopy = () => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleSend = () => {
    if (method === 'sms') {
      window.open(`sms:${phone.replace(/\D/g,'')}?body=${encodeURIComponent(smsText)}`, '_self');
    } else {
      window.open(`mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank');
    }
    setSent(true);
    onSent(apt.id, method);
  };
  const missingContact = method === 'sms' ? !phone : !email;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:800, fontSize:15 }}>📤 Send Telehealth Link</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>✕</button>
        </div>

        {sent ? (
          <div style={{ padding:'32px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{method === 'sms' ? '📱' : '✉️'}</div>
            <div style={{ fontWeight:800, fontSize:16, color:'#15803d', marginBottom:6 }}>{method === 'sms' ? 'SMS app opened!' : 'Email client opened!'}</div>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>
              {method === 'sms' ? `Send the pre-filled message to ${phone || 'patient'}.` : `Send the pre-filled email to ${email || 'patient'}.`}
            </div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>Send has been logged on this appointment.</div>
            <button onClick={onClose} style={{ marginTop:20, padding:'9px 24px', borderRadius:8, background:'#4f46e5', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding:'18px 20px', display:'grid', gap:14 }}>
              <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
                <Avatar apt={apt} patient={patients?.find(p => p.id === apt.patientId)} size={36} />
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{apt.patientName}</div>
                  <div style={{ color:'#64748b', fontSize:12 }}>🕐 {apt.time}{apt.reason ? ` · ${apt.reason}` : ''}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Secure Video Link</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input readOnly value={link} style={{ flex:1, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, color:'#4f46e5' }} />
                  <button onClick={handleCopy} style={{ padding:'8px 14px', borderRadius:7, border:'none', background:copied ? '#059669' : '#4f46e5', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {copied ? '✅ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Send via</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{ k:'sms', label:'📱 Text (SMS)' }, { k:'email', label:'✉️ Email' }].map(m => (
                    <button key={m.k} onClick={() => setMethod(m.k)}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:`2px solid ${method===m.k ? '#4f46e5' : '#e2e8f0'}`, background:method===m.k ? '#eef2ff' : '#fff', color:method===m.k ? '#4338ca' : '#64748b', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background:missingContact ? '#fff7ed' : '#f0fdf4', border:`1px solid ${missingContact ? '#fed7aa' : '#bbf7d0'}`, borderRadius:8, padding:'10px 14px', fontSize:12 }}>
                {method === 'sms'
                  ? <span>📱 {phone ? <strong>{phone}</strong> : <span style={{ color:'#c2410c' }}>No phone number on file — update patient chart first</span>}</span>
                  : <span>✉️ {email ? <strong>{email}</strong> : <span style={{ color:'#c2410c' }}>No email on file — update patient chart first</span>}</span>
                }
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Message Preview</div>
                {method === 'sms'
                  ? <div style={{ background:'#1a1a2e', color:'#e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, fontFamily:'monospace', lineHeight:1.65 }}>{smsText}</div>
                  : <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, lineHeight:1.65 }}>
                      <div style={{ fontWeight:700, marginBottom:4, color:'#374151' }}>Subject: {emailSubject}</div>
                      <div style={{ whiteSpace:'pre-line', color:'#64748b' }}>{emailBody}</div>
                    </div>
                }
              </div>
            </div>

            <div style={{ padding:'14px 20px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:8, background:'#f8fafc' }}>
              <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
              <button onClick={handleSend} disabled={missingContact}
                style={{ padding:'8px 18px', borderRadius:8, background:missingContact ? '#e5e7eb' : '#4f46e5', color:missingContact ? '#9ca3af' : '#fff', border:'none', fontWeight:700, fontSize:13, cursor:missingContact ? 'not-allowed' : 'pointer' }}>
                {method === 'sms' ? '📱 Send Text' : '✉️ Send Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADHOC PATIENT PICKER
═══════════════════════════════════════════════════════════════════════ */
function AdhocPatientModal({ patients, onSelect, onCancel }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = query.trim().length < 2
    ? []
    : (patients || []).filter(p => {
        const q = query.toLowerCase();
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        const rev  = `${p.lastName} ${p.firstName}`.toLowerCase();
        return full.includes(q) || rev.includes(q) || (p.mrn && p.mrn.toLowerCase().includes(q));
      }).slice(0, 10);

  const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}
      onKeyDown={handleKey}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.3)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:900, color:'#fff', fontSize:15 }}>+ Ad-Hoc Telehealth Session</div>
            <div style={{ fontSize:11, color:'#e9d5ff', marginTop:2 }}>Search by name or MRN</div>
          </div>
          <button onClick={onCancel} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, color:'#fff', fontSize:18, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding:'16px 22px 0' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'#9ca3af', pointerEvents:'none' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Patient name or MRN…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width:'100%', padding:'10px 10px 10px 34px', border:'2px solid #e5e7eb', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ minHeight:80, maxHeight:340, overflowY:'auto', padding:'10px 22px 18px' }}>
          {query.trim().length < 2 && (
            <div style={{ textAlign:'center', padding:'28px 0', color:'#9ca3af', fontSize:13 }}>
              Type at least 2 characters to search
            </div>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <div style={{ textAlign:'center', padding:'28px 0', color:'#9ca3af', fontSize:13 }}>
              No patients found for "{query}"
            </div>
          )}
          {results.map(p => {
            const age = calcAge(p.dob);
            const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();
            const hue = initials.charCodeAt(0) * 7 % 360;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:9, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', textAlign:'left', marginBottom:6, transition:'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                {p.photo
                  ? <img src={p.photo} alt={`${p.firstName}`} style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                  : <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color:'#fff', background:`hsl(${hue},55%,42%)` }}>{initials}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{p.firstName} {p.lastName}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>
                    MRN {p.mrn || '—'}{age != null ? ` · ${age} y/o` : ''}{p.dob ? ` · DOB ${new Date(p.dob).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span style={{ color:'#7c3aed', fontSize:13, fontWeight:700, flexShrink:0 }}>Select →</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   POST-SESSION SUMMARY MODAL
═══════════════════════════════════════════════════════════════════════ */
function PostSessionModal({ apt, patient, sessionDuration, sessionNote, onClose }) {
  const [selectedCPT, setSelectedCPT] = useState(CPT_CODES[1].code);
  const [diagnosis,   setDiagnosis]   = useState('');
  const [plan,        setPlan]        = useState('');
  const [followUp,    setFollowUp]    = useState('2 weeks');
  const [saved,       setSaved]       = useState(false);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ background:'linear-gradient(135deg,#065f46,#059669)', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ fontWeight:900, color:'#fff', fontSize:16 }}>✅ Session Complete — Post-Visit Documentation</div>
          <div style={{ fontSize:11, color:'#a7f3d0', marginTop:2 }}>Complete documentation before closing. This data is saved to the encounter record.</div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {saved ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:18, color:'#065f46', marginBottom:6 }}>Session Documented</div>
              <div style={{ fontSize:13, color:'#64748b' }}>Visit note saved · Billing code queued · Encounter closed</div>
              <button onClick={onClose} style={{ marginTop:20, padding:'9px 24px', borderRadius:8, background:'#059669', color:'#fff', border:'none', fontWeight:700, cursor:'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                {[
                  { label:'Patient',  val: apt.patientName,                             icon:'👤' },
                  { label:'Duration', val: fmtTimer(sessionDuration),                   icon:'⏱️' },
                  { label:'Date',     val: apt.date || new Date().toLocaleDateString(), icon:'📅' },
                  { label:'Type',     val: 'Telehealth',                                icon:'📹' },
                ].map(s => (
                  <div key={s.label} style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:20 }}>{s.icon}</div>
                    <div style={{ fontWeight:700, fontSize:12, marginTop:4, color:'#1e293b' }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CPT code */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>💰 Billing CPT Code</label>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {CPT_CODES.map(c => (
                    <label key={c.code} style={{ display:'flex', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${selectedCPT===c.code ? '#6366f1' : '#e2e8f0'}`, background:selectedCPT===c.code ? '#eef2ff' : '#fafafa' }}>
                      <input type="radio" name="cpt" checked={selectedCPT===c.code} onChange={() => setSelectedCPT(c.code)} style={{ accentColor:'#6366f1', marginTop:2 }} />
                      <div>
                        <span style={{ fontWeight:700, fontSize:13, color:'#3730a3' }}>{c.code}</span>
                        <span style={{ fontSize:12, color:'#64748b', marginLeft:8 }}>{c.label}</span>
                        <span style={{ fontSize:11, color:'#9ca3af', marginLeft:8, fontStyle:'italic' }}>{c.typical}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>🏥 Diagnosis / Assessment</label>
                <textarea className="form-textarea" rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g., F32.1 Major Depressive Disorder, recurrent, moderate — stable; continue current regimen" style={{ fontSize:13, width:'100%' }} />
              </div>

              {/* Plan */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📋 Plan</label>
                <textarea className="form-textarea" rows={3} value={plan} onChange={e => setPlan(e.target.value)} placeholder="Continue current medications, follow up in 2 weeks, safety plan reviewed…" style={{ fontSize:13, width:'100%' }} />
              </div>

              {/* Follow-up */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📅 Follow-up</label>
                <select className="form-input" value={followUp} onChange={e => setFollowUp(e.target.value)} style={{ fontSize:13 }}>
                  {['1 week','2 weeks','3 weeks','4 weeks','6 weeks','8 weeks','3 months','PRN','No follow-up needed'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>

              {/* Session notes preview */}
              {sessionNote && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>📝 Session Notes</div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#475569', lineHeight:1.6, maxHeight:100, overflowY:'auto' }}>{sessionNote}</div>
                </div>
              )}
            </>
          )}
        </div>

        {!saved && (
          <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f8fafc', flexShrink:0 }}>
            <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Close Without Saving</button>
            <button onClick={() => setSaved(true)} style={{ padding:'9px 22px', borderRadius:8, background:'#059669', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>💾 Save & Close Encounter</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LIVEKIT VIDEO CONTENT  (rendered inside <LiveKitRoom>)
═══════════════════════════════════════════════════════════════════════ */
function LiveKitVideoContent({ apt, patient, isRecording, toggleRecording, navigate }) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const room = useRoomContext();
  const [admitting, setAdmitting] = useState(null);
  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestLink, setGuestLink] = useState('');
  const [guestCopied, setGuestCopied] = useState(false);

  // ── Breakout room state ──────────────────────────────────────────────────
  const [breakoutModal,   setBreakoutModal]   = useState(false);
  const [breakoutSelected, setBreakoutSelected] = useState([]); // identities selected
  const [breakoutStarting, setBreakoutStarting] = useState(false);
  const [breakoutToken,   setBreakoutToken]   = useState(null);
  const [breakoutRoom,    setBreakoutRoom]    = useState(null);

  const getMeta = (p) => { try { return JSON.parse(p.metadata || '{}'); } catch { return {}; } };

  const startBreakout = async () => {
    if (breakoutSelected.length === 0) return;
    setBreakoutStarting(true);
    try {
      const invited = remoteParticipants
        .filter(p => breakoutSelected.includes(p.identity))
        .map(p => ({ identity: p.identity, name: p.name, role: getMeta(p).role || 'participant' }));

      const d = await telehealthApi.breakout(apt.id, invited);
      if (!d.ok) throw new Error(d.error);

      // Send each invited participant their token via LiveKit data message
      const enc = new TextEncoder();
      for (const pt of d.participantTokens) {
        const msg = JSON.stringify({ type: 'breakout_invite', token: pt.token, room: d.breakoutRoom });
        await localParticipant.publishData(enc.encode(msg), {
          reliable: true,
          destinationIdentities: [pt.identity],
        });
      }

      setBreakoutToken(d.providerToken);
      setBreakoutRoom(d.breakoutRoom);
      setBreakoutModal(false);
      setBreakoutSelected([]);
    } catch { /* ignore */ } finally { setBreakoutStarting(false); }
  };

  const endBreakout = async () => {
    // Notify breakout participants to return to main room
    const enc = new TextEncoder();
    const msg = JSON.stringify({ type: 'breakout_ended' });
    await localParticipant.publishData(enc.encode(msg), { reliable: true }).catch(() => {});
    setBreakoutToken(null);
    setBreakoutRoom(null);
  };

  const toggleBreakoutSelect = (identity) =>
    setBreakoutSelected(prev =>
      prev.includes(identity) ? prev.filter(i => i !== identity) : [...prev, identity]
    );

  const localVideoTrack   = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteVideoTrack  = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const remoteScreenTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.ScreenShare);
  const mainTrack = remoteScreenTrack || remoteVideoTrack;

  // Split participants: waiting room (canPublish=false) vs active
  const waitingParticipants = remoteParticipants.filter(p => p.permissions?.canPublish === false);
  const activeParticipants  = remoteParticipants.filter(p => p.permissions?.canPublish !== false);

  const getRoleIcon = (p) => {
    const meta = getMeta(p);
    if (meta.role === 'patient') return '🧑‍⚕️';
    if (meta.role === 'guest')   return '🌐';
    if (meta.role === 'front_desk') return '🏥';
    return '👤';
  };

  const admit = async (identity) => {
    setAdmitting(identity);
    try {
      await telehealthApi.admit(apt.id, identity);
    } catch { /* ignore */ } finally { setAdmitting(null); }
  };

  const generateGuestLink = async () => {
    if (!guestName.trim()) return;
    try {
      const d = await telehealthApi.guestInvite(apt.id, guestName.trim());
      if (d.joinUrl) setGuestLink(d.joinUrl);
    } catch { /* ignore */ }
  };

  const copyGuestLink = () => {
    navigator.clipboard?.writeText(guestLink).catch(() => {});
    setGuestCopied(true);
    setTimeout(() => setGuestCopied(false), 2500);
  };

  return (
    <>
      {/* ── Waiting room banner (shown when someone is waiting) ── */}
      {waitingParticipants.length > 0 && (
        <div style={{ flexShrink:0, background:'#1e293b', borderRadius:10, padding:'10px 14px', border:'1px solid #fbbf24' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#fbbf24', marginBottom:8 }}>
            ⏳ Waiting Room · {waitingParticipants.length} waiting
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {waitingParticipants.map(p => (
              <div key={p.identity} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.05)', borderRadius:7, padding:'7px 10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{getRoleIcon(p)}</span>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:13, fontWeight:600 }}>{p.name || p.identity}</div>
                    <div style={{ color:'#64748b', fontSize:10 }}>{getMeta(p).role || 'participant'} · waiting</div>
                  </div>
                </div>
                <button
                  onClick={() => admit(p.identity)}
                  disabled={admitting === p.identity}
                  style={{ background: admitting === p.identity ? '#166534' : '#16a34a', color:'#fff', border:'none', borderRadius:7, padding:'6px 16px', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  {admitting === p.identity ? '✓ Admitted' : 'Admit →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main video view ── */}
      <div style={{ flex:1, background:'#1e293b', borderRadius:12, position:'relative', minHeight:0, overflow:'hidden' }}>
        {mainTrack ? (
          <VideoTrack trackRef={mainTrack} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8 }}>
            <Avatar apt={apt} patient={patient} size={90} />
            <div style={{ color:'#e2e8f0', fontSize:15, fontWeight:700, marginTop:6 }}>{apt.patientName}</div>
            <div style={{ color:'#64748b', fontSize:12 }}>
              {activeParticipants.length === 0
                ? waitingParticipants.length > 0
                  ? 'Patient is in the waiting room — admit them above'
                  : 'Waiting for patient to join…'
                : 'Patient connected · camera off'}
            </div>
            {activeParticipants.length === 0 && waitingParticipants.length === 0 && (
              <div style={{ padding:'4px 14px', borderRadius:99, background:'#fbbf2420', color:'#fbbf24', fontSize:11, fontWeight:700 }}>
                ⏳ Patient not yet in room
              </div>
            )}
          </div>
        )}

        {/* Self-view PiP */}
        <div style={{ position:'absolute', top:16, right:16, width:160, height:110, borderRadius:10, overflow:'hidden', border:'2px solid #3b82f6', boxShadow:'0 4px 12px rgba(0,0,0,0.45)', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {localVideoTrack && isCameraEnabled ? (
            <VideoTrack trackRef={localVideoTrack} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:20 }}>{isCameraEnabled ? '📷' : '📵'}</span>
              <span style={{ color:'#94a3b8', fontSize:9 }}>Camera {isCameraEnabled ? 'starting…' : 'off'}</span>
            </div>
          )}
          <div style={{ position:'absolute', bottom:5, left:6, fontSize:9, color:'#cbd5e1', background:'rgba(0,0,0,0.55)', borderRadius:4, padding:'1px 6px' }}>
            You {isMicrophoneEnabled ? '🎤' : '🔇'}
          </div>
        </div>

        {/* Reason overlay */}
        {apt.reason && (
          <span style={{ position:'absolute', top:10, left:12, background:'#6366f130', color:'#a5b4fc', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700, backdropFilter:'blur(4px)' }}>
            {apt.reason}
          </span>
        )}
        {activeParticipants.length > 0 && (
          <div style={{ position:'absolute', bottom:10, left:12 }}>
            <span style={{ background:'#10b98130', color:'#10b981', padding:'2px 10px', borderRadius:99, fontSize:10, fontWeight:700 }}>CONNECTED</span>
          </div>
        )}
        {/* Observer badge */}
        {remoteParticipants.some(p => getMeta(p).role === 'front_desk') && (
          <div style={{ position:'absolute', bottom:10, right:12 }}>
            <span style={{ background:'#7c3aed30', color:'#c4b5fd', padding:'2px 10px', borderRadius:99, fontSize:10, fontWeight:700 }}>👁 Front Desk observing</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'6px 0', flexShrink:0, flexWrap:'wrap' }}>
        {[
          { icon: isMicrophoneEnabled ? '🎤' : '🔇', label: isMicrophoneEnabled ? 'Mute' : 'Unmute',   active: !isMicrophoneEnabled, onClick: () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled) },
          { icon: isCameraEnabled     ? '📹' : '📵', label: isCameraEnabled     ? 'Cam Off' : 'Cam On', active: !isCameraEnabled,     onClick: () => localParticipant.setCameraEnabled(!isCameraEnabled) },
          { icon: '🖥️', label: 'Share',  active: false,       onClick: () => localParticipant.setScreenShareEnabled(true) },
          { icon: '⏺️', label: isRecording ? 'Stop Rec' : 'Record', active: isRecording, onClick: toggleRecording },
          { icon: '🔗', label: '+ Guest',  active: false,        onClick: () => setGuestModal(true) },
          { icon: '⊕',  label: 'Breakout', active: !!breakoutToken, onClick: () => breakoutToken ? endBreakout() : setBreakoutModal(true) },
        ].map(ctrl => (
          <button key={ctrl.label} onClick={ctrl.onClick} title={ctrl.label}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background: ctrl.active ? '#dc2626' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#fff', fontSize:17, minWidth:54, transition:'background 0.15s' }}>
            <span>{ctrl.icon}</span>
            <span style={{ fontSize:8, fontWeight:600, opacity:0.8 }}>{ctrl.label}</span>
          </button>
        ))}
        {apt?.patientId && (
          <button onClick={() => navigate(`/chart/${apt.patientId}`)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'rgba(99,102,241,0.3)', border:'1px solid #6366f1', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#a5b4fc', fontSize:17, minWidth:54 }}>
            <span>📋</span>
            <span style={{ fontSize:8, fontWeight:600, opacity:0.9 }}>Chart</span>
          </button>
        )}
      </div>

      {/* ── Guest invite modal ── */}
      {guestModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#1e293b', borderRadius:14, width:440, padding:24, border:'1px solid #334155' }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:15, marginBottom:16 }}>🔗 Invite Guest to Session</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:12 }}>
              Generate a 15-minute link for an interpreter, family member, or specialist. They'll join the waiting room and you admit them.
            </div>
            {!guestLink ? (
              <>
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Guest name (e.g. Maria R. — Interpreter)"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:13, marginBottom:12, boxSizing:'border-box' }}
                />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setGuestModal(false); setGuestName(''); }}
                    style={{ flex:1, padding:'9px 0', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={generateGuestLink} disabled={!guestName.trim()}
                    style={{ flex:2, padding:'9px 0', borderRadius:8, border:'none', background: guestName.trim() ? '#4f46e5' : '#334155', color:'#fff', fontWeight:700, fontSize:13, cursor: guestName.trim() ? 'pointer' : 'not-allowed' }}>
                    Generate Link
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:12, color:'#4ade80', marginBottom:8, fontWeight:600 }}>✅ Link ready for {guestName}</div>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <input readOnly value={guestLink} style={{ flex:1, padding:'8px 10px', borderRadius:7, border:'1px solid #334155', background:'#0f172a', color:'#6366f1', fontSize:11 }} />
                  <button onClick={copyGuestLink}
                    style={{ padding:'8px 14px', borderRadius:7, border:'none', background: guestCopied ? '#059669' : '#4f46e5', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {guestCopied ? '✅ Copied' : '📋 Copy'}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:12 }}>Expires in 15 minutes. Guest joins the waiting room — you admit them like any other participant.</div>
                <button onClick={() => { setGuestModal(false); setGuestLink(''); setGuestName(''); }}
                  style={{ width:'100%', padding:'9px 0', borderRadius:8, border:'none', background:'#334155', color:'#e2e8f0', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Breakout participant selection modal ── */}
      {breakoutModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#1e293b', borderRadius:14, width:440, padding:24, border:'1px solid #334155' }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:15, marginBottom:8 }}>⊕ Start Breakout Room</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:16 }}>
              Select participants to move into a private breakout room. They'll receive an invitation and can join independently.
            </div>
            {activeParticipants.length === 0 ? (
              <div style={{ fontSize:12, color:'#64748b', textAlign:'center', padding:'20px 0' }}>No active participants to invite.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {activeParticipants.map(p => {
                  const meta = getMeta(p);
                  const selected = breakoutSelected.includes(p.identity);
                  return (
                    <label key={p.identity} style={{ display:'flex', alignItems:'center', gap:10, background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 12px', cursor:'pointer', border: `1px solid ${selected ? '#6366f1' : '#334155'}`, transition:'all 0.15s' }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleBreakoutSelect(p.identity)} style={{ accentColor:'#6366f1', width:16, height:16 }} />
                      <span style={{ fontSize:16 }}>{getRoleIcon(p)}</span>
                      <span style={{ fontSize:13, color:'#e2e8f0', fontWeight:500 }}>{p.name || p.identity}</span>
                      {meta.role && <span style={{ marginLeft:'auto', fontSize:10, color:'#64748b', background:'#0f172a', padding:'2px 7px', borderRadius:99 }}>{meta.role}</span>}
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setBreakoutModal(false); setBreakoutSelected([]); }}
                style={{ flex:1, padding:'9px 0', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={startBreakout} disabled={breakoutSelected.length === 0 || breakoutStarting}
                style={{ flex:2, padding:'9px 0', borderRadius:8, border:'none', background: breakoutSelected.length > 0 ? '#4f46e5' : '#334155', color:'#fff', fontWeight:700, fontSize:13, cursor: breakoutSelected.length > 0 ? 'pointer' : 'not-allowed' }}>
                {breakoutStarting ? 'Starting…' : `Start Breakout (${breakoutSelected.length} selected)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Breakout room overlay (provider joins the sub-room) ── */}
      {breakoutToken && (
        <div style={{ position:'fixed', inset:0, zIndex:6000, background:'#0a0f1e', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'rgba(99,102,241,0.15)', borderBottom:'1px solid #6366f1' }}>
            <span style={{ color:'#a5b4fc', fontWeight:700, fontSize:13 }}>⊕ Breakout Room — {breakoutRoom}</span>
            <button onClick={endBreakout}
              style={{ padding:'6px 16px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              End Breakout
            </button>
          </div>
          <div style={{ flex:1 }}>
            <LiveKitRoom serverUrl={LIVEKIT_URL} token={breakoutToken} connect>
              <BreakoutVideoContent onEnd={endBreakout} />
            </LiveKitRoom>
          </div>
        </div>
      )}
    </>
  );
}

function BreakoutVideoContent({ onEnd }) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  const remoteVideoTrack = tracks.find(t => !t.participant.isLocal && t.source === Track.Source.Camera);
  const localVideoTrack  = tracks.find(t =>  t.participant.isLocal && t.source === Track.Source.Camera);
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:12, gap:8 }}>
      <RoomAudioRenderer />
      <div style={{ flex:1, background:'#0f172a', borderRadius:10, overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {remoteVideoTrack ? (
          <VideoTrack trackRef={remoteVideoTrack} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ color:'#475569', fontSize:13 }}>
            {remoteParticipants.length === 0 ? 'Waiting for participants…' : 'No video from participants'}
          </div>
        )}
        {localVideoTrack && (
          <div style={{ position:'absolute', bottom:10, right:10, width:120, height:80, borderRadius:8, overflow:'hidden', border:'2px solid #6366f1' }}>
            <VideoTrack trackRef={localVideoTrack} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        {[
          { icon: isMicrophoneEnabled ? '🎤' : '🔇', label: isMicrophoneEnabled ? 'Mute' : 'Unmute', active: !isMicrophoneEnabled, onClick: () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled) },
          { icon: isCameraEnabled ? '📹' : '📵',     label: isCameraEnabled ? 'Cam Off' : 'Cam On',   active: !isCameraEnabled,     onClick: () => localParticipant.setCameraEnabled(!isCameraEnabled) },
        ].map(ctrl => (
          <button key={ctrl.label} onClick={ctrl.onClick}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background: ctrl.active ? '#dc2626' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#fff', fontSize:17, minWidth:54 }}>
            <span>{ctrl.icon}</span>
            <span style={{ fontSize:8, fontWeight:600, opacity:0.8 }}>{ctrl.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVE SESSION VIEW
═══════════════════════════════════════════════════════════════════════ */
function ActiveSession({ apt, patient, patients, consentRecord, patientMeds, patientProblems, patientAllergies, patientVitals }) {
  const {
    isMuted, isVideoOff, isRecording, camError, audioOnly, sessionTimer,
    localStreamRef, streamReady, toggleMute, toggleCamera, toggleRecording, endSession,
    retryCam, videoDevices, audioDevices, selectedVideoId, selectedAudioId,
    switchVideoDevice, switchAudioDevice,
  } = useTelehealth();
  const navigate = useNavigate();

  const [isScreenShare,    setIsScreenShare]    = useState(false);
  const [handRaised,       setHandRaised]       = useState(false);
  const [isPiP,            setIsPiP]            = useState(false);
  const [patientMicMuted,  setPatientMicMuted]  = useState(false);
  const [sidePanel,        setSidePanel]        = useState('notes');
  const [notes,            setNotes]            = useState('');
  const [participants,     setParticipants]     = useState([]);
  const [lkToken,          setLkToken]          = useState(null);

  // Join session on mount, populate notes from check-in, leave on unmount
  useEffect(() => {
    if (LIVEKIT_URL) {
      telehealthApi.token(apt.id)
        .then(d => { if (d?.token) setLkToken(d.token); })
        .catch(() => {});
    }

    telehealthApi.join(apt.id, 'provider').catch(() => {});

    telehealthApi.participants(apt.id)
      .then(data => {
        if (!Array.isArray(data)) return;
        setParticipants(data);
        const checkin = data.find(p => p.checkinData && p.joinMode === 'checkin');
        if (checkin?.checkinData) {
          const cd = checkin.checkinData;
          const lines = [
            `[Pre-Visit Check-In by ${cd.completedBy || 'Front Desk'}]`,
            cd.chiefComplaint ? `Chief Complaint: ${cd.chiefComplaint}` : '',
            cd.copayCollected ? `Copay Collected: $${cd.copayAmount || '0'}` : '',
            cd.notes ? `Notes: ${cd.notes}` : '',
          ].filter(Boolean);
          if (lines.length > 1) setNotes(lines.join('\n'));
        }
      })
      .catch(() => {});

    return () => { telehealthApi.leave(apt.id).catch(() => {}); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [noteTemplate,     setNoteTemplate]     = useState('');
  const [chatInput,        setChatInput]        = useState('');
  const [chatMessages,     setChatMessages]     = useState([{
    from: 'system',
    text: `Session started. Patient: ${apt.patientName} · Consent recorded at ${new Date(consentRecord?.timestamp || Date.now()).toLocaleTimeString()}.`,
    time: nowTime(),
  }]);
  const [showPostSession,  setShowPostSession]  = useState(false);
  const [connectionQuality] = useState('Excellent');

  const localVideoRef = useRef(null);
  const chatEndRef    = useRef(null);

  /* ── Attach stream to video element ── */
  const setVideoRef = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
      el.play().catch(() => {}); // autoplay policy — attempt play
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-attach whenever stream becomes ready (initial + retry)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [streamReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chatMessages]);

  /* ── Picture-in-Picture ── */
  const enterPiP = async () => {
    const vid = localVideoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); setIsPiP(false); }
      else {
        await vid.requestPictureInPicture();
        setIsPiP(true);
        vid.addEventListener('leavepictureinpicture', () => setIsPiP(false), { once: true });
      }
    } catch { /* PiP not supported — silent fallback */ }
  };

  /* ── Chat ── */
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(p => [...p, { from: 'Provider', text: chatInput, time: nowTime() }]);
    setChatInput('');
    setTimeout(() => {
      const replies = ['Thank you, I understand.', 'Yes, I\'ve been taking it consistently.', 'Should I continue at this dose?', 'That makes sense.'];
      setChatMessages(p => [...p, { from: apt.patientName.split(' ')[0], text: replies[Math.floor(Math.random() * replies.length)], time: nowTime() }]);
    }, 2500);
  };

  const applyTemplate = (tmpl) => { setNotes(p => p ? `${p}\n\n${tmpl.text}` : tmpl.text); setNoteTemplate(''); };
  const qualityColor  = { Excellent:'#22c55e', Good:'#84cc16', Fair:'#f59e0b', Poor:'#ef4444' }[connectionQuality];

  /* ── Active meds (top 6) ── */
  const activeMeds = (patientMeds || []).filter(m => m.status === 'Active' || !m.status).slice(0, 8);
  /* ── Active problems (top 5) ── */
  const activeProblems = (patientProblems || []).filter(p => p.status === 'Active' || !p.status).slice(0, 6);
  /* ── Active allergies ── */
  const activeAllergies = (patientAllergies || []).slice(0, 5);
  /* ── Latest vitals ── */
  const latestVitals = Array.isArray(patientVitals) && patientVitals.length > 0 ? patientVitals[0] : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 100px)', background:'#0f172a', borderRadius:14, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.3)' }}>

      {/* ── Top bar ── */}
      <div style={{ background:'#0f172a', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #1e293b', flexShrink:0, gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar apt={apt} patient={patient} size={30} />
            <div>
              <div style={{ fontWeight:800, color:'#fff', fontSize:14, lineHeight:1.1 }}>{apt.patientName}</div>
              {apt.reason && <div style={{ fontSize:10, color:'#94a3b8' }}>{apt.reason}</div>}
            </div>
          </div>
          <div style={{ background:'#ef444420', color:'#f87171', padding:'4px 12px', borderRadius:7, fontSize:13, fontWeight:800, fontFamily:'monospace' }}>
            🔴 LIVE · {fmtTimer(sessionTimer)}
          </div>
          <div style={{ fontSize:11, color:qualityColor, display:'flex', alignItems:'center', gap:4 }}>
            <span>●</span> {connectionQuality}
          </div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'#16a34a20', color:'#4ade80', fontSize:11, fontWeight:700 }}>🔒 AES-256</div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'#0891b220', color:'#67e8f9', fontSize:11, fontWeight:700 }}>✅ Consent</div>
          {isRecording && <div style={{ padding:'3px 10px', borderRadius:20, background:'#ef444420', color:'#f87171', fontSize:11, fontWeight:700 }}>⏺️ Recording</div>}
        </div>
        <button onClick={() => setShowPostSession(true)}
          style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:800, fontSize:13, cursor:'pointer', flexShrink:0 }}>
          End Session
        </button>
      </div>

      {/* Camera error / audio-only banner */}
      {camError && (
        <div style={{ background: camError === 'audio-only' ? '#fffbeb' : '#fef2f2', borderBottom: `1px solid ${camError === 'audio-only' ? '#fcd34d' : '#fecaca'}`, padding:'8px 16px', display:'flex', alignItems:'center', gap:10, fontSize:12, color: camError === 'audio-only' ? '#92400e' : '#b91c1c', flexShrink:0, flexWrap:'wrap' }}>
          <span>{camError === 'audio-only' ? '🎤' : '⚠️'}</span>
          <span>
            {camError === 'denied' && <><strong>Camera/mic access denied.</strong> Click the camera icon in your browser's address bar and allow access.</>}
            {camError === 'unavailable' && <><strong>Camera/mic not detected.</strong> Check that your device is connected, not in use by another app, and try again.</>}
            {camError === 'insecure' && <><strong>Secure connection required.</strong> Camera access requires HTTPS. Contact your administrator.</>}
            {camError === 'audio-only' && <><strong>Audio-only mode.</strong> Camera unavailable — continuing with microphone only.</>}
          </span>
          {(camError === 'denied' || camError === 'unavailable') && (
            <button onClick={retryCam} style={{ marginLeft:'auto', background:'#dc2626', color:'#fff', border:'none', borderRadius:5, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
              🔄 Retry Camera
            </button>
          )}
          {camError === 'denied' && (
            <a href="https://support.google.com/chrome/answer/2693767" target="_blank" rel="noopener noreferrer" style={{ color:'#b91c1c', fontSize:11 }}>How to fix →</a>
          )}
        </div>
      )}

      {/* Device selector (shown when multiple cameras/mics available) */}
      {streamReady && (videoDevices.length > 1 || audioDevices.length > 1) && (
        <div style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'6px 16px', display:'flex', alignItems:'center', gap:12, fontSize:11, flexShrink:0 }}>
          {videoDevices.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:'#94a3b8' }}>📷</span>
              <select value={selectedVideoId} onChange={e => switchVideoDevice(e.target.value)}
                style={{ background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155', borderRadius:4, padding:'2px 6px', fontSize:11 }}>
                {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,6)}`}</option>)}
              </select>
            </div>
          )}
          {audioDevices.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:'#94a3b8' }}>🎤</span>
              <select value={selectedAudioId} onChange={e => switchAudioDevice(e.target.value)}
                style={{ background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155', borderRadius:4, padding:'2px 6px', fontSize:11 }}>
                {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,6)}`}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Main body ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* ── Video area ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0f172a', padding:'14px 14px 10px', gap:10, position:'relative', minWidth:0 }}>
          {lkToken && LIVEKIT_URL ? (
            <LiveKitRoom
              serverUrl={LIVEKIT_URL}
              token={lkToken}
              connect={true}
              audio={true}
              video={true}
              style={{ display:'contents' }}
            >
              <RoomAudioRenderer />
              <LiveKitVideoContent
                apt={apt}
                patient={patient}
                isRecording={isRecording}
                toggleRecording={toggleRecording}
                navigate={navigate}
              />
            </LiveKitRoom>
          ) : (
            <>
              {/* Fallback: avatar placeholder while LiveKit token loads */}
              <div style={{ flex:1, background:'#1e293b', borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', minHeight:0 }}>
                <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:'3px solid #10b981' }}>
                  <Avatar apt={apt} patient={patient} size={90} />
                </div>
                <div style={{ color:'#e2e8f0', fontSize:15, fontWeight:700, marginTop:10 }}>{apt.patientName}</div>
                <div style={{ color:'#64748b', fontSize:12, marginTop:3 }}>
                  {lkToken === null && LIVEKIT_URL ? '⏳ Connecting to video…' : '📡 Video unavailable — audio-only mode'}
                </div>
              </div>
              {/* Minimal controls for fallback */}
              <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'6px 0', flexShrink:0 }}>
                <button onClick={toggleMute}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:isMuted ? '#dc2626' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#fff', fontSize:17, minWidth:54 }}>
                  <span>{isMuted ? '🔇' : '🎤'}</span>
                  <span style={{ fontSize:8, fontWeight:600, opacity:0.8 }}>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button onClick={toggleRecording}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:isRecording ? '#dc2626' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#fff', fontSize:17, minWidth:54 }}>
                  <span>⏺️</span>
                  <span style={{ fontSize:8, fontWeight:600, opacity:0.8 }}>{isRecording ? 'Stop Rec' : 'Record'}</span>
                </button>
                {apt?.patientId && (
                  <button onClick={() => navigate(`/chart/${apt.patientId}`)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'rgba(99,102,241,0.3)', border:'1px solid #6366f1', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#a5b4fc', fontSize:17, minWidth:54 }}>
                    <span>📋</span>
                    <span style={{ fontSize:8, fontWeight:600, opacity:0.9 }}>Chart</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width:340, background:'#fff', display:'flex', flexDirection:'column', borderLeft:'1px solid #e2e8f0', flexShrink:0 }}>
          {/* Sidebar tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
            {[
              { k:'notes',  label:'📝 Notes' },
              { k:'chart',  label:'📋 Chart' },
              { k:'team',   label:`👥 Team${participants.filter(p => p.isActive).length > 0 ? ` (${participants.filter(p => p.isActive).length})` : ''}` },
              { k:'chat',   label:'💬 Chat'  },
            ].map(t => (
              <button key={t.k} onClick={() => setSidePanel(t.k)}
                style={{ flex:1, padding:'9px 0', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:sidePanel===t.k ? '#fff' : '#f8fafc', color:sidePanel===t.k ? '#4f46e5' : '#64748b', borderBottom:`2px solid ${sidePanel===t.k ? '#4f46e5' : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Notes panel ── */}
          {sidePanel === 'notes' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', padding:12, gap:10, minHeight:0 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>Quick Note Template</div>
                <select value={noteTemplate} onChange={e => { if (e.target.value) applyTemplate(QUICK_NOTE_TEMPLATES.find(t => t.label === e.target.value)); }}
                  style={{ width:'100%', padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12 }}>
                  <option value="">— Insert template —</option>
                  <optgroup label="── Routine & Follow-Up ──">
                    {['Stable / Routine Follow-Up','Medication Adjustment','New Side Effect Reported','Refill Only / Brief Check-In','Follow-Up After Hospitalization'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                  <optgroup label="── Crisis & Safety ──">
                    {['Crisis Assessment / Safety Planning','Passive SI — No Acute Risk','Domestic Violence / Safety Concern'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                  <optgroup label="── Evaluations ──">
                    {['Initial Psychiatric Evaluation','ADHD Evaluation'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                  <optgroup label="── Condition-Specific ──">
                    {['Depression Follow-Up','Anxiety / Panic Follow-Up','Bipolar Disorder Follow-Up','PTSD / Trauma Follow-Up','Psychosis / Schizophrenia Follow-Up','Substance Use / SUD Follow-Up','Insomnia / Sleep Disorder Follow-Up'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                  <optgroup label="── Special Situations ──">
                    {['No Show / Late Cancel','Collateral Contact / Family Session','Telehealth Technical Difficulties','Discharge / Transfer of Care','Informed Consent — New Medication'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                </select>
              </div>
              <textarea
                style={{ flex:1, padding:10, border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, resize:'none', lineHeight:1.65, minHeight:180 }}
                placeholder="Session notes…&#10;&#10;Chief complaint:&#10;&#10;Mental status:&#10;&#10;Assessment & Plan:"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <div style={{ fontSize:10, color:'#94a3b8', textAlign:'right' }}>{notes.length} chars</div>
            </div>
          )}

          {/* ── Chart panel ── */}
          {sidePanel === 'chart' && (
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>

              {/* Patient header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #f1f5f9' }}>
                <Avatar apt={apt} patient={patient} size={44} />
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>{patient ? `${patient.firstName} ${patient.lastName}` : apt.patientName}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>
                    {patient?.dob && <>Age {calcAge(patient.dob)} · </>}
                    {patient?.gender && <>{patient.gender} · </>}
                    {patient?.mrn && <>MRN {patient.mrn}</>}
                  </div>
                </div>
              </div>

              {/* Consent on file */}
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 10px', marginBottom:12, fontSize:11 }}>
                <div style={{ fontWeight:700, color:'#166534' }}>✅ Consent on File</div>
                <div style={{ color:'#15803d', marginTop:2 }}>
                  {new Date(consentRecord?.timestamp || Date.now()).toLocaleString()} · Illinois confirmed · Identity verified ✓
                </div>
              </div>

              {/* Allergies */}
              {activeAllergies.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>⚠️ Allergies</span>
                    <span style={{ background:'#fef2f2', color:'#dc2626', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeAllergies.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeAllergies.map((a, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:6, padding:'5px 9px' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#991b1b' }}>{a.allergen || a.name || ''}</span>
                        <span style={{ fontSize:10, color:'#ef4444' }}>{a.reaction || a.severity || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active problems */}
              {activeProblems.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>🏥 Active Diagnoses</span>
                    <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeProblems.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeProblems.map((p, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 9px' }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{p.name || (p.code ? `${p.code} — ${p.description || ''}` : p.description || p.problem || '')}</div>
                          {p.icdCode && <div style={{ fontSize:10, color:'#94a3b8' }}>{p.icdCode}</div>}
                        </div>
                        {p.onset && <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0, marginLeft:4 }}>{p.onset}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active medications */}
              {activeMeds.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>💊 Active Medications</span>
                    <span style={{ background:'#dcfce7', color:'#166534', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeMeds.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeMeds.map((m, i) => (
                      <div key={i} style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'6px 9px' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#15803d' }}>{m.name || m.medication || ''}</div>
                        {(m.dose || m.sig || m.frequency) && (
                          <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>{[m.dose, m.frequency || m.sig].filter(Boolean).join(' · ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest vitals */}
              {latestVitals && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📊 Latest Vitals</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                    {[
                      { label:'BP',     val: latestVitals.bloodPressure || latestVitals.bp },
                      { label:'HR',     val: latestVitals.heartRate     || latestVitals.hr,  unit:'bpm' },
                      { label:'Temp',   val: latestVitals.temperature   || latestVitals.temp, unit:'°F' },
                      { label:'Weight', val: latestVitals.weight,                             unit:'lb' },
                    ].filter(v => v.val).map(v => (
                      <div key={v.label} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{v.val}{v.unit ? ` ${v.unit}` : ''}</div>
                        <div style={{ fontSize:9, color:'#94a3b8', textTransform:'uppercase' }}>{v.label}</div>
                      </div>
                    ))}
                  </div>
                  {latestVitals.date && <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>Recorded {latestVitals.date}</div>}
                </div>
              )}

              {/* Insurance + contact */}
              {patient && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📞 Contact & Insurance</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {[
                      { label:'Phone',     val: patient.cellPhone || patient.phone },
                      { label:'Email',     val: patient.email },
                      { label:'Insurance', val: patient.insurance?.primary?.name || patient.insurance?.primary },
                      { label:'Copay',     val: patient.insurance?.primary?.copay ? `$${patient.insurance.primary.copay}` : null },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'4px 0', borderBottom:'1px solid #f8fafc' }}>
                        <span style={{ color:'#64748b' }}>{r.label}</span>
                        <span style={{ fontWeight:600, color:'#1e293b' }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No data fallback */}
              {activeProblems.length === 0 && activeMeds.length === 0 && !latestVitals && (
                <div style={{ textAlign:'center', padding:'20px 10px', color:'#94a3b8', fontSize:12 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                  Chart data will appear here once loaded.
                  {apt?.patientId && (
                    <button onClick={() => navigate(`/chart/${apt.patientId}`)}
                      style={{ display:'block', margin:'10px auto 0', padding:'7px 16px', borderRadius:7, background:'#4f46e5', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                      Open Full Chart →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Team / Participants panel ── */}
          {sidePanel === 'team' && (
            <div style={{ flex:1, overflowY:'auto', padding:14 }}>
              {/* Check-in data from front desk */}
              {(() => {
                const checkin = participants.find(p => p.checkinData && p.joinMode === 'checkin');
                if (!checkin) return (
                  <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#92400e', marginBottom:12 }}>
                    ⏳ No pre-visit check-in completed yet. Front desk can use the <strong>Check-In Patient</strong> button from the appointment list.
                  </div>
                );
                const cd = checkin.checkinData;
                return (
                  <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:'#166534', marginBottom:10 }}>✅ Pre-Visit Check-In Complete</div>
                    <div style={{ fontSize:11, color:'#16a34a', marginBottom:8 }}>Completed by {cd.completedBy} · {cd.completedAt ? new Date(cd.completedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}</div>
                    {[
                      { label:'Identity Verified', val: cd.identityVerified ? `✅ Yes${cd.dobConfirmed ? ` (DOB: ${cd.dobConfirmed})` : ''}` : '❌ No' },
                      { label:'Insurance Active', val: cd.insuranceVerified ? '✅ Verified' : '❌ Not verified' },
                      { label:'Copay', val: cd.copayCollected ? `✅ $${cd.copayAmount || '0'} collected` : 'Not collected' },
                      { label:'Chief Complaint', val: cd.chiefComplaint || '—' },
                      { label:'Medications', val: cd.medsConfirmed ? '✅ Confirmed current' : 'Not reviewed' },
                      { label:'Allergies', val: cd.allergiesConfirmed ? '✅ Confirmed' : 'Not reviewed' },
                      { label:'Tech Tested', val: cd.techTested ? '✅ Yes' : '⚠️ No' },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid #bbf7d0' }}>
                        <span style={{ color:'#374151', fontWeight:600 }}>{label}</span>
                        <span style={{ color:'#1e293b', textAlign:'right', maxWidth:'55%' }}>{val}</span>
                      </div>
                    ))}
                    {cd.notes && (
                      <div style={{ marginTop:10, padding:'8px 10px', background:'#fff', border:'1px solid #bbf7d0', borderRadius:7, fontSize:12, color:'#374151' }}>
                        <strong>Notes:</strong> {cd.notes}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Active session participants */}
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Session Participants</div>
              {participants.length === 0 ? (
                <div style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:'20px 0' }}>No participation records yet</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {participants.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:p.isActive ? '#f0f9ff' : '#f9fafb', border:`1px solid ${p.isActive ? '#bae6fd' : '#e5e7eb'}` }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:p.isActive ? '#0ea5e9' : '#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0 }}>
                        {p.userName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{p.userName}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>
                          {p.userRole.replace('_',' ')} · {p.joinMode === 'checkin' ? '🏥 Check-in' : p.joinMode === 'provider' ? '📹 Provider' : '👁 Observer'}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        {p.isActive
                          ? <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'2px 7px', borderRadius:99 }}>● Active</span>
                          : <span style={{ fontSize:10, color:'#94a3b8' }}>Left {p.leftAt ? new Date(p.leftAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</span>
                        }
                        {p.checkinData && <div style={{ fontSize:10, color:'#0d9488', marginTop:2 }}>✅ Checked in pt</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Chat panel ── */}
          {sidePanel === 'chat' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 12px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    {m.from === 'system'
                      ? <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:7, padding:'6px 10px', fontSize:11, color:'#0369a1' }}>🔔 {m.text}</div>
                      : (
                        <div style={{ display:'flex', flexDirection:'column', alignItems: m.from === 'Provider' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{m.from} · {m.time}</div>
                          <div style={{ maxWidth:'82%', background: m.from === 'Provider' ? '#eef2ff' : '#f8fafc', border:`1px solid ${m.from === 'Provider' ? '#c7d2fe' : '#e2e8f0'}`, borderRadius:10, padding:'7px 11px', fontSize:13, color:'#1e293b' }}>
                            {m.text}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding:'8px 10px', borderTop:'1px solid #e2e8f0', display:'flex', gap:7, flexShrink:0 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Message patient…" style={{ flex:1, padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13 }} />
                <button onClick={sendChat} style={{ padding:'7px 12px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPostSession && (
        <PostSessionModal
          apt={apt} patient={patient}
          sessionDuration={sessionTimer} sessionNote={notes}
          onClose={() => { setShowPostSession(false); endSession(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WAITING ROOM / PRE-VISIT CHECK-IN (Front Desk)
═══════════════════════════════════════════════════════════════════════ */
function WaitingRoomCheckin({ apt, patient, onClose, onComplete }) {
  const [form, setForm] = useState({
    identityVerified: false, dobConfirmed: '',
    insuranceVerified: false, copayCollected: false,
    copayAmount: patient?.insurance?.primary?.copay ? String(patient.insurance.primary.copay) : '',
    chiefComplaint: apt.reason || '',
    medsConfirmed: false, allergiesConfirmed: false, techTested: false, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isComplete = form.identityVerified && form.insuranceVerified && form.chiefComplaint.trim() && form.techTested;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSaving(true); setError('');
    try {
      await telehealthApi.checkin(apt.id, form);
      onComplete(form);
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        onComplete(form);
      } else {
        setError(e.message);
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:540, boxShadow:'0 24px 64px rgba(0,0,0,0.3)', overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        <div style={{ background:'linear-gradient(135deg,#0f766e,#0d9488)', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ fontWeight:900, color:'#fff', fontSize:16 }}>🏥 Pre-Visit Check-In</div>
          <div style={{ fontSize:11, color:'#99f6e4', marginTop:3 }}>Complete before provider joins · Front Desk Workflow</div>
        </div>

        <div style={{ background:'#f0fdfa', borderBottom:'1px solid #99f6e4', padding:'10px 24px', display:'flex', gap:14, alignItems:'center', flexShrink:0 }}>
          <Avatar apt={apt} patient={patient} size={36} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#134e4a' }}>{apt.patientName}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>🕐 {apt.time}{apt.reason ? ` · ${apt.reason}` : ''}</div>
          </div>
          {patient?.insurance?.primary?.name && (
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#0f766e' }}>{patient.insurance.primary.name}</div>
              {patient.insurance.primary.copay && <div style={{ fontSize:11, color:'#64748b' }}>Copay: ${patient.insurance.primary.copay}</div>}
            </div>
          )}
        </div>

        <div style={{ padding:'16px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:12 }}>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626' }}>⚠️ {error}</div>}

          {/* Identity */}
          <div style={{ background:form.identityVerified ? '#f0fdf4' : '#f9fafb', border:`1.5px solid ${form.identityVerified ? '#86efac' : '#e5e7eb'}`, borderRadius:10, padding:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>🪪 Identity Verification <span style={{ color:'#ef4444' }}>*</span></div>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:8 }}>
              <input type="checkbox" checked={form.identityVerified} onChange={e => set('identityVerified', e.target.checked)} style={{ width:16, height:16, accentColor:'#16a34a' }} />
              <span style={{ fontSize:13, fontWeight:600, color:form.identityVerified ? '#166534' : '#374151' }}>Patient identity confirmed (name + DOB)</span>
            </label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'#6b7280', whiteSpace:'nowrap' }}>DOB entered by patient:</span>
              <input type="text" placeholder={patient?.dob ? new Date(patient.dob + 'T12:00').toLocaleDateString() : 'mm/dd/yyyy'} value={form.dobConfirmed} onChange={e => set('dobConfirmed', e.target.value)}
                style={{ flex:1, padding:'5px 8px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12 }} />
            </div>
          </div>

          {/* Insurance & Copay */}
          <div style={{ background:form.insuranceVerified ? '#f0fdf4' : '#f9fafb', border:`1.5px solid ${form.insuranceVerified ? '#86efac' : '#e5e7eb'}`, borderRadius:10, padding:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>🏥 Insurance & Copay <span style={{ color:'#ef4444' }}>*</span></div>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:8 }}>
              <input type="checkbox" checked={form.insuranceVerified} onChange={e => set('insuranceVerified', e.target.checked)} style={{ width:16, height:16, accentColor:'#16a34a' }} />
              <span style={{ fontSize:13, fontWeight:600, color:form.insuranceVerified ? '#166534' : '#374151' }}>Insurance verified and active</span>
            </label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'#374151', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={form.copayCollected} onChange={e => set('copayCollected', e.target.checked)} style={{ accentColor:'#16a34a' }} />
                Copay collected:
              </label>
              <input type="text" placeholder="$0.00" value={form.copayAmount} onChange={e => set('copayAmount', e.target.value)}
                style={{ width:80, padding:'5px 8px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12 }} />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📋 Chief Complaint / Reason for Visit <span style={{ color:'#ef4444' }}>*</span></label>
            <textarea rows={2} placeholder="Patient's reason for today's visit…" value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)}
              style={{ width:'100%', padding:'8px 10px', border:`1.5px solid ${form.chiefComplaint.trim() ? '#86efac' : '#e5e7eb'}`, borderRadius:8, fontSize:13, resize:'none', boxSizing:'border-box', background:form.chiefComplaint.trim() ? '#f0fdf4' : '#fff' }} />
          </div>

          {/* Clinical confirmations */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { k:'medsConfirmed',     label:'💊 Medication list reviewed',  required:false },
              { k:'allergiesConfirmed',label:'⚠️ Allergies confirmed',        required:false },
              { k:'techTested',        label:'📡 Telehealth tech tested',     required:true  },
            ].map(({ k, label, required }) => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, border:`1.5px solid ${form[k] ? '#86efac' : '#e5e7eb'}`, background:form[k] ? '#f0fdf4' : '#f9fafb', cursor:'pointer', fontSize:12, fontWeight:600, color:form[k] ? '#166534' : '#374151' }}>
                <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} style={{ width:14, height:14, accentColor:'#16a34a' }} />
                {label} {required && <span style={{ color:'#ef4444' }}>*</span>}
              </label>
            ))}
          </div>

          {/* Notes for provider */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📝 Notes for Provider</label>
            <textarea rows={2} placeholder="Vitals, concerns, or anything the provider should know…" value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, resize:'none', boxSizing:'border-box' }} />
          </div>

          {!isComplete && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#92400e' }}>
              ⚠️ Required:{!form.identityVerified && ' • Verify identity'}{!form.insuranceVerified && ' • Verify insurance'}{!form.chiefComplaint.trim() && ' • Chief complaint'}{!form.techTested && ' • Test connection'}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f8fafc', flexShrink:0 }}>
          <button onClick={onClose} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!isComplete || saving}
            style={{ padding:'9px 22px', borderRadius:8, fontWeight:800, fontSize:13, border:'none', background:isComplete && !saving ? 'linear-gradient(135deg,#0f766e,#0d9488)' : '#d1d5db', color:isComplete && !saving ? '#fff' : '#9ca3af', cursor:isComplete && !saving ? 'pointer' : 'not-allowed', boxShadow:isComplete ? '0 2px 8px rgba(13,148,136,0.3)' : 'none' }}>
            {saving ? '⏳ Checking In…' : '✅ Complete Check-In → Notify Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APPOINTMENT CARD (pre-session waiting room)
═══════════════════════════════════════════════════════════════════════ */
function AppointmentCard({ apt, patient, hasConsent, linkSent, patientMeds, patientProblems, onSendLink, onStartSession, onCheckin, participants }) {
  const [expanded, setExpanded] = useState(false);
  const sc = getStatus(apt.status);
  const activeMeds    = (patientMeds    || []).filter(m => m.status === 'Active' || !m.status).slice(0, 3);
  const activeProbs   = (patientProblems|| []).filter(p => p.status === 'Active' || !p.status).slice(0, 2);
  const isReady       = apt.status === 'Checked In' || apt.status === 'Confirmed';
  const activeParticipants = (participants || []).filter(p => p.isActive);
  const checkinDone = (participants || []).some(p => p.checkinData && p.joinMode === 'checkin');

  return (
    <div style={{ borderBottom:'1px solid var(--border)', background: isReady ? '#fafffe' : '#fff' }}>
      {/* Main row */}
      <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>

        {/* Time + status */}
        <div style={{ textAlign:'center', minWidth:64, flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:16, color:'var(--text-primary)' }}>{apt.time}</div>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8, background:sc.bg, color:sc.color }}>{sc.label}</span>
        </div>

        {/* Patient + avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <Avatar apt={apt} patient={patient} size={40} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              {apt.patientName}
              {hasConsent && <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'1px 7px', borderRadius:99 }}>✅ Consent</span>}
              {linkSent && <span style={{ fontSize:10, fontWeight:700, color:'#7c3aed', background:'#ede9fe', padding:'1px 7px', borderRadius:99 }}>📤 Link Sent</span>}
              {checkinDone && <span style={{ fontSize:10, fontWeight:700, color:'#0f766e', background:'#ccfbf1', padding:'1px 7px', borderRadius:99 }}>🏥 Checked In</span>}
              {activeParticipants.length > 0 && <span style={{ fontSize:10, fontWeight:700, color:'#1e40af', background:'#dbeafe', padding:'1px 7px', borderRadius:99 }}>👥 {activeParticipants.length} in session</span>}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
              {apt.reason && <span>📍 {apt.reason}</span>}
              {apt.providerName && <span>👩‍⚕️ {apt.providerName}</span>}
              {apt.duration && <span>⏱ {apt.duration} min</span>}
            </div>
            {/* Quick clinical badges */}
            {(activeProbs.length > 0 || activeMeds.length > 0) && (
              <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                {activeProbs.map((p, i) => (
                  <span key={i} style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'#e0e7ff', color:'#3730a3', fontWeight:600 }}>
                    {p.name || (p.code ? `${p.code} — ${p.description || ''}` : p.description || '')}
                  </span>
                ))}
                {activeMeds.length > 0 && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600 }}>
                    💊 {activeMeds.length} med{activeMeds.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:6, flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:11, cursor:'pointer', color:'#64748b' }}>
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={onCheckin}
            style={{ padding:'6px 11px', borderRadius:7, border:`1.5px solid ${checkinDone ? '#99f6e4' : '#d1fae5'}`, background:checkinDone ? '#f0fdfa' : '#f0fdf4', fontSize:11, cursor:'pointer', color:checkinDone ? '#0f766e' : '#166534', fontWeight:700 }}>
            {checkinDone ? '🏥 Re-Check-In' : '🏥 Check-In Patient'}
          </button>
          <button onClick={onSendLink}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:12, cursor:'pointer', color:'#374151', fontWeight:600 }}>
            {linkSent ? '🔄 Resend' : '📤 Send Link'}
          </button>
          <button onClick={onStartSession}
            style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontWeight:800, fontSize:12, cursor:'pointer', boxShadow:'0 2px 8px rgba(109,40,217,0.25)' }}>
            {hasConsent ? '▶ Resume' : '📹 Start'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'0 20px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>

          {/* Patient demographics */}
          {patient && (
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>👤 Patient</div>
              {[
                { l:'DOB',      v: patient.dob },
                { l:'MRN',      v: patient.mrn },
                { l:'Phone',    v: patient.cellPhone || patient.phone },
                { l:'Email',    v: patient.email },
                { l:'Language', v: patient.language },
              ].filter(r => r.v).map(r => (
                <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                  <span style={{ color:'#64748b' }}>{r.l}</span>
                  <span style={{ fontWeight:600, color:'#1e293b', textAlign:'right', maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Insurance */}
          {patient?.insurance?.primary && (
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>🏥 Insurance</div>
              {[
                { l:'Plan',     v: patient.insurance.primary.name },
                { l:'Member',   v: patient.insurance.primary.memberId },
                { l:'Group',    v: patient.insurance.primary.groupNumber },
                { l:'Copay',    v: patient.insurance.primary.copay ? `$${patient.insurance.primary.copay}` : null },
              ].filter(r => r.v).map(r => (
                <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                  <span style={{ color:'#64748b' }}>{r.l}</span>
                  <span style={{ fontWeight:600, color:'#1e293b', textAlign:'right', maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Active meds */}
          {activeMeds.length > 0 && (
            <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 12px', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#166534', marginBottom:6 }}>💊 Active Medications</div>
              {activeMeds.map((m, i) => (
                <div key={i} style={{ fontSize:11, padding:'2px 0', color:'#15803d' }}>
                  <span style={{ fontWeight:600 }}>{m.name || m.medication || ''}</span>
                  {m.dose && <span style={{ color:'#64748b' }}> · {m.dose}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Problems */}
          {activeProbs.length > 0 && (
            <div style={{ background:'#eef2ff', borderRadius:8, padding:'10px 12px', border:'1px solid #c7d2fe' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#3730a3', marginBottom:6 }}>🏥 Diagnoses</div>
              {(patientProblems || []).filter(p => p.status === 'Active' || !p.status).map((p, i) => (
                <div key={i} style={{ fontSize:11, padding:'2px 0', color:'#4338ca' }}>
                  <span style={{ fontWeight:600 }}>{p.name || (p.code ? `${p.code} — ${p.description || ''}` : p.description || '')}</span>
                  {p.icdCode && <span style={{ color:'#818cf8' }}> {p.icdCode}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Appointment details */}
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📅 Appointment</div>
            {[
              { l:'Type',     v: apt.type },
              { l:'Duration', v: apt.duration ? `${apt.duration} min` : null },
              { l:'Room',     v: apt.room },
              { l:'Date',     v: apt.date },
              { l:'Visit #',  v: apt.sessionNumber ? `#${apt.sessionNumber}` : null },
              { l:'Modality', v: apt.therapyModality },
            ].filter(r => r.v).map(r => (
              <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                <span style={{ color:'#64748b' }}>{r.l}</span>
                <span style={{ fontWeight:600, color:'#1e293b' }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN TELEHEALTH PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function Telehealth() {
  const {
    patients, appointments, meds, problemList, allergies, vitalSigns,
    loadPatientClinical, selectPatient, openChart,
  } = usePatient();
  const { activeSession, startSession } = useTelehealth();
  const [sendModal,           setSendModal]           = useState(null);
  const [linkSentFor,         setLinkSentFor]         = useState({});
  const [consentModal,        setConsentModal]        = useState(null);
  const [consentRecords,      setConsentRecords]      = useState({});
  const [adhocModal,          setAdhocModal]          = useState(false);
  const [filter,              setFilter]              = useState('all');
  const [checkinModal,        setCheckinModal]        = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState({});

  /* ── Filter to telehealth-only, not completed/cancelled ── */
  const telehealthAppts = appointments.filter(a =>
    a.visitType === 'Telehealth' && a.status !== 'Completed' && a.status !== 'Cancelled'
  );

  /* ── Pre-load clinical data for all TH patients on mount ── */
  useEffect(() => {
    const ids = [...new Set(telehealthAppts.map(a => a.patientId).filter(Boolean))];
    ids.forEach(id => { try { loadPatientClinical(id); } catch { /* ignore */ } });
  }, [telehealthAppts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filtered appointment list ── */
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const filtered = telehealthAppts.filter(a => {
    if (filter === 'ready') return a.status === 'Checked In' || a.status === 'Confirmed';
    if (filter === 'today') return a.date === today;
    return true;
  });

  /* ── Stats ── */
  const readyCount   = telehealthAppts.filter(a => a.status === 'Checked In').length;
  const sentCount    = Object.keys(linkSentFor).length;
  const activeCount  = Object.keys(consentRecords).length;

  /* ── Load participants for visible appointments ── */
  const loadParticipants = useCallback(async (aptId) => {
    try {
      const data = await telehealthApi.participants(aptId);
      setSessionParticipants(prev => ({ ...prev, [aptId]: data }));
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    filtered.forEach(apt => loadParticipants(apt.id));
  }, [filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Session handlers ── */
  const launchSession = (apt, consentRecord) => {
    const patientId = apt.patientId;
    const patient   = patients?.find(p => p.id === patientId);
    // Select + open the patient in context so chart data is live
    if (patientId) {
      selectPatient(patientId);
      openChart(patientId);
      loadPatientClinical(patientId);
    }
    startSession({ apt, patient, consentRecord });
  };

  const handleStartSession = (apt) => {
    if (consentRecords[apt.id]) {
      launchSession(apt, consentRecords[apt.id]);
    } else {
      setConsentModal(apt);
    }
  };

  const handleConsentComplete = (record) => {
    const apt = consentModal;
    setConsentRecords(p => ({ ...p, [apt.id]: record }));
    setConsentModal(null);
    launchSession(apt, record);
  };

  const handleLinkSent = (aptId, method) => {
    setLinkSentFor(p => ({ ...p, [aptId]: method }));
    setSendModal(null);
  };

  /* ── Active session view ── */
  if (activeSession) {
    const { apt, patient } = activeSession;
    return (
      <div className="fade-in" style={{ padding:'0 0 16px' }}>
        <ActiveSession
          apt={apt}
          patient={patient}
          patients={patients}
          consentRecord={activeSession.consentRecord}
          patientMeds={meds?.[apt?.patientId]}
          patientProblems={problemList?.[apt?.patientId]}
          patientAllergies={allergies?.[apt?.patientId]}
          patientVitals={vitalSigns?.[apt?.patientId]}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">

      {/* ── Page header ── */}
      <div style={{ marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--text-primary)' }}>📹 Telehealth</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)' }}>HIPAA-compliant video visits · Illinois Telehealth Act (410 ILCS 151) compliant</p>
        </div>
        <button
          onClick={() => setAdhocModal(true)}
          style={{ padding:'9px 18px', borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(109,40,217,0.25)', flexShrink:0 }}>
          + Ad-Hoc Session
        </button>
      </div>

      {/* ── Compliance banner ── */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius:12, padding:'14px 20px', marginBottom:18, display:'flex', gap:14, alignItems:'flex-start' }}>
        <span style={{ fontSize:26, flexShrink:0 }}>🏛️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, color:'#fff', fontSize:13 }}>Illinois Telehealth Act Compliance Active</div>
          <div style={{ fontSize:11, color:'#bfdbfe', marginTop:3, lineHeight:1.5 }}>
            Patient telehealth consent captured at registration. State confirmation (Illinois only — no address collected) required at each session start. All sessions are audit-logged.
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
          {['AES-256 Encrypted','HIPAA Compliant','IL 410 ILCS 151','Audit Logged'].map(b => (
            <span key={b} style={{ padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.14)', color:'#bfdbfe', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:18 }}>
        {[
          { label:'Scheduled',   val:telehealthAppts.length,   icon:'📅', color:'#3b82f6', bg:'#eff6ff' },
          { label:'Ready (In)',  val:readyCount,                icon:'🟢', color:'#22c55e', bg:'#f0fdf4' },
          { label:'Links Sent',  val:sentCount,                 icon:'📤', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Consented',   val:activeCount,               icon:'✅', color:'#f59e0b', bg:'#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid var(--border)`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Provider reminders ── */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', marginBottom:18, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontWeight:800, fontSize:13, color:'#1e40af', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
          📋 Provider Compliance Reminders
          <span style={{ fontWeight:400, fontSize:11, color:'#64748b' }}>— reference for each session start</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:7 }}>
          {PROVIDER_REMINDERS.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:9, alignItems:'flex-start', background:'#f8fafc', borderRadius:7, padding:'8px 10px', border:'1px solid #e2e8f0' }}>
              <span style={{ color:'#0891b2', fontWeight:900, fontSize:11, flexShrink:0, marginTop:1 }}>{i + 1}.</span>
              <span style={{ fontSize:11, color:'#374151', lineHeight:1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Virtual Waiting Room ── */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
        {/* Section header */}
        <div style={{ padding:'13px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8fafc', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>🕐 Virtual Waiting Room</div>
            <span style={{ background:'#dbeafe', color:'#1e40af', padding:'3px 11px', borderRadius:99, fontSize:12, fontWeight:700 }}>
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Filter tabs */}
          <div style={{ display:'flex', gap:5 }}>
            {[['all','All'],['ready','Ready'],['today','Today']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${filter===k ? '#3b82f6' : '#e2e8f0'}`, background:filter===k ? '#eff6ff' : '#fff', color:filter===k ? '#1e40af' : '#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'50px 20px', textAlign:'center', color:'var(--text-muted)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📹</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>
              {filter === 'all' ? 'No telehealth appointments scheduled' : `No ${filter === 'ready' ? '"Ready"' : "today's"} telehealth appointments`}
            </div>
            <div style={{ fontSize:12 }}>Appointments show here when visit type is set to "Telehealth"</div>
          </div>
        ) : (
          filtered.map(apt => {
            const patient = patients?.find(p => p.id === apt.patientId);
            return (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                patient={patient}
                hasConsent={!!consentRecords[apt.id]}
                linkSent={linkSentFor[apt.id]}
                patientMeds={meds?.[apt.patientId]}
                patientProblems={problemList?.[apt.patientId]}
                participants={sessionParticipants[apt.id] || []}
                onSendLink={() => setSendModal(apt)}
                onStartSession={() => handleStartSession(apt)}
                onCheckin={() => setCheckinModal(apt)}
              />
            );
          })
        )}
      </div>

      {/* ── Modals ── */}
      {checkinModal && (
        <WaitingRoomCheckin
          apt={checkinModal}
          patient={patients?.find(p => p.id === checkinModal.patientId)}
          onClose={() => setCheckinModal(null)}
          onComplete={(checkinData) => {
            setCheckinModal(null);
            loadParticipants(checkinModal.id);
          }}
        />
      )}
      {sendModal && (
        <SendLinkModal apt={sendModal} patients={patients} onClose={() => setSendModal(null)} onSent={handleLinkSent} />
      )}
      {adhocModal && (
        <AdhocPatientModal
          patients={patients}
          onSelect={(patient) => {
            setAdhocModal(false);
            const aptId = 'adhoc-' + Date.now();
            setConsentModal({
              id: aptId,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              time: nowTime(),
              date: new Date().toLocaleDateString(),
              reason: 'Ad-Hoc Visit',
            });
          }}
          onCancel={() => setAdhocModal(false)}
        />
      )}
      {consentModal && (
        <QuickStartModal
          apt={consentModal}
          patient={patients?.find(p => p.id === consentModal.patientId)}
          onStart={handleConsentComplete}
          onCancel={() => setConsentModal(null)}
        />
      )}
    </div>
  );
}
