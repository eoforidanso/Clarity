import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { users as allUsers } from '../data/mockData';

/* ── PHQ-9 & GAD-7 question banks ─────────────────────────── */
const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things, such as reading',
  'Moving or speaking so slowly that other people could have noticed',
  'Thoughts that you would be better off dead or of hurting yourself',
];
const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it\'s hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];
const CSSRS_QUESTIONS = [
  'Have you wished you were dead or wished you could go to sleep and not wake up?',
  'Have you actually had any thoughts of killing yourself?',
  'Have you been thinking about how you might do this?',
  'Have you had these thoughts and had some intention of acting on them?',
  'Have you started to work out or worked out the details of how to kill yourself?',
  'Have you ever done anything, started to do anything, or prepared to do anything to end your life?',
];
const CSSRS_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
];
const PCL5_QUESTIONS = [
  'Repeated, disturbing, and unwanted memories of the stressful experience?',
  'Repeated, disturbing dreams of the stressful experience?',
  'Suddenly feeling or acting as if the stressful experience were actually happening again?',
  'Feeling very upset when something reminded you of the stressful experience?',
  'Having strong physical reactions when reminded (heart pounding, trouble breathing, sweating)?',
  'Avoiding memories, thoughts, or feelings related to the stressful experience?',
  'Avoiding external reminders (people, places, conversations, activities, objects, situations)?',
  'Trouble remembering important parts of the stressful experience?',
  'Having strong negative beliefs about yourself, other people, or the world?',
  'Blaming yourself or someone else for the stressful experience or what happened after it?',
  'Having strong negative feelings such as fear, horror, anger, guilt, or shame?',
  'Loss of interest in activities you used to enjoy?',
  'Feeling distant or cut off from other people?',
  'Trouble experiencing positive feelings?',
  'Irritable behavior, angry outbursts, or acting aggressively?',
  'Taking too many risks or doing things that could cause you harm?',
  'Being "superalert" or watchful or on guard?',
  'Feeling jumpy or easily startled?',
  'Having difficulty concentrating?',
  'Trouble falling or staying asleep?',
];
const PCL5_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'A little bit' },
  { value: 2, label: 'Moderately' },
  { value: 3, label: 'Quite a bit' },
  { value: 4, label: 'Extremely' },
];
const AUDITC_QUESTIONS = [
  'How often do you have a drink containing alcohol?',
  'How many drinks containing alcohol do you have on a typical day when you are drinking?',
  'How often do you have 6 or more drinks on one occasion?',
];
const AUDITC_OPTIONS = [
  [
    { value: 0, label: 'Never' },
    { value: 1, label: 'Monthly or less' },
    { value: 2, label: '2–4 times/month' },
    { value: 3, label: '2–3 times/week' },
    { value: 4, label: '4+ times/week' },
  ],
  [
    { value: 0, label: '1–2' },
    { value: 1, label: '3–4' },
    { value: 2, label: '5–6' },
    { value: 3, label: '7–9' },
    { value: 4, label: '10+' },
  ],
  [
    { value: 0, label: 'Never' },
    { value: 1, label: 'Less than monthly' },
    { value: 2, label: 'Monthly' },
    { value: 3, label: 'Weekly' },
    { value: 4, label: 'Daily or almost' },
  ],
];
const DAST10_QUESTIONS = [
  'Have you used drugs other than those required for medical reasons?',
  'Do you abuse more than one drug at a time?',
  'Are you always able to stop using drugs when you want to? (If never used drugs, answer "No")',
  'Have you had "blackouts" or "flashbacks" as a result of drug use?',
  'Do you ever feel bad or guilty about your drug use? (If never used drugs, answer "No")',
  'Does your spouse (or parents) ever complain about your involvement with drugs?',
  'Have you neglected your family because of your use of drugs?',
  'Have you engaged in illegal activities in order to obtain drugs?',
  'Have you ever experienced withdrawal symptoms when you stopped taking drugs?',
  'Have you had medical problems as a result of your drug use?',
];
const DAST10_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
];
const ASRS_QUESTIONS = [
  'How often do you have trouble wrapping up the final details of a project?',
  'How often do you have difficulty getting things in order when you have to do a task that requires organization?',
  'How often do you have problems remembering appointments or obligations?',
  'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?',
  'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?',
  'How often do you feel overly active and compelled to do things, like you were driven by a motor?',
];
const ASRS_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Very Often' },
];
const MDQ_QUESTIONS = [
  'Has there ever been a period of time when you were not your usual self and you felt so good or hyper that others thought you were not your normal self?',
  '… you were so irritable that you shouted at people or started fights or arguments?',
  '… you felt much more self-confident than usual?',
  '… you got much less sleep than usual and found you didn\'t really miss it?',
  '… you were much more talkative or spoke faster than usual?',
  '… thoughts raced through your head and you couldn\'t slow your mind down?',
  '… you were so easily distracted by things around you that you had trouble concentrating?',
  '… you had much more energy than usual?',
  '… you were much more active or did many more things than usual?',
  '… you were much more social or outgoing, like telephoning friends in the middle of the night?',
  '… you were much more interested in sex than usual?',
  '… you did things that were unusual for you or others might have thought were excessive, foolish, or risky?',
  '… spending money got you or your family in trouble?',
];
const MDQ_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' },
];
const MOCA_CATEGORIES = [
  { name: 'Visuospatial / Executive', maxScore: 5, description: 'Trail-making, cube copy, clock drawing' },
  { name: 'Naming', maxScore: 3, description: 'Animal naming (lion, rhino, camel)' },
  { name: 'Attention', maxScore: 6, description: 'Digit span, serial 7s, tapping task' },
  { name: 'Language', maxScore: 3, description: 'Sentence repetition, verbal fluency' },
  { name: 'Abstraction', maxScore: 2, description: 'Similarity tasks' },
  { name: 'Delayed Recall', maxScore: 5, description: '5-word recall after delay' },
  { name: 'Orientation', maxScore: 6, description: 'Date, place, city, month, year, day' },
];

/* ── Multi-language translations ────────────────────────────── */
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ht', label: 'Kreyòl Ayisyen', flag: '🇭🇹' },
];

const TRANSLATIONS = {
  en: {
    home: 'Home', messages: 'Messages', medications: 'Medications', appointments: 'Appointments',
    bookAppointment: 'Book Appointment', assessments: 'Assessments', insurance: 'Insurance',
    telehealth: 'Telehealth', billing: 'Billing & Payments', signOut: 'Sign Out',
    welcomeBack: 'Welcome back', nextAppointment: 'Next Appointment', messageProvider: 'Message Provider',
    completeAssessments: 'Complete Assessments', appointmentReminder: 'Appointment Reminder',
    today: 'TODAY', tomorrow: 'TOMORROW', activeMeds: 'Active Meds', upcomingAppts: 'Upcoming Appts',
    assessmentsDue: 'Assessments Due', yourCareTeam: 'Your Care Team', myPreferences: 'My Preferences',
    preferredPharmacy: 'Preferred Pharmacy', preferredLab: 'Preferred Lab', savePreferences: 'Save Preferences',
    saved: 'Saved', currentMedications: 'Current Medications', viewAll: 'View All',
    crisisResources: 'Crisis Resources', requestRefill: 'Request Refill', requested: 'Requested',
    contactOffice: 'Contact office', send: 'Send', typeMessage: 'Type a message to your provider...',
    checkInOnline: 'Check In Online', checkInNow: 'Check In Now', checkedIn: 'Checked In',
    myAppointments: 'My Appointments', requestAppointment: 'Request Appointment',
    noUpcomingAppts: 'No upcoming appointments', pastAppointments: 'Past Appointments',
    onlineCheckIn: 'Online Check-In', bookAnAppointment: 'Book an Appointment',
    provider: 'Provider', duration: 'Duration', visitType: 'Visit Type', appointmentType: 'Appointment Type',
    notes: 'Notes', confirmAppointment: 'Confirm Appointment', cancel: 'Cancel',
    appointmentBooked: 'Appointment Booked!', selectTimeSlot: 'Select a time slot from the schedule to begin booking.',
    bookingDetails: 'Booking Details', available: 'Available', selected: 'Selected',
    insuranceInfo: 'Insurance Information', primaryInsurance: 'Primary Insurance',
    secondaryInsurance: 'Secondary Insurance', submitInsuranceUpdate: 'Submit Insurance Update',
    eligibilityVerification: 'Insurance Eligibility Verification', checkEligibility: 'Check Eligibility',
    checking: 'Checking...', coverageActive: 'Coverage Active — Eligible',
    telehealthInfo: 'Telehealth Information', joinSession: 'Join Session',
    noTelehealthVisits: 'No Upcoming Telehealth Visits', beforeYourVisit: 'Before Your Visit',
    technicalRequirements: 'Technical Requirements',
    // Billing & Payments
    billingPayments: 'Billing & Payments', outstandingBalance: 'Outstanding Balance',
    payNow: 'Pay Now', paymentHistory: 'Payment History', autoPaySettings: 'AutoPay Settings',
    enableAutoPay: 'Enable AutoPay', autoPayEnabled: 'AutoPay is Active',
    autoPayDesc: 'Automatically pay your copay before each visit. No more missed payments.',
    paymentMethod: 'Payment Method', addPaymentMethod: 'Add Payment Method',
    makePayment: 'Make a Payment', paymentAmount: 'Payment Amount', processPayment: 'Process Payment',
    paymentSuccess: 'Payment Successful!', paymentProcessing: 'Processing payment...',
    preVisitPayment: 'Pre-Visit Payment', postVisitPayment: 'Post-Visit Payment',
    estimatedCopay: 'Estimated Copay', amountDue: 'Amount Due', paidOn: 'Paid on',
    pending: 'Pending', paid: 'Paid', paymentType: 'Payment Type', amount: 'Amount',
    date: 'Date', status: 'Status', noPaymentHistory: 'No payment history',
    payPreVisit: 'Pay copay now before your visit', language: 'Language',
    messagesWithTeam: 'Messages with Your Care Team', myMedications: 'My Medications',
    noActiveMeds: 'No active medications', clickRequestRefill: 'Click "Request Refill" to send to your provider',
  },
  es: {
    home: 'Inicio', messages: 'Mensajes', medications: 'Medicamentos', appointments: 'Citas',
    bookAppointment: 'Reservar Cita', assessments: 'Evaluaciones', insurance: 'Seguro',
    telehealth: 'Telesalud', billing: 'Facturación y Pagos', signOut: 'Cerrar Sesión',
    welcomeBack: 'Bienvenido de nuevo', nextAppointment: 'Próxima Cita', messageProvider: 'Mensaje al Proveedor',
    completeAssessments: 'Completar Evaluaciones', appointmentReminder: 'Recordatorio de Cita',
    today: 'HOY', tomorrow: 'MAÑANA', activeMeds: 'Medicamentos Activos', upcomingAppts: 'Próximas Citas',
    assessmentsDue: 'Evaluaciones Pendientes', yourCareTeam: 'Su Equipo de Atención', myPreferences: 'Mis Preferencias',
    preferredPharmacy: 'Farmacia Preferida', preferredLab: 'Laboratorio Preferido', savePreferences: 'Guardar Preferencias',
    saved: 'Guardado', currentMedications: 'Medicamentos Actuales', viewAll: 'Ver Todo',
    crisisResources: 'Recursos de Crisis', requestRefill: 'Solicitar Recarga', requested: 'Solicitado',
    contactOffice: 'Contactar oficina', send: 'Enviar', typeMessage: 'Escriba un mensaje a su proveedor...',
    checkInOnline: 'Registrarse en Línea', checkInNow: 'Registrarse Ahora', checkedIn: 'Registrado',
    myAppointments: 'Mis Citas', requestAppointment: 'Solicitar Cita',
    noUpcomingAppts: 'Sin citas próximas', pastAppointments: 'Citas Anteriores',
    onlineCheckIn: 'Registro en Línea', bookAnAppointment: 'Reservar una Cita',
    provider: 'Proveedor', duration: 'Duración', visitType: 'Tipo de Visita', appointmentType: 'Tipo de Cita',
    notes: 'Notas', confirmAppointment: 'Confirmar Cita', cancel: 'Cancelar',
    appointmentBooked: '¡Cita Reservada!', selectTimeSlot: 'Seleccione un horario del calendario para comenzar.',
    bookingDetails: 'Detalles de Reserva', available: 'Disponible', selected: 'Seleccionado',
    insuranceInfo: 'Información del Seguro', primaryInsurance: 'Seguro Primario',
    secondaryInsurance: 'Seguro Secundario', submitInsuranceUpdate: 'Enviar Actualización de Seguro',
    eligibilityVerification: 'Verificación de Elegibilidad', checkEligibility: 'Verificar Elegibilidad',
    checking: 'Verificando...', coverageActive: 'Cobertura Activa — Elegible',
    telehealthInfo: 'Información de Telesalud', joinSession: 'Unirse a la Sesión',
    noTelehealthVisits: 'Sin Visitas de Telesalud', beforeYourVisit: 'Antes de su Visita',
    technicalRequirements: 'Requisitos Técnicos',
    billingPayments: 'Facturación y Pagos', outstandingBalance: 'Saldo Pendiente',
    payNow: 'Pagar Ahora', paymentHistory: 'Historial de Pagos', autoPaySettings: 'Configuración de AutoPago',
    enableAutoPay: 'Activar AutoPago', autoPayEnabled: 'AutoPago está Activo',
    autoPayDesc: 'Pague automáticamente su copago antes de cada visita.',
    paymentMethod: 'Método de Pago', addPaymentMethod: 'Agregar Método de Pago',
    makePayment: 'Realizar un Pago', paymentAmount: 'Monto del Pago', processPayment: 'Procesar Pago',
    paymentSuccess: '¡Pago Exitoso!', paymentProcessing: 'Procesando pago...',
    preVisitPayment: 'Pago Pre-Visita', postVisitPayment: 'Pago Post-Visita',
    estimatedCopay: 'Copago Estimado', amountDue: 'Monto Adeudado', paidOn: 'Pagado el',
    pending: 'Pendiente', paid: 'Pagado', paymentType: 'Tipo de Pago', amount: 'Monto',
    date: 'Fecha', status: 'Estado', noPaymentHistory: 'Sin historial de pagos',
    payPreVisit: 'Pague su copago antes de su visita', language: 'Idioma',
    messagesWithTeam: 'Mensajes con Su Equipo de Atención', myMedications: 'Mis Medicamentos',
    noActiveMeds: 'Sin medicamentos activos', clickRequestRefill: 'Haga clic en "Solicitar Recarga" para enviar a su proveedor',
  },
  ar: {
    home: 'الرئيسية', messages: 'الرسائل', medications: 'الأدوية', appointments: 'المواعيد',
    bookAppointment: 'حجز موعد', assessments: 'التقييمات', insurance: 'التأمين',
    telehealth: 'الرعاية عن بُعد', billing: 'الفواتير والمدفوعات', signOut: 'تسجيل الخروج',
    welcomeBack: 'مرحبًا بعودتك', nextAppointment: 'الموعد التالي', messageProvider: 'مراسلة المعالج',
    completeAssessments: 'إكمال التقييمات', appointmentReminder: 'تذكير بالموعد',
    today: 'اليوم', tomorrow: 'غداً', activeMeds: 'الأدوية النشطة', upcomingAppts: 'المواعيد القادمة',
    assessmentsDue: 'التقييمات المطلوبة', yourCareTeam: 'فريق الرعاية', myPreferences: 'تفضيلاتي',
    preferredPharmacy: 'الصيدلية المفضلة', preferredLab: 'المختبر المفضل', savePreferences: 'حفظ التفضيلات',
    saved: 'تم الحفظ', currentMedications: 'الأدوية الحالية', viewAll: 'عرض الكل',
    crisisResources: 'موارد الأزمات', requestRefill: 'طلب إعادة تعبئة', requested: 'تم الطلب',
    contactOffice: 'اتصل بالعيادة', send: 'إرسال', typeMessage: 'اكتب رسالة لمعالجك...',
    checkInOnline: 'تسجيل الحضور', checkInNow: 'سجّل الحضور', checkedIn: 'تم التسجيل',
    myAppointments: 'مواعيدي', requestAppointment: 'طلب موعد',
    noUpcomingAppts: 'لا توجد مواعيد قادمة', pastAppointments: 'المواعيد السابقة',
    onlineCheckIn: 'تسجيل الحضور عبر الإنترنت', bookAnAppointment: 'حجز موعد',
    provider: 'المعالج', duration: 'المدة', visitType: 'نوع الزيارة', appointmentType: 'نوع الموعد',
    notes: 'ملاحظات', confirmAppointment: 'تأكيد الموعد', cancel: 'إلغاء',
    appointmentBooked: 'تم حجز الموعد!', selectTimeSlot: 'اختر وقتاً من الجدول للبدء.',
    bookingDetails: 'تفاصيل الحجز', available: 'متاح', selected: 'محدد',
    insuranceInfo: 'معلومات التأمين', primaryInsurance: 'التأمين الأساسي',
    secondaryInsurance: 'التأمين الثانوي', submitInsuranceUpdate: 'إرسال تحديث التأمين',
    eligibilityVerification: 'التحقق من الأهلية', checkEligibility: 'تحقق من الأهلية',
    checking: 'جاري التحقق...', coverageActive: 'التغطية نشطة — مؤهل',
    telehealthInfo: 'معلومات الرعاية عن بُعد', joinSession: 'انضم للجلسة',
    noTelehealthVisits: 'لا توجد زيارات عن بُعد', beforeYourVisit: 'قبل زيارتك',
    technicalRequirements: 'المتطلبات التقنية',
    billingPayments: 'الفواتير والمدفوعات', outstandingBalance: 'الرصيد المستحق',
    payNow: 'ادفع الآن', paymentHistory: 'سجل المدفوعات', autoPaySettings: 'إعدادات الدفع التلقائي',
    enableAutoPay: 'تفعيل الدفع التلقائي', autoPayEnabled: 'الدفع التلقائي نشط',
    autoPayDesc: 'ادفع تلقائياً قبل كل زيارة.',
    paymentMethod: 'طريقة الدفع', addPaymentMethod: 'إضافة طريقة دفع',
    makePayment: 'إجراء دفعة', paymentAmount: 'مبلغ الدفع', processPayment: 'معالجة الدفع',
    paymentSuccess: 'تم الدفع بنجاح!', paymentProcessing: 'جاري معالجة الدفع...',
    preVisitPayment: 'دفع ما قبل الزيارة', postVisitPayment: 'دفع ما بعد الزيارة',
    estimatedCopay: 'الحصة المقدرة', amountDue: 'المبلغ المستحق', paidOn: 'دُفع في',
    pending: 'معلق', paid: 'مدفوع', paymentType: 'نوع الدفع', amount: 'المبلغ',
    date: 'التاريخ', status: 'الحالة', noPaymentHistory: 'لا يوجد سجل مدفوعات',
    payPreVisit: 'ادفع حصتك قبل الزيارة', language: 'اللغة',
    messagesWithTeam: 'الرسائل مع فريق الرعاية', myMedications: 'أدويتي',
    noActiveMeds: 'لا توجد أدوية نشطة', clickRequestRefill: 'انقر "طلب إعادة تعبئة" للإرسال إلى معالجك',
  },
  fr: {
    home: 'Accueil', messages: 'Messages', medications: 'Médicaments', appointments: 'Rendez-vous',
    bookAppointment: 'Prendre RDV', assessments: 'Évaluations', insurance: 'Assurance',
    telehealth: 'Télésanté', billing: 'Facturation et Paiements', signOut: 'Déconnexion',
    welcomeBack: 'Bon retour', nextAppointment: 'Prochain RDV', messageProvider: 'Message au Médecin',
    completeAssessments: 'Compléter les Évaluations', appointmentReminder: 'Rappel de RDV',
    today: "AUJOURD'HUI", tomorrow: 'DEMAIN', activeMeds: 'Médicaments Actifs', upcomingAppts: 'Prochains RDV',
    assessmentsDue: 'Évaluations à Faire', yourCareTeam: 'Votre Équipe Soignante', myPreferences: 'Mes Préférences',
    preferredPharmacy: 'Pharmacie Préférée', preferredLab: 'Laboratoire Préféré', savePreferences: 'Enregistrer',
    saved: 'Enregistré', currentMedications: 'Médicaments Actuels', viewAll: 'Voir Tout',
    crisisResources: 'Ressources de Crise', requestRefill: 'Demander Renouvellement', requested: 'Demandé',
    contactOffice: 'Contacter le bureau', send: 'Envoyer', typeMessage: 'Écrivez un message...',
    checkInOnline: "S'enregistrer", checkInNow: "S'enregistrer", checkedIn: 'Enregistré',
    myAppointments: 'Mes Rendez-vous', requestAppointment: 'Demander un RDV',
    noUpcomingAppts: 'Aucun rendez-vous', pastAppointments: 'Rendez-vous Passés',
    onlineCheckIn: 'Enregistrement en Ligne', bookAnAppointment: 'Prendre un Rendez-vous',
    provider: 'Médecin', duration: 'Durée', visitType: 'Type de Visite', appointmentType: 'Type de RDV',
    notes: 'Notes', confirmAppointment: 'Confirmer le RDV', cancel: 'Annuler',
    appointmentBooked: 'RDV Réservé!', selectTimeSlot: "Sélectionnez un créneau pour commencer.",
    bookingDetails: 'Détails de Réservation', available: 'Disponible', selected: 'Sélectionné',
    insuranceInfo: "Informations d'Assurance", primaryInsurance: 'Assurance Principale',
    secondaryInsurance: 'Assurance Secondaire', submitInsuranceUpdate: "Mettre à Jour l'Assurance",
    eligibilityVerification: "Vérification d'Éligibilité", checkEligibility: 'Vérifier',
    checking: 'Vérification...', coverageActive: 'Couverture Active — Éligible',
    telehealthInfo: 'Info Télésanté', joinSession: 'Rejoindre',
    noTelehealthVisits: 'Aucune Visite Télésanté', beforeYourVisit: 'Avant Votre Visite',
    technicalRequirements: 'Exigences Techniques',
    billingPayments: 'Facturation et Paiements', outstandingBalance: 'Solde Impayé',
    payNow: 'Payer', paymentHistory: 'Historique des Paiements', autoPaySettings: 'Paramètres AutoPay',
    enableAutoPay: 'Activer AutoPay', autoPayEnabled: 'AutoPay Actif',
    autoPayDesc: 'Payez automatiquement votre copaiement avant chaque visite.',
    paymentMethod: 'Mode de Paiement', addPaymentMethod: 'Ajouter un Mode de Paiement',
    makePayment: 'Effectuer un Paiement', paymentAmount: 'Montant', processPayment: 'Traiter le Paiement',
    paymentSuccess: 'Paiement Réussi!', paymentProcessing: 'Traitement en cours...',
    preVisitPayment: 'Paiement Pré-Visite', postVisitPayment: 'Paiement Post-Visite',
    estimatedCopay: 'Copaiement Estimé', amountDue: 'Montant Dû', paidOn: 'Payé le',
    pending: 'En Attente', paid: 'Payé', paymentType: 'Type de Paiement', amount: 'Montant',
    date: 'Date', status: 'Statut', noPaymentHistory: 'Aucun historique',
    payPreVisit: 'Payez votre copaiement avant la visite', language: 'Langue',
    messagesWithTeam: 'Messages avec Votre Équipe de Soins', myMedications: 'Mes Médicaments',
    noActiveMeds: 'Aucun médicament actif', clickRequestRefill: 'Cliquez "Demander Renouvellement" pour envoyer à votre médecin',
  },
  zh: {
    home: '首页', messages: '消息', medications: '药物', appointments: '预约',
    bookAppointment: '预约挂号', assessments: '评估', insurance: '保险',
    telehealth: '远程医疗', billing: '账单与支付', signOut: '退出',
    welcomeBack: '欢迎回来', nextAppointment: '下次预约', messageProvider: '联系医生',
    completeAssessments: '完成评估', appointmentReminder: '预约提醒',
    today: '今天', tomorrow: '明天', activeMeds: '使用中的药物', upcomingAppts: '即将到来的预约',
    assessmentsDue: '待完成评估', yourCareTeam: '您的医疗团队', myPreferences: '我的偏好设置',
    preferredPharmacy: '首选药房', preferredLab: '首选实验室', savePreferences: '保存设置',
    saved: '已保存', currentMedications: '当前药物', viewAll: '查看全部',
    crisisResources: '危机资源', requestRefill: '申请续方', requested: '已申请',
    contactOffice: '联系诊所', send: '发送', typeMessage: '输入消息...',
    checkInOnline: '在线签到', checkInNow: '立即签到', checkedIn: '已签到',
    myAppointments: '我的预约', requestAppointment: '申请预约',
    noUpcomingAppts: '没有即将到来的预约', pastAppointments: '过往预约',
    onlineCheckIn: '在线签到', bookAnAppointment: '预约挂号',
    provider: '医生', duration: '时长', visitType: '就诊类型', appointmentType: '预约类型',
    notes: '备注', confirmAppointment: '确认预约', cancel: '取消',
    appointmentBooked: '预约成功！', selectTimeSlot: '请从日程表中选择时间段。',
    bookingDetails: '预约详情', available: '可用', selected: '已选',
    insuranceInfo: '保险信息', primaryInsurance: '主要保险',
    secondaryInsurance: '次要保险', submitInsuranceUpdate: '提交保险更新',
    eligibilityVerification: '保险资格验证', checkEligibility: '检查资格',
    checking: '检查中...', coverageActive: '保险有效',
    telehealthInfo: '远程医疗信息', joinSession: '加入会议',
    noTelehealthVisits: '没有远程医疗预约', beforeYourVisit: '就诊前准备',
    technicalRequirements: '技术要求',
    billingPayments: '账单与支付', outstandingBalance: '未付余额',
    payNow: '立即支付', paymentHistory: '支付历史', autoPaySettings: '自动支付设置',
    enableAutoPay: '开启自动支付', autoPayEnabled: '自动支付已开启',
    autoPayDesc: '自动在每次就诊前支付您的自付额。',
    paymentMethod: '支付方式', addPaymentMethod: '添加支付方式',
    makePayment: '进行支付', paymentAmount: '支付金额', processPayment: '处理支付',
    paymentSuccess: '支付成功！', paymentProcessing: '正在处理支付...',
    preVisitPayment: '就诊前支付', postVisitPayment: '就诊后支付',
    estimatedCopay: '预估自付额', amountDue: '应付金额', paidOn: '支付日期',
    pending: '待处理', paid: '已支付', paymentType: '支付类型', amount: '金额',
    date: '日期', status: '状态', noPaymentHistory: '暂无支付记录',
    payPreVisit: '请在就诊前支付自付额', language: '语言',
    messagesWithTeam: '与医疗团队的消息', myMedications: '我的药物',
    noActiveMeds: '无活跃药物', clickRequestRefill: '点击"申请续方"发送给您的医生',
  },
  ko: {
    home: '홈', messages: '메시지', medications: '약물', appointments: '예약',
    bookAppointment: '예약하기', assessments: '평가', insurance: '보험',
    telehealth: '원격진료', billing: '청구 및 결제', signOut: '로그아웃',
    welcomeBack: '다시 오신 것을 환영합니다', nextAppointment: '다음 예약', messageProvider: '의사에게 메시지',
    completeAssessments: '평가 완료', appointmentReminder: '예약 알림',
    today: '오늘', tomorrow: '내일', activeMeds: '복용 중인 약물', upcomingAppts: '예정된 예약',
    assessmentsDue: '미완료 평가', yourCareTeam: '담당 의료팀', myPreferences: '내 설정',
    preferredPharmacy: '선호 약국', preferredLab: '선호 검사실', savePreferences: '설정 저장',
    saved: '저장됨', currentMedications: '현재 약물', viewAll: '전체 보기',
    crisisResources: '위기 자원', requestRefill: '리필 요청', requested: '요청됨',
    contactOffice: '병원 연락', send: '전송', typeMessage: '메시지를 입력하세요...',
    checkInOnline: '온라인 체크인', checkInNow: '체크인', checkedIn: '체크인 완료',
    myAppointments: '내 예약', requestAppointment: '예약 요청',
    noUpcomingAppts: '예정된 예약이 없습니다', pastAppointments: '지난 예약',
    onlineCheckIn: '온라인 체크인', bookAnAppointment: '예약하기',
    provider: '의사', duration: '시간', visitType: '방문 유형', appointmentType: '예약 유형',
    notes: '메모', confirmAppointment: '예약 확인', cancel: '취소',
    appointmentBooked: '예약 완료!', selectTimeSlot: '일정에서 시간을 선택하세요.',
    bookingDetails: '예약 정보', available: '가능', selected: '선택됨',
    insuranceInfo: '보험 정보', primaryInsurance: '주 보험', secondaryInsurance: '보조 보험',
    submitInsuranceUpdate: '보험 업데이트', eligibilityVerification: '자격 확인',
    checkEligibility: '확인', checking: '확인 중...', coverageActive: '보험 유효',
    telehealthInfo: '원격진료 정보', joinSession: '참여',
    noTelehealthVisits: '원격진료 예약 없음', beforeYourVisit: '방문 전', technicalRequirements: '기술 요건',
    billingPayments: '청구 및 결제', outstandingBalance: '미결제 잔액',
    payNow: '결제', paymentHistory: '결제 내역', autoPaySettings: '자동결제 설정',
    enableAutoPay: '자동결제 활성화', autoPayEnabled: '자동결제 활성',
    autoPayDesc: '매 방문 전 자동으로 본인부담금을 결제합니다.',
    paymentMethod: '결제 방법', addPaymentMethod: '결제 방법 추가',
    makePayment: '결제하기', paymentAmount: '결제 금액', processPayment: '결제 처리',
    paymentSuccess: '결제 완료!', paymentProcessing: '결제 처리 중...',
    preVisitPayment: '방문 전 결제', postVisitPayment: '방문 후 결제',
    estimatedCopay: '예상 본인부담금', amountDue: '청구 금액', paidOn: '결제일',
    pending: '대기 중', paid: '결제됨', paymentType: '결제 유형', amount: '금액',
    date: '날짜', status: '상태', noPaymentHistory: '결제 내역 없음',
    payPreVisit: '방문 전 본인부담금을 결제하세요', language: '언어',
    messagesWithTeam: '담당 팀과의 메시지', myMedications: '내 약물',
    noActiveMeds: '활성 약물 없음', clickRequestRefill: '"리필 요청"을 클릭하여 의사에게 보내세요',
  },
  vi: {
    home: 'Trang chủ', messages: 'Tin nhắn', medications: 'Thuốc', appointments: 'Lịch hẹn',
    bookAppointment: 'Đặt lịch hẹn', assessments: 'Đánh giá', insurance: 'Bảo hiểm',
    telehealth: 'Khám từ xa', billing: 'Hóa đơn & Thanh toán', signOut: 'Đăng xuất',
    welcomeBack: 'Chào mừng trở lại', nextAppointment: 'Lịch hẹn tiếp theo', messageProvider: 'Nhắn bác sĩ',
    completeAssessments: 'Hoàn thành đánh giá', appointmentReminder: 'Nhắc nhở lịch hẹn',
    today: 'HÔM NAY', tomorrow: 'NGÀY MAI', activeMeds: 'Thuốc đang dùng', upcomingAppts: 'Lịch hẹn sắp tới',
    assessmentsDue: 'Đánh giá cần làm', yourCareTeam: 'Đội ngũ y tế', myPreferences: 'Cài đặt của tôi',
    preferredPharmacy: 'Nhà thuốc ưa thích', preferredLab: 'Phòng xét nghiệm', savePreferences: 'Lưu cài đặt',
    saved: 'Đã lưu', currentMedications: 'Thuốc hiện tại', viewAll: 'Xem tất cả',
    crisisResources: 'Tài nguyên khủng hoảng', requestRefill: 'Yêu cầu kê lại', requested: 'Đã yêu cầu',
    contactOffice: 'Liên hệ phòng khám', send: 'Gửi', typeMessage: 'Nhập tin nhắn cho bác sĩ...',
    checkInOnline: 'Đăng ký trực tuyến', checkInNow: 'Đăng ký ngay', checkedIn: 'Đã đăng ký',
    myAppointments: 'Lịch hẹn của tôi', requestAppointment: 'Yêu cầu lịch hẹn',
    noUpcomingAppts: 'Không có lịch hẹn sắp tới', pastAppointments: 'Lịch hẹn đã qua',
    onlineCheckIn: 'Đăng ký trực tuyến', bookAnAppointment: 'Đặt lịch hẹn',
    provider: 'Bác sĩ', duration: 'Thời gian', visitType: 'Loại khám', appointmentType: 'Loại hẹn',
    notes: 'Ghi chú', confirmAppointment: 'Xác nhận lịch hẹn', cancel: 'Hủy',
    appointmentBooked: 'Đặt lịch thành công!', selectTimeSlot: 'Chọn khung giờ từ lịch.',
    bookingDetails: 'Chi tiết đặt lịch', available: 'Có sẵn', selected: 'Đã chọn',
    insuranceInfo: 'Thông tin bảo hiểm', primaryInsurance: 'Bảo hiểm chính',
    secondaryInsurance: 'Bảo hiểm phụ', submitInsuranceUpdate: 'Cập nhật bảo hiểm',
    eligibilityVerification: 'Xác minh quyền lợi', checkEligibility: 'Kiểm tra',
    checking: 'Đang kiểm tra...', coverageActive: 'Bảo hiểm còn hiệu lực',
    telehealthInfo: 'Thông tin khám từ xa', joinSession: 'Tham gia',
    noTelehealthVisits: 'Không có lịch khám từ xa', beforeYourVisit: 'Trước buổi khám',
    technicalRequirements: 'Yêu cầu kỹ thuật',
    billingPayments: 'Hóa đơn & Thanh toán', outstandingBalance: 'Số dư chưa thanh toán',
    payNow: 'Thanh toán', paymentHistory: 'Lịch sử thanh toán', autoPaySettings: 'Cài đặt tự động thanh toán',
    enableAutoPay: 'Bật tự động thanh toán', autoPayEnabled: 'Tự động thanh toán đang hoạt động',
    autoPayDesc: 'Tự động thanh toán trước mỗi buổi khám.',
    paymentMethod: 'Phương thức thanh toán', addPaymentMethod: 'Thêm phương thức',
    makePayment: 'Thanh toán', paymentAmount: 'Số tiền', processPayment: 'Xử lý thanh toán',
    paymentSuccess: 'Thanh toán thành công!', paymentProcessing: 'Đang xử lý...',
    preVisitPayment: 'Thanh toán trước khám', postVisitPayment: 'Thanh toán sau khám',
    estimatedCopay: 'Đồng chi trả dự kiến', amountDue: 'Số tiền cần trả', paidOn: 'Thanh toán ngày',
    pending: 'Đang chờ', paid: 'Đã thanh toán', paymentType: 'Loại thanh toán', amount: 'Số tiền',
    date: 'Ngày', status: 'Trạng thái', noPaymentHistory: 'Chưa có lịch sử thanh toán',
    payPreVisit: 'Thanh toán đồng chi trả trước buổi khám', language: 'Ngôn ngữ',
    messagesWithTeam: 'Tin nhắn với Nhóm Chăm sóc', myMedications: 'Thuốc của Tôi',
    noActiveMeds: 'Không có thuốc đang dùng', clickRequestRefill: 'Nhấn "Yêu cầu cấp lại" để gửi cho bác sĩ',
  },
  ht: {
    home: 'Akèy', messages: 'Mesaj', medications: 'Medikaman', appointments: 'Randevou',
    bookAppointment: 'Pran Randevou', assessments: 'Evalyasyon', insurance: 'Asirans',
    telehealth: 'Telesante', billing: 'Fakti & Pèman', signOut: 'Dekonekte',
    welcomeBack: 'Byenveni ankò', nextAppointment: 'Pwochen Randevou', messageProvider: 'Mesaj Doktè',
    completeAssessments: 'Konplete Evalyasyon', appointmentReminder: 'Rapèl Randevou',
    today: 'JODI A', tomorrow: 'DEMEN', activeMeds: 'Medikaman Aktif', upcomingAppts: 'Pwochen Randevou',
    assessmentsDue: 'Evalyasyon Dwe Fèt', yourCareTeam: 'Ekip Swen Ou', myPreferences: 'Preferans Mwen',
    preferredPharmacy: 'Famasi Prefere', preferredLab: 'Laboratwa Prefere', savePreferences: 'Sove Preferans',
    saved: 'Sove', currentMedications: 'Medikaman Aktyèl', viewAll: 'Gade Tout',
    crisisResources: 'Resous Kriz', requestRefill: 'Mande Ranpli', requested: 'Mande',
    contactOffice: 'Kontakte biwo', send: 'Voye', typeMessage: 'Ekri yon mesaj pou doktè ou...',
    checkInOnline: 'Tcheke Antre', checkInNow: 'Tcheke Kounye a', checkedIn: 'Tcheke',
    myAppointments: 'Randevou Mwen', requestAppointment: 'Mande Randevou',
    noUpcomingAppts: 'Pa gen randevou k ap vini', pastAppointments: 'Ansyen Randevou',
    onlineCheckIn: 'Tcheke Antre sou Entènèt', bookAnAppointment: 'Pran yon Randevou',
    provider: 'Doktè', duration: 'Dire', visitType: 'Tip Vizit', appointmentType: 'Tip Randevou',
    notes: 'Nòt', confirmAppointment: 'Konfime Randevou', cancel: 'Anile',
    appointmentBooked: 'Randevou Rezève!', selectTimeSlot: 'Chwazi yon lè nan orè a.',
    bookingDetails: 'Detay Rezèvasyon', available: 'Disponib', selected: 'Chwazi',
    insuranceInfo: 'Enfòmasyon Asirans', primaryInsurance: 'Asirans Prensipal',
    secondaryInsurance: 'Asirans Segondè', submitInsuranceUpdate: 'Soumèt Mizajou Asirans',
    eligibilityVerification: 'Verifikasyon Elijibilite', checkEligibility: 'Verifye',
    checking: 'Verifikasyon...', coverageActive: 'Kouvèti Aktif',
    telehealthInfo: 'Enfòmasyon Telesante', joinSession: 'Antre',
    noTelehealthVisits: 'Pa gen Vizit Telesante', beforeYourVisit: 'Anvan Vizit Ou',
    technicalRequirements: 'Kondisyon Teknik',
    billingPayments: 'Fakti & Pèman', outstandingBalance: 'Balans Dwe',
    payNow: 'Peye Kounye a', paymentHistory: 'Istwa Pèman', autoPaySettings: 'Paramèt OtoPèman',
    enableAutoPay: 'Aktive OtoPèman', autoPayEnabled: 'OtoPèman Aktif',
    autoPayDesc: 'Peye otomatikman kopeman ou anvan chak vizit.',
    paymentMethod: 'Metòd Pèman', addPaymentMethod: 'Ajoute Metòd Pèman',
    makePayment: 'Fè yon Pèman', paymentAmount: 'Montan Pèman', processPayment: 'Trete Pèman',
    paymentSuccess: 'Pèman Reyisi!', paymentProcessing: 'Ap trete pèman...',
    preVisitPayment: 'Pèman Avan Vizit', postVisitPayment: 'Pèman Apre Vizit',
    estimatedCopay: 'Kopeman Estime', amountDue: 'Montan Dwe', paidOn: 'Peye nan',
    pending: 'An Atant', paid: 'Peye', paymentType: 'Tip Pèman', amount: 'Montan',
    date: 'Dat', status: 'Estati', noPaymentHistory: 'Pa gen istwa pèman',
    payPreVisit: 'Peye kopeman ou anvan vizit ou', language: 'Lang',
    messagesWithTeam: 'Mesaj ak Ekip Swen Ou', myMedications: 'Medikaman Mwen',
    noActiveMeds: 'Pa gen medikaman aktif', clickRequestRefill: 'Klike "Mande Ranpli" pou voye bay doktè ou',
  },
};

/* ── Assessment tool registry ──────────────────────────────── */
const ASSESSMENT_TOOLS = {
  phq9:  { key: 'phq9',  tool: 'PHQ-9',  name: 'PHQ-9 — Patient Health Questionnaire',  category: 'Depression',  questions: PHQ9_QUESTIONS,  maxScore: 27, color: '#0066cc', bg: '#eff6ff',  icon: '📋', description: 'A 9-item validated instrument for screening, diagnosing, and measuring the severity of depression.',  required: true },
  gad7:  { key: 'gad7',  tool: 'GAD-7',  name: 'GAD-7 — Generalized Anxiety Disorder',   category: 'Anxiety',     questions: GAD7_QUESTIONS,  maxScore: 21, color: '#7c3aed', bg: '#f5f3ff',  icon: '📋', description: 'A 7-item validated instrument for screening and measuring the severity of generalized anxiety disorder.', required: true },
  cssrs: { key: 'cssrs', tool: 'C-SSRS', name: 'C-SSRS — Columbia Suicide Severity Rating Scale', category: 'Safety',  questions: CSSRS_QUESTIONS, maxScore: 6,  color: '#dc2626', bg: '#fef2f2', icon: '🛡️', description: 'A structured interview to assess suicidal ideation and behavior. Used at every visit for safety screening.' },
  pcl5:  { key: 'pcl5',  tool: 'PCL-5',  name: 'PCL-5 — PTSD Checklist',                 category: 'Trauma',      questions: PCL5_QUESTIONS,  maxScore: 80, color: '#ea580c', bg: '#fff7ed', icon: '📋', description: 'A 20-item self-report measure for PTSD symptom severity based on DSM-5 criteria. Cutoff 31-33.' },
  auditc:{ key: 'auditc',tool: 'AUDIT-C', name: 'AUDIT-C — Alcohol Use Disorders Test',   category: 'Substance',   questions: AUDITC_QUESTIONS,maxScore: 12, color: '#0891b2', bg: '#ecfeff', icon: '🍷', description: 'A 3-item alcohol screening tool to identify hazardous drinking or active alcohol use disorders.' },
  dast10:{ key: 'dast10',tool: 'DAST-10', name: 'DAST-10 — Drug Abuse Screening Test',    category: 'Substance',   questions: DAST10_QUESTIONS,maxScore: 10, color: '#4f46e5', bg: '#eef2ff', icon: '💊', description: 'A 10-item screening instrument for drug use (excluding alcohol and tobacco).' },
  asrs:  { key: 'asrs',  tool: 'ASRS v1.1',name: 'ASRS v1.1 — Adult ADHD Self-Report Scale',category: 'ADHD',      questions: ASRS_QUESTIONS,  maxScore: 24, color: '#059669', bg: '#ecfdf5', icon: '🧠', description: 'A 6-question screener developed with the WHO for adult Attention-Deficit/Hyperactivity Disorder.' },
  mdq:   { key: 'mdq',   tool: 'MDQ',     name: 'MDQ — Mood Disorder Questionnaire',      category: 'Bipolar',     questions: MDQ_QUESTIONS,   maxScore: 13, color: '#d97706', bg: '#fffbeb', icon: '🌗', description: 'A 13-item Yes/No self-report screening instrument for bipolar spectrum disorders.' },
  moca:  { key: 'moca',  tool: 'MoCA',    name: 'MoCA — Montreal Cognitive Assessment',    category: 'Cognition',   questions: MOCA_CATEGORIES.map(c => c.name), maxScore: 30, color: '#64748b', bg: '#f8fafc', icon: '🧩', description: 'A cognitive screening tool for Mild Cognitive Impairment (MCI). Normal score ≥ 26/30. Requires clinician administration.' },
};

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const PHARMACIES = [
  'CVS Pharmacy - Main St',
  'Walgreens - Downtown',
  'Rite Aid - Springfield',
  "Walmart Pharmacy - East Side",
  'Costco Pharmacy',
  'Hospital Outpatient Pharmacy',
  'Clarity Specialty Pharmacy',
  'Express Scripts Mail Order',
];

const LABS = [
  'Quest Diagnostics - Springfield',
  'LabCorp - Downtown Medical Center',
  'Clarity Hospital Lab',
  'BioReference Laboratories',
  'University Clinical Lab',
];

const TABS = [
  { key: 'home', icon: '🏠', label: 'home' },
  { key: 'messages', icon: '💬', label: 'messages' },
  { key: 'medications', icon: '💊', label: 'medications' },
  { key: 'appointments', icon: '📅', label: 'appointments' },
  { key: 'schedule', icon: '🗓️', label: 'bookAppointment' },
  { key: 'assessments', icon: '📊', label: 'assessments' },
  { key: 'billing', icon: '💳', label: 'billing' },
  { key: 'insurance', icon: '🏥', label: 'insurance' },
  { key: 'telehealth', icon: '📹', label: 'telehealth' },
];

export default function PatientPortal() {
  const { currentUser, logout } = useAuth();
  const { patients, meds, appointments, assessmentScores, addInboxMessage, inboxMessages, updateAppointmentStatus, addAppointment } = usePatient();

  /* Allow page scrolling — clinical layout locks body overflow */
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.height = 'auto';
    const root = document.getElementById('root');
    if (root) root.style.height = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.documentElement.style.height = '';
      if (root) root.style.height = '';
    };
  }, []);

  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang] = useState('en');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isRTL = lang === 'ar';

  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your Clarity AI Assistant. I can help with appointment questions, medication info, billing, and more. How can I help you today?' }
  ]);
  const [aiInput, setAiInput] = useState('');

  const AI_RESPONSES = {
    appointment: 'Your next appointment is shown in the Appointments tab. To reschedule, click the appointment and select "Request Reschedule," or message your provider directly.',
    medication: 'You can view all your active medications in the Medications tab. For refill requests, click the refill button next to any medication. Always consult your provider before changing doses.',
    billing: 'Your billing information is available through your insurance section. For copay questions, contact our billing department at billing@clarity.health or call (312) 555-0199.',
    assessment: 'You have assessments to complete in the Assessments tab. These help your provider track your progress. Most take less than 5 minutes.',
    telehealth: 'Telehealth visits are conducted via secure video. Join from the Telehealth tab 5 minutes before your appointment. Make sure your camera and microphone are enabled.',
    insurance: 'Your insurance information is in the Insurance tab. To update your coverage, upload your new insurance card or contact our front desk.',
    emergency: '⚠️ If you are experiencing a medical emergency, please call 911 immediately. For the Suicide & Crisis Lifeline, call or text 988.',
    default: 'I can help with: appointments, medications, billing, assessments, telehealth, and insurance questions. Could you tell me more about what you need?',
  };

  const handleAISend = () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let response = AI_RESPONSES.default;
      if (/appoint|schedule|reschedule|cancel|when.*next/.test(lower)) response = AI_RESPONSES.appointment;
      else if (/med|medication|refill|prescription|drug|dose/.test(lower)) response = AI_RESPONSES.medication;
      else if (/bill|pay|copay|cost|charge|invoice|statement/.test(lower)) response = AI_RESPONSES.billing;
      else if (/assess|survey|phq|gad|questionnaire|screener/.test(lower)) response = AI_RESPONSES.assessment;
      else if (/teleh|video|virtual|zoom|call/.test(lower)) response = AI_RESPONSES.telehealth;
      else if (/insur|coverage|plan|deductible/.test(lower)) response = AI_RESPONSES.insurance;
      else if (/emergenc|crisis|suicid|harm|911|988/.test(lower)) response = AI_RESPONSES.emergency;
      setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 800);
  };
  const patientId = currentUser?.patientId;
  const patient = patients.find(p => p.id === patientId);

  /* ── Patient-level data ──────────────────────────────────── */
  const patMeds = (meds[patientId] || []).filter(m => m.status === 'Active');
  const patAppts = useMemo(() =>
    appointments.filter(a => a.patientId === patientId).sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`);
      const db = new Date(`${b.date}T${b.time}`);
      return da - db;
    }),
  [appointments, patientId]);
  const futureAppts = patAppts.filter(a => new Date(`${a.date}T${a.time}`) >= new Date() && a.status !== 'Completed');
  const nextAppt = futureAppts[0];
  const patAssessments = assessmentScores[patientId] || [];

  /* ── Preferences (pharmacy, lab) local state ─────────────── */
  const [preferredPharmacy, setPreferredPharmacy] = useState(() => patMeds[0]?.pharmacy || PHARMACIES[0]);
  const [preferredLab, setPreferredLab] = useState(LABS[0]);
  const [prefSaved, setPrefSaved] = useState(false);

  /* ── Reminder helpers ────────────────────────────────────── */
  const todayKey = new Date().toISOString().split('T')[0];
  const tomorrowKey = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const in48hAppts = futureAppts.filter(a =>
    (a.date === todayKey || a.date === tomorrowKey) &&
    (a.status === 'Scheduled' || a.status === 'Confirmed')
  );
  const todayCheckableAppts = futureAppts.filter(a =>
    a.date === todayKey && (a.status === 'Scheduled' || a.status === 'Confirmed')
  );

  /* ── Self-scheduling ─────────────────────────────────────── */
  const [showSelfSchedule, setShowSelfSchedule] = useState(false);
  const [selfSchedForm, setSelfSchedForm] = useState({
    preferredDate1: '', preferredDate2: '', preferredDate3: '',
    visitType: 'In-Person', reason: '', notes: '',
  });
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false);

  const submitSelfSchedule = () => {
    addInboxMessage({
      type: 'Staff Message',
      from: `${currentUser?.firstName} ${currentUser?.lastName} (Patient Portal)`,
      subject: `Appointment Request — ${currentUser?.firstName} ${currentUser?.lastName}`,
      body: `Patient is requesting an appointment.\n\nPatient: ${patient?.firstName} ${patient?.lastName} (${patient?.mrn})\nVisit Type: ${selfSchedForm.visitType}\nReason: ${selfSchedForm.reason}\nPreferred Date 1: ${selfSchedForm.preferredDate1||'—'}\nPreferred Date 2: ${selfSchedForm.preferredDate2||'—'}\nPreferred Date 3: ${selfSchedForm.preferredDate3||'—'}\nNotes: ${selfSchedForm.notes||'None'}`,
      patient: patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: false,
    });
    setScheduleSubmitted(true);
    setTimeout(() => { setShowSelfSchedule(false); setScheduleSubmitted(false); setSelfSchedForm({ preferredDate1:'', preferredDate2:'', preferredDate3:'', visitType:'In-Person', reason:'', notes:'' }); }, 3500);
  };

  /* ── Live schedule booking ───────────────────────────────── */
  const schedulableProviders = useMemo(() =>
    allUsers.filter(u => u.role === 'prescriber' || u.role === 'therapist')
      .map(u => ({
        id: u.id,
        name: u.role === 'prescriber' ? `Dr. ${u.firstName} ${u.lastName}` : `${u.firstName} ${u.lastName}, ${u.credentials}`,
        role: u.role,
        specialty: u.specialty,
        credentials: u.credentials,
        durations: u.role === 'therapist' ? [60] : [15, 30],
      })),
    []
  );
  const [liveSchedProvider, setLiveSchedProvider] = useState(schedulableProviders[0]?.id || '');
  const [liveSchedWeekStart, setLiveSchedWeekStart] = useState(() => {
    const d = new Date(); const day = d.getDay();
    const diff = day === 0 ? 1 : day === 6 ? 2 : 0;
    d.setDate(d.getDate() + diff); d.setHours(0,0,0,0);
    // Monday of current or next week
    const mon = new Date(d); mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
    return mon;
  });
  const [liveSchedDuration, setLiveSchedDuration] = useState(30);
  const [liveSchedVisitType, setLiveSchedVisitType] = useState('In-Person');
  const [liveSchedReason, setLiveSchedReason] = useState('Follow-Up');
  const [liveSchedSelectedSlot, setLiveSchedSelectedSlot] = useState(null); // { date, time }
  const [liveSchedConfirmed, setLiveSchedConfirmed] = useState(false);
  const [liveSchedNotes, setLiveSchedNotes] = useState('');

  const selectedProviderObj = useMemo(() => schedulableProviders.find(p => p.id === liveSchedProvider), [schedulableProviders, liveSchedProvider]);

  // Ensure duration matches provider type when switching providers
  useEffect(() => {
    if (selectedProviderObj) {
      if (!selectedProviderObj.durations.includes(liveSchedDuration)) {
        setLiveSchedDuration(selectedProviderObj.durations[0]);
      }
    }
  }, [selectedProviderObj]);

  // Generate week days (Mon-Fri)
  const liveSchedWeekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(liveSchedWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [liveSchedWeekStart]);

  // Generate available slots for the selected provider/week
  const OFFICE_START = 8; // 8 AM
  const OFFICE_END = 17;  // 5 PM
  const liveSchedSlots = useMemo(() => {
    if (!liveSchedProvider) return {};
    const slotsByDay = {};
    const now = new Date();
    liveSchedWeekDays.forEach(dayDate => {
      const dateStr = dayDate.toISOString().split('T')[0];
      // Skip past days
      if (dayDate < new Date(now.toISOString().split('T')[0])) { slotsByDay[dateStr] = []; return; }
      // Get all existing appointments for this provider on this day
      const dayAppts = appointments.filter(a => a.provider === liveSchedProvider && a.date === dateStr);
      // Build occupied time ranges (in minutes from midnight)
      const occupied = dayAppts.map(a => {
        const [h, m] = a.time.split(':').map(Number);
        return { start: h * 60 + m, end: h * 60 + m + (a.duration || 30) };
      });
      // Generate candidate slots
      const candidates = [];
      for (let min = OFFICE_START * 60; min + liveSchedDuration <= OFFICE_END * 60; min += 15) {
        const slotStart = min;
        const slotEnd = min + liveSchedDuration;
        // Check if current time has passed for today
        if (dateStr === todayKey) {
          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (slotStart <= nowMin + 30) continue; // Must be at least 30 min in the future
        }
        // Check for overlap with any existing appointment
        const overlaps = occupied.some(o => slotStart < o.end && slotEnd > o.start);
        if (!overlaps) {
          const hh = String(Math.floor(min / 60)).padStart(2, '0');
          const mm = String(min % 60).padStart(2, '0');
          candidates.push({ time: `${hh}:${mm}`, available: true });
        }
      }
      slotsByDay[dateStr] = candidates;
    });
    return slotsByDay;
  }, [liveSchedProvider, liveSchedWeekDays, appointments, liveSchedDuration, todayKey]);

  const confirmLiveBooking = useCallback(() => {
    if (!liveSchedSelectedSlot || !liveSchedProvider || !patient) return;
    const provObj = schedulableProviders.find(p => p.id === liveSchedProvider);
    const newApt = {
      id: `pat-book-${Date.now()}`,
      patientId: patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      provider: liveSchedProvider,
      providerName: provObj?.name || '',
      date: liveSchedSelectedSlot.date,
      time: liveSchedSelectedSlot.time,
      duration: liveSchedDuration,
      type: liveSchedReason,
      status: 'Scheduled',
      reason: `Patient self-scheduled: ${liveSchedReason}${liveSchedNotes ? ' — ' + liveSchedNotes : ''}`,
      visitType: liveSchedVisitType,
      room: liveSchedVisitType === 'Telehealth' ? 'Virtual' : 'TBD',
    };
    addAppointment(newApt);
    addInboxMessage({
      type: 'Staff Message',
      from: `${currentUser?.firstName} ${currentUser?.lastName} (Patient Portal)`,
      subject: `New Appointment Booked — ${patient.firstName} ${patient.lastName}`,
      body: `Patient has booked an appointment via the Patient Portal.\n\nPatient: ${patient.firstName} ${patient.lastName} (${patient.mrn})\nProvider: ${provObj?.name}\nDate: ${liveSchedSelectedSlot.date}\nTime: ${liveSchedSelectedSlot.time}\nDuration: ${liveSchedDuration} min\nType: ${liveSchedReason}\nVisit: ${liveSchedVisitType}\nNotes: ${liveSchedNotes || 'None'}`,
      patient: patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: false,
    });
    setLiveSchedConfirmed(true);
    setTimeout(() => {
      setLiveSchedConfirmed(false);
      setLiveSchedSelectedSlot(null);
      setLiveSchedNotes('');
    }, 4000);
  }, [liveSchedSelectedSlot, liveSchedProvider, patient, liveSchedDuration, liveSchedReason, liveSchedVisitType, liveSchedNotes, addAppointment, addInboxMessage, currentUser, patientId, schedulableProviders]);

  /* ── Online check-in ─────────────────────────────────────── */
  const [checkInApt, setCheckInApt] = useState(null);
  const [checkInStep, setCheckInStep] = useState(1);
  const [checkInData, setCheckInData] = useState({ reason: '', symptoms: '', emergencyName: '', emergencyPhone: '', consentSigned: false });
  const [checkInComplete, setCheckInComplete] = useState({});

  const submitCheckIn = (apt) => {
    updateAppointmentStatus(apt.id, 'Checked In', { checkInTime: Date.now(), onlineCheckIn: true });
    addInboxMessage({
      type: 'Check-in Alert',
      from: 'Patient Portal',
      subject: `Online Check-In — ${apt.patientName}`,
      body: `${apt.patientName} has completed online check-in for their ${apt.time} appointment.\n\nReason for Visit: ${checkInData.reason || apt.reason}\nCurrent Symptoms: ${checkInData.symptoms || 'None noted'}\nEmergency Contact: ${checkInData.emergencyName} — ${checkInData.emergencyPhone}\nConsent: Signed electronically`,
      patient: patientId,
      patientName: apt.patientName,
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: false,
    });
    setCheckInComplete(prev => ({ ...prev, [apt.id]: true }));
    setCheckInApt(null);
    setCheckInStep(1);
    setCheckInData({ reason: '', symptoms: '', emergencyName: '', emergencyPhone: '', consentSigned: false });
  };

  /* ── Insurance eligibility ───────────────────────────────── */
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);

  const runEligibilityCheck = () => {
    setEligibilityLoading(true);
    setEligibilityResult(null);
    setTimeout(() => {
      const hasInsurance = !!(insuranceForm.primaryName && insuranceForm.primaryMemberId);
      setEligibilityResult(hasInsurance ? {
        status: 'eligible',
        plan: insuranceForm.primaryName || 'Unknown Plan',
        memberId: insuranceForm.primaryMemberId,
        groupNumber: insuranceForm.primaryGroup || '—',
        copay: insuranceForm.primaryCopay || patient?.insurance?.primary?.copay,
        deductible: '$1,500',
        deductibleMet: '$850',
        outOfPocketMax: '$4,000',
        outOfPocketMet: '$850',
        mentalHealth: 'Covered — $30 copay / visit',
        effectiveDate: '01/01/2026',
        checkedAt: new Date().toLocaleTimeString(),
      } : {
        status: 'needs_info',
        checkedAt: new Date().toLocaleTimeString(),
      });
      setEligibilityLoading(false);
    }, 1800);
  };

  /* ── Messaging ───────────────────────────────────────────── */
  const [messages, setMessages] = useState(() => {
    const providerName = patient?.assignedProvider === 'u1' ? 'Dr. Chris L.' : patient?.assignedProvider === 'u2' ? 'Joseph (NP)' : 'Your Provider';
    return [
      { id: 1, from: 'provider', name: providerName, text: `Hi ${currentUser?.firstName}, just checking in. How are you feeling on your current medication regimen? Any side effects?`, time: '2026-04-08 09:15', read: true },
      { id: 2, from: 'patient', name: currentUser?.firstName, text: 'Hi! I\'m doing okay. I think the Sertraline is helping but I\'ve been having some trouble sleeping.', time: '2026-04-08 10:32', read: true },
      { id: 3, from: 'provider', name: providerName, text: 'Thank you for letting me know. We can discuss adjusting your Trazodone dose at your next appointment. In the meantime, try to avoid screens an hour before bed and keep a consistent sleep schedule.', time: '2026-04-08 14:20', read: true },
      { id: 4, from: 'system', name: 'Clarity', text: '📋 Reminder: Your PHQ-9 and GAD-7 assessments are due before your next appointment. Please complete them under the Assessments tab.', time: '2026-04-09 08:00', read: false },
    ];
  });
  const [msgInput, setMsgInput] = useState('');
  const msgEndRef = useRef(null);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeTab]);

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(), from: 'patient', name: currentUser?.firstName,
      text: msgInput.trim(), time: new Date().toISOString().replace('T', ' ').slice(0, 16), read: true,
    }]);
    // Also post to clinical inbox
    addInboxMessage({
      type: 'Patient Message',
      from: `${currentUser?.firstName} ${currentUser?.lastName} (Patient Portal)`,
      subject: `Message from ${currentUser?.firstName} ${currentUser?.lastName}`,
      body: msgInput.trim(),
      patient: patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: false,
    });
    setMsgInput('');
  };

  /* ── Refill request ──────────────────────────────────────── */
  const [refillRequested, setRefillRequested] = useState({});
  const requestRefill = (med) => {
    setRefillRequested(prev => ({ ...prev, [med.id]: true }));
    addInboxMessage({
      type: 'Rx Refill Request',
      from: `${currentUser?.firstName} ${currentUser?.lastName} (Patient Portal)`,
      subject: `Refill Request: ${med.name} ${med.dose}`,
      body: `Patient ${currentUser?.firstName} ${currentUser?.lastName} is requesting a refill of ${med.name} ${med.dose} (${med.frequency}). Preferred pharmacy: ${preferredPharmacy}. Refills remaining: ${med.refillsLeft ?? 'Unknown'}.`,
      patient: patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: false,
    });
  };

  /* ── Insurance editing ────────────────────────────────────── */
  const [insuranceForm, setInsuranceForm] = useState({
    primaryName: patient?.insurance?.primary?.name || '',
    primaryMemberId: patient?.insurance?.primary?.memberId || '',
    primaryGroup: patient?.insurance?.primary?.groupNumber || '',
    primaryCopay: patient?.insurance?.primary?.copay || '',
    secondaryName: patient?.insurance?.secondary?.name || '',
    secondaryMemberId: patient?.insurance?.secondary?.memberId || '',
    secondaryGroup: patient?.insurance?.secondary?.groupNumber || '',
  });
  const [insuranceSaved, setInsuranceSaved] = useState(false);
  const saveInsurance = () => { setInsuranceSaved(true); setTimeout(() => setInsuranceSaved(false), 3000); };

  /* ── Billing & Payment Collection ────────────────────────── */
  const copayAmount = Number(patient?.insurance?.primary?.copay || insuranceForm.primaryCopay || 30);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'pm1', type: 'Visa', last4: '4242', expiry: '08/27', isDefault: true },
  ]);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([
    { id: 'pay1', date: '2026-03-18', type: 'Copay — Follow-Up Visit', amount: copayAmount, status: 'Paid', method: 'Visa •••• 4242' },
    { id: 'pay2', date: '2026-02-20', type: 'Copay — Medication Management', amount: copayAmount, status: 'Paid', method: 'Visa •••• 4242' },
    { id: 'pay3', date: '2026-01-15', type: 'Copay — Psychiatric Evaluation', amount: copayAmount, status: 'Paid', method: 'Visa •••• 4242' },
  ]);
  const [outstandingBalance, setOutstandingBalance] = useState(() => {
    // Check if there are recent unpaid copays (past appointments without payment)
    const completedUnpaid = patAppts.filter(a => a.status === 'Completed').length > paymentHistory.length;
    return completedUnpaid ? copayAmount : 0;
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const processPayment = (amount, type = 'Copay') => {
    if (!amount || amount <= 0) return;
    setPaymentProcessing(true);
    setTimeout(() => {
      const payment = {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: type,
        amount: Number(amount),
        status: 'Paid',
        method: paymentMethods.find(p => p.isDefault)?.type ? `${paymentMethods.find(p => p.isDefault).type} •••• ${paymentMethods.find(p => p.isDefault).last4}` : 'Card on file',
      };
      setPaymentHistory(prev => [payment, ...prev]);
      setOutstandingBalance(prev => Math.max(0, prev - Number(amount)));
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      addInboxMessage({
        type: 'Payment Receipt',
        from: 'Clarity Billing',
        subject: `Payment Received — $${Number(amount).toFixed(2)}`,
        body: `Payment of $${Number(amount).toFixed(2)} has been processed for ${type}.\n\nPayment Method: ${payment.method}\nDate: ${payment.date}\nPatient: ${patient?.firstName} ${patient?.lastName}\n\nThank you for your payment.`,
        patient: patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
        date: new Date().toISOString().split('T')[0],
        status: 'Unread',
        urgent: false,
      });
      setTimeout(() => {
        setPaymentSuccess(false);
        setShowPaymentModal(false);
        setPaymentAmountInput('');
      }, 3000);
    }, 2000);
  };

  const addNewCard = () => {
    if (!newCard.number || !newCard.expiry || !newCard.cvv) return;
    const last4 = newCard.number.replace(/\s/g, '').slice(-4);
    const type = newCard.number.startsWith('4') ? 'Visa' : newCard.number.startsWith('5') ? 'Mastercard' : newCard.number.startsWith('3') ? 'Amex' : 'Card';
    setPaymentMethods(prev => [...prev.map(p => ({ ...p, isDefault: false })), {
      id: `pm-${Date.now()}`, type, last4, expiry: newCard.expiry, isDefault: true,
    }]);
    setShowAddCard(false);
    setNewCard({ number: '', expiry: '', cvv: '', name: '' });
  };

  /* ── Assessment taking ────────────────────────────────────── */
  const [assessmentMode, setAssessmentMode] = useState(null); // key from ASSESSMENT_TOOLS
  const [assessmentAnswers, setAssessmentAnswers] = useState([]);
  const [assessmentSubmitted, setAssessmentSubmitted] = useState({});

  /* ── Weekly check-in ──────────────────────────────────────── */
  const [ciAnswers, setCiAnswers] = useState(new Array(4).fill(-1));
  const [ciResult, setCiResult] = useState(null);

  const startAssessment = (type) => {
    const toolDef = ASSESSMENT_TOOLS[type];
    if (!toolDef) return;
    if (type === 'moca') {
      // MoCA uses category-based scoring
      setAssessmentAnswers(new Array(MOCA_CATEGORIES.length).fill(-1));
    } else {
      setAssessmentAnswers(new Array(toolDef.questions.length).fill(-1));
    }
    setAssessmentMode(type);
  };
  const setAnswer = (idx, val) => {
    setAssessmentAnswers(prev => { const n = [...prev]; n[idx] = val; return n; });
  };
  const getInterpretation = (type, total) => {
    switch (type) {
      case 'phq9':
        return total <= 4 ? 'Minimal Depression' : total <= 9 ? 'Mild Depression' : total <= 14 ? 'Moderate Depression' : total <= 19 ? 'Moderately Severe Depression' : 'Severe Depression';
      case 'gad7':
        return total <= 4 ? 'Minimal Anxiety' : total <= 9 ? 'Mild Anxiety' : total <= 14 ? 'Moderate Anxiety' : 'Severe Anxiety';
      case 'cssrs':
        return total === 0 ? 'No Suicidal Ideation' : total <= 2 ? 'Low Risk — Passive Ideation' : total <= 4 ? 'Moderate Risk — Active Ideation' : 'High Risk — Active Ideation with Plan';
      case 'pcl5':
        return total < 31 ? 'Below PTSD Threshold' : total <= 33 ? 'Borderline PTSD' : 'Probable PTSD';
      case 'auditc':
        return total <= 2 ? 'Low Risk' : total <= 3 ? 'Moderate Risk' : 'Positive for Alcohol Misuse';
      case 'dast10':
        return total === 0 ? 'No Problems Reported' : total <= 2 ? 'Low Level' : total <= 5 ? 'Moderate Level' : total <= 8 ? 'Substantial Level' : 'Severe Level';
      case 'asrs':
        return total >= 14 ? 'Highly Consistent with ADHD' : total >= 10 ? 'Possible ADHD' : 'Low Likelihood of ADHD';
      case 'mdq':
        return total >= 7 ? 'Positive for Bipolar Spectrum' : 'Negative Screen';
      case 'moca':
        return total >= 26 ? 'Normal Cognition' : total >= 18 ? 'Mild Cognitive Impairment' : 'Possible Dementia';
      default: return '';
    }
  };
  const submitAssessment = () => {
    const total = assessmentAnswers.reduce((sum, v) => sum + (v >= 0 ? v : 0), 0);
    const toolDef = ASSESSMENT_TOOLS[assessmentMode];
    const interpretation = getInterpretation(assessmentMode, total);
    addInboxMessage({
      type: 'Patient Message',
      from: `${currentUser?.firstName} ${currentUser?.lastName} (Patient Portal)`,
      subject: `${toolDef.tool} Assessment Completed — Score: ${total}`,
      body: `Patient completed ${toolDef.tool} via Patient Portal.\n\nScore: ${total}/${toolDef.maxScore}\nInterpretation: ${interpretation}\nAnswers: [${assessmentAnswers.join(', ')}]\nDate: ${new Date().toLocaleDateString()}`,
      patient: patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      date: new Date().toISOString().split('T')[0],
      status: 'Unread',
      urgent: (assessmentMode === 'cssrs' && total >= 3) || (assessmentMode === 'phq9' && total >= 20),
    });
    setAssessmentSubmitted(prev => ({ ...prev, [assessmentMode]: { score: total, maxScore: toolDef.maxScore, interpretation, date: new Date().toLocaleDateString() } }));
    setAssessmentMode(null);
  };

  /* ── Telehealth ────────────────────────────────────────────── */
  const teleAppts = futureAppts.filter(a => a.visitType === 'Telehealth');

  if (!patient) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Patient record not found</h2>
          <p style={{ color: '#6b7ea0', marginTop: 8 }}>Please contact your care team for portal access.</p>
          <button onClick={logout} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#0066cc', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>
    );
  }

  const providerName = patient.assignedProvider === 'u1' ? 'Dr. Chris L., MD PhD' : patient.assignedProvider === 'u2' ? 'Joseph, PMHNP-BC' : patient.assignedProvider === 'u3' ? 'Dr. Irina S., MD' : 'Your Provider';

  /* ── Styles ──────────────────────────────────────────────── */
  const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' };
  const cardHeaderStyle = (icon) => ({ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', letterSpacing: '-0.2px' });
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="patient-portal-root" style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Inter', -apple-system, sans-serif", direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #0d2444 0%, #1b3d6e 100%)',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        gap: 16, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>Clarity</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Patient Portal</div>
          </div>
        </div>

        {/* Tab Nav */}
        <nav style={{ display: 'flex', gap: 2, height: '100%', overflowX: 'auto', flexShrink: 1, minWidth: 0, alignItems: 'stretch' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: isActive ? 700 : 500,
                display: 'flex', alignItems: 'center', gap: 5, position: 'relative', whiteSpace: 'nowrap', flexShrink: 0,
                borderBottom: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                transition: 'all 0.15s', boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 14 }}>{tab.icon}</span> {t[tab.label] || tab.label}
              </button>
            );
          })}
        </nav>

        {/* Language + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Language Picker */}
          <div style={{ position: 'relative' }}>
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              style={{
                padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', appearance: 'none',
                paddingRight: 22, minWidth: 80,
              }}
              title={t.language}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} style={{ color: '#1e293b', background: '#fff' }}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>▼</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>MRN {patient.mrn}</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
          }}>
            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
          </div>
          <button onClick={logout} style={{
            padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{t.signOut}</button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ════════════ HOME TAB ════════════ */}
        {activeTab === 'home' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Welcome banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1b3d6e 0%, #0055a8 100%)',
              borderRadius: 14, padding: '28px 32px', marginBottom: 24, color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>
                  {t.welcomeBack}, {currentUser?.firstName}
                </h1>
                <p style={{ opacity: 0.7, fontSize: 13 }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                {nextAppt && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', padding: '8px 14px', borderRadius: 8, width: 'fit-content' }}>
                    <span style={{ fontSize: 16 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{t.nextAppointment}: {new Date(nextAppt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {nextAppt.time}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{nextAppt.type} with {nextAppt.providerName} · {nextAppt.visitType}</div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setActiveTab('messages')} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💬 {t.messageProvider}</button>
                <button onClick={() => setActiveTab('assessments')} style={{ padding: '8px 18px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📊 {t.completeAssessments}</button>
              </div>
            </div>

            {/* Appointment reminder banner */}
            {in48hAppts.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fef9ee 100%)', border: '1.5px solid #fde068', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                    {t.appointmentReminder}
                  </div>
                  {in48hAppts.map(a => (
                    <div key={a.id} style={{ fontSize: 13, color: '#78350f' }}>
                      <strong>{a.date === todayKey ? `🔴 ${t.today}` : `🟡 ${t.tomorrow}`}</strong> — {a.type} with {a.providerName} at <strong>{a.time}</strong> ({a.visitType})
                    </div>
                  ))}
                </div>
                {todayCheckableAppts.length > 0 && (
                  <button
                    onClick={() => { setActiveTab('appointments'); }}
                    style={{ padding: '8px 18px', borderRadius: 8, background: '#d97706', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    ✅ {t.checkInOnline}
                  </button>
                )}
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              {[
                { icon: '💊', label: t.activeMeds, value: patMeds.length, color: '#3b82f6', onClick: () => setActiveTab('medications') },
                { icon: '📅', label: t.upcomingAppts, value: futureAppts.length, color: '#8b5cf6', onClick: () => setActiveTab('appointments') },
                { icon: '💬', label: t.messages, value: messages.filter(m => !m.read).length || 0, color: '#10b981', onClick: () => setActiveTab('messages') },
                { icon: '📊', label: t.assessmentsDue, value: (assessmentSubmitted.phq9 ? 0 : 1) + (assessmentSubmitted.gad7 ? 0 : 1), color: '#f59e0b', onClick: () => setActiveTab('assessments') },
              ].map(s => (
                <div key={s.label} onClick={s.onClick} style={{
                  ...cardStyle, cursor: 'pointer', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Two-column: Provider info + Preferences */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
              {/* Care Team */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle()}>🩺 {t.yourCareTeam}</div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                      {providerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{providerName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Psychiatry · Primary Provider</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                    <div><strong>PCP:</strong> {patient.pcp || '—'}</div>
                    <div><strong>Phone:</strong> (555) 100-2000</div>
                    <div><strong>After Hours:</strong> Call 988 (Suicide & Crisis Lifeline)</div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle()}>⚙️ {t.myPreferences}</div>
                <div style={{ padding: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={sectionLabel}>{t.preferredPharmacy}</label>
                    <select value={preferredPharmacy} onChange={e => { setPreferredPharmacy(e.target.value); setPrefSaved(false); }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                      {PHARMACIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={sectionLabel}>{t.preferredLab}</label>
                    <select value={preferredLab} onChange={e => { setPreferredLab(e.target.value); setPrefSaved(false); }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                      {LABS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 3000); }}
                    style={{ padding: '7px 18px', borderRadius: 6, background: '#0066cc', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {prefSaved ? `✅ ${t.saved}` : t.savePreferences}
                  </button>
                </div>
              </div>
            </div>

            {/* Medications preview */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ ...cardHeaderStyle(), justifyContent: 'space-between' }}>
                <span>💊 {t.currentMedications}</span>
                <button onClick={() => setActiveTab('medications')} style={{ background: 'none', border: 'none', color: '#0066cc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.viewAll} →</button>
              </div>
              <div style={{ padding: 0 }}>
                {patMeds.slice(0, 4).map(m => (
                  <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{m.dose} · {m.frequency}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
                      Last filled: {m.lastFilled || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crisis resources */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', marginBottom: 6 }}>🚨 {t.crisisResources}</div>
              <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.7 }}>
                <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988 · <strong>Crisis Text Line:</strong> Text HOME to 741741 · <strong>Emergency:</strong> Call 911
              </div>
            </div>
          </div>
        )}

        {/* ════════════ MESSAGES TAB ════════════ */}
        {activeTab === 'messages' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ ...cardStyle, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...cardHeaderStyle(), justifyContent: 'space-between' }}>
                <span>💬 {t.messagesWithTeam || 'Messages with Your Care Team'}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{t.provider || 'Provider'}: {providerName}</span>
              </div>

              {/* Message thread */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', justifyContent: m.from === 'patient' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                      background: m.from === 'patient' ? '#0066cc' : m.from === 'system' ? '#fef3c7' : '#fff',
                      color: m.from === 'patient' ? '#fff' : '#1e293b',
                      border: m.from === 'system' ? '1px solid #fde68a' : m.from === 'provider' ? '1px solid #e2e8f0' : 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: m.from === 'patient' ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: 4 }}>
                        {m.from === 'system' ? '⚙️ System' : m.name} · {m.time.split(' ')[1] || m.time}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{m.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>

              {/* Compose */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, background: '#fff' }}>
                <input
                  type="text"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t.typeMessage || 'Type a message to your provider...'}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                />
                <button onClick={sendMessage} disabled={!msgInput.trim()} style={{
                  padding: '10px 20px', borderRadius: 8, background: msgInput.trim() ? '#0066cc' : '#cbd5e1',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: msgInput.trim() ? 'pointer' : 'not-allowed',
                }}>{t.send || 'Send'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ MEDICATIONS TAB ════════════ */}
        {activeTab === 'medications' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Pharmacy + Lab info bar */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{ ...cardStyle, flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🏪</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.preferredPharmacy}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{preferredPharmacy}</div>
                </div>
              </div>
              <div style={{ ...cardStyle, flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🔬</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.preferredLab}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{preferredLab}</div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ ...cardHeaderStyle(), justifyContent: 'space-between' }}>
                <span>💊 {t.myMedications || 'My Medications'} ({patMeds.length} {t.activeMeds})</span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{t.clickRequestRefill || 'Click "Request Refill" to send to your provider'}</span>
              </div>
              <div>
                {patMeds.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
                    <div style={{ fontWeight: 700 }}>{t.noActiveMeds || 'No active medications'}</div>
                  </div>
                ) : patMeds.map(m => {
                  const lastHistory = m.rxHistory?.[0];
                  return (
                    <div key={m.id} style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: m.isControlled ? '#fef3c7' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                      }}>
                        {m.isControlled ? '⚠️' : '💊'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                          {m.isControlled && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#fef3c7', color: '#92400e' }}>Schedule {m.schedule}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                          <strong>{m.dose}</strong> · {m.route} · {m.frequency}
                        </div>
                        {m.sig && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>Sig: {m.sig}</div>}
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span>📅 Last filled: <strong>{m.lastFilled || '—'}</strong></span>
                          <span>🔄 Refills remaining: <strong>{m.refillsLeft ?? '—'}</strong></span>
                          <span>👨‍⚕️ Prescriber: {m.prescriber}</span>
                          <span>🏪 Pharmacy: {m.pharmacy}</span>
                        </div>
                        {lastHistory && (
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                            Last Rx: {lastHistory.type} on {lastHistory.date} · Qty: {lastHistory.qty} · #{lastHistory.refillNumber}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {m.isControlled ? (
                          <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, padding: '6px 12px', background: '#fef3c7', borderRadius: 6 }}>
                            Contact office
                          </div>
                        ) : refillRequested[m.id] ? (
                          <div style={{ fontSize: 11, color: '#065f46', fontWeight: 700, padding: '6px 12px', background: '#dcfce7', borderRadius: 6 }}>
                            ✅ Requested
                          </div>
                        ) : (
                          <button onClick={() => requestRefill(m)} style={{
                            padding: '6px 14px', borderRadius: 6, background: '#0066cc', color: '#fff',
                            border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          }}>{t.requestRefill || 'Request Refill'}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ APPOINTMENTS TAB ════════════ */}
        {activeTab === 'appointments' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>

            {/* ── Reminder banners ── */}
            {in48hAppts.map(a => (
              <div key={a.id} style={{ background: a.date === todayKey ? '#fef2f2' : '#fef3c7', border: `1.5px solid ${a.date === todayKey ? '#fca5a5' : '#fde068'}`, borderRadius: 10, padding: '12px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{a.date === todayKey ? '🔴' : '🟡'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: a.date === todayKey ? '#991b1b' : '#92400e' }}>
                    {a.date === todayKey ? 'You have an appointment TODAY' : 'You have an appointment TOMORROW'}
                  </div>
                  <div style={{ fontSize: 12, color: a.date === todayKey ? '#7f1d1d' : '#78350f', marginTop: 2 }}>
                    {a.type} with {a.providerName} at {a.time} · {a.visitType}
                  </div>
                </div>
                {a.date === todayKey && !checkInComplete[a.id] && a.status !== 'Checked In' && (
                  <button onClick={() => { setCheckInApt(a); setCheckInStep(1); }}
                    style={{ padding: '8px 18px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    ✅ Check In Now
                  </button>
                )}
                {(checkInComplete[a.id] || a.status === 'Checked In') && (
                  <span style={{ padding: '6px 14px', borderRadius: 8, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 12 }}>✅ Checked In</span>
                )}
              </div>
            ))}

            {/* ── Header + Request button ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📅 {t.myAppointments || 'My Appointments'}</h2>
              <button onClick={() => setShowSelfSchedule(true)}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#0066cc', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                + {t.requestAppointment || 'Request Appointment'}
              </button>
            </div>

            <div style={cardStyle}>
              <div>
                {futureAppts.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                    <div style={{ fontWeight: 700 }}>{t.noUpcomingAppts || 'No upcoming appointments'}</div>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      <button onClick={() => setShowSelfSchedule(true)} style={{ background: 'none', border: 'none', color: '#0066cc', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Request an appointment</button>
                    </p>
                  </div>
                ) : futureAppts.map((a, idx) => {
                  const dt = new Date(a.date + 'T00:00:00');
                  const isNext = idx === 0;
                  const isToday = a.date === todayKey;
                  const isTomorrow = a.date === tomorrowKey;
                  const alreadyCheckedIn = checkInComplete[a.id] || a.status === 'Checked In';
                  const canCheckIn = isToday && (a.status === 'Scheduled' || a.status === 'Confirmed') && !alreadyCheckedIn;
                  return (
                    <div key={a.id} style={{
                      padding: '16px 18px', borderBottom: '1px solid #f1f5f9',
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: isToday ? '#fef9f0' : isNext ? '#eff6ff' : 'transparent',
                    }}>
                      {/* Date block */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 10, flexShrink: 0, textAlign: 'center',
                        background: isToday ? '#d97706' : isNext ? '#0066cc' : '#f1f5f9',
                        color: isToday || isNext ? '#fff' : '#1e293b',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}>
                          {isToday ? 'TODAY' : isTomorrow ? 'TMRW' : dt.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        {!isToday && !isTomorrow && <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{dt.getDate()}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                          {a.type}
                          {isNext && !isToday && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#065f46', marginLeft: 8 }}>NEXT</span>}
                          {alreadyCheckedIn && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#065f46', marginLeft: 8 }}>✅ CHECKED IN</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {a.time} · {a.duration || 30} min · {a.providerName}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.reason}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 10,
                          background: a.visitType === 'Telehealth' ? '#f5f3ff' : '#eff6ff',
                          color: a.visitType === 'Telehealth' ? '#5b21b6' : '#1d4ed8',
                        }}>
                          {a.visitType === 'Telehealth' ? '📹 Telehealth' : '🏥 In-Person'}
                        </span>
                        {canCheckIn && (
                          <button onClick={() => { setCheckInApt(a); setCheckInStep(1); }}
                            style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 8, background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}>
                            ✅ Online Check-In
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Past appointments */}
            {patAppts.filter(a => new Date(`${a.date}T${a.time}`) < new Date() || a.status === 'Completed').length > 0 && (
              <div style={{ ...cardStyle, marginTop: 18 }}>
                <div style={{ ...cardHeaderStyle(), color: '#64748b' }}>🗓️ Past Appointments</div>
                <div>
                  {patAppts.filter(a => new Date(`${a.date}T${a.time}`) < new Date() || a.status === 'Completed').slice(0,5).map(a => (
                    <div key={a.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 700, color: '#64748b' }}>
                        <div>{new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: '#475569' }}>{new Date(a.date + 'T00:00:00').getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.type} with {a.providerName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.date} · {a.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Self-schedule modal ── */}
            {showSelfSchedule && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={e => { if (e.target === e.currentTarget) setShowSelfSchedule(false); }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#0066cc,#1d4ed8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>📅 Request an Appointment</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Submit your preferred times — our team will confirm</div>
                    </div>
                    <button onClick={() => setShowSelfSchedule(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                  {scheduleSubmitted ? (
                    <div style={{ padding: 44, textAlign: 'center' }}>
                      <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Request Submitted!</div>
                      <p style={{ color: '#64748b', fontSize: 13 }}>Our scheduling team will review your request and confirm your appointment. You'll receive a message when it's confirmed.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
                        <div>
                          <label style={sectionLabel}>Visit Type</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {['In-Person', 'Telehealth'].map(vt => (
                              <button key={vt} type="button" onClick={() => setSelfSchedForm(f => ({ ...f, visitType: vt }))}
                                style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${selfSchedForm.visitType === vt ? '#0066cc' : '#e2e8f0'}`, background: selfSchedForm.visitType === vt ? '#eff6ff' : '#f8fafc', color: selfSchedForm.visitType === vt ? '#0066cc' : '#64748b' }}>
                                {vt === 'In-Person' ? '🏥 In-Person' : '📹 Telehealth'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={sectionLabel}>Reason / Chief Complaint *</label>
                          <input className="form-input" placeholder="e.g. Medication follow-up, anxiety, sleep issues..." value={selfSchedForm.reason} onChange={e => setSelfSchedForm(f => ({ ...f, reason: e.target.value }))} style={{ fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Preferred Date — Option 1</label>
                          <input type="date" className="form-input" value={selfSchedForm.preferredDate1} onChange={e => setSelfSchedForm(f => ({ ...f, preferredDate1: e.target.value }))} min={todayKey} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Preferred Date — Option 2 (optional)</label>
                          <input type="date" className="form-input" value={selfSchedForm.preferredDate2} onChange={e => setSelfSchedForm(f => ({ ...f, preferredDate2: e.target.value }))} min={todayKey} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Preferred Date — Option 3 (optional)</label>
                          <input type="date" className="form-input" value={selfSchedForm.preferredDate3} onChange={e => setSelfSchedForm(f => ({ ...f, preferredDate3: e.target.value }))} min={todayKey} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Additional Notes</label>
                          <textarea className="form-textarea" rows={2} value={selfSchedForm.notes} onChange={e => setSelfSchedForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any other information for our scheduling team..." style={{ fontSize: 12 }} />
                        </div>
                      </div>
                      <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => setShowSelfSchedule(false)} style={{ padding: '8px 18px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={submitSelfSchedule} disabled={!selfSchedForm.reason || !selfSchedForm.preferredDate1}
                          style={{ padding: '8px 20px', borderRadius: 8, background: selfSchedForm.reason && selfSchedForm.preferredDate1 ? '#0066cc' : '#cbd5e1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: selfSchedForm.reason && selfSchedForm.preferredDate1 ? 'pointer' : 'not-allowed' }}>
                          📤 Submit Request
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Online check-in modal ── */}
            {checkInApt && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={e => { if (e.target === e.currentTarget) { setCheckInApt(null); setCheckInStep(1); } }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#059669,#065f46)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>✅ Online Check-In</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{checkInApt.type} · {checkInApt.time} · {checkInApt.providerName}</div>
                    </div>
                    <button onClick={() => { setCheckInApt(null); setCheckInStep(1); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                  {/* Step indicator */}
                  <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Demographics', 'Symptoms', 'Emergency', 'Consent'].map((s, i) => (
                      <div key={s} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', fontSize: 10, fontWeight: 700, borderBottom: checkInStep === i + 1 ? '2px solid #059669' : '2px solid transparent', color: checkInStep > i ? '#059669' : checkInStep === i + 1 ? '#065f46' : '#94a3b8' }}>
                        {checkInStep > i ? '✓ ' : `${i + 1}. `}{s}
                      </div>
                    ))}
                  </div>
                  {/* Steps */}
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 220 }}>
                    {checkInStep === 1 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#1e293b' }}>Please confirm your information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>NAME</span><br /><strong>{patient?.firstName} {patient?.lastName}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>MRN</span><br /><strong>{patient?.mrn}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>DATE OF BIRTH</span><br /><strong>{patient?.dob}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>INSURANCE</span><br /><strong>{patient?.insurance?.primary?.name || insuranceForm.primaryName || '—'}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>ADDRESS</span><br /><strong style={{ fontSize: 12 }}>{patient?.address || '—'}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>PHONE</span><br /><strong>{patient?.phone || '—'}</strong></div>
                        </div>
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', border: '1px solid #bfdbfe' }}>
                          ℹ️ If anything looks incorrect, please notify the front desk upon arrival. You can also update your information in the <strong>Insurance</strong> tab.
                        </div>
                      </div>
                    )}
                    {checkInStep === 2 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#1e293b' }}>Today's Visit Information</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={sectionLabel}>Reason for Today's Visit</label>
                          <input className="form-input" value={checkInData.reason} onChange={e => setCheckInData(d => ({ ...d, reason: e.target.value }))} placeholder={checkInApt.reason || 'Describe the reason for your visit...'} style={{ fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Current Symptoms (optional)</label>
                          <textarea className="form-textarea" rows={3} value={checkInData.symptoms} onChange={e => setCheckInData(d => ({ ...d, symptoms: e.target.value }))} placeholder="e.g. Increased anxiety, trouble sleeping, mood changes..." style={{ fontSize: 12 }} />
                        </div>
                      </div>
                    )}
                    {checkInStep === 3 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#1e293b' }}>Emergency Contact</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={sectionLabel}>Emergency Contact Name</label>
                          <input className="form-input" value={checkInData.emergencyName} onChange={e => setCheckInData(d => ({ ...d, emergencyName: e.target.value }))} placeholder={patient?.emergencyContact || 'Full name...'} style={{ fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={sectionLabel}>Emergency Contact Phone</label>
                          <input className="form-input" value={checkInData.emergencyPhone} onChange={e => setCheckInData(d => ({ ...d, emergencyPhone: e.target.value }))} placeholder="(555) 000-0000" style={{ fontSize: 13 }} />
                        </div>
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                          <strong>Copay Reminder:</strong> Your estimated copay is <strong>${patient?.insurance?.primary?.copay ?? insuranceForm.primaryCopay ?? '—'}</strong>. Payment will be collected at check-out.
                        </div>
                      </div>
                    )}
                    {checkInStep === 4 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#1e293b' }}>Consent & Agreement</div>
                        <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#475569', maxHeight: 140, overflowY: 'auto', lineHeight: 1.7, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                          <strong>Consent to Treatment:</strong> I consent to the provision of outpatient mental health services by Clarity and its licensed providers. I understand that treatment may include evaluation, therapy, medication management, and other evidence-based interventions.<br /><br />
                          <strong>Notice of Privacy Practices:</strong> I acknowledge receiving notice of Clarity's HIPAA privacy practices. My health information may be used for treatment, payment, and healthcare operations as described in the Notice.<br /><br />
                          <strong>Financial Responsibility:</strong> I agree to pay any applicable copays, coinsurance, or deductibles per my insurance plan at the time of service.
                        </div>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          <input type="checkbox" checked={checkInData.consentSigned} onChange={e => setCheckInData(d => ({ ...d, consentSigned: e.target.checked }))} style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0 }} />
                          I have read and agree to the Consent to Treatment and acknowledge the Notice of Privacy Practices.
                        </label>
                        {checkInData.consentSigned && (
                          <div style={{ marginTop: 10, padding: '8px 14px', background: '#dcfce7', borderRadius: 8, fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                            ✍️ Electronically signed by {currentUser?.firstName} {currentUser?.lastName} on {new Date().toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={() => checkInStep > 1 ? setCheckInStep(s => s - 1) : (setCheckInApt(null), setCheckInStep(1))}
                      style={{ padding: '8px 18px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {checkInStep === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {checkInStep < 4 ? (
                      <button onClick={() => setCheckInStep(s => s + 1)}
                        style={{ padding: '8px 22px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        Continue →
                      </button>
                    ) : (
                      <button onClick={() => submitCheckIn(checkInApt)} disabled={!checkInData.consentSigned}
                        style={{ padding: '8px 22px', borderRadius: 8, background: checkInData.consentSigned ? '#059669' : '#a7f3d0', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: checkInData.consentSigned ? 'pointer' : 'not-allowed' }}>
                        ✅ Complete Check-In
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ BOOK APPOINTMENT (SCHEDULE) TAB ════════════ */}
        {activeTab === 'schedule' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>📅 Book an Appointment</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                  Choose a provider, select a date, pick an available time slot, and confirm your booking.
                </p>
              </div>
            </div>

            {liveSchedConfirmed ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#065f46', margin: '0 0 8px' }}>Appointment Booked!</h3>
                <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
                  Your appointment has been scheduled. You'll find it in your Appointments tab. A confirmation notification has been sent to your care team.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* ─── Left: Live Schedule ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Provider + Options bar */}
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                      {/* Provider */}
                      <div style={{ flex: '1 1 200px' }}>
                        <label style={{ ...sectionLabel, marginBottom: 6 }}>Provider</label>
                        <select value={liveSchedProvider} onChange={e => { setLiveSchedProvider(e.target.value); setLiveSchedSelectedSlot(null); }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#1e293b', background: '#fff', cursor: 'pointer' }}>
                          {schedulableProviders.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.role === 'prescriber' ? '🧠' : '🤝'} {p.name} — {p.specialty}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Duration */}
                      <div style={{ flex: '0 0 auto' }}>
                        <label style={{ ...sectionLabel, marginBottom: 6 }}>Duration</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(selectedProviderObj?.durations || [30]).map(d => (
                            <button key={d} onClick={() => { setLiveSchedDuration(d); setLiveSchedSelectedSlot(null); }}
                              style={{ padding: '9px 16px', borderRadius: 8, border: liveSchedDuration === d ? '2px solid #0066cc' : '1.5px solid #e2e8f0', background: liveSchedDuration === d ? '#eff6ff' : '#fff', color: liveSchedDuration === d ? '#0066cc' : '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                              {d} min
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Visit Type */}
                      <div style={{ flex: '0 0 auto' }}>
                        <label style={{ ...sectionLabel, marginBottom: 6 }}>Visit Type</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['In-Person', 'Telehealth'].map(vt => (
                            <button key={vt} onClick={() => setLiveSchedVisitType(vt)}
                              style={{ padding: '9px 14px', borderRadius: 8, border: liveSchedVisitType === vt ? '2px solid #0066cc' : '1.5px solid #e2e8f0', background: liveSchedVisitType === vt ? '#eff6ff' : '#fff', color: liveSchedVisitType === vt ? '#0066cc' : '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                              {vt === 'In-Person' ? '🏥' : '📹'} {vt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Provider role badge */}
                    {selectedProviderObj && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: selectedProviderObj.role === 'prescriber' ? '#dbeafe' : '#fae8ff', color: selectedProviderObj.role === 'prescriber' ? '#1e40af' : '#86198f' }}>
                          {selectedProviderObj.role === 'prescriber' ? '💊 Prescriber' : '🧠 Therapist'}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {selectedProviderObj.role === 'therapist' ? 'Therapy sessions — 60 min' : 'Follow-up — 15 or 30 min'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Week navigation */}
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <button onClick={() => {
                        const prev = new Date(liveSchedWeekStart); prev.setDate(prev.getDate() - 7);
                        const todayMon = new Date(); todayMon.setDate(todayMon.getDate() - (todayMon.getDay() === 0 ? 6 : todayMon.getDay() - 1)); todayMon.setHours(0,0,0,0);
                        if (prev >= todayMon) { setLiveSchedWeekStart(prev); setLiveSchedSelectedSlot(null); }
                      }} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                        ← Prev Week
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {liveSchedWeekDays[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {liveSchedWeekDays[4]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button onClick={() => { const next = new Date(liveSchedWeekStart); next.setDate(next.getDate() + 7); setLiveSchedWeekStart(next); setLiveSchedSelectedSlot(null); }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                        Next Week →
                      </button>
                    </div>

                    {/* Day columns with time slots */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                      {liveSchedWeekDays.map(dayDate => {
                        const dateStr = dayDate.toISOString().split('T')[0];
                        const daySlots = liveSchedSlots[dateStr] || [];
                        const isPast = dayDate < new Date(todayKey);
                        const isToday = dateStr === todayKey;
                        return (
                          <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* Day header */}
                            <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: isToday ? '#0066cc' : isPast ? '#f1f5f9' : '#f8fafc', color: isToday ? '#fff' : isPast ? '#94a3b8' : '#1e293b', marginBottom: 6 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                                {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 800 }}>
                                {dayDate.getDate()}
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.8 }}>
                                {dayDate.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                            </div>
                            {/* Slots */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                              {daySlots.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px 4px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                  {isPast ? 'Past' : 'No slots'}
                                </div>
                              ) : (
                                daySlots.map(slot => {
                                  const isSelected = liveSchedSelectedSlot?.date === dateStr && liveSchedSelectedSlot?.time === slot.time;
                                  const [h, m] = slot.time.split(':').map(Number);
                                  const ampm = h >= 12 ? 'PM' : 'AM';
                                  const dispH = h > 12 ? h - 12 : h === 0 ? 12 : h;
                                  const dispTime = `${dispH}:${String(m).padStart(2, '0')} ${ampm}`;
                                  return (
                                    <button key={slot.time} onClick={() => setLiveSchedSelectedSlot({ date: dateStr, time: slot.time })}
                                      style={{ padding: '8px 6px', borderRadius: 8, border: isSelected ? '2px solid #0066cc' : '1.5px solid #d1fae5', background: isSelected ? '#0066cc' : '#f0fdf4', color: isSelected ? '#fff' : '#065f46', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                                      {dispTime}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: '#64748b', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: '#f0fdf4', border: '1.5px solid #d1fae5' }} />
                        Available
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: '#0066cc' }} />
                        Selected
                      </div>
                      <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                        Showing {liveSchedDuration}-min slots for {selectedProviderObj?.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── Right: Booking panel + upcoming ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Booking confirmation card */}
                  <div style={{ background: liveSchedSelectedSlot ? '#fff' : '#f8fafc', borderRadius: 14, border: liveSchedSelectedSlot ? '2px solid #0066cc' : '1px solid #e2e8f0', padding: 20, boxShadow: liveSchedSelectedSlot ? '0 4px 12px rgba(0,102,204,0.12)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {liveSchedSelectedSlot ? '✅' : '📝'} Booking Details
                    </h4>
                    {!liveSchedSelectedSlot ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🗓️</div>
                        <p style={{ fontSize: 13, margin: 0 }}>Select a time slot from the schedule to begin booking.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Summary */}
                        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div><span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>PROVIDER</span><br /><strong style={{ color: '#1e293b' }}>{selectedProviderObj?.name}</strong></div>
                            <div><span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>DATE</span><br /><strong style={{ color: '#1e293b' }}>{new Date(liveSchedSelectedSlot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong></div>
                            <div><span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>TIME</span><br /><strong style={{ color: '#1e293b' }}>{(() => { const [h,m] = liveSchedSelectedSlot.time.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const dh = h > 12 ? h-12 : h === 0 ? 12 : h; return `${dh}:${String(m).padStart(2,'0')} ${ap}`; })()}</strong></div>
                            <div><span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>DURATION</span><br /><strong style={{ color: '#1e293b' }}>{liveSchedDuration} minutes</strong></div>
                            <div><span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>VISIT TYPE</span><br /><strong style={{ color: '#1e293b' }}>{liveSchedVisitType === 'In-Person' ? '🏥' : '📹'} {liveSchedVisitType}</strong></div>
                          </div>
                        </div>

                        {/* Appointment type */}
                        <div>
                          <label style={{ ...sectionLabel, marginBottom: 4 }}>Appointment Type</label>
                          <select value={liveSchedReason} onChange={e => setLiveSchedReason(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {selectedProviderObj?.role === 'therapist' ? (
                              <>
                                <option value="Individual Therapy">Individual Therapy</option>
                                <option value="Couples Therapy">Couples Therapy</option>
                                <option value="Family Therapy">Family Therapy</option>
                              </>
                            ) : (
                              <>
                                <option value="Follow-Up">Follow-Up Visit</option>
                                <option value="Medication Management">Medication Management</option>
                                <option value="Psychiatric Evaluation">Psychiatric Evaluation</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label style={{ ...sectionLabel, marginBottom: 4 }}>Notes (optional)</label>
                          <textarea value={liveSchedNotes} onChange={e => setLiveSchedNotes(e.target.value)} rows={2} placeholder="Brief reason for visit..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>

                        {/* Confirm button */}
                        <button onClick={confirmLiveBooking}
                          style={{ padding: '12px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#0066cc,#0052a3)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                          ✅ Confirm Appointment
                        </button>
                        <button onClick={() => setLiveSchedSelectedSlot(null)}
                          style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Your Care Team */}
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>👩‍⚕️ Your Care Team</h4>
                    {schedulableProviders.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: p.role === 'prescriber' ? '#eff6ff' : '#fae8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {p.role === 'prescriber' ? '🧠' : '🤝'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {p.specialty} · {p.role === 'therapist' ? '60-min sessions' : '15 or 30-min follow-ups'}
                          </div>
                        </div>
                        <button onClick={() => { setLiveSchedProvider(p.id); setLiveSchedSelectedSlot(null); }}
                          style={{ padding: '5px 10px', borderRadius: 6, border: liveSchedProvider === p.id ? '2px solid #0066cc' : '1.5px solid #e2e8f0', background: liveSchedProvider === p.id ? '#eff6ff' : '#fff', color: liveSchedProvider === p.id ? '#0066cc' : '#64748b', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                          {liveSchedProvider === p.id ? 'Selected' : 'View'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Upcoming appointments */}
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>📋 Upcoming Appointments</h4>
                    {futureAppts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>No upcoming appointments</div>
                    ) : (
                      futureAppts.slice(0, 4).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: a.visitType === 'Telehealth' ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                            {a.visitType === 'Telehealth' ? '📹' : '🏥'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.type}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{a.providerName} · {a.date} at {a.time}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: a.status === 'Confirmed' ? '#dcfce7' : a.status === 'Checked In' ? '#dbeafe' : '#f1f5f9', color: a.status === 'Confirmed' ? '#065f46' : a.status === 'Checked In' ? '#1e40af' : '#475569', whiteSpace: 'nowrap' }}>
                            {a.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ ASSESSMENTS TAB ════════════ */}
        {activeTab === 'assessments' && !assessmentMode && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Due assessments alert */}
            {(!assessmentSubmitted.phq9 || !assessmentSubmitted.gad7) && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Assessments Due Before Your Next Appointment</div>
                  <div style={{ fontSize: 12, color: '#92400e', opacity: 0.8 }}>Please complete your PHQ-9 and GAD-7 screenings below.</div>
                </div>
              </div>
            )}

            {/* ── Required Assessments ── */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>!</span>
                Required Assessments
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Please complete these assessments before your next appointment.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, alignItems: 'stretch' }}>
                {Object.values(ASSESSMENT_TOOLS).filter(t => t.required).map(t => (
                  <div key={t.key} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ ...cardHeaderStyle(), background: t.bg, minHeight: 48, flexShrink: 0 }}>
                      <span>{t.icon} {t.name}</span>
                    </div>
                    <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 14, flex: 1 }}>{t.description}</p>
                      <div style={{ marginTop: 'auto' }}>
                      {assessmentSubmitted[t.key] ? (
                        <div style={{ background: '#dcfce7', borderRadius: 8, padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>✅ Completed</div>
                          <div style={{ fontSize: 12, color: '#065f46', marginTop: 4 }}>
                            Score: {assessmentSubmitted[t.key].score}/{assessmentSubmitted[t.key].maxScore || t.maxScore} — {assessmentSubmitted[t.key].interpretation}
                          </div>
                          <div style={{ fontSize: 10, color: '#059669', marginTop: 4 }}>{assessmentSubmitted[t.key].date}</div>
                        </div>
                      ) : (
                        <button onClick={() => startAssessment(t.key)} style={{
                          width: '100%', padding: '10px', borderRadius: 8, background: t.color, color: '#fff',
                          border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}>Begin {t.tool} Assessment</button>
                      )}
                      {patAssessments.filter(a => a.tool === t.tool).length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div style={sectionLabel}>Previous Scores</div>
                          {patAssessments.filter(a => a.tool === t.tool).slice(0, 3).map(a => (
                            <div key={a.id} style={{ fontSize: 11, color: '#64748b', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{a.date}</span>
                              <span style={{ fontWeight: 700 }}>Score: {a.score} — {a.interpretation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Weekly Symptom Check-In ── */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📅</span> Weekly Symptom Check-In
                <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, textTransform: 'none' }}>takes 2 min</span>
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                A brief weekly check-in helps your provider track how you're feeling between visits. Your responses are visible to your care team.
              </p>
              {(() => {
                const PHQ2 = [
                  'Little interest or pleasure in doing things',
                  'Feeling down, depressed, or hopeless',
                ];
                const GAD2 = [
                  'Feeling nervous, anxious, or on edge',
                  'Not being able to stop or control worrying',
                ];
                const OPTS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

                const allAnswered = ciAnswers.every(a => a >= 0);
                const phq2Score = ciAnswers[0] + ciAnswers[1];
                const gad2Score = ciAnswers[2] + ciAnswers[3];

                const phq2Interp = phq2Score >= 3 ? 'Possible depression — your provider will follow up' : phq2Score >= 1 ? 'Mild symptoms noted' : 'Minimal symptoms';
                const gad2Interp = gad2Score >= 3 ? 'Possible anxiety — your provider will follow up' : gad2Score >= 1 ? 'Mild symptoms noted' : 'Minimal symptoms';

                if (ciResult) {
                  return (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '20px 24px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46', marginBottom: 8 }}>✅ Weekly Check-In Complete!</div>
                      <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 12 }}>Your responses have been sent to your care team.</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid #d1fae5' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>PHQ-2 (Depression)</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: ciResult.phq2 >= 3 ? '#dc2626' : '#1e293b' }}>{ciResult.phq2}/{6}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{phq2Interp}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid #d1fae5' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>GAD-2 (Anxiety)</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: ciResult.gad2 >= 3 ? '#d97706' : '#1e293b' }}>{ciResult.gad2}/{6}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{gad2Interp}</div>
                        </div>
                      </div>
                      {(ciResult.phq2 >= 3 || ciResult.gad2 >= 3) && (
                        <div style={{ marginTop: 12, background: '#fef3c7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                          <strong>⚠️ Your provider will review these scores before your next appointment.</strong> If you're in distress now, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline).
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 16 }}>
                      Over the <strong>past 7 days</strong>, how often have you been bothered by:
                    </div>

                    {/* PHQ-2 */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#4f46e5', letterSpacing: '0.5px', marginBottom: 10 }}>Depression Symptoms (PHQ-2)</div>
                      {PHQ2.map((q, qi) => (
                        <div key={qi} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>{qi + 1}. {q}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {OPTS.map((opt, oi) => (
                              <button key={oi} type="button"
                                onClick={() => { const a = [...ciAnswers]; a[qi] = oi; setCiAnswers(a); }}
                                style={{
                                  padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                                  border: `1.5px solid ${ciAnswers[qi] === oi ? '#4f46e5' : '#e2e8f0'}`,
                                  background: ciAnswers[qi] === oi ? '#ede9fe' : '#fff',
                                  color: ciAnswers[qi] === oi ? '#4338ca' : '#64748b',
                                  fontWeight: ciAnswers[qi] === oi ? 700 : 400,
                                }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* GAD-2 */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.5px', marginBottom: 10 }}>Anxiety Symptoms (GAD-2)</div>
                      {GAD2.map((q, qi) => (
                        <div key={qi} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>{qi + 3}. {q}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {OPTS.map((opt, oi) => (
                              <button key={oi} type="button"
                                onClick={() => { const a = [...ciAnswers]; a[qi + 2] = oi; setCiAnswers(a); }}
                                style={{
                                  padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                                  border: `1.5px solid ${ciAnswers[qi + 2] === oi ? '#d97706' : '#e2e8f0'}`,
                                  background: ciAnswers[qi + 2] === oi ? '#fef3c7' : '#fff',
                                  color: ciAnswers[qi + 2] === oi ? '#92400e' : '#64748b',
                                  fontWeight: ciAnswers[qi + 2] === oi ? 700 : 400,
                                }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={!allAnswered}
                      onClick={() => {
                        const p2 = ciAnswers[0] + ciAnswers[1];
                        const g2 = ciAnswers[2] + ciAnswers[3];
                        setCiResult({ phq2: p2, gad2: g2 });
                        setAssessmentSubmitted(prev => ({ ...prev, weeklyCheckin: { date: new Date().toLocaleDateString(), phq2: p2, gad2: g2 } }));
                      }}
                      style={{
                        padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: allAnswered ? 'pointer' : 'not-allowed',
                        background: allAnswered ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e2e8f0',
                        color: allAnswered ? '#fff' : '#94a3b8', border: 'none',
                      }}>
                      Submit Check-In
                    </button>
                    {!allAnswered && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Please answer all 4 questions to submit.</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Assessment Resource Library ── */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📚</span> Assessment Resource Library
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Additional screening tools available for self-assessment. Results are sent to your care team for review.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, alignItems: 'stretch' }}>
                {Object.values(ASSESSMENT_TOOLS).filter(t => !t.required).map(t => {
                  const prevScores = patAssessments.filter(a => a.tool === t.tool);
                  const submitted = assessmentSubmitted[t.key];
                  return (
                    <div key={t.key} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Fixed-height header — consistent across all cards */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: 10, height: 76, flexShrink: 0, boxSizing: 'border-box' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, background: t.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, marginTop: 2,
                        }}>{t.icon}</div>
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.tool}</div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: t.color, padding: '1px 6px', borderRadius: 6, background: t.bg, display: 'inline-block', marginTop: 3, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{t.category}</span>
                        </div>
                      </div>
                      {/* Body — flex column to push button to bottom */}
                      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, marginBottom: 12, flex: 1, minHeight: 50 }}>{t.description}</p>
                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>
                            {t.questions.length} items · Max score: {t.maxScore}
                          </div>
                          {submitted ? (
                            <div style={{ background: '#dcfce7', borderRadius: 6, padding: '8px 10px', fontSize: 11, minHeight: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#065f46' }}>✅ Score: {submitted.score}/{submitted.maxScore || t.maxScore}</span>
                              <div style={{ color: '#059669', fontSize: 10, marginTop: 2 }}>{submitted.interpretation} · {submitted.date}</div>
                            </div>
                          ) : t.key === 'moca' ? (
                            <button onClick={() => startAssessment(t.key)} style={{
                              width: '100%', padding: '8px', borderRadius: 6, background: '#f8fafc', color: t.color,
                              border: `1.5px solid ${t.color}30`, fontWeight: 700, fontSize: 11, cursor: 'pointer', minHeight: 36,
                            }}>Self-Rate (Clinician Preferred)</button>
                          ) : (
                            <button onClick={() => startAssessment(t.key)} style={{
                              width: '100%', padding: '8px', borderRadius: 6, background: t.color, color: '#fff',
                              border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', minHeight: 36,
                            }}>Take {t.tool}</button>
                          )}
                          {prevScores.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              {prevScores.slice(0, 2).map(a => (
                                <div key={a.id} style={{ fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                  <span>{a.date}</span>
                                  <span style={{ fontWeight: 600 }}>{a.score} — {a.interpretation}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Assessment questionnaire mode ── */}
        {activeTab === 'assessments' && assessmentMode && (() => {
          const toolDef = ASSESSMENT_TOOLS[assessmentMode];
          const isCSSRS = assessmentMode === 'cssrs';
          const isDAST = assessmentMode === 'dast10';
          const isMDQ = assessmentMode === 'mdq';
          const isAUDITC = assessmentMode === 'auditc';
          const isMoCA = assessmentMode === 'moca';
          const isPCL5 = assessmentMode === 'pcl5';
          const isASRS = assessmentMode === 'asrs';

          const getOptionsForQ = (qi) => {
            if (isCSSRS) return CSSRS_OPTIONS;
            if (isDAST) return DAST10_OPTIONS;
            if (isMDQ) return MDQ_OPTIONS;
            if (isAUDITC) return AUDITC_OPTIONS[qi];
            if (isPCL5) return PCL5_OPTIONS;
            if (isASRS) return ASRS_OPTIONS;
            if (isMoCA) return Array.from({ length: MOCA_CATEGORIES[qi].maxScore + 1 }, (_, i) => ({ value: i, label: String(i) }));
            return RESPONSE_OPTIONS; // PHQ-9, GAD-7
          };

          const questions = isMoCA ? MOCA_CATEGORIES.map(c => `${c.name}: ${c.description}`) : toolDef.questions;

          return (
            <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
              <div style={cardStyle}>
                <div style={{
                  padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: toolDef.bg,
                }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                      {toolDef.icon} {toolDef.name}
                    </h2>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {isCSSRS ? 'Please answer honestly. Your responses help ensure your safety.' :
                       isAUDITC ? 'Please answer regarding your alcohol use.' :
                       isDAST ? 'Please answer regarding your drug use (excluding alcohol and tobacco).' :
                       isMDQ ? 'Has there ever been a period of time when you were not your usual self and...' :
                       isMoCA ? 'Rate your performance in each cognitive domain. Ideally administered by a clinician.' :
                       isPCL5 ? 'In the past month, how much were you bothered by:' :
                       isASRS ? 'How often do you experience the following?' :
                       <>Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?</>}
                    </p>
                  </div>
                  <button onClick={() => setAssessmentMode(null)} style={{
                    background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748b',
                  }}>✕ Cancel</button>
                </div>
                <div style={{ padding: 20 }}>
                  {questions.map((q, qi) => (
                    <div key={qi} style={{
                      padding: '16px 0', borderBottom: qi < questions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#1e293b' }}>
                        <span style={{ color: '#94a3b8', marginRight: 6 }}>{qi + 1}.</span> {q}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {getOptionsForQ(qi).map(opt => (
                          <button key={opt.value} onClick={() => setAnswer(qi, opt.value)} style={{
                            flex: isMoCA ? 'none' : 1, minWidth: isMoCA ? 40 : 'auto',
                            padding: isMoCA ? '8px 12px' : '8px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.12s',
                            background: assessmentAnswers[qi] === opt.value ? toolDef.color : '#f8fafc',
                            color: assessmentAnswers[qi] === opt.value ? '#fff' : '#475569',
                            border: assessmentAnswers[qi] === opt.value ? 'none' : '1px solid #e2e8f0',
                          }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Score preview + submit */}
                  <div style={{ marginTop: 20, padding: '16px', background: '#f8fafc', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Current score</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: toolDef.color }}>
                        {assessmentAnswers.reduce((s, v) => s + (v >= 0 ? v : 0), 0)} / {toolDef.maxScore}
                      </div>
                    </div>
                    <button
                      onClick={submitAssessment}
                      disabled={assessmentAnswers.some(a => a < 0)}
                      style={{
                        padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: assessmentAnswers.some(a => a < 0) ? 'not-allowed' : 'pointer',
                        background: assessmentAnswers.some(a => a < 0) ? '#cbd5e1' : '#10b981',
                        color: '#fff', border: 'none',
                      }}
                    >
                      {assessmentAnswers.some(a => a < 0) ? `Answer all ${questions.length} questions` : 'Submit Assessment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════════════ BILLING & PAYMENTS TAB ════════════ */}
        {activeTab === 'billing' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Outstanding Balance Banner */}
            {outstandingBalance > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                borderRadius: 14, padding: '22px 28px', marginBottom: 20, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: 4 }}>
                    {t.outstandingBalance}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>${outstandingBalance.toFixed(2)}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{t.amountDue}</div>
                </div>
                <button onClick={() => { setPaymentAmountInput(String(outstandingBalance)); setShowPaymentModal(true); }}
                  style={{ padding: '14px 32px', borderRadius: 10, background: '#fff', color: '#dc2626', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  💳 {t.payNow}
                </button>
              </div>
            )}
            {outstandingBalance === 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: 14, padding: '22px 28px', marginBottom: 20, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <span style={{ fontSize: 36 }}>✅</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>$0.00 — {t.outstandingBalance}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>All payments are current. Thank you!</div>
                </div>
              </div>
            )}

            {/* Pre-Visit Payment for upcoming appointments */}
            {nextAppt && (
              <div style={{ ...cardStyle, marginBottom: 20, border: '2px solid #fbbf24' }}>
                <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>⏰</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>{t.preVisitPayment}</div>
                      <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>
                        {t.payPreVisit} — {nextAppt.type} on {nextAppt.date} at {nextAppt.time}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>{t.estimatedCopay}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>${copayAmount}</div>
                    </div>
                    <button onClick={() => { setPaymentAmountInput(String(copayAmount)); setShowPaymentModal(true); }}
                      style={{ padding: '10px 22px', borderRadius: 8, background: '#d97706', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      💳 {t.payNow}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Payment Methods */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle()}>💳 {t.paymentMethod}</div>
                <div style={{ padding: 18 }}>
                  {paymentMethods.map(pm => (
                    <div key={pm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: pm.isDefault ? '#eff6ff' : '#f8fafc', borderRadius: 10,
                      border: pm.isDefault ? '2px solid #3b82f6' : '1px solid #e2e8f0', marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 24 }}>{pm.type === 'Visa' ? '💳' : pm.type === 'Mastercard' ? '🟠' : '💎'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{pm.type} •••• {pm.last4}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Expires {pm.expiry}{pm.isDefault ? ' · Default' : ''}</div>
                      </div>
                      {pm.isDefault && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: '#3b82f6', color: '#fff' }}>DEFAULT</span>
                      )}
                    </div>
                  ))}

                  {showAddCard ? (
                    <div style={{ marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#1e293b' }}>{t.addPaymentMethod}</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <input placeholder="Card number" value={newCard.number} onChange={e => setNewCard(p => ({ ...p, number: e.target.value }))}
                          style={{ padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input placeholder="MM/YY" value={newCard.expiry} onChange={e => setNewCard(p => ({ ...p, expiry: e.target.value }))}
                            style={{ flex: 1, padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12 }} />
                          <input placeholder="CVV" value={newCard.cvv} onChange={e => setNewCard(p => ({ ...p, cvv: e.target.value }))}
                            style={{ flex: 1, padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12 }} />
                        </div>
                        <input placeholder="Name on card" value={newCard.name} onChange={e => setNewCard(p => ({ ...p, name: e.target.value }))}
                          style={{ padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 12 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={addNewCard} style={{ flex: 1, padding: '8px', borderRadius: 6, background: '#0066cc', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Save Card</button>
                          <button onClick={() => setShowAddCard(false)} style={{ padding: '8px 14px', borderRadius: 6, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{t.cancel}</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddCard(true)}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                      + {t.addPaymentMethod}
                    </button>
                  )}
                </div>
              </div>

              {/* AutoPay Settings */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle()}>🔄 {t.autoPaySettings}</div>
                <div style={{ padding: 18 }}>
                  <div style={{
                    padding: 20, borderRadius: 12, textAlign: 'center',
                    background: autoPayEnabled ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : '#f8fafc',
                    border: autoPayEnabled ? '2px solid #10b981' : '1px solid #e2e8f0',
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>{autoPayEnabled ? '✅' : '🔄'}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: autoPayEnabled ? '#065f46' : '#1e293b', marginBottom: 6 }}>
                      {autoPayEnabled ? t.autoPayEnabled : t.enableAutoPay}
                    </div>
                    <div style={{ fontSize: 12, color: autoPayEnabled ? '#047857' : '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                      {t.autoPayDesc}
                    </div>
                    <button onClick={() => setAutoPayEnabled(!autoPayEnabled)}
                      style={{
                        padding: '10px 28px', borderRadius: 8,
                        background: autoPayEnabled ? '#dc2626' : '#10b981',
                        color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      }}>
                      {autoPayEnabled ? '⏸️ Disable AutoPay' : `✅ ${t.enableAutoPay}`}
                    </button>
                  </div>
                  {autoPayEnabled && (
                    <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#065f46' }}>
                      <strong>AutoPay Active</strong> — Your copay of <strong>${copayAmount}</strong> will be charged to {paymentMethods.find(p => p.isDefault)?.type} •••• {paymentMethods.find(p => p.isDefault)?.last4} before each visit.
                    </div>
                  )}
                  {/* Quick pay button */}
                  <button onClick={() => setShowPaymentModal(true)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 8, marginTop: 14,
                      background: 'linear-gradient(135deg, #0066cc, #0052a3)', color: '#fff',
                      border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                    💵 {t.makePayment}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div style={cardStyle}>
              <div style={{ ...cardHeaderStyle(), justifyContent: 'space-between' }}>
                <span>📜 {t.paymentHistory}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{paymentHistory.length} transactions</span>
              </div>
              <div>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 140px', padding: '10px 18px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <div>{t.date}</div>
                  <div>{t.paymentType}</div>
                  <div style={{ textAlign: 'right' }}>{t.amount}</div>
                  <div style={{ textAlign: 'center' }}>{t.status}</div>
                  <div>{t.paymentMethod}</div>
                </div>
                {paymentHistory.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>
                    <div style={{ fontWeight: 700 }}>{t.noPaymentHistory}</div>
                  </div>
                ) : paymentHistory.map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 140px', padding: '14px 18px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{p.date}</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.type}</div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>${p.amount.toFixed(2)}</div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                        background: p.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: p.status === 'Paid' ? '#065f46' : '#92400e',
                      }}>{p.status === 'Paid' ? t.paid : t.pending}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.method}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={e => { if (e.target === e.currentTarget && !paymentProcessing) setShowPaymentModal(false); }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#0066cc,#0052a3)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>💳 {t.makePayment}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Secure payment processing</div>
                    </div>
                    {!paymentProcessing && (
                      <button onClick={() => setShowPaymentModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                  </div>
                  {paymentSuccess ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                      <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#065f46', marginBottom: 8 }}>{t.paymentSuccess}</div>
                      <p style={{ color: '#64748b', fontSize: 13 }}>A receipt has been sent to your inbox.</p>
                    </div>
                  ) : paymentProcessing ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                      <div style={{ fontSize: 44, marginBottom: 12 }}>🔄</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{t.paymentProcessing}</div>
                      <div style={{ marginTop: 16, height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: '70%', height: '100%', background: '#0066cc', borderRadius: 4, animation: 'shimmer 1.5s ease-in-out infinite' }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Payment method summary */}
                        <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 24 }}>💳</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{paymentMethods.find(p => p.isDefault)?.type || 'Card'} •••• {paymentMethods.find(p => p.isDefault)?.last4 || '----'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Default payment method</div>
                          </div>
                          <span style={{ fontSize: 18 }}>🔒</span>
                        </div>
                        {/* Amount */}
                        <div>
                          <label style={sectionLabel}>{t.paymentAmount}</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>$</span>
                            <input
                              type="number"
                              value={paymentAmountInput}
                              onChange={e => setPaymentAmountInput(e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '14px 14px 14px 36px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 22, fontWeight: 800, color: '#1e293b', boxSizing: 'border-box' }}
                            />
                          </div>
                          {/* Quick amount buttons */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            {[copayAmount, copayAmount * 2, 50, 100].map(amt => (
                              <button key={amt} onClick={() => setPaymentAmountInput(String(amt))}
                                style={{
                                  flex: 1, padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                  border: paymentAmountInput === String(amt) ? '2px solid #0066cc' : '1.5px solid #e2e8f0',
                                  background: paymentAmountInput === String(amt) ? '#eff6ff' : '#fff',
                                  color: paymentAmountInput === String(amt) ? '#0066cc' : '#475569',
                                }}>
                                ${amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 8 }}>
                        <button onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t.cancel}</button>
                        <button onClick={() => processPayment(paymentAmountInput, `Copay — ${nextAppt?.type || 'Visit'}`)} disabled={!paymentAmountInput || Number(paymentAmountInput) <= 0}
                          style={{
                            flex: 2, padding: '10px 20px', borderRadius: 8,
                            background: paymentAmountInput && Number(paymentAmountInput) > 0 ? 'linear-gradient(135deg, #059669, #047857)' : '#cbd5e1',
                            color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
                            cursor: paymentAmountInput && Number(paymentAmountInput) > 0 ? 'pointer' : 'not-allowed',
                          }}>
                          🔒 {t.processPayment}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ INSURANCE TAB ════════════ */}
        {activeTab === 'insurance' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            <div style={cardStyle}>
              <div style={cardHeaderStyle()}>🏥 Insurance Information</div>
              <div style={{ padding: 20 }}>
                {insuranceSaved && (
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                    ✅ Insurance information update submitted. Our billing team will review and confirm.
                  </div>
                )}

                {/* Primary */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#0066cc', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>1</span>
                    Primary Insurance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={sectionLabel}>Insurance Company</label>
                      <input value={insuranceForm.primaryName} onChange={e => setInsuranceForm(p => ({ ...p, primaryName: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={sectionLabel}>Member ID</label>
                      <input value={insuranceForm.primaryMemberId} onChange={e => setInsuranceForm(p => ({ ...p, primaryMemberId: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={sectionLabel}>Group Number</label>
                      <input value={insuranceForm.primaryGroup} onChange={e => setInsuranceForm(p => ({ ...p, primaryGroup: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={sectionLabel}>Copay ($)</label>
                      <input value={insuranceForm.primaryCopay} onChange={e => setInsuranceForm(p => ({ ...p, primaryCopay: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                  </div>
                </div>

                {/* Secondary */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#64748b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>2</span>
                    Secondary Insurance <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(optional)</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={sectionLabel}>Insurance Company</label>
                      <input value={insuranceForm.secondaryName} onChange={e => setInsuranceForm(p => ({ ...p, secondaryName: e.target.value }))}
                        placeholder="e.g. Medicaid, Medicare"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={sectionLabel}>Member ID</label>
                      <input value={insuranceForm.secondaryMemberId} onChange={e => setInsuranceForm(p => ({ ...p, secondaryMemberId: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={sectionLabel}>Group Number</label>
                      <input value={insuranceForm.secondaryGroup} onChange={e => setInsuranceForm(p => ({ ...p, secondaryGroup: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={saveInsurance} style={{
                    padding: '10px 24px', borderRadius: 8, background: '#0066cc', color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}>Submit Insurance Update</button>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Changes will be reviewed by our billing department.</span>
                </div>

                {/* ── Eligibility Check ── */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>🔍 Insurance Eligibility Verification</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Verify your current insurance coverage and benefits in real time</div>
                    </div>
                    <button onClick={runEligibilityCheck} disabled={eligibilityLoading}
                      style={{ padding: '10px 22px', borderRadius: 8, background: eligibilityLoading ? '#94a3b8' : '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: eligibilityLoading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                      {eligibilityLoading ? '⏳ Checking...' : '✅ Check Eligibility'}
                    </button>
                  </div>
                  {eligibilityLoading && (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
                      Contacting insurance payer... please wait
                    </div>
                  )}
                  {eligibilityResult && eligibilityResult.status === 'eligible' && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 24 }}>✅</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#065f46' }}>Coverage Active — Eligible</div>
                          <div style={{ fontSize: 11, color: '#059669' }}>Checked at {eligibilityResult.checkedAt}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                        {[
                          ['Plan', eligibilityResult.plan],
                          ['Member ID', eligibilityResult.memberId],
                          ['Group #', eligibilityResult.groupNumber],
                          ['Mental Health', eligibilityResult.mentalHealth],
                          ['Copay', `$${eligibilityResult.copay || '—'} per visit`],
                          ['Effective Date', eligibilityResult.effectiveDate],
                          ['Deductible', `${eligibilityResult.deductible} (${eligibilityResult.deductibleMet} met)`],
                          ['Out-of-Pocket Max', `${eligibilityResult.outOfPocketMax} (${eligibilityResult.outOfPocketMet} met)`],
                        ].map(([label, val]) => (
                          <div key={label} style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {eligibilityResult && eligibilityResult.status === 'needs_info' && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde068', borderRadius: 10, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 22 }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>Insurance Information Incomplete</div>
                          <div style={{ fontSize: 12, color: '#78350f', marginTop: 4, lineHeight: 1.6 }}>
                            Please enter your insurance company name and member ID above, then click <strong>Submit Insurance Update</strong> before running the eligibility check.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TELEHEALTH TAB ════════════ */}
        {activeTab === 'telehealth' && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Next telehealth appointment */}
            {teleAppts.length > 0 ? (
              <>
                <div style={{
                  ...cardStyle, marginBottom: 20, overflow: 'visible',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#fff', padding: '28px 32px', borderRadius: 14,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.7, marginBottom: 8 }}>Your Next Telehealth Visit</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                        {new Date(teleAppts[0].date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {teleAppts[0].time}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                        {teleAppts[0].type} with {teleAppts[0].providerName} · {teleAppts[0].duration || 30} min
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{teleAppts[0].reason}</div>
                    </div>
                    <button style={{
                      padding: '14px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.2)',
                      color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 14,
                      cursor: 'pointer', backdropFilter: 'blur(8px)',
                    }}>
                      📹 Join Session
                    </button>
                  </div>
                </div>

                {/* All upcoming telehealth */}
                {teleAppts.length > 1 && (
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle()}>📹 All Upcoming Telehealth Appointments</div>
                    <div>
                      {teleAppts.slice(1).map(a => (
                        <div key={a.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              {new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {a.time}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{a.type} · {a.providerName}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 10, background: '#f5f3ff', color: '#5b21b6' }}>Scheduled</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>No Upcoming Telehealth Visits</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>You don't have any telehealth appointments scheduled. Contact your care team to schedule one.</p>
              </div>
            )}

            {/* Telehealth info */}
            <div style={{ ...cardStyle, marginTop: 20 }}>
              <div style={cardHeaderStyle()}>ℹ️ Telehealth Information</div>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>Before Your Visit</div>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      <li>Find a quiet, private location</li>
                      <li>Test your camera and microphone</li>
                      <li>Use Chrome or Safari for best results</li>
                      <li>Have your medication list ready</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>Technical Requirements</div>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      <li>Stable internet connection (5+ Mbps)</li>
                      <li>Webcam and microphone enabled</li>
                      <li>Updated web browser</li>
                      <li>Join 5 minutes before your appointment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Assistant Floating Widget */}
      {aiChatOpen && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, width: 360, maxHeight: 480,
          background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            padding: '14px 18px', background: 'linear-gradient(135deg, #0d2444, #1b3d6e)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Clarity AI Assistant</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>Ask me anything about your care</div>
              </div>
            </div>
            <button onClick={() => setAiChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320 }}>
            {aiMessages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                background: m.role === 'user' ? '#0d2444' : '#f1f5f9',
                color: m.role === 'user' ? '#fff' : '#1e293b',
                fontSize: 12, lineHeight: 1.5,
                borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                borderBottomLeftRadius: m.role === 'ai' ? 4 : 12,
              }}>
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAISend()}
              placeholder="Ask a question..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <button onClick={handleAISend} style={{
              padding: '8px 14px', borderRadius: 8, background: '#0d2444', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>Send</button>
          </div>
          <div style={{ padding: '6px 14px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['Appointments', 'Medications', 'Billing', 'Telehealth'].map(q => (
              <button key={q} onClick={() => { setAiInput(q); }}
                style={{ padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI FAB Button */}
      <button
        onClick={() => setAiChatOpen(v => !v)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 52, height: 52,
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #0d2444, #1b3d6e)',
          color: '#fff', fontSize: 24, boxShadow: '0 4px 20px rgba(13,36,68,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          transition: 'transform 0.2s',
        }}
        title="AI Assistant"
      >
        {aiChatOpen ? '✕' : '🤖'}
      </button>
    </div>
  );
}
