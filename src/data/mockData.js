// Mock data for the entire EHR system
import { v4 as uuidv4 } from 'uuid';

// ========== USERS & AUTH ==========
export const users = [
  {
    id: 'u1',
    username: 'dr.chris',
    password: 'Pass123!',
    firstName: 'Chris',
    lastName: 'L.',
    role: 'prescriber',
    credentials: 'DNP',
    specialty: 'Psychiatry',
    npi: '1234567890',
    deaNumber: 'FM1234567',
    email: 'chris.l@clarity.health',
    epcsPin: '9921',
    twoFactorEnabled: true,
    locationId: 'loc-apmg',
  },
  {
    id: 'u4',
    username: 'nurse.kelly',
    password: 'Pass123!',
    firstName: 'Kelly',
    lastName: 'Chen',
    role: 'nurse',
    credentials: 'RN',
    specialty: 'Behavioral Health',
    npi: '',
    email: 'kelly.chen@clarity.health',
    twoFactorEnabled: true,
  },
  {
    id: 'u5',
    username: 'harriet',
    password: 'Pass123!',
    firstName: 'Harriet',
    lastName: 'Appiah',
    role: 'admin',
    credentials: '',
    specialty: '',
    npi: '',
    email: 'eoforidanso@gmail.com',
    twoFactorEnabled: true,
  },

  {
    id: 'u6',
    username: 'baz',
    password: 'Pass123!',
    firstName: 'Baz',
    lastName: '',
    role: 'front_desk',
    credentials: '',
    specialty: '',
    npi: '',
    email: 'baz@clarity.health',
    twoFactorEnabled: true,
  },
  {
    id: 'u7',
    username: 'amena',
    password: 'Pass123!',
    firstName: 'Amena',
    lastName: '',
    role: 'front_desk',
    credentials: '',
    specialty: '',
    npi: '',
    email: 'amena@clarity.health',
    twoFactorEnabled: true,
  },

  {
    id: 'u9',
    username: 'dr.emmanuel',
    password: 'Pass123!',
    firstName: 'Emmanuel',
    lastName: '',
    role: 'prescriber',
    credentials: 'NP',
    specialty: 'Psychiatry',
    npi: '1376299933',
    deaNumber: 'MO7223857',
    email: 'eoforid@gmail.com',
    epcsPin: '4412',
    twoFactorEnabled: true,
    mustChangePassword: true,
    locationId: 'loc-apmg',
  },

  {
    id: 'u8',
    username: 'april.t',
    password: 'Pass123!',
    firstName: 'April',
    lastName: 'T.',
    role: 'therapist',
    credentials: 'LCSW',
    specialty: 'Individual & Group Therapy',
    npi: '3344556677',
    email: 'april.t@clarity.health',
    twoFactorEnabled: true,
  },

  // ── Patient portal accounts ──────────────────────────────────
  { id: 'pat-p1', username: 'james.anderson', password: 'Pass123!', firstName: 'James', lastName: 'Anderson', role: 'patient', patientId: 'p1', email: 'james.anderson@email.com', twoFactorEnabled: true },
  { id: 'pat-p2', username: 'maria.garcia',   password: 'Pass123!', firstName: 'Maria', lastName: 'Garcia',   role: 'patient', patientId: 'p2', email: 'maria.garcia@email.com', twoFactorEnabled: true },
  { id: 'pat-p3', username: 'robert.chen',    password: 'Pass123!', firstName: 'Robert', lastName: 'Chen',   role: 'patient', patientId: 'p3', email: 'robert.chen@email.com', twoFactorEnabled: true },
  { id: 'pat-p4', username: 'ashley.kim',     password: 'Pass123!', firstName: 'Ashley', lastName: 'Kim',    role: 'patient', patientId: 'p4', email: 'ashley.kim@email.com', twoFactorEnabled: true },
  { id: 'pat-p5', username: 'dorothy.wilson', password: 'Pass123!', firstName: 'Dorothy', lastName: 'Wilson', role: 'patient', patientId: 'p5', email: 'dorothy.wilson@email.com', twoFactorEnabled: true },
  { id: 'pat-p6', username: 'marcus.brown',   password: 'Pass123!', firstName: 'Marcus', lastName: 'Brown',  role: 'patient', patientId: 'p6', email: 'marcus.brown@email.com', twoFactorEnabled: true },
];

// ========== PATIENTS ==========
export const patients = [
  {
    id: 'p1',
    locationId: 'loc1',
    mrn: 'MRN-00001',
    firstName: 'James',
    lastName: 'Anderson',
    dob: '1985-03-15',
    age: 41,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-4521',
    race: 'White',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Married',
    phone: '(555) 234-5678',
    cellPhone: '(555) 987-6543',
    email: 'james.anderson@email.com',
    address: {
      street: '1234 Oak Avenue',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
    },
    emergencyContact: {
      name: 'Lisa Anderson',
      relationship: 'Spouse',
      phone: '(555) 234-5679',
    },
    insurance: {
      primary: {
        name: 'Blue Cross Blue Shield',
        memberId: 'BCB123456789',
        groupNumber: 'GRP-5500',
        copay: 30,
      },
      secondary: null,
    },
    pcp: 'Dr. Robert Smith',
    assignedProvider: 'u1',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-02',
    nextAppointment: '2026-04-10',
    flags: ['Fall Risk'],
  },
  {
    id: 'p2',
    locationId: 'loc1',
    mrn: 'MRN-00002',
    firstName: 'Maria',
    lastName: 'Garcia',
    dob: '1992-07-22',
    age: 33,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-8834',
    race: 'Hispanic',
    ethnicity: 'Hispanic/Latino',
    language: 'Spanish',
    maritalStatus: 'Single',
    phone: '(555) 345-6789',
    cellPhone: '(555) 876-5432',
    email: 'maria.garcia@email.com',
    address: {
      street: '5678 Pine Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    emergencyContact: {
      name: 'Carlos Garcia',
      relationship: 'Brother',
      phone: '(555) 345-6780',
    },
    insurance: {
      primary: {
        name: 'Aetna',
        memberId: 'AET987654321',
        groupNumber: 'GRP-8800',
        copay: 25,
      },
      secondary: null,
    },
    pcp: 'Dr. Jennifer Lee',
    assignedProvider: 'u1',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-05',
    nextAppointment: '2026-04-12',
    flags: ['Suicide Risk - Monitor'],
  },
  {
    id: 'p3',
    locationId: 'loc1',
    mrn: 'MRN-00003',
    firstName: 'David',
    lastName: 'Thompson',
    dob: '1978-11-08',
    age: 47,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-2267',
    race: 'African American',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Divorced',
    phone: '(555) 456-7890',
    cellPhone: '(555) 765-4321',
    email: 'david.thompson@email.com',
    address: {
      street: '9012 Elm Drive',
      city: 'Springfield',
      state: 'IL',
      zip: '62702',
    },
    emergencyContact: {
      name: 'Patricia Thompson',
      relationship: 'Mother',
      phone: '(555) 456-7891',
    },
    insurance: {
      primary: {
        name: 'United Healthcare',
        memberId: 'UHC456789012',
        groupNumber: 'GRP-3300',
        copay: 40,
      },
      secondary: {
        name: 'Medicaid',
        memberId: 'MCD789012345',
        groupNumber: '',
        copay: 0,
      },
    },
    pcp: 'Dr. William Davis',
    assignedProvider: 'u2',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-03-28',
    nextAppointment: '2026-04-15',
    flags: ['Substance Use History', 'Controlled Substance Agreement'],
  },
  {
    id: 'p4',
    locationId: 'loc1',
    mrn: 'MRN-00004',
    firstName: 'Emily',
    lastName: 'Chen',
    dob: '2001-01-30',
    age: 25,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-9912',
    race: 'Asian',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Single',
    phone: '(555) 567-8901',
    cellPhone: '(555) 654-3210',
    email: 'emily.chen@email.com',
    address: {
      street: '3456 Maple Court',
      city: 'Springfield',
      state: 'IL',
      zip: '62703',
    },
    emergencyContact: {
      name: 'Wei Chen',
      relationship: 'Father',
      phone: '(555) 567-8902',
    },
    insurance: {
      primary: {
        name: 'Cigna',
        memberId: 'CIG321654987',
        groupNumber: 'GRP-7700',
        copay: 20,
      },
      secondary: null,
    },
    pcp: 'Dr. Susan Park',
    assignedProvider: 'u2',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-07',
    nextAppointment: '2026-04-14',
    flags: [],
  },
  {
    id: 'p5',
    locationId: 'loc1',
    mrn: 'MRN-00005',
    firstName: 'Robert',
    lastName: 'Wilson',
    dob: '1965-09-12',
    age: 60,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-5548',
    race: 'White',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Widowed',
    phone: '(555) 678-9012',
    cellPhone: '(555) 543-2109',
    email: 'robert.wilson@email.com',
    address: {
      street: '7890 Cedar Lane',
      city: 'Springfield',
      state: 'IL',
      zip: '62705',
    },
    emergencyContact: {
      name: 'Karen Wilson',
      relationship: 'Daughter',
      phone: '(555) 678-9013',
    },
    insurance: {
      primary: {
        name: 'Medicare',
        memberId: 'MCR567890123',
        groupNumber: '',
        copay: 0,
      },
      secondary: {
        name: 'AARP Supplemental',
        memberId: 'AARP123456',
        groupNumber: 'GRP-SUP',
        copay: 0,
      },
    },
    pcp: 'Dr. Thomas Brown',
    assignedProvider: 'u1',
    photo: null,
    isBTG: true,
    isActive: true,
    lastVisit: '2026-03-20',
    nextAppointment: '2026-04-18',
    flags: ['VIP', 'BTG Protected'],
  },
  {
    id: 'p6',
    locationId: 'loc1',
    mrn: 'MRN-00006',
    firstName: 'Aisha',
    lastName: 'Patel',
    dob: '1990-05-18',
    age: 35,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-3376',
    race: 'Asian',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Married',
    phone: '(555) 789-0123',
    cellPhone: '(555) 432-1098',
    email: 'aisha.patel@email.com',
    address: {
      street: '2345 Birch Road',
      city: 'Springfield',
      state: 'IL',
      zip: '62706',
    },
    emergencyContact: {
      name: 'Raj Patel',
      relationship: 'Spouse',
      phone: '(555) 789-0124',
    },
    insurance: {
      primary: {
        name: 'Anthem',
        memberId: 'ANT654987321',
        groupNumber: 'GRP-4400',
        copay: 35,
      },
      secondary: null,
    },
    pcp: 'Dr. Michelle Taylor',
    assignedProvider: 'u1',
    photo: null,
    isBTG: true,
    isActive: true,
    lastVisit: '2026-04-01',
    nextAppointment: '2026-04-20',
    flags: ['BTG Protected', 'Interpreter Needed - Hindi'],
  },

  // ─── West Loop patients ───────────────────────────────────────────────────
  {
    id: 'p7',
    locationId: 'loc2',
    mrn: 'MRN-00007',
    firstName: 'Vanessa',
    lastName: 'Monroe',
    dob: '1988-06-14',
    age: 37,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-6612',
    race: 'African American',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Divorced',
    phone: '(312) 555-0191',
    cellPhone: '(312) 555-0192',
    email: 'vanessa.monroe@email.com',
    address: { street: '120 S Riverside Plaza, Apt 14C', city: 'Chicago', state: 'IL', zip: '60606' },
    emergencyContact: { name: 'Darlene Monroe', relationship: 'Mother', phone: '(312) 555-0193' },
    insurance: { primary: { name: 'Cigna', memberId: 'CIG771234567', groupNumber: 'GRP-9900', copay: 35 }, secondary: null },
    pcp: 'Dr. Angela Hayes',
    assignedProvider: 'u1',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-18',
    nextAppointment: '2026-05-02',
    flags: [],
  },
  {
    id: 'p8',
    locationId: 'loc2',
    mrn: 'MRN-00008',
    firstName: 'Marcus',
    lastName: 'Chen-Williams',
    dob: '1997-02-09',
    age: 29,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-3341',
    race: 'Asian',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Single',
    phone: '(312) 555-0281',
    cellPhone: '(312) 555-0282',
    email: 'marcus.chenwilliams@email.com',
    address: { street: '333 W Madison St, Apt 1204', city: 'Chicago', state: 'IL', zip: '60606' },
    emergencyContact: { name: 'Linda Chen', relationship: 'Mother', phone: '(312) 555-0283' },
    insurance: { primary: { name: 'Blue Cross Blue Shield', memberId: 'BCB882211330', groupNumber: 'GRP-2200', copay: 20 }, secondary: null },
    pcp: 'Dr. James Nakamura',
    assignedProvider: 'u2',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-21',
    nextAppointment: '2026-05-05',
    flags: ['Stimulant Rx - DEA Required'],
  },
  {
    id: 'p9',
    locationId: 'loc2',
    mrn: 'MRN-00009',
    firstName: 'Sofia',
    lastName: 'Reyes-Gutierrez',
    dob: '1982-10-27',
    age: 43,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-7728',
    race: 'Hispanic',
    ethnicity: 'Hispanic/Latino',
    language: 'Spanish',
    maritalStatus: 'Married',
    phone: '(312) 555-0371',
    cellPhone: '(312) 555-0372',
    email: 'sofia.reyes@email.com',
    address: { street: '225 W Washington St, Apt 601', city: 'Chicago', state: 'IL', zip: '60606' },
    emergencyContact: { name: 'Miguel Gutierrez', relationship: 'Spouse', phone: '(312) 555-0373' },
    insurance: { primary: { name: 'Medicaid', memberId: 'MCD990112233', groupNumber: '', copay: 0 }, secondary: null },
    pcp: 'Dr. Carmen Vidal',
    assignedProvider: 'u1',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-22',
    nextAppointment: '2026-05-06',
    flags: ['Interpreter Needed - Spanish', 'Suicide Risk - Monitor'],
  },
  {
    id: 'p10',
    locationId: 'loc2',
    mrn: 'MRN-00010',
    firstName: 'Theodore',
    lastName: 'Okafor',
    dob: '1974-03-05',
    age: 52,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-5519',
    race: 'African American',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Widowed',
    phone: '(312) 555-0461',
    cellPhone: '(312) 555-0462',
    email: 'theodore.okafor@email.com',
    address: { street: '500 W Monroe St, Apt 3A', city: 'Chicago', state: 'IL', zip: '60661' },
    emergencyContact: { name: 'Chisom Okafor', relationship: 'Son', phone: '(312) 555-0463' },
    insurance: {
      primary: { name: 'Medicare', memberId: 'MCR661234500', groupNumber: '', copay: 0 },
      secondary: { name: 'Medicaid', memberId: 'MCD661234501', groupNumber: '', copay: 0 },
    },
    pcp: 'Dr. Sandra Moss',
    assignedProvider: 'u1',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-16',
    nextAppointment: '2026-05-07',
    flags: ['Long-Acting Injectable', 'Controlled Substance Agreement'],
  },
  {
    id: 'p11',
    locationId: 'loc2',
    mrn: 'MRN-00011',
    firstName: 'Bridget',
    lastName: "O'Sullivan",
    dob: '1995-08-30',
    age: 30,
    gender: 'Female',
    pronouns: 'She/Her',
    ssn: '***-**-4407',
    race: 'White',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Single',
    phone: '(312) 555-0551',
    cellPhone: '(312) 555-0552',
    email: 'bridget.osullivan@email.com',
    address: { street: '848 W Randolph St, Apt 2B', city: 'Chicago', state: 'IL', zip: '60607' },
    emergencyContact: { name: 'Patrick O\'Sullivan', relationship: 'Father', phone: '(312) 555-0553' },
    insurance: { primary: { name: 'Aetna', memberId: 'AET334455667', groupNumber: 'GRP-6600', copay: 25 }, secondary: null },
    pcp: 'Dr. Kevin Walsh',
    assignedProvider: 'u8',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-23',
    nextAppointment: '2026-05-08',
    flags: [],
  },
  {
    id: 'p12',
    locationId: 'loc2',
    mrn: 'MRN-00012',
    firstName: 'Kwame',
    lastName: 'Johnson-Bell',
    dob: '2002-11-17',
    age: 23,
    gender: 'Male',
    pronouns: 'He/Him',
    ssn: '***-**-8803',
    race: 'African American',
    ethnicity: 'Non-Hispanic',
    language: 'English',
    maritalStatus: 'Single',
    phone: '(312) 555-0641',
    cellPhone: '(312) 555-0642',
    email: 'kwame.johnsonbell@email.com',
    address: { street: '175 N Aberdeen St, Apt 1F', city: 'Chicago', state: 'IL', zip: '60607' },
    emergencyContact: { name: 'Nana Johnson', relationship: 'Grandmother', phone: '(312) 555-0643' },
    insurance: { primary: { name: 'Medicaid', memberId: 'MCD556677881', groupNumber: '', copay: 0 }, secondary: null },
    pcp: 'Dr. Toyin Adeyemi',
    assignedProvider: 'u2',
    photo: null,
    isBTG: false,
    isActive: true,
    lastVisit: '2026-04-24',
    nextAppointment: '2026-05-01',
    flags: ['First Episode Psychosis', 'Substance Use History'],
  },
];

// ========== ALLERGIES ==========
export const allergies = {
  p1: [
    { id: 'a1', allergen: 'Penicillin', type: 'Medication', reaction: 'Hives, Anaphylaxis', severity: 'Severe', status: 'Active', onsetDate: '2005-06-15', source: 'Patient Reported' },
    { id: 'a2', allergen: 'Sulfa Drugs', type: 'Medication', reaction: 'Rash', severity: 'Moderate', status: 'Active', onsetDate: '2010-03-20', source: 'Clinician Verified' },
    { id: 'a3', allergen: 'Latex', type: 'Environmental', reaction: 'Contact Dermatitis', severity: 'Mild', status: 'Active', onsetDate: '2015-01-10', source: 'Patient Reported' },
  ],
  p2: [
    { id: 'a4', allergen: 'Codeine', type: 'Medication', reaction: 'Nausea, Vomiting', severity: 'Moderate', status: 'Active', onsetDate: '2018-09-05', source: 'Patient Reported' },
    { id: 'a5', allergen: 'Shellfish', type: 'Food', reaction: 'Throat Swelling', severity: 'Severe', status: 'Active', onsetDate: '2012-12-25', source: 'Clinician Verified' },
  ],
  p3: [
    { id: 'a6', allergen: 'No Known Drug Allergies (NKDA)', type: 'None', reaction: '', severity: '', status: 'Active', onsetDate: '', source: 'Patient Reported' },
  ],
  p4: [
    { id: 'a7', allergen: 'Ibuprofen', type: 'Medication', reaction: 'GI Bleeding', severity: 'Severe', status: 'Active', onsetDate: '2022-04-18', source: 'Clinician Verified' },
    { id: 'a8', allergen: 'Peanuts', type: 'Food', reaction: 'Anaphylaxis', severity: 'Severe', status: 'Active', onsetDate: '2001-01-30', source: 'Patient Reported' },
    { id: 'a9', allergen: 'Dust Mites', type: 'Environmental', reaction: 'Rhinitis, Asthma', severity: 'Moderate', status: 'Active', onsetDate: '2015-07-01', source: 'Patient Reported' },
  ],
  p5: [
    { id: 'a10', allergen: 'Lisinopril', type: 'Medication', reaction: 'Angioedema', severity: 'Severe', status: 'Active', onsetDate: '2019-11-30', source: 'Clinician Verified' },
  ],
  p6: [
    { id: 'a11', allergen: 'Aspirin', type: 'Medication', reaction: 'Bronchospasm', severity: 'Moderate', status: 'Active', onsetDate: '2020-02-14', source: 'Patient Reported' },
    { id: 'a12', allergen: 'Bee Stings', type: 'Environmental', reaction: 'Anaphylaxis', severity: 'Severe', status: 'Active', onsetDate: '2008-08-22', source: 'Clinician Verified' },
  ],
  p7: [
    { id: 'a13', allergen: 'Lithium', type: 'Medication', reaction: 'Tremor, Polyuria, Toxicity', severity: 'Severe', status: 'Active', onsetDate: '2016-04-10', source: 'Clinician Verified' },
    { id: 'a14', allergen: 'Haloperidol', type: 'Medication', reaction: 'Acute Dystonia', severity: 'Severe', status: 'Active', onsetDate: '2018-11-22', source: 'Clinician Verified' },
  ],
  p8: [
    { id: 'a15', allergen: 'No Known Drug Allergies (NKDA)', type: 'None', reaction: '', severity: '', status: 'Active', onsetDate: '', source: 'Patient Reported' },
    { id: 'a16', allergen: 'Tree Pollen', type: 'Environmental', reaction: 'Rhinitis', severity: 'Mild', status: 'Active', onsetDate: '2014-05-01', source: 'Patient Reported' },
  ],
  p9: [
    { id: 'a17', allergen: 'Sertraline', type: 'Medication', reaction: 'Severe Agitation, Serotonin Syndrome Signs', severity: 'Severe', status: 'Active', onsetDate: '2021-08-15', source: 'Clinician Verified' },
    { id: 'a18', allergen: 'Sulfa Drugs', type: 'Medication', reaction: 'Rash', severity: 'Moderate', status: 'Active', onsetDate: '2019-02-10', source: 'Patient Reported' },
  ],
  p10: [
    { id: 'a19', allergen: 'Clozapine', type: 'Medication', reaction: 'Agranulocytosis', severity: 'Severe', status: 'Active', onsetDate: '2010-07-30', source: 'Clinician Verified' },
    { id: 'a20', allergen: 'Nuts', type: 'Food', reaction: 'Urticaria', severity: 'Moderate', status: 'Active', onsetDate: '2002-03-12', source: 'Patient Reported' },
  ],
  p11: [
    { id: 'a21', allergen: 'No Known Drug Allergies (NKDA)', type: 'None', reaction: '', severity: '', status: 'Active', onsetDate: '', source: 'Patient Reported' },
  ],
  p12: [
    { id: 'a22', allergen: 'Diphenhydramine', type: 'Medication', reaction: 'Paradoxical Agitation', severity: 'Moderate', status: 'Active', onsetDate: '2023-01-05', source: 'Patient Reported' },
    { id: 'a23', allergen: 'Latex', type: 'Environmental', reaction: 'Contact Dermatitis', severity: 'Mild', status: 'Active', onsetDate: '2020-09-14', source: 'Patient Reported' },
  ],
};

// ========== PROBLEM LIST ==========
export const problems = {
  p1: [
    { id: 'pr1', code: 'F33.1', description: 'Major Depressive Disorder, Recurrent, Moderate', status: 'Active', onsetDate: '2020-01-15', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr2', code: 'F41.1', description: 'Generalized Anxiety Disorder', status: 'Active', onsetDate: '2020-01-15', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr3', code: 'G47.00', description: 'Insomnia, Unspecified', status: 'Active', onsetDate: '2021-06-10', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr4', code: 'E11.9', description: 'Type 2 Diabetes Mellitus', status: 'Active', onsetDate: '2018-03-20', diagnosedBy: 'Dr. Smith (PCP)' },
  ],
  p2: [
    { id: 'pr5', code: 'F43.10', description: 'Post-Traumatic Stress Disorder', status: 'Active', onsetDate: '2022-05-01', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr6', code: 'F33.2', description: 'Major Depressive Disorder, Recurrent, Severe', status: 'Active', onsetDate: '2022-05-01', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr7', code: 'F40.10', description: 'Social Anxiety Disorder', status: 'Active', onsetDate: '2023-02-14', diagnosedBy: 'Dr. Chris L.' },
  ],
  p3: [
    { id: 'pr8', code: 'F10.20', description: 'Alcohol Use Disorder, Moderate', status: 'Active', onsetDate: '2019-08-15', diagnosedBy: 'Joseph' },
    { id: 'pr9', code: 'F33.0', description: 'Major Depressive Disorder, Recurrent, Mild', status: 'Active', onsetDate: '2019-08-15', diagnosedBy: 'Joseph' },
    { id: 'pr10', code: 'I10', description: 'Essential Hypertension', status: 'Active', onsetDate: '2015-04-10', diagnosedBy: 'Dr. Davis (PCP)' },
    { id: 'pr11', code: 'F17.210', description: 'Nicotine Dependence, Cigarettes', status: 'Active', onsetDate: '2010-01-01', diagnosedBy: 'Joseph' },
  ],
  p4: [
    { id: 'pr12', code: 'F90.2', description: 'ADHD, Combined Type', status: 'Active', onsetDate: '2015-09-01', diagnosedBy: 'Joseph' },
    { id: 'pr13', code: 'F41.1', description: 'Generalized Anxiety Disorder', status: 'Active', onsetDate: '2023-01-20', diagnosedBy: 'Joseph' },
    { id: 'pr14', code: 'F50.00', description: 'Anorexia Nervosa, Unspecified', status: 'In Remission', onsetDate: '2019-06-15', diagnosedBy: 'Dr. Park (PCP)' },
  ],
  p5: [
    { id: 'pr15', code: 'F32.2', description: 'Major Depressive Disorder, Single Episode, Severe', status: 'Active', onsetDate: '2025-12-01', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr16', code: 'F41.0', description: 'Panic Disorder', status: 'Active', onsetDate: '2026-01-10', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr17', code: 'G30.9', description: 'Alzheimers Disease, Unspecified (Early Onset)', status: 'Active', onsetDate: '2025-06-15', diagnosedBy: 'Dr. Brown (PCP)' },
  ],
  p6: [
    { id: 'pr18', code: 'F31.31', description: 'Bipolar Disorder, Current Episode Depressed, Mild', status: 'Active', onsetDate: '2021-03-10', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr19', code: 'F41.1', description: 'Generalized Anxiety Disorder', status: 'Active', onsetDate: '2021-03-10', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr20', code: 'N94.3', description: 'Premenstrual Dysphoric Disorder', status: 'Active', onsetDate: '2022-08-05', diagnosedBy: 'Dr. Taylor (PCP)' },
  ],
  p7: [
    { id: 'pr21', code: 'F31.10', description: 'Bipolar I Disorder, Current Episode Manic, Unspecified', status: 'Active', onsetDate: '2014-09-20', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr22', code: 'F41.1', description: 'Generalized Anxiety Disorder', status: 'Active', onsetDate: '2016-03-14', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr23', code: 'G47.00', description: 'Insomnia, Unspecified', status: 'Active', onsetDate: '2018-07-01', diagnosedBy: 'Dr. Chris L.' },
  ],
  p8: [
    { id: 'pr24', code: 'F90.2', description: 'ADHD, Combined Type', status: 'Active', onsetDate: '2012-08-15', diagnosedBy: 'Joseph' },
    { id: 'pr25', code: 'F33.1', description: 'Major Depressive Disorder, Recurrent, Moderate', status: 'Active', onsetDate: '2022-11-04', diagnosedBy: 'Joseph' },
    { id: 'pr26', code: 'F40.10', description: 'Social Anxiety Disorder', status: 'Active', onsetDate: '2023-02-20', diagnosedBy: 'Joseph' },
  ],
  p9: [
    { id: 'pr27', code: 'F43.10', description: 'Post-Traumatic Stress Disorder', status: 'Active', onsetDate: '2020-06-01', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr28', code: 'F32.2', description: 'Major Depressive Disorder, Single Episode, Severe', status: 'Active', onsetDate: '2020-06-01', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr29', code: 'F41.1', description: 'Generalized Anxiety Disorder', status: 'Active', onsetDate: '2021-01-15', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr30', code: 'I10', description: 'Essential Hypertension', status: 'Active', onsetDate: '2019-03-08', diagnosedBy: 'Dr. Vidal (PCP)' },
  ],
  p10: [
    { id: 'pr31', code: 'F25.1', description: 'Schizoaffective Disorder, Depressive Type', status: 'Active', onsetDate: '2008-05-12', diagnosedBy: 'Dr. Chris L.' },
    { id: 'pr32', code: 'F17.210', description: 'Nicotine Dependence, Cigarettes', status: 'Active', onsetDate: '2000-01-01', diagnosedBy: 'Dr. Moss (PCP)' },
    { id: 'pr33', code: 'E11.9', description: 'Type 2 Diabetes Mellitus', status: 'Active', onsetDate: '2015-09-20', diagnosedBy: 'Dr. Moss (PCP)' },
    { id: 'pr34', code: 'I10', description: 'Essential Hypertension', status: 'Active', onsetDate: '2012-04-30', diagnosedBy: 'Dr. Moss (PCP)' },
  ],
  p11: [
    { id: 'pr35', code: 'F42.2', description: 'Mixed Obsessional Thoughts and Acts (OCD)', status: 'Active', onsetDate: '2018-02-28', diagnosedBy: 'April T., LCSW' },
    { id: 'pr36', code: 'F41.0', description: 'Panic Disorder', status: 'Active', onsetDate: '2019-10-15', diagnosedBy: 'April T., LCSW' },
    { id: 'pr37', code: 'F32.0', description: 'Major Depressive Disorder, Single Episode, Mild', status: 'Active', onsetDate: '2023-06-01', diagnosedBy: 'April T., LCSW' },
  ],
  p12: [
    { id: 'pr38', code: 'F29', description: 'Unspecified Nonorganic Psychosis (First Episode)', status: 'Active', onsetDate: '2025-10-08', diagnosedBy: 'Joseph' },
    { id: 'pr39', code: 'F12.20', description: 'Cannabis Use Disorder, Moderate', status: 'Active', onsetDate: '2022-03-01', diagnosedBy: 'Joseph' },
    { id: 'pr40', code: 'F32.1', description: 'Major Depressive Disorder, Single Episode, Moderate', status: 'Active', onsetDate: '2025-10-08', diagnosedBy: 'Joseph' },
  ],
};

// ========== VITALS ==========
export const vitals = {
  p1: [
    { id: 'v1', date: '2026-04-02', time: '09:15', bp: '128/82', hr: 76, rr: 16, temp: 98.6, spo2: 98, weight: 185, height: 70, bmi: 26.5, pain: 2, takenBy: 'Kelly Chen, RN' },
    { id: 'v2', date: '2026-03-05', time: '10:30', bp: '132/85', hr: 80, rr: 18, temp: 98.4, spo2: 97, weight: 187, height: 70, bmi: 26.8, pain: 3, takenBy: 'Kelly Chen, RN' },
    { id: 'v3', date: '2026-02-01', time: '14:00', bp: '135/88', hr: 82, rr: 16, temp: 98.6, spo2: 98, weight: 190, height: 70, bmi: 27.3, pain: 4, takenBy: 'Kelly Chen, RN' },
  ],
  p2: [
    { id: 'v4', date: '2026-04-05', time: '11:00', bp: '118/72', hr: 68, rr: 14, temp: 98.2, spo2: 99, weight: 135, height: 64, bmi: 23.2, pain: 0, takenBy: 'Kelly Chen, RN' },
    { id: 'v5', date: '2026-03-08', time: '09:45', bp: '120/74', hr: 72, rr: 16, temp: 98.6, spo2: 98, weight: 136, height: 64, bmi: 23.3, pain: 1, takenBy: 'Kelly Chen, RN' },
  ],
  p3: [
    { id: 'v6', date: '2026-03-28', time: '13:30', bp: '142/92', hr: 88, rr: 18, temp: 98.8, spo2: 96, weight: 210, height: 72, bmi: 28.5, pain: 5, takenBy: 'Kelly Chen, RN' },
    { id: 'v7', date: '2026-02-28', time: '10:00', bp: '148/95', hr: 92, rr: 20, temp: 98.6, spo2: 95, weight: 215, height: 72, bmi: 29.2, pain: 4, takenBy: 'Kelly Chen, RN' },
  ],
  p4: [
    { id: 'v8', date: '2026-04-07', time: '08:30', bp: '110/68', hr: 72, rr: 14, temp: 97.8, spo2: 99, weight: 115, height: 63, bmi: 20.4, pain: 0, takenBy: 'Kelly Chen, RN' },
  ],
  p5: [
    { id: 'v9', date: '2026-03-20', time: '15:00', bp: '152/96', hr: 84, rr: 18, temp: 98.4, spo2: 95, weight: 178, height: 68, bmi: 27.1, pain: 6, takenBy: 'Kelly Chen, RN' },
  ],
  p6: [
    { id: 'v10', date: '2026-04-01', time: '10:15', bp: '122/76', hr: 74, rr: 16, temp: 98.6, spo2: 98, weight: 145, height: 65, bmi: 24.1, pain: 1, takenBy: 'Kelly Chen, RN' },
  ],
};

// ========== MEDICATIONS / PRESCRIPTIONS ==========
export const medications = {
  p1: [
    { id: 'm1', name: 'Sertraline (Zoloft)', dose: '100mg', route: 'Oral', frequency: 'Once daily', startDate: '2020-02-01', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 3, isControlled: false, schedule: null, pharmacy: 'CVS Pharmacy - Main St', lastFilled: '2026-03-15', sig: 'Take 1 tablet by mouth once daily in the morning', rxHistory: [
      { date: '2026-03-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 7, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 6, type: 'Refill', note: '' },
      { date: '2025-09-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 5, type: 'Refill', note: '' },
      { date: '2025-06-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2020-02-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initial prescription for depression' },
    ] },
    { id: 'm2', name: 'Trazodone', dose: '50mg', route: 'Oral', frequency: 'Once daily at bedtime', startDate: '2021-07-01', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 2, isControlled: false, schedule: null, pharmacy: 'CVS Pharmacy - Main St', lastFilled: '2026-03-15', sig: 'Take 1 tablet by mouth at bedtime as needed for insomnia', rxHistory: [
      { date: '2026-03-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2025-12-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2025-08-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2021-07-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Added for insomnia management' },
    ] },
    { id: 'm3', name: 'Metformin', dose: '500mg', route: 'Oral', frequency: 'Twice daily', startDate: '2018-04-01', prescriber: 'Dr. Robert Smith (PCP)', status: 'Active', refillsLeft: 5, isControlled: false, schedule: null, pharmacy: 'CVS Pharmacy - Main St', lastFilled: '2026-03-01', sig: 'Take 1 tablet by mouth twice daily with meals', rxHistory: [
      { date: '2026-03-01', prescribedBy: 'Dr. Robert Smith (PCP)', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 10, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-01', prescribedBy: 'Dr. Robert Smith (PCP)', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 9, type: 'Refill', note: '' },
      { date: '2025-09-01', prescribedBy: 'Dr. Robert Smith (PCP)', pharmacy: 'CVS Pharmacy - Main St', qty: 90, refillNumber: 8, type: 'Refill', note: '' },
      { date: '2018-04-01', prescribedBy: 'Dr. Robert Smith (PCP)', pharmacy: 'CVS Pharmacy - Main St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initiated for Type 2 Diabetes management' },
    ] },
  ],
  p2: [
    { id: 'm4', name: 'Venlafaxine XR (Effexor XR)', dose: '150mg', route: 'Oral', frequency: 'Once daily', startDate: '2022-06-01', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 4, isControlled: false, schedule: null, pharmacy: 'Walgreens - 5th Ave', lastFilled: '2026-03-20', sig: 'Take 1 capsule by mouth once daily with food', rxHistory: [
      { date: '2026-03-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 90, refillNumber: 5, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 90, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2025-09-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 90, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2022-09-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 1, type: 'Refill', note: 'Dose increased from 75mg to 150mg' },
      { date: '2022-06-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Started at 75mg for titration' },
    ] },
    { id: 'm5', name: 'Prazosin', dose: '2mg', route: 'Oral', frequency: 'Once daily at bedtime', startDate: '2022-08-15', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 3, isControlled: false, schedule: null, pharmacy: 'Walgreens - 5th Ave', lastFilled: '2026-03-20', sig: 'Take 1 tablet by mouth at bedtime for nightmares', rxHistory: [
      { date: '2026-03-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2025-12-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2025-09-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2022-08-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'For PTSD-related nightmares' },
    ] },
    { id: 'm6', name: 'Hydroxyzine', dose: '25mg', route: 'Oral', frequency: 'Every 6 hours as needed', startDate: '2023-01-10', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 2, isControlled: false, schedule: null, pharmacy: 'Walgreens - 5th Ave', lastFilled: '2026-02-28', sig: 'Take 1 tablet by mouth every 6 hours as needed for anxiety', rxHistory: [
      { date: '2026-02-28', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2025-10-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 1, type: 'Refill', note: '' },
      { date: '2023-01-10', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - 5th Ave', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Added for PRN anxiety relief' },
    ] },
  ],
  p3: [
    { id: 'm7', name: 'Naltrexone', dose: '50mg', route: 'Oral', frequency: 'Once daily', startDate: '2020-01-15', prescriber: 'NP Michael Johnson', status: 'Active', refillsLeft: 5, isControlled: false, schedule: null, pharmacy: 'Rite Aid - Center St', lastFilled: '2026-03-10', sig: 'Take 1 tablet by mouth once daily', rxHistory: [
      { date: '2026-03-10', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 90, refillNumber: 6, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-10', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 5, type: 'Refill', note: '' },
      { date: '2025-09-10', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2020-01-15', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initiated for alcohol use disorder (AUD) treatment' },
    ] },
    { id: 'm8', name: 'Bupropion XL (Wellbutrin XL)', dose: '300mg', route: 'Oral', frequency: 'Once daily', startDate: '2020-01-15', prescriber: 'NP Michael Johnson', status: 'Active', refillsLeft: 4, isControlled: false, schedule: null, pharmacy: 'Rite Aid - Center St', lastFilled: '2026-03-10', sig: 'Take 1 tablet by mouth once daily in the morning', rxHistory: [
      { date: '2026-03-10', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 5, type: 'Refill', note: '' },
      { date: '2025-12-10', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2020-04-15', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 1, type: 'Refill', note: 'Dose increased from 150mg to 300mg' },
      { date: '2020-01-15', prescribedBy: 'NP Michael Johnson', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Started at 150mg for depression; also supports smoking cessation' },
    ] },
    { id: 'm9', name: 'Lisinopril', dose: '20mg', route: 'Oral', frequency: 'Once daily', startDate: '2015-05-01', prescriber: 'Dr. William Davis (PCP)', status: 'Active', refillsLeft: 6, isControlled: false, schedule: null, pharmacy: 'Rite Aid - Center St', lastFilled: '2026-03-01', sig: 'Take 1 tablet by mouth once daily', rxHistory: [
      { date: '2026-03-01', prescribedBy: 'Dr. William Davis (PCP)', pharmacy: 'Rite Aid - Center St', qty: 90, refillNumber: 12, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-01', prescribedBy: 'Dr. William Davis (PCP)', pharmacy: 'Rite Aid - Center St', qty: 90, refillNumber: 11, type: 'Refill', note: '' },
      { date: '2025-09-01', prescribedBy: 'Dr. William Davis (PCP)', pharmacy: 'Rite Aid - Center St', qty: 90, refillNumber: 10, type: 'Refill', note: '' },
      { date: '2015-05-01', prescribedBy: 'Dr. William Davis (PCP)', pharmacy: 'Rite Aid - Center St', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initiated for hypertension management' },
    ] },
  ],
  p4: [
    { id: 'm10', name: 'Adderall XR (Amphetamine/Dextroamphetamine)', dose: '20mg', route: 'Oral', frequency: 'Once daily in the morning', startDate: '2023-03-01', prescriber: 'NP Michael Johnson', status: 'Active', refillsLeft: 0, isControlled: true, schedule: 'Schedule II', pharmacy: 'CVS Pharmacy - College Ave', lastFilled: '2026-03-25', sig: 'Take 1 capsule by mouth once daily in the morning', rxHistory: [
      { date: '2026-03-25', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 30, refillNumber: 36, type: 'Written Rx', note: 'Monthly CII — no refills' },
      { date: '2026-02-25', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 30, refillNumber: 35, type: 'Written Rx', note: 'Monthly CII — no refills' },
      { date: '2026-01-25', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 30, refillNumber: 34, type: 'Written Rx', note: 'Monthly CII — no refills' },
      { date: '2023-03-01', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initiated for ADHD; titrated from 10mg' },
    ] },
    { id: 'm11', name: 'Buspirone', dose: '15mg', route: 'Oral', frequency: 'Twice daily', startDate: '2023-02-01', prescriber: 'NP Michael Johnson', status: 'Active', refillsLeft: 3, isControlled: false, schedule: null, pharmacy: 'CVS Pharmacy - College Ave', lastFilled: '2026-03-15', sig: 'Take 1 tablet by mouth twice daily', rxHistory: [
      { date: '2026-03-15', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 60, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2025-12-15', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 60, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2025-06-01', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 60, refillNumber: 1, type: 'Refill', note: 'Dose increased from 10mg to 15mg' },
      { date: '2023-02-01', prescribedBy: 'NP Michael Johnson', pharmacy: 'CVS Pharmacy - College Ave', qty: 60, refillNumber: 0, type: 'New Prescription', note: 'For generalized anxiety disorder' },
    ] },
  ],
  p5: [
    { id: 'm12', name: 'Mirtazapine (Remeron)', dose: '30mg', route: 'Oral', frequency: 'Once daily at bedtime', startDate: '2026-01-01', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 5, isControlled: false, schedule: null, pharmacy: 'Walmart Pharmacy', lastFilled: '2026-03-20', sig: 'Take 1 tablet by mouth at bedtime', rxHistory: [
      { date: '2026-03-20', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2026-02-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 1, type: 'Refill', note: 'Dose increased from 15mg to 30mg' },
      { date: '2026-01-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Started at 15mg for depression and insomnia' },
    ] },
    { id: 'm13', name: 'Lorazepam (Ativan)', dose: '0.5mg', route: 'Oral', frequency: 'Twice daily as needed', startDate: '2026-01-15', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 1, isControlled: true, schedule: 'Schedule IV', pharmacy: 'Walmart Pharmacy', lastFilled: '2026-03-01', sig: 'Take 1 tablet by mouth twice daily as needed for acute anxiety', rxHistory: [
      { date: '2026-03-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 2, type: 'Written Rx', note: 'CIV — limited supply per PDMP guidelines' },
      { date: '2026-02-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 1, type: 'Written Rx', note: '' },
      { date: '2026-01-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Short-term for acute anxiety; review in 90 days' },
    ] },
    { id: 'm14', name: 'Donepezil (Aricept)', dose: '10mg', route: 'Oral', frequency: 'Once daily at bedtime', startDate: '2025-07-01', prescriber: 'Dr. Thomas Brown (PCP)', status: 'Active', refillsLeft: 4, isControlled: false, schedule: null, pharmacy: 'Walmart Pharmacy', lastFilled: '2026-03-15', sig: 'Take 1 tablet by mouth at bedtime', rxHistory: [
      { date: '2026-03-15', prescribedBy: 'Dr. Thomas Brown (PCP)', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2025-12-15', prescribedBy: 'Dr. Thomas Brown (PCP)', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2025-10-01', prescribedBy: 'Dr. Thomas Brown (PCP)', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 1, type: 'Refill', note: 'Dose increased from 5mg to 10mg' },
      { date: '2025-07-01', prescribedBy: 'Dr. Thomas Brown (PCP)', pharmacy: 'Walmart Pharmacy', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Initiated for mild cognitive impairment / early Alzheimer\'s — started at 5mg' },
    ] },
  ],
  p6: [
    { id: 'm15', name: 'Lamotrigine (Lamictal)', dose: '200mg', route: 'Oral', frequency: 'Once daily', startDate: '2021-06-01', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 5, isControlled: false, schedule: null, pharmacy: 'Walgreens - Oak Park', lastFilled: '2026-03-25', sig: 'Take 1 tablet by mouth once daily', rxHistory: [
      { date: '2026-03-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 90, refillNumber: 5, type: 'Refill', note: '90-day supply' },
      { date: '2025-12-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 90, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2025-09-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 90, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2021-09-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 1, type: 'Refill', note: 'Dose titrated to 200mg per protocol' },
      { date: '2021-06-01', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Titration start at 25mg for bipolar I disorder' },
    ] },
    { id: 'm16', name: 'Quetiapine (Seroquel)', dose: '100mg', route: 'Oral', frequency: 'Once daily at bedtime', startDate: '2021-09-15', prescriber: 'Dr. Chris L.', status: 'Active', refillsLeft: 3, isControlled: false, schedule: null, pharmacy: 'Walgreens - Oak Park', lastFilled: '2026-03-25', sig: 'Take 1 tablet by mouth at bedtime', rxHistory: [
      { date: '2026-03-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 4, type: 'Refill', note: '' },
      { date: '2025-12-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 3, type: 'Refill', note: '' },
      { date: '2025-09-25', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 2, type: 'Refill', note: '' },
      { date: '2021-09-15', prescribedBy: 'Dr. Chris L.', pharmacy: 'Walgreens - Oak Park', qty: 30, refillNumber: 0, type: 'New Prescription', note: 'Added as mood stabilizer adjunct for bipolar I' },
    ] },
  ],
};

// ========== MEDICATION INSURANCE / FORMULARY ==========
export const medicationInsurance = {
  // p1 – Blue Cross Blue Shield
  m1: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', formularyTier: 'Tier 1 – Generic', rxCopay: 10, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 tablets / 90 days', stepTherapyRequired: false, coverageNotes: 'Generic sertraline fully covered under behavioral health benefit.' },
  m2: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', formularyTier: 'Tier 1 – Generic', rxCopay: 10, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Generic trazodone covered. PRN use approved.' },
  m3: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', formularyTier: 'Tier 1 – Generic', rxCopay: 10, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 tablets / 90 days', stepTherapyRequired: false, coverageNotes: 'Covered under medical benefit (diabetes management). Prescribed by PCP.' },
  // p2 – Aetna
  m4: { insuranceName: 'Aetna', memberId: 'AET987654321', formularyTier: 'Tier 2 – Preferred Brand', rxCopay: 35, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 capsules / 90 days', stepTherapyRequired: false, coverageNotes: 'Brand Effexor XR on preferred formulary. Generic venlafaxine ER available at Tier 1 ($15).' },
  m5: { insuranceName: 'Aetna', memberId: 'AET987654321', formularyTier: 'Tier 1 – Generic', rxCopay: 15, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Generic prazosin covered under behavioral health benefit for PTSD nightmares.' },
  m6: { insuranceName: 'Aetna', memberId: 'AET987654321', formularyTier: 'Tier 1 – Generic', rxCopay: 15, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '120 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'OTC-strength hydroxyzine covered as Rx under behavioral health benefit.' },
  // p3 – United Healthcare (primary) + Medicaid (secondary)
  m7: { insuranceName: 'United Healthcare', memberId: 'UHC456789012', formularyTier: 'Tier 2 – Preferred', rxCopay: 15, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 tablets / 90 days', stepTherapyRequired: false, coverageNotes: 'Covered under SUD treatment benefit. Medicaid secondary covers remaining copay ($0 patient cost).' },
  m8: { insuranceName: 'United Healthcare', memberId: 'UHC456789012', formularyTier: 'Tier 2 – Preferred Brand', rxCopay: 20, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Brand Wellbutrin XL preferred. Medicaid secondary covers copay balance.' },
  m9: { insuranceName: 'United Healthcare', memberId: 'UHC456789012', formularyTier: 'Tier 1 – Generic', rxCopay: 5, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 tablets / 90 days', stepTherapyRequired: false, coverageNotes: 'Generic lisinopril fully covered. Prescribed by external PCP Dr. William Davis.' },
  // p4 – Cigna
  m10: { insuranceName: 'Cigna', memberId: 'CIG321654987', formularyTier: 'Tier 2 – Preferred Brand', rxCopay: 30, priorAuthRequired: true, coverageStatus: 'Covered – PA Approved', quantityLimit: '30 capsules / 30 days (CII – no refills)', stepTherapyRequired: true, coverageNotes: 'Schedule II controlled substance. Prior authorization approved through 09/2026. Step therapy completed (failed behavioral interventions alone). PDMP check required each fill.' },
  m11: { insuranceName: 'Cigna', memberId: 'CIG321654987', formularyTier: 'Tier 1 – Generic', rxCopay: 10, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '60 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Generic buspirone covered under behavioral health benefit.' },
  // p5 – Medicare (primary) + AARP Supplemental (secondary)
  m12: { insuranceName: 'Medicare Part D', memberId: 'MCR567890123', formularyTier: 'Tier 1 – Generic', rxCopay: 0, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Generic mirtazapine covered under Medicare Part D. AARP supplement covers any remaining cost. $0 patient responsibility.' },
  m13: { insuranceName: 'Medicare Part D', memberId: 'MCR567890123', formularyTier: 'Tier 3 – Non-Preferred', rxCopay: 0, priorAuthRequired: false, coverageStatus: 'Covered – Quantity Limited', quantityLimit: '30 tablets / 30 days (max 60 days supply)', stepTherapyRequired: false, coverageNotes: 'Benzodiazepine covered under Part D with quantity limits. AARP supplement covers copay. Prescriber must document medical necessity for continued use beyond 90 days.' },
  m14: { insuranceName: 'Medicare Part D', memberId: 'MCR567890123', formularyTier: 'Tier 1 – Generic', rxCopay: 0, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Donepezil covered under Medicare Part D for Alzheimer\'s disease. AARP supplement covers remaining cost.' },
  // p6 – Anthem
  m15: { insuranceName: 'Anthem', memberId: 'ANT654987321', formularyTier: 'Tier 1 – Generic', rxCopay: 10, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '90 tablets / 90 days', stepTherapyRequired: false, coverageNotes: 'Generic lamotrigine covered. Mood stabilizer approved for bipolar I maintenance.' },
  m16: { insuranceName: 'Anthem', memberId: 'ANT654987321', formularyTier: 'Tier 2 – Preferred Brand', rxCopay: 30, priorAuthRequired: false, coverageStatus: 'Covered', quantityLimit: '30 tablets / 30 days', stepTherapyRequired: false, coverageNotes: 'Brand Seroquel on preferred formulary. Generic quetiapine available at Tier 1 ($10).' },
};

// ========== IMMUNIZATIONS ==========
export const immunizations = {
  p1: [
    { id: 'imm1', vaccine: 'Influenza (Flu)', date: '2025-10-15', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-A1234', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm2', vaccine: 'COVID-19 (Updated 2025-2026)', date: '2025-09-20', site: 'Right Deltoid', route: 'IM', lot: 'CV2526-B5678', manufacturer: 'Pfizer-BioNTech', administeredBy: 'Kelly Chen, RN', nextDue: '2026-09-01' },
    { id: 'imm3', vaccine: 'Tdap', date: '2022-06-10', site: 'Left Deltoid', route: 'IM', lot: 'TD2022-C9012', manufacturer: 'GSK', administeredBy: 'Kelly Chen, RN', nextDue: '2032-06-10' },
    { id: 'imm4', vaccine: 'Hepatitis B (Series Complete)', date: '2020-03-15', site: 'Right Deltoid', route: 'IM', lot: 'HB2020-D3456', manufacturer: 'Merck', administeredBy: 'External', nextDue: 'Complete' },
  ],
  p2: [
    { id: 'imm5', vaccine: 'Influenza (Flu)', date: '2025-11-01', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-E7890', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm6', vaccine: 'COVID-19 (Updated 2025-2026)', date: '2025-10-05', site: 'Right Deltoid', route: 'IM', lot: 'CV2526-F1234', manufacturer: 'Moderna', administeredBy: 'Kelly Chen, RN', nextDue: '2026-09-01' },
  ],
  p3: [
    { id: 'imm7', vaccine: 'Influenza (Flu)', date: '2025-10-20', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-G5678', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm8', vaccine: 'Pneumococcal (PCV20)', date: '2025-01-15', site: 'Left Deltoid', route: 'IM', lot: 'PN2025-H9012', manufacturer: 'Pfizer', administeredBy: 'External', nextDue: 'Complete' },
  ],
  p4: [
    { id: 'imm9', vaccine: 'Influenza (Flu)', date: '2025-09-15', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-I3456', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm10', vaccine: 'HPV (Gardasil 9 - Series Complete)', date: '2019-03-20', site: 'Right Deltoid', route: 'IM', lot: 'HPV2019-J7890', manufacturer: 'Merck', administeredBy: 'External', nextDue: 'Complete' },
  ],
  p5: [
    { id: 'imm11', vaccine: 'Influenza (Flu)', date: '2025-10-10', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-K1234', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm12', vaccine: 'Shingrix (Dose 2 of 2)', date: '2024-06-15', site: 'Right Deltoid', route: 'IM', lot: 'SH2024-L5678', manufacturer: 'GSK', administeredBy: 'External', nextDue: 'Complete' },
    { id: 'imm13', vaccine: 'Pneumococcal (PCV20)', date: '2025-02-10', site: 'Left Deltoid', route: 'IM', lot: 'PN2025-M9012', manufacturer: 'Pfizer', administeredBy: 'Kelly Chen, RN', nextDue: 'Complete' },
  ],
  p6: [
    { id: 'imm14', vaccine: 'Influenza (Flu)', date: '2025-11-05', site: 'Left Deltoid', route: 'IM', lot: 'FL2025-N3456', manufacturer: 'Sanofi Pasteur', administeredBy: 'Kelly Chen, RN', nextDue: '2026-10-01' },
    { id: 'imm15', vaccine: 'COVID-19 (Updated 2025-2026)', date: '2025-10-15', site: 'Right Deltoid', route: 'IM', lot: 'CV2526-O7890', manufacturer: 'Pfizer-BioNTech', administeredBy: 'Kelly Chen, RN', nextDue: '2026-09-01' },
  ],
};

// ========== LAB RESULTS ==========
export const labResults = {
  p1: [
    {
      id: 'lab1', orderDate: '2026-03-28', resultDate: '2026-03-30', orderedBy: 'Dr. Chris L.', status: 'Final',
      tests: [
        { name: 'CBC w/ Differential', results: [
          { component: 'WBC', value: '7.2', unit: 'K/uL', range: '4.5-11.0', flag: '' },
          { component: 'RBC', value: '4.8', unit: 'M/uL', range: '4.5-5.5', flag: '' },
          { component: 'Hemoglobin', value: '14.2', unit: 'g/dL', range: '13.5-17.5', flag: '' },
          { component: 'Hematocrit', value: '42.1', unit: '%', range: '38.0-50.0', flag: '' },
          { component: 'Platelets', value: '245', unit: 'K/uL', range: '150-400', flag: '' },
        ]},
        { name: 'Comprehensive Metabolic Panel', results: [
          { component: 'Glucose', value: '142', unit: 'mg/dL', range: '70-100', flag: 'H' },
          { component: 'BUN', value: '18', unit: 'mg/dL', range: '7-20', flag: '' },
          { component: 'Creatinine', value: '1.0', unit: 'mg/dL', range: '0.7-1.3', flag: '' },
          { component: 'Sodium', value: '140', unit: 'mEq/L', range: '136-145', flag: '' },
          { component: 'Potassium', value: '4.2', unit: 'mEq/L', range: '3.5-5.0', flag: '' },
          { component: 'ALT', value: '28', unit: 'U/L', range: '7-56', flag: '' },
          { component: 'AST', value: '24', unit: 'U/L', range: '10-40', flag: '' },
        ]},
        { name: 'HbA1c', results: [
          { component: 'Hemoglobin A1c', value: '7.2', unit: '%', range: '<5.7', flag: 'H' },
        ]},
        { name: 'Lipid Panel', results: [
          { component: 'Total Cholesterol', value: '210', unit: 'mg/dL', range: '<200', flag: 'H' },
          { component: 'LDL', value: '135', unit: 'mg/dL', range: '<100', flag: 'H' },
          { component: 'HDL', value: '42', unit: 'mg/dL', range: '>40', flag: '' },
          { component: 'Triglycerides', value: '165', unit: 'mg/dL', range: '<150', flag: 'H' },
        ]},
      ],
    },
  ],
  p2: [
    {
      id: 'lab2', orderDate: '2026-03-25', resultDate: '2026-03-27', orderedBy: 'Dr. Chris L.', status: 'Final',
      tests: [
        { name: 'TSH', results: [
          { component: 'TSH', value: '2.4', unit: 'mIU/L', range: '0.4-4.0', flag: '' },
        ]},
        { name: 'CBC', results: [
          { component: 'WBC', value: '6.5', unit: 'K/uL', range: '4.5-11.0', flag: '' },
          { component: 'Hemoglobin', value: '13.2', unit: 'g/dL', range: '12.0-16.0', flag: '' },
        ]},
      ],
    },
  ],
  p3: [
    {
      id: 'lab3', orderDate: '2026-03-20', resultDate: '2026-03-22', orderedBy: 'Joseph', status: 'Final',
      tests: [
        { name: 'Hepatic Function Panel', results: [
          { component: 'ALT', value: '62', unit: 'U/L', range: '7-56', flag: 'H' },
          { component: 'AST', value: '55', unit: 'U/L', range: '10-40', flag: 'H' },
          { component: 'Alkaline Phosphatase', value: '95', unit: 'U/L', range: '44-147', flag: '' },
          { component: 'Total Bilirubin', value: '1.1', unit: 'mg/dL', range: '0.1-1.2', flag: '' },
          { component: 'Albumin', value: '3.8', unit: 'g/dL', range: '3.5-5.5', flag: '' },
        ]},
        { name: 'Urine Drug Screen', results: [
          { component: 'Amphetamines', value: 'Negative', unit: '', range: 'Negative', flag: '' },
          { component: 'Benzodiazepines', value: 'Negative', unit: '', range: 'Negative', flag: '' },
          { component: 'Cocaine', value: 'Negative', unit: '', range: 'Negative', flag: '' },
          { component: 'Opiates', value: 'Negative', unit: '', range: 'Negative', flag: '' },
          { component: 'THC', value: 'Positive', unit: '', range: 'Negative', flag: 'A' },
          { component: 'Alcohol (EtOH)', value: 'Negative', unit: '', range: 'Negative', flag: '' },
        ]},
      ],
    },
  ],
  p4: [],
  p5: [],
  p6: [],
};

// ========== ASSESSMENT TOOLS / SCORES ==========
export const assessmentScores = {
  p1: [
    { id: 'as1',  tool: 'PHQ-9', score: 14, interpretation: 'Moderate Depression',          date: '2026-04-02', administeredBy: 'Dr. Chris L.', answers: [2,2,2,1,1,2,1,2,1] },
    { id: 'as2',  tool: 'PHQ-9', score: 18, interpretation: 'Moderately Severe Depression',  date: '2026-03-05', administeredBy: 'Dr. Chris L.', answers: [2,3,2,2,1,2,2,2,2] },
    { id: 'as2b', tool: 'PHQ-9', score: 20, interpretation: 'Severe Depression',             date: '2026-02-05', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,2,2,2,1] },
    { id: 'as2c', tool: 'PHQ-9', score: 22, interpretation: 'Severe Depression',             date: '2026-01-08', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,3,2,2,2] },
    { id: 'as2d', tool: 'PHQ-9', score: 23, interpretation: 'Severe Depression',             date: '2025-12-10', administeredBy: 'Dr. Chris L.', answers: [3,3,3,3,2,3,2,2,2] },
    { id: 'as2e', tool: 'PHQ-9', score: 21, interpretation: 'Severe Depression',             date: '2025-11-12', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,3,2,2,1] },
    { id: 'as3',  tool: 'GAD-7', score: 12, interpretation: 'Moderate Anxiety',              date: '2026-04-02', administeredBy: 'Dr. Chris L.', answers: [2,2,1,2,2,1,2] },
    { id: 'as4',  tool: 'GAD-7', score: 15, interpretation: 'Severe Anxiety',                date: '2026-03-05', administeredBy: 'Dr. Chris L.', answers: [3,2,2,2,2,2,2] },
    { id: 'as4b', tool: 'GAD-7', score: 16, interpretation: 'Severe Anxiety',                date: '2026-02-05', administeredBy: 'Dr. Chris L.', answers: [3,2,2,3,2,2,2] },
    { id: 'as4c', tool: 'GAD-7', score: 17, interpretation: 'Severe Anxiety',                date: '2026-01-08', administeredBy: 'Dr. Chris L.', answers: [3,2,3,3,2,2,2] },
    { id: 'as4d', tool: 'GAD-7', score: 18, interpretation: 'Severe Anxiety',                date: '2025-12-10', administeredBy: 'Dr. Chris L.', answers: [3,3,3,3,2,2,2] },
    { id: 'as4e', tool: 'GAD-7', score: 17, interpretation: 'Severe Anxiety',                date: '2025-11-12', administeredBy: 'Dr. Chris L.', answers: [3,3,2,3,2,2,2] },
    { id: 'as5',  tool: 'Columbia Suicide Severity Rating', score: 2, interpretation: 'Low Risk - Non-specific active suicidal thoughts', date: '2026-04-02', administeredBy: 'Dr. Chris L.' },
  ],
  p2: [
    { id: 'as6',  tool: 'PHQ-9', score: 22, interpretation: 'Severe Depression',             date: '2026-04-05', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,3,2,2,2] },
    { id: 'as6b', tool: 'PHQ-9', score: 23, interpretation: 'Severe Depression',             date: '2026-03-01', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,3,3,2,2,2] },
    { id: 'as6c', tool: 'PHQ-9', score: 21, interpretation: 'Severe Depression',             date: '2026-02-01', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,3,2,1,2] },
    { id: 'as6d', tool: 'PHQ-9', score: 19, interpretation: 'Moderately Severe Depression',  date: '2026-01-04', administeredBy: 'Dr. Chris L.', answers: [3,3,2,2,2,3,2,1,1] },
    { id: 'as7',  tool: 'PCL-5', score: 52, interpretation: 'Probable PTSD (cutoff: 31-33)',  date: '2026-04-05', administeredBy: 'Dr. Chris L.' },
    { id: 'as8',  tool: 'Columbia Suicide Severity Rating', score: 3, interpretation: 'Moderate Risk - Active suicidal ideation with some intent', date: '2026-04-05', administeredBy: 'Dr. Chris L.' },
    { id: 'as9',  tool: 'GAD-7', score: 18, interpretation: 'Severe Anxiety',                date: '2026-04-05', administeredBy: 'Dr. Chris L.', answers: [3,3,2,3,2,3,2] },
    { id: 'as9b', tool: 'GAD-7', score: 19, interpretation: 'Severe Anxiety',                date: '2026-03-01', administeredBy: 'Dr. Chris L.', answers: [3,3,3,3,2,3,2] },
    { id: 'as9c', tool: 'GAD-7', score: 17, interpretation: 'Severe Anxiety',                date: '2026-02-01', administeredBy: 'Dr. Chris L.', answers: [3,3,2,3,2,2,2] },
    { id: 'as9d', tool: 'GAD-7', score: 16, interpretation: 'Severe Anxiety',                date: '2026-01-04', administeredBy: 'Dr. Chris L.', answers: [3,2,2,3,2,2,2] },
  ],
  p3: [
    { id: 'as10', tool: 'AUDIT-C', score: 7, interpretation: 'Positive for Alcohol Misuse', date: '2026-03-28', administeredBy: 'Joseph' },
    { id: 'as11', tool: 'PHQ-9',  score: 8,  interpretation: 'Mild Depression',              date: '2026-03-28', administeredBy: 'Joseph', answers: [1,1,1,1,1,1,1,0,1] },
    { id: 'as11b',tool: 'PHQ-9',  score: 10, interpretation: 'Moderate Depression',          date: '2026-02-20', administeredBy: 'Joseph', answers: [1,1,2,1,1,2,1,0,1] },
    { id: 'as11c',tool: 'PHQ-9',  score: 13, interpretation: 'Moderate Depression',          date: '2026-01-22', administeredBy: 'Joseph', answers: [2,2,2,1,1,2,1,1,1] },
    { id: 'as11d',tool: 'PHQ-9',  score: 11, interpretation: 'Moderate Depression',          date: '2025-12-18', administeredBy: 'Joseph', answers: [2,1,2,1,1,2,1,0,1] },
    { id: 'as12', tool: 'DAST-10', score: 3, interpretation: 'Low Level Drug Use',           date: '2026-03-28', administeredBy: 'Joseph' },
    { id: 'as12b',tool: 'GAD-7',  score: 5,  interpretation: 'Mild Anxiety',                 date: '2026-03-28', administeredBy: 'Joseph', answers: [1,1,0,1,1,0,1] },
    { id: 'as12c',tool: 'GAD-7',  score: 7,  interpretation: 'Mild Anxiety',                 date: '2026-02-20', administeredBy: 'Joseph', answers: [1,1,1,1,1,1,1] },
    { id: 'as12d',tool: 'GAD-7',  score: 9,  interpretation: 'Mild Anxiety',                 date: '2026-01-22', administeredBy: 'Joseph', answers: [1,2,1,1,2,1,1] },
  ],
  p4: [
    { id: 'as13', tool: 'ASRS v1.1', score: 15, interpretation: 'Highly Consistent with ADHD', date: '2026-04-07', administeredBy: 'Joseph' },
    { id: 'as14', tool: 'GAD-7',  score: 10, interpretation: 'Moderate Anxiety',              date: '2026-04-07', administeredBy: 'Joseph', answers: [2,1,1,2,1,2,1] },
    { id: 'as14b',tool: 'GAD-7',  score: 13, interpretation: 'Moderate Anxiety',              date: '2026-03-03', administeredBy: 'Joseph', answers: [2,2,2,2,1,2,2] },
    { id: 'as14c',tool: 'GAD-7',  score: 15, interpretation: 'Severe Anxiety',               date: '2026-02-01', administeredBy: 'Joseph', answers: [3,2,2,2,2,2,2] },
    { id: 'as14d',tool: 'GAD-7',  score: 14, interpretation: 'Moderate Anxiety',              date: '2025-12-15', administeredBy: 'Joseph', answers: [2,2,2,2,2,2,2] },
    { id: 'as15', tool: 'PHQ-9',  score: 6,  interpretation: 'Mild Depression',              date: '2026-04-07', administeredBy: 'Joseph', answers: [1,1,0,1,1,1,0,0,1] },
    { id: 'as15b',tool: 'PHQ-9',  score: 9,  interpretation: 'Mild Depression',              date: '2026-03-03', administeredBy: 'Joseph', answers: [1,1,1,1,1,1,1,1,1] },
    { id: 'as15c',tool: 'PHQ-9',  score: 12, interpretation: 'Moderate Depression',          date: '2026-02-01', administeredBy: 'Joseph', answers: [2,1,2,1,1,2,1,1,1] },
    { id: 'as15d',tool: 'PHQ-9',  score: 11, interpretation: 'Moderate Depression',          date: '2025-12-15', administeredBy: 'Joseph', answers: [2,1,2,1,1,1,1,1,1] },
  ],
  p5: [
    { id: 'as16', tool: 'PHQ-9',  score: 24, interpretation: 'Severe Depression',            date: '2026-03-20', administeredBy: 'Dr. Chris L.', answers: [3,3,3,3,2,3,3,2,2] },
    { id: 'as16b',tool: 'PHQ-9',  score: 21, interpretation: 'Severe Depression',            date: '2026-02-15', administeredBy: 'Dr. Chris L.', answers: [3,3,3,2,2,3,2,2,1] },
    { id: 'as16c',tool: 'PHQ-9',  score: 19, interpretation: 'Moderately Severe Depression', date: '2026-01-18', administeredBy: 'Dr. Chris L.', answers: [3,2,3,2,2,3,2,1,1] },
    { id: 'as16d',tool: 'PHQ-9',  score: 17, interpretation: 'Moderately Severe Depression', date: '2025-12-20', administeredBy: 'Dr. Chris L.', answers: [2,2,3,2,2,2,2,1,1] },
    { id: 'as17', tool: 'MoCA',   score: 22, interpretation: 'Mild Cognitive Impairment (Normal: ≥26)', date: '2026-03-20', administeredBy: 'Dr. Chris L.' },
    { id: 'as18', tool: 'Columbia Suicide Severity Rating', score: 4, interpretation: 'High Risk - Active suicidal ideation with plan', date: '2026-03-20', administeredBy: 'Dr. Chris L.' },
    { id: 'as19', tool: 'GAD-7',  score: 19, interpretation: 'Severe Anxiety',               date: '2026-03-20', administeredBy: 'Dr. Chris L.', answers: [3,3,3,3,2,3,2] },
    { id: 'as19b',tool: 'GAD-7',  score: 17, interpretation: 'Severe Anxiety',               date: '2026-02-15', administeredBy: 'Dr. Chris L.', answers: [3,2,3,3,2,2,2] },
    { id: 'as19c',tool: 'GAD-7',  score: 15, interpretation: 'Severe Anxiety',               date: '2026-01-18', administeredBy: 'Dr. Chris L.', answers: [3,2,2,3,2,2,1] },
    { id: 'as19d',tool: 'GAD-7',  score: 14, interpretation: 'Moderate Anxiety',             date: '2025-12-20', administeredBy: 'Dr. Chris L.', answers: [2,2,2,2,2,2,2] },
  ],
  p6: [
    { id: 'as20', tool: 'MDQ',    score: 9,  interpretation: 'Positive for Bipolar Spectrum', date: '2026-04-01', administeredBy: 'Dr. Chris L.' },
    { id: 'as21', tool: 'PHQ-9',  score: 11, interpretation: 'Moderate Depression',          date: '2026-04-01', administeredBy: 'Dr. Chris L.', answers: [2,1,2,1,1,1,1,1,1] },
    { id: 'as21b',tool: 'PHQ-9',  score: 13, interpretation: 'Moderate Depression',          date: '2026-03-01', administeredBy: 'Dr. Chris L.', answers: [2,2,2,1,1,2,1,1,1] },
    { id: 'as21c',tool: 'PHQ-9',  score: 15, interpretation: 'Moderately Severe Depression', date: '2026-02-01', administeredBy: 'Dr. Chris L.', answers: [2,2,2,2,2,2,1,1,1] },
    { id: 'as21d',tool: 'PHQ-9',  score: 16, interpretation: 'Moderately Severe Depression', date: '2026-01-04', administeredBy: 'Dr. Chris L.', answers: [2,2,2,2,2,2,2,1,1] },
    { id: 'as22', tool: 'GAD-7',  score: 13, interpretation: 'Moderate Anxiety',             date: '2026-04-01', administeredBy: 'Dr. Chris L.', answers: [2,2,2,2,1,2,2] },
    { id: 'as22b',tool: 'GAD-7',  score: 14, interpretation: 'Moderate Anxiety',             date: '2026-03-01', administeredBy: 'Dr. Chris L.', answers: [2,2,2,2,2,2,2] },
    { id: 'as22c',tool: 'GAD-7',  score: 15, interpretation: 'Severe Anxiety',               date: '2026-02-01', administeredBy: 'Dr. Chris L.', answers: [2,2,3,2,2,2,2] },
    { id: 'as22d',tool: 'GAD-7',  score: 16, interpretation: 'Severe Anxiety',               date: '2026-01-04', administeredBy: 'Dr. Chris L.', answers: [3,2,2,3,2,2,2] },
  ],
};

// ========== ORDERS ==========
export const orders = {
  p1: [
    { id: 'o1', type: 'Lab', description: 'CBC w/ Differential, CMP, HbA1c, Lipid Panel', status: 'Completed', orderedDate: '2026-03-28', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'Routine monitoring - diabetes, med management' },
    { id: 'o2', type: 'Lab', description: 'TSH, Vitamin D 25-Hydroxy', status: 'Pending', orderedDate: '2026-04-02', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'Annual screening' },
    { id: 'o3', type: 'Referral', description: 'Referral to CBT Therapist', status: 'Completed', orderedDate: '2026-01-15', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'Weekly CBT for depression and anxiety' },
  ],
  p2: [
    { id: 'o4', type: 'Lab', description: 'TSH, CBC', status: 'Completed', orderedDate: '2026-03-25', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'Thyroid screening, baseline labs' },
    { id: 'o5', type: 'Referral', description: 'Referral to EMDR Therapist', status: 'Active', orderedDate: '2026-04-05', orderedBy: 'Dr. Chris L.', priority: 'Urgent', notes: 'EMDR therapy for PTSD' },
    { id: 'o6', type: 'Imaging', description: 'Brain MRI w/o contrast', status: 'Pending', orderedDate: '2026-04-05', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'R/O organic pathology given severity of symptoms' },
  ],
  p3: [
    { id: 'o7', type: 'Lab', description: 'Hepatic Function Panel, UDS', status: 'Completed', orderedDate: '2026-03-20', orderedBy: 'Joseph', priority: 'Routine', notes: 'Monitoring LFTs and compliance' },
    { id: 'o8', type: 'Referral', description: 'Referral to AA/NA Support Group', status: 'Active', orderedDate: '2026-03-28', orderedBy: 'Joseph', priority: 'Routine', notes: 'Community support for alcohol use disorder' },
  ],
  p4: [
    { id: 'o9', type: 'Lab', description: 'CBC, CMP', status: 'Pending', orderedDate: '2026-04-07', orderedBy: 'Joseph', priority: 'Routine', notes: 'Baseline labs before stimulant monitoring' },
    { id: 'o10', type: 'Prescription', description: 'Adderall XR 20mg - Refill', status: 'Pending EPCS Auth', orderedDate: '2026-04-07', orderedBy: 'Joseph', priority: 'Routine', notes: 'Schedule II - requires EPCS authentication' },
  ],
  p5: [
    { id: 'o11', type: 'Referral', description: 'Referral to Neuropsychology', status: 'Active', orderedDate: '2026-03-20', orderedBy: 'Dr. Chris L.', priority: 'Urgent', notes: 'Cognitive assessment for early onset Alzheimers' },
    { id: 'o12', type: 'Lab', description: 'BMP, TSH, B12, Folate', status: 'Pending', orderedDate: '2026-03-20', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'R/O reversible causes of cognitive decline' },
  ],
  p6: [
    { id: 'o13', type: 'Lab', description: 'Lamotrigine Level, CBC, CMP', status: 'Pending', orderedDate: '2026-04-01', orderedBy: 'Dr. Chris L.', priority: 'Routine', notes: 'Therapeutic drug monitoring' },
  ],
};

// ========== ORDER INSURANCE / COVERAGE ==========
export const orderInsurance = {
  // p1 – Blue Cross Blue Shield
  o1: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Routine labs fully covered under preventive benefit. No copay for in-network Quest Diagnostics.' },
  o2: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Annual screening labs covered at 100% under preventive care. In-network lab required.' },
  o3: { insuranceName: 'Blue Cross Blue Shield', memberId: 'BCB123456789', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 30, coverageNotes: 'Behavioral health referral covered. Specialist copay of $30 per session applies. 30 outpatient MH visits/year included.' },
  // p2 – Aetna
  o4: { insuranceName: 'Aetna', memberId: 'AET987654321', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Routine labs covered at 100% in-network. No cost sharing for preventive screening.' },
  o5: { insuranceName: 'Aetna', memberId: 'AET987654321', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 25, coverageNotes: 'EMDR therapy covered under behavioral health benefit. $25 specialist copay per session. Pre-authorization not required for initial 20 sessions.' },
  o6: { insuranceName: 'Aetna', memberId: 'AET987654321', coverageStatus: 'Pending PA', priorAuthRequired: true, authorizationNumber: 'PA-2026-AET-44821', estimatedPatientCost: 150, coverageNotes: 'Brain MRI requires prior authorization. PA submitted 04/05/2026. Clinical documentation for medical necessity attached. Estimated patient cost reflects 20% coinsurance after deductible if approved.' },
  // p3 – United Healthcare + Medicaid
  o7: { insuranceName: 'United Healthcare', memberId: 'UHC456789012', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Hepatic function panel and UDS covered under substance use disorder monitoring benefit. Medicaid secondary covers remaining balance. $0 patient cost.' },
  o8: { insuranceName: 'United Healthcare', memberId: 'UHC456789012', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Community support group referral — no insurance billing applicable. Free community resource.' },
  // p4 – Cigna
  o9: { insuranceName: 'Cigna', memberId: 'CIG321654987', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Baseline labs covered at 100% under preventive benefit. Required for stimulant medication monitoring.' },
  o10: { insuranceName: 'Cigna', memberId: 'CIG321654987', coverageStatus: 'Covered – PA Active', priorAuthRequired: true, authorizationNumber: 'PA-2026-CIG-33195', estimatedPatientCost: 30, coverageNotes: 'Schedule II prescription requires active prior authorization. PA approved through 09/30/2026. EPCS authentication pending provider action. $30 brand copay.' },
  // p5 – Medicare + AARP
  o11: { insuranceName: 'Medicare Part B', memberId: 'MCR567890123', coverageStatus: 'Covered', priorAuthRequired: true, authorizationNumber: 'PA-2026-MCR-77012', estimatedPatientCost: 0, coverageNotes: 'Neuropsychological testing covered under Medicare Part B with prior authorization. PA approved. AARP supplement covers 20% coinsurance. $0 patient cost.' },
  o12: { insuranceName: 'Medicare Part B', memberId: 'MCR567890123', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Diagnostic labs covered at 100% under Medicare Part B. No deductible or coinsurance for clinical lab services.' },
  // p6 – Anthem
  o13: { insuranceName: 'Anthem', memberId: 'ANT654987321', coverageStatus: 'Covered', priorAuthRequired: false, authorizationNumber: null, estimatedPatientCost: 0, coverageNotes: 'Therapeutic drug monitoring labs covered at 100% in-network. Required for lamotrigine level monitoring.' },
};

// ========== CLINICAL INBOX MESSAGES ==========
export const inboxMessages = [
  { id: 'msg1', type: 'Rx Refill Request', from: 'CVS Pharmacy - Main St', to: 'u1', patient: 'p1', patientName: 'James Anderson', subject: 'Refill Request: Sertraline 100mg', body: 'Patient requesting refill of Sertraline 100mg #90. Last filled 03/15/2026. 0 refills remaining.', date: '2026-04-08', time: '09:15', read: false, priority: 'Normal', status: 'Pending' },
  { id: 'msg2', type: 'Lab Result', from: 'Quest Diagnostics', to: 'u1', patient: 'p1', patientName: 'James Anderson', subject: 'Lab Results Ready: CBC, CMP, HbA1c, Lipid Panel', body: 'Lab results are now available for review. Click to view full results.', date: '2026-04-08', time: '08:30', read: false, priority: 'Normal', status: 'Pending' },
  { id: 'msg3', type: 'Patient Message', from: 'Maria Garcia', to: 'u1', patient: 'p2', patientName: 'Maria Garcia', subject: 'Medication Side Effects', body: 'Dr. Chris L., I have been experiencing increased dizziness and headaches since starting Prazosin. Should I continue taking it? I am also having trouble sleeping. Please advise.', date: '2026-04-07', time: '16:45', read: false, priority: 'High', status: 'Pending' },
  { id: 'msg4', type: 'Prior Authorization', from: 'Aetna Insurance', to: 'u1', patient: 'p2', patientName: 'Maria Garcia', subject: 'PA Required: Brain MRI w/o contrast', body: 'Prior authorization is required for the ordered Brain MRI. Please submit clinical documentation supporting medical necessity.', date: '2026-04-07', time: '14:20', read: true, priority: 'High', status: 'In Progress' },
  { id: 'msg5', type: 'Rx Refill Request', from: 'CVS Pharmacy - College Ave', to: 'u2', patient: 'p4', patientName: 'Emily Chen', subject: 'Refill Request: Adderall XR 20mg (Schedule II)', body: 'Patient requesting refill of Adderall XR 20mg #30. CONTROLLED SUBSTANCE - Schedule II. Requires new prescription. Last filled 03/25/2026.', date: '2026-04-08', time: '10:00', read: false, priority: 'High', status: 'Pending' },
  { id: 'msg6', type: 'Staff Message', from: 'Sarah Williams (Front Desk)', to: 'u1', patient: null, patientName: null, subject: 'Schedule Change Request', body: 'Dr. Chris L., patient Robert Wilson called requesting to move his 04/18 appointment to 04/16. He mentioned his symptoms are worsening. Should I accommodate?', date: '2026-04-08', time: '08:00', read: false, priority: 'Normal', status: 'Pending' },
  { id: 'msg7', type: 'Patient Message', from: 'David Thompson', to: 'u2', patient: 'p3', patientName: 'David Thompson', subject: 'Missed Dose Question', body: 'Joseph, I accidentally missed my Naltrexone yesterday. Should I take a double dose today or just continue as normal?', date: '2026-04-08', time: '07:30', read: false, priority: 'Normal', status: 'Pending' },
  { id: 'msg8', type: 'Referral Update', from: 'Dr. Sarah Kim, PhD (EMDR)', to: 'u1', patient: 'p2', patientName: 'Maria Garcia', subject: 'Referral Accepted - EMDR Therapy', body: 'I am accepting the referral for Maria Garcia for EMDR therapy. First appointment scheduled for 04/15/2026 at 2:00 PM. Will send progress notes after each session.', date: '2026-04-06', time: '11:30', read: true, priority: 'Normal', status: 'Completed' },
  // Front desk messages
  { id: 'msg9', type: 'Check-in Alert', from: 'System', to: 'u3', patient: 'p1', patientName: 'James Anderson', subject: 'Patient Checked In - 10:00 AM Appointment', body: 'James Anderson has checked in for his 10:00 AM appointment with Dr. Chris L.. Insurance verified. Copay: $30 collected.', date: '2026-04-09', time: '09:45', read: false, priority: 'Normal', status: 'Pending' },
  { id: 'msg10', type: 'Insurance Alert', from: 'System', to: 'u3', patient: 'p3', patientName: 'David Thompson', subject: 'Insurance Eligibility Failed', body: 'United Healthcare eligibility check failed for David Thompson. Policy may be inactive. Please verify coverage before next appointment on 04/15.', date: '2026-04-08', time: '16:00', read: false, priority: 'High', status: 'Pending' },
];

// ========== SMART PHRASES ==========
export const smartPhrases = [
  { id: 'sp1', trigger: '.mentalstatusexam', name: 'Mental Status Exam - Normal', category: 'Exam', content: 'MENTAL STATUS EXAMINATION:\nAppearance: Well-groomed, appropriately dressed, good hygiene\nBehavior: Cooperative, good eye contact, no psychomotor agitation or retardation\nSpeech: Normal rate, rhythm, and volume; spontaneous and coherent\nMood: "Good" (patient-reported)\nAffect: Euthymic, congruent with stated mood, full range\nThought Process: Linear, logical, goal-directed\nThought Content: No suicidal ideation, homicidal ideation, or auditory/visual hallucinations. No delusions or paranoia.\nCognition: Alert and oriented x4 (person, place, time, situation). Attention and concentration intact.\nInsight: Good\nJudgment: Good\nMemory: Intact for recent and remote events' },
  { id: 'sp2', trigger: '.mseneg', name: 'Mental Status Exam - Depressed', category: 'Exam', content: 'MENTAL STATUS EXAMINATION:\nAppearance: Casually dressed, fair hygiene, appears fatigued\nBehavior: Cooperative but psychomotor retardation noted. Decreased eye contact.\nSpeech: Decreased rate and volume, increased latency\nMood: "Depressed" / "Down" (patient-reported)\nAffect: Dysphoric, constricted range, tearful at times\nThought Process: Linear but slowed, occasionally circumstantial\nThought Content: Endorses passive suicidal ideation without plan or intent. Denies homicidal ideation. No auditory/visual hallucinations. No delusions.\nCognition: Alert and oriented x4. Attention and concentration mildly impaired.\nInsight: Fair\nJudgment: Fair\nMemory: Intact' },
  { id: 'sp3', trigger: '.mseanx', name: 'Mental Status Exam - Anxious', category: 'Exam', content: 'MENTAL STATUS EXAMINATION:\nAppearance: Appropriately dressed, appears tense, fidgeting\nBehavior: Cooperative, restless, frequent position changes, wringing hands\nSpeech: Pressured rate, normal volume, coherent\nMood: "Anxious" / "Nervous" (patient-reported)\nAffect: Anxious, mildly restricted range\nThought Process: Linear but tangential at times, occasionally racing\nThought Content: Endorses excessive worry. Denies suicidal/homicidal ideation. No hallucinations or delusions.\nCognition: Alert and oriented x4. Attention and concentration impaired by anxiety.\nInsight: Good\nJudgment: Good\nMemory: Intact' },
  { id: 'sp4', trigger: '.safetyplan', name: 'Safety Plan', category: 'Clinical', content: 'SAFETY PLAN:\n1. Warning Signs (thoughts, images, mood, situation, behavior): []\n2. Internal Coping Strategies (things I can do to take my mind off problems): []\n3. People and Social Settings that Provide Distraction: []\n4. People I Can Ask for Help:\n   - Name: _____ Phone: _____\n   - Name: _____ Phone: _____\n5. Professionals/Agencies I Can Contact During a Crisis:\n   - Clinician: _____ Phone: _____\n   - 988 Suicide & Crisis Lifeline: Call or Text 988\n   - Crisis Text Line: Text HOME to 741741\n   - Local ER: _____\n6. Making the Environment Safe (removing/restricting access to lethal means): []\n7. My Reasons for Living: []' },
  { id: 'sp5', trigger: '.followupmh', name: 'Follow Up - Mental Health', category: 'Plan', content: 'PLAN:\n1. Continue current medication regimen as prescribed\n2. Return to clinic in [4/6/8/12] weeks for follow-up\n3. Continue therapy [weekly/biweekly] with [therapist name]\n4. Patient instructed to call clinic or go to nearest ER if experiencing worsening symptoms, suicidal thoughts, or medication side effects\n5. Reviewed safety plan and crisis resources (988 Lifeline)\n6. Labs ordered: []\n7. Medication changes: []\n8. Referrals: []' },
  { id: 'sp6', trigger: '.initialpsych', name: 'Initial Psychiatric Evaluation Template', category: 'Note', content: 'PSYCHIATRIC EVALUATION\n\nCHIEF COMPLAINT: []\n\nHISTORY OF PRESENT ILLNESS:\nPatient is a [age]-year-old [gender] presenting for [initial evaluation/follow-up] for [presenting concern]. [Narrative description of current symptoms, onset, duration, severity, triggers, and impact on functioning.]\n\nPAST PSYCHIATRIC HISTORY:\n- Previous diagnoses: []\n- Previous hospitalizations: []\n- Previous medications: []\n- Previous therapy/treatment: []\n- History of self-harm/suicide attempts: []\n\nSUBSTANCE USE HISTORY:\n- Alcohol: []\n- Cannabis: []\n- Tobacco/Nicotine: []\n- Stimulants: []\n- Opioids: []\n- Other: []\n\nFAMILY PSYCHIATRIC HISTORY:\n- []\n\nSOCIAL HISTORY:\n- Living situation: []\n- Employment/Education: []\n- Relationships: []\n- Support system: []\n- Legal history: []\n- Trauma history: []\n\nMEDICAL HISTORY:\n- Active conditions: []\n- Surgical history: []\n\nREVIEW OF SYSTEMS: []\n\nMENTAL STATUS EXAMINATION: [use .mentalstatusexam]\n\nASSESSMENT:\n[]\n\nDIAGNOSES:\n1. []\n\nPLAN:\n[use .followupmh]' },
  { id: 'sp7', trigger: '.progressnote', name: 'Progress Note Template', category: 'Note', content: 'FOLLOW-UP PSYCHIATRIC NOTE\n\nSubjective:\nPatient reports []. Since last visit, patient describes []. Sleep: []. Appetite: []. Energy: []. Mood: []. Medication compliance: []. Side effects: []. Therapy progress: [].\n\nObjective:\nVitals: [auto-populated]\nMental Status Exam: [use .mentalstatusexam]\nAssessment scores: [auto-populated]\n\nAssessment:\n[age]-year-old [gender] with [diagnoses] presenting for follow-up. [Clinical impression and progress summary.]\n\nPlan:\n[use .followupmh]' },
  { id: 'sp8', trigger: '.telehealthnote', name: 'Telehealth Note Header', category: 'Note', content: 'TELEHEALTH VISIT NOTE\nVisit Type: Audio/Video Telehealth\nPlatform: Clarity Telehealth (HIPAA-compliant)\nPatient Location: [City, State] - Confirmed patient is in a private, safe location\nProvider Location: [Office/Home] - [City, State]\nConsent: Informed consent for telehealth obtained and documented\nIdentity Verification: Patient identity verified via [visual confirmation/DOB/MRN]\nTechnology: [Video/Audio] connection maintained throughout visit. No significant connectivity issues. / [Document any interruptions]' },
  { id: 'sp9', trigger: '.controlledsubstance', name: 'Controlled Substance Agreement Note', category: 'Clinical', content: 'CONTROLLED SUBSTANCE MANAGEMENT:\n- Controlled substance agreement reviewed and signed: [Yes/No]\n- PDMP checked: [Date] - Results: [Consistent/Inconsistent with prescribed medications]\n- Last UDS: [Date] - Results: []\n- Risk assessment for misuse: [Low/Moderate/High]\n- Current medication: []\n- Dose/frequency: []\n- Quantity dispensed: []\n- Refills authorized: []\n- Next PDMP check due: []\n- Next UDS due: []\n- Patient counseled on: proper use, storage, disposal, risks of dependence, not sharing medications' },
  { id: 'sp10', trigger: '.suiciderisk', name: 'Suicide Risk Assessment', category: 'Clinical', content: 'SUICIDE RISK ASSESSMENT:\nColumbia-Suicide Severity Rating Scale (C-SSRS) administered.\n\n1. Have you wished you were dead or wished you could go to sleep and not wake up? [Y/N]\n2. Have you actually had any thoughts of killing yourself? [Y/N]\n3. Have you been thinking about how you might do this? [Y/N]\n4. Have you had these thoughts and had some intention of acting on them? [Y/N]\n5. Have you started to work out or worked out the details of how to kill yourself? [Y/N]\n6. Have you ever done anything, started to do anything, or prepared to do anything to end your life? [Y/N]\n\nRisk Level: [None/Low/Moderate/High/Imminent]\nProtective Factors: []\nRisk Factors: []\nSafety Plan: [Reviewed/Created/Updated]\nDisposition: []' },
];

// ========== APPOINTMENTS (Today's Schedule) ==========
export const appointments = [
  // ── April 9, 2026 (past) ──
  { id: 'apt1', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-09', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Med management - depression/anxiety', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt2', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-09', time: '09:30', duration: 60, type: 'Follow-Up', status: 'Completed', reason: 'PTSD follow-up, medication review', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt3', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-04-09', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'ADHD follow-up, stimulant refill', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt4', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-09', time: '10:30', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Bipolar disorder management', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt5', patientId: null, patientName: 'New Patient - Alex Rivera', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-09', time: '11:00', duration: 60, type: 'New Patient', status: 'Completed', reason: 'Initial psych evaluation - depression, anxiety', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt6', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-09', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'AUD management, med review', visitType: 'In-Person', room: 'Room 4' },
  { id: 'apt7', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-09', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Completed', reason: 'Depression/anxiety management, cognitive decline monitoring', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt8', patientId: null, patientName: 'New Patient - Jordan Taylor', provider: 'u2', providerName: 'Joseph', date: '2026-04-09', time: '14:00', duration: 60, type: 'New Patient', status: 'Completed', reason: 'Initial evaluation - OCD symptoms', visitType: 'Telehealth', room: 'Virtual' },

  // ── April 11, 2026 (past) ──
  { id: 'apt9',  patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-11', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Lab review — Sertraline level', visitType: 'Telehealth', room: 'Virtual' },

  // ── April 14, 2026 (yesterday) ──
  { id: 'apt10', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-14', time: '09:00', duration: 60, type: 'Follow-Up', status: 'Completed', reason: 'PTSD re-assessment, PCL-5', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt10b', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-14', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'AUD check-in, naltrexone compliance', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt10c', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-14', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Bipolar mgmt — Lamotrigine titration', visitType: 'Telehealth', room: 'Virtual' },

  // ═══════════════════════════════════════════════════════════
  //  TODAY — April 15, 2026 — FULL DAY SCHEDULE
  // ═══════════════════════════════════════════════════════════
  { id: 'today1', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '08:00', duration: 30, type: 'Follow-Up', status: 'Checked In', reason: 'Sertraline 150mg follow-up, PHQ-9 recheck', visitType: 'In-Person', room: 'Room 3' },
  { id: 'today2', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '08:30', duration: 60, type: 'Follow-Up', status: 'Checked In', reason: 'PTSD — Prazosin dose adjustment, nightmare frequency review', visitType: 'In-Person', room: 'Room 2' },
  { id: 'today3', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-04-15', time: '08:30', duration: 30, type: 'Follow-Up', status: 'Checked In', reason: 'ADHD — Adderall XR refill, weight/BP check', visitType: 'In-Person', room: 'Room 1' },
  { id: 'today4', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '09:30', duration: 45, type: 'Follow-Up', status: 'Confirmed', reason: 'Depression & cognitive decline — caregiver present, MMSE', visitType: 'In-Person', room: 'Room 3' },
  { id: 'today5', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-15', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Confirmed', reason: 'AUD management — 6-month sobriety milestone, naltrexone refill', visitType: 'In-Person', room: 'Room 4' },
  { id: 'today6', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '10:15', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar — Lamotrigine 50mg check, mood diary review', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'today7', patientId: null, patientName: 'New Patient - Rachel Kim', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '11:00', duration: 60, type: 'New Patient', status: 'Confirmed', reason: 'Initial psych eval — severe anxiety, panic attacks, agoraphobia', visitType: 'In-Person', room: 'Room 2' },
  { id: 'today8', patientId: 'p4', patientName: 'Emily Chen', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '10:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'DBT skills — distress tolerance, body image work', visitType: 'In-Person', room: 'Room 5', therapyModality: 'DBT', sessionNumber: 8 },
  { id: 'today9', patientId: 'p1', patientName: 'James Anderson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '11:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'CBT — cognitive restructuring, behavioral activation homework', visitType: 'In-Person', room: 'Room 5', therapyModality: 'CBT', sessionNumber: 16 },
  { id: 'today10', patientId: null, patientName: 'New Patient - Marcus Williams', provider: 'u2', providerName: 'Joseph', date: '2026-04-15', time: '10:00', duration: 60, type: 'New Patient', status: 'Scheduled', reason: 'Initial evaluation — insomnia, work-related stress, possible GAD', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'today11', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '13:00', duration: 60, type: 'Individual Therapy', status: 'Scheduled', reason: 'Trauma-focused CBT — EMDR session 3, processing session', visitType: 'In-Person', room: 'Room 5', therapyModality: 'EMDR', sessionNumber: 10 },
  { id: 'today12', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u2', providerName: 'Joseph', date: '2026-04-15', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Dementia monitoring — medication reconciliation', visitType: 'In-Person', room: 'Room 1' },
  { id: 'today13', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '14:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'IPSRT — mood regulation, interpersonal rhythms', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'IPSRT', sessionNumber: 12 },
  { id: 'today14', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '13:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'GAD management — Buspirone consideration, therapy coordination', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'today15', patientId: 'p3', patientName: 'David Thompson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '15:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'MET/CBT — relapse prevention planning, urge surfing', visitType: 'In-Person', room: 'Room 5', therapyModality: 'MET/CBT', sessionNumber: 24 },
  { id: 'today16', patientId: null, patientName: 'New Patient - Priya Sharma', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '14:00', duration: 60, type: 'New Patient', status: 'Confirmed', reason: 'Initial eval — postpartum depression and anxiety, 4 months postpartum', visitType: 'In-Person', room: 'Room 2' },
  { id: 'today17', patientId: 'p3', patientName: 'David Thompson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '15:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bupropion follow-up, nicotine dependence discussion', visitType: 'In-Person', room: 'Room 3' },
  { id: 'today18', patientId: null, patientName: 'Group Session - Anxiety Management', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-15', time: '16:00', duration: 90, type: 'Group Therapy', status: 'Scheduled', reason: 'Weekly anxiety management group — exposure hierarchy review', visitType: 'In-Person', room: 'Group Room A', therapyModality: 'Group CBT', sessionNumber: 20, groupMembers: ['p1', 'p2', 'p4', 'p6'] },
  { id: 'today19', patientId: 'p4', patientName: 'Emily Chen', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-15', time: '15:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Anxiety — GAD-7 recheck, eating disorder screen', visitType: 'Telehealth', room: 'Virtual' },

  // ═══════════════════════════════════════════════════════════
  //  TOMORROW — April 16, 2026
  // ═══════════════════════════════════════════════════════════
  { id: 'apt11', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-16', time: '08:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Lamotrigine titration check — increase to 100mg', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt11b', patientId: 'p1', patientName: 'James Anderson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-16', time: '09:30', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'CBT - behavioral activation, thought records', visitType: 'In-Person', room: 'Room 5', therapyModality: 'CBT', sessionNumber: 17 },
  { id: 'apt11c', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-16', time: '11:00', duration: 60, type: 'Individual Therapy', status: 'Scheduled', reason: 'Trauma processing - EMDR session 4', visitType: 'In-Person', room: 'Room 5', therapyModality: 'EMDR', sessionNumber: 11 },
  { id: 'apt11d', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-16', time: '10:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression follow-up — MoCA retest', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt11e', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-16', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'LFT review, naltrexone refill', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt11f', patientId: null, patientName: 'New Patient - Tomás Herrera', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-16', time: '11:00', duration: 60, type: 'New Patient', status: 'Confirmed', reason: 'Initial eval — bipolar II, rapid cycling, medication hx', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt11g', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-04-16', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD — executive function coaching, planner review', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt11h', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-16', time: '14:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'Mood regulation, interpersonal effectiveness', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'IPSRT', sessionNumber: 13 },
  { id: 'apt11i', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-16', time: '13:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Venlafaxine XR tolerability — GI side effects', visitType: 'Telehealth', room: 'Virtual' },

  // ── April 17, 2026 ──
  { id: 'apt17a', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-17', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Trazodone review — sleep quality assessment', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt17b', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u2', providerName: 'Joseph', date: '2026-04-17', time: '10:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Caregiver coordination — memory aids discussion', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt17c', patientId: null, patientName: 'New Patient - Kenji Watanabe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-17', time: '10:00', duration: 60, type: 'New Patient', status: 'Confirmed', reason: 'Initial eval — social anxiety, selective mutism hx', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt17d', patientId: 'p4', patientName: 'Emily Chen', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-17', time: '13:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'DBT — emotion regulation module', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'DBT', sessionNumber: 9 },
  { id: 'apt17e', patientId: 'p3', patientName: 'David Thompson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-17', time: '14:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Hypertension + AUD — coordinating with PCP', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt17f', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u2', providerName: 'Joseph', date: '2026-04-17', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'PMDD symptom tracking review', visitType: 'In-Person', room: 'Room 4' },

  // ── April 18, 2026 ──
  { id: 'apt12', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-18', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'AUD follow-up, naltrexone refill', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt18a', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-18', time: '09:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD symptom monitor — PCL-5 recheck', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt18b', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-18', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Sertraline 150mg — 2-week check', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt18c', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-18', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression review — family meeting', visitType: 'In-Person', room: 'Room 3' },

  // ── April 21-30 ──
  { id: 'apt13', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-04-21', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD check-in, grades review', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt21a', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-21', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression monthly follow-up', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt21b', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-21', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar — Lamotrigine 100mg titration', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt21c', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-21', time: '11:00', duration: 60, type: 'Individual Therapy', status: 'Scheduled', reason: 'EMDR processing — session 5', visitType: 'In-Person', room: 'Room 5', therapyModality: 'EMDR', sessionNumber: 12 },
  { id: 'apt21d', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-04-22', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bupropion XL follow-up, smoking cessation check', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt21e', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-22', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Neuropsych referral follow-up', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt14', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-23', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Cognitive decline follow-up, MMSE', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt23a', patientId: 'p1', patientName: 'James Anderson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-23', time: '09:30', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'CBT — midpoint review, treatment goals', visitType: 'In-Person', room: 'Room 5', therapyModality: 'CBT', sessionNumber: 18 },
  { id: 'apt23b', patientId: 'p4', patientName: 'Emily Chen', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-23', time: '13:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'DBT skills — interpersonal effectiveness', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'DBT', sessionNumber: 10 },
  { id: 'apt15', patientId: null, patientName: 'New Patient - Sarah Kim', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-25', time: '10:00', duration: 60, type: 'New Patient', status: 'Scheduled', reason: 'Initial eval — postpartum depression', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt25a', patientId: 'p3', patientName: 'David Thompson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-25', time: '14:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'SUD counseling — urge surfing, values work', visitType: 'In-Person', room: 'Room 5', therapyModality: 'MET/CBT', sessionNumber: 25 },
  { id: 'apt16', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-28', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Sertraline dose check, PHQ-9', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt28a', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-28', time: '10:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD — med adjustment review', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt28b', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-04-28', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD — end of semester planning', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt28c', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-29', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar — Lamotrigine level & mood review', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt17', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-30', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar mgmt — mood check', visitType: 'Telehealth', room: 'Virtual' },

  // ── May 2026 ──
  { id: 'apt18', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-01', time: '10:00', duration: 60, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD follow-up, PE session #10', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt19', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-05-02', time: '14:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'AUD management, sobriety check', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt20', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-05-05', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Adderall refill, weight check', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt21', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-07', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Med management follow-up', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt22', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-08', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression/cognitive monitoring', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt23', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-12', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar — Lamotrigine 100mg check', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt24', patientId: null, patientName: 'New Patient - Marcus Lee', provider: 'u2', providerName: 'Joseph', date: '2026-05-13', time: '10:00', duration: 60, type: 'New Patient', status: 'Scheduled', reason: 'Initial eval — social anxiety', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt25', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-15', time: '10:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD follow-up, Prazosin review', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt26', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-05-16', time: '14:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'AUD follow-up, liver panel review', visitType: 'In-Person', room: 'Room 4' },
  { id: 'apt27', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-20', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Sertraline 150mg check-in', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt28', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-05-22', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD semester review', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt29', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-27', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Dementia staging, caregiver meeting', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt30', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-29', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar stable check, labs', visitType: 'In-Person', room: 'Room 3' },

  // ── June 2026 ──
  { id: 'apt31', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-02', time: '10:00', duration: 60, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD — PE completion session', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt32', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-06-03', time: '14:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'AUD 6-month milestone', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt33', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-04', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'MDD quarterly review', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt34', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-06-08', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD summer plan, med holiday discuss', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt35', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-10', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression/cognitive follow-up', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt36', patientId: 'p6', patientName: 'Aisha Patel', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-12', time: '11:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar mgmt, Lamotrigine level', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt37', patientId: null, patientName: 'New Patient - Olivia Brown', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-15', time: '10:00', duration: 60, type: 'New Patient', status: 'Scheduled', reason: 'Initial eval — panic disorder', visitType: 'In-Person', room: 'Room 2' },
  { id: 'apt38', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-18', time: '10:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD maintenance phase', visitType: 'Telehealth', room: 'Virtual' },
  { id: 'apt39', patientId: 'p3', patientName: 'David Thompson', provider: 'u2', providerName: 'Joseph', date: '2026-06-19', time: '14:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'AUD follow-up, naltrexone', visitType: 'In-Person', room: 'Room 4' },
  { id: 'apt40', patientId: 'p1', patientName: 'James Anderson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-24', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Depression check-in, PHQ-9', visitType: 'In-Person', room: 'Room 3' },
  { id: 'apt41', patientId: 'p4', patientName: 'Emily Chen', provider: 'u2', providerName: 'Joseph', date: '2026-06-26', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD stimulant refill', visitType: 'In-Person', room: 'Room 1' },
  { id: 'apt42', patientId: 'p5', patientName: 'Robert Wilson', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-06-30', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Dementia monitoring, family session', visitType: 'In-Person', room: 'Room 3' },

  // ── Therapist (april.t / u8) — past April 9 sessions ──
  { id: 'tapt1', patientId: 'p1', patientName: 'James Anderson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-09', time: '09:30', duration: 50, type: 'Individual Therapy', status: 'Completed', reason: 'CBT - depression & anxiety, cognitive restructuring', visitType: 'In-Person', room: 'Room 5', therapyModality: 'CBT', sessionNumber: 14 },
  { id: 'tapt2', patientId: 'p2', patientName: 'Maria Garcia', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-09', time: '11:00', duration: 60, type: 'Individual Therapy', status: 'Completed', reason: 'Trauma-focused CBT - PTSD processing, EMDR prep', visitType: 'In-Person', room: 'Room 5', therapyModality: 'TF-CBT', sessionNumber: 8 },
  { id: 'tapt3', patientId: 'p4', patientName: 'Emily Chen', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-09', time: '13:00', duration: 50, type: 'Individual Therapy', status: 'Completed', reason: 'Anxiety management, DBT skills, body image work', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'DBT', sessionNumber: 6 },
  { id: 'tapt4', patientId: 'p3', patientName: 'David Thompson', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-09', time: '14:00', duration: 50, type: 'Individual Therapy', status: 'Completed', reason: 'SUD counseling - relapse prevention, motivational enhancement', visitType: 'In-Person', room: 'Room 5', therapyModality: 'MET/CBT', sessionNumber: 22 },
  { id: 'tapt5', patientId: null, patientName: 'Group Session - MDD/Anxiety', provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-09', time: '15:00', duration: 90, type: 'Group Therapy', status: 'Completed', reason: 'Weekly mood management group - CBT skills', visitType: 'In-Person', room: 'Group Room A', therapyModality: 'Group CBT', sessionNumber: 18, groupMembers: ['p1', 'p4', 'p6'] },

  // ─── West Loop (loc2) appointments ────────────────────────────────────────
  // ── Past West Loop (April 2026) ──
  { id: 'wl1', patientId: 'p7', patientName: 'Vanessa Monroe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-02', time: '09:00', duration: 45, type: 'Follow-Up', status: 'Completed', reason: 'Bipolar I — Lamotrigine 200mg tolerability, mood diary review', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl2', patientId: 'p8', patientName: 'Marcus Chen-Williams', provider: 'u2', providerName: 'Joseph', date: '2026-04-02', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'ADHD — Vyvanse 40mg check-in, mood screen', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
  { id: 'wl3', patientId: 'p9', patientName: 'Sofia Reyes-Gutierrez', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-03', time: '11:00', duration: 60, type: 'Follow-Up', status: 'Completed', reason: 'PTSD — Mirtazapine titration, PCL-5 recheck (interpreter on call)', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl4', patientId: 'p10', patientName: 'Theodore Okafor', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-07', time: '09:30', duration: 45, type: 'Follow-Up', status: 'Completed', reason: 'Schizoaffective — Paliperidone LAI monthly injection, PANSS screen', visitType: 'In-Person', room: 'WL Procedure Room', locationId: 'loc2' },
  { id: 'wl5', patientId: 'p11', patientName: "Bridget O'Sullivan", provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-08', time: '10:00', duration: 50, type: 'Individual Therapy', status: 'Completed', reason: 'OCD — ERP session 7, contamination obsessions hierarchy', visitType: 'In-Person', room: 'WL Room 3', therapyModality: 'ERP', sessionNumber: 7, locationId: 'loc2' },
  { id: 'wl6', patientId: 'p12', patientName: 'Kwame Johnson-Bell', provider: 'u2', providerName: 'Joseph', date: '2026-04-08', time: '11:00', duration: 45, type: 'Follow-Up', status: 'Completed', reason: 'First episode psychosis — Risperidone 2mg tolerability, cannabis use screen', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
  { id: 'wl7', patientId: 'p7', patientName: 'Vanessa Monroe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-16', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Bipolar I — Mania prodrome monitoring, sleep log review', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl8', patientId: 'p9', patientName: 'Sofia Reyes-Gutierrez', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-17', time: '10:00', duration: 60, type: 'Follow-Up', status: 'Completed', reason: 'PTSD — trauma processing, Mirtazapine 30mg dose, PHQ-9', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl9', patientId: 'p11', patientName: "Bridget O'Sullivan", provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-22', time: '11:00', duration: 50, type: 'Individual Therapy', status: 'Completed', reason: 'OCD — ERP session 8, checking compulsions response prevention', visitType: 'In-Person', room: 'WL Room 3', therapyModality: 'ERP', sessionNumber: 8, locationId: 'loc2' },
  { id: 'wl10', patientId: 'p10', patientName: 'Theodore Okafor', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-23', time: '09:30', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'Schizoaffective — depressive symptoms review, metabolic monitoring', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl11', patientId: 'p8', patientName: 'Marcus Chen-Williams', provider: 'u2', providerName: 'Joseph', date: '2026-04-24', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Completed', reason: 'ADHD + MDD — Vyvanse refill, Wellbutrin 150mg add-on discussion', visitType: 'Telehealth', room: 'Virtual', locationId: 'loc2' },
  { id: 'wl12', patientId: 'p12', patientName: 'Kwame Johnson-Bell', provider: 'u2', providerName: 'Joseph', date: '2026-04-24', time: '11:30', duration: 45, type: 'Follow-Up', status: 'Completed', reason: 'First episode psychosis — Risperidone 4mg increase, AUDIT-C, family education', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },

  // ── Today & Upcoming West Loop ──
  { id: 'wl-today1', patientId: 'p7', patientName: 'Vanessa Monroe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-30', time: '09:00', duration: 45, type: 'Follow-Up', status: 'Checked In', reason: 'Bipolar I — Lamotrigine 200mg level, mood stability check', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl-today2', patientId: 'p9', patientName: 'Sofia Reyes-Gutierrez', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-30', time: '10:00', duration: 60, type: 'Follow-Up', status: 'Confirmed', reason: 'PTSD — PCL-5 follow-up, Prazosin 4mg add-on for nightmares', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl-today3', patientId: 'p11', patientName: "Bridget O'Sullivan", provider: 'u8', providerName: 'April T., LCSW', date: '2026-04-30', time: '10:30', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'OCD — ERP session 9, intrusive thoughts habituation', visitType: 'In-Person', room: 'WL Room 3', therapyModality: 'ERP', sessionNumber: 9, locationId: 'loc2' },
  { id: 'wl-today4', patientId: 'p12', patientName: 'Kwame Johnson-Bell', provider: 'u2', providerName: 'Joseph', date: '2026-04-30', time: '11:00', duration: 45, type: 'Follow-Up', status: 'Confirmed', reason: 'First episode psychosis — 2-week check, tobacco cessation, cannabis reduction', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
  { id: 'wl-today5', patientId: 'p10', patientName: 'Theodore Okafor', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-04-30', time: '13:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Schizoaffective — Paliperidone LAI monthly injection', visitType: 'In-Person', room: 'WL Procedure Room', locationId: 'loc2' },
  { id: 'wl-may1', patientId: 'p12', patientName: 'Kwame Johnson-Bell', provider: 'u2', providerName: 'Joseph', date: '2026-05-01', time: '11:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Psychosis — risperidone 4mg response, side effect monitoring', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
  { id: 'wl-may2', patientId: 'p7', patientName: 'Vanessa Monroe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-02', time: '09:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar I — mood journal debrief, sleep hygiene', visitType: 'Telehealth', room: 'Virtual', locationId: 'loc2' },
  { id: 'wl-may3', patientId: 'p9', patientName: 'Sofia Reyes-Gutierrez', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-06', time: '10:00', duration: 60, type: 'Follow-Up', status: 'Scheduled', reason: 'PTSD — Trauma-Focused CBT, coping review', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl-may4', patientId: 'p8', patientName: 'Marcus Chen-Williams', provider: 'u2', providerName: 'Joseph', date: '2026-05-05', time: '10:00', duration: 30, type: 'Follow-Up', status: 'Scheduled', reason: 'ADHD — Vyvanse 50mg titration, Wellbutrin 150mg check', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
  { id: 'wl-may5', patientId: 'p11', patientName: "Bridget O'Sullivan", provider: 'u8', providerName: 'April T., LCSW', date: '2026-05-08', time: '10:30', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'OCD — ERP session 10, social situations exposure', visitType: 'In-Person', room: 'WL Room 3', therapyModality: 'ERP', sessionNumber: 10, locationId: 'loc2' },
  { id: 'wl-may6', patientId: 'p10', patientName: 'Theodore Okafor', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-07', time: '09:30', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Schizoaffective — depressive symptoms, diabetes management coordination', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl-may7', patientId: 'p7', patientName: 'Vanessa Monroe', provider: 'u1', providerName: 'Dr. Chris L.', date: '2026-05-14', time: '09:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Bipolar I — quarterly psych eval, lamotrigine level', visitType: 'In-Person', room: 'WL Room 1', locationId: 'loc2' },
  { id: 'wl-may8', patientId: 'p8', patientName: 'Marcus Chen-Williams', provider: 'u8', providerName: 'April T., LCSW', date: '2026-05-12', time: '11:00', duration: 50, type: 'Individual Therapy', status: 'Scheduled', reason: 'Depression + ADHD — ACT, values clarification', visitType: 'Telehealth', room: 'Virtual', therapyModality: 'ACT', sessionNumber: 5, locationId: 'loc2' },
  { id: 'wl-may9', patientId: 'p9', patientName: 'Sofia Reyes-Gutierrez', provider: 'u8', providerName: 'April T., LCSW', date: '2026-05-13', time: '13:00', duration: 60, type: 'Individual Therapy', status: 'Scheduled', reason: 'PTSD — TF-CBT trauma narrative session (interpreter needed)', visitType: 'In-Person', room: 'WL Room 3', therapyModality: 'TF-CBT', sessionNumber: 6, locationId: 'loc2' },
  { id: 'wl-may10', patientId: 'p12', patientName: 'Kwame Johnson-Bell', provider: 'u2', providerName: 'Joseph', date: '2026-05-15', time: '11:00', duration: 45, type: 'Follow-Up', status: 'Scheduled', reason: 'Psychosis — 3-month stabilization review, family therapy intro', visitType: 'In-Person', room: 'WL Room 2', locationId: 'loc2' },
];

// ========== ENCOUNTER HISTORY ==========
export const encounterHistory = {
  p1: [
    {
      id: 'enc-hist-1', date: '2026-03-12', time: '09:15', provider: 'Elena Martinez', credentials: 'MD, PhD',
      visitType: 'Follow-Up', cptCode: '99214', icdCode: 'F33.1 - Major depressive disorder, recurrent, moderate',
      reason: 'Med management - depression/anxiety', duration: '28 min',
      chiefComplaint: 'Patient reports persistent low mood and difficulty concentrating at work despite medication adjustments.',
      hpi: 'Mr. Anderson returns for follow-up of MDD and GAD. He reports partial improvement on Sertraline 100mg, noting that anxiety has improved approximately 50% but depressive symptoms persist, particularly anhedonia and difficulty concentrating. Sleep has improved with trazodone. Denies side effects from current regimen. Adherent with medications.',
      intervalNote: 'Since last visit 4 weeks ago: mood improved from 3/10 to 5/10, sleep 6-7 hrs (improved), appetite stable, energy still low. Started walking 20 min 3x/week. Work performance still impacted.',
      mse: 'Appearance: Casually dressed, adequate grooming\nBehavior: Cooperative, good eye contact\nSpeech: Normal rate and volume\nMood: "A little better but not great"\nAffect: Restricted range, congruent\nThought Process: Linear and goal-directed\nThought Content: No suicidal ideation, No homicidal ideation\nPerception: No hallucinations\nCognition: Alert and oriented x4, concentration mildly impaired\nInsight: Good\nJudgment: Good',
      assessment: 'Major depressive disorder, recurrent, moderate — partial response to Sertraline 100mg. GAD improving. Continue current approach with dose optimization.',
      plan: '1. Increase Sertraline from 100mg to 150mg daily\n2. Continue Trazodone 50mg QHS for insomnia\n3. Continue therapy referral - CBT\n4. PHQ-9 today: 14 (moderate)\n5. Return in 4 weeks for reassessment',
      safety: { siLevel: 'None', hiLevel: 'None', selfHarm: false, substanceUse: false, safetyPlanUpdated: false, crisisResources: false, safetyNotes: '' },
      followUp: '4 Weeks', disposition: 'Stable - follow up as scheduled',
    },
    {
      id: 'enc-hist-2', date: '2026-02-14', time: '09:00', provider: 'Elena Martinez', credentials: 'MD, PhD',
      visitType: 'Follow-Up', cptCode: '99214', icdCode: 'F33.1 - Major depressive disorder, recurrent, moderate',
      reason: 'Med management - depression/anxiety', duration: '32 min',
      chiefComplaint: 'Follow-up for depression and anxiety. Reports worsening mood over past month.',
      hpi: 'Patient reports worsening depressive symptoms over past 4 weeks. PHQ-9 increased from 10 to 16. Difficulty sleeping, early morning awakening at 4 AM. Appetite decreased, lost 5 lbs. Continues to work but struggling with motivation. No change in anxiety symptoms on current Sertraline 50mg.',
      intervalNote: 'Since last visit: mood declined from 5/10 to 3/10, sleep disrupted (early awakening), appetite decreased, weight loss 5 lbs. Job stress increased — new supervisor. Compliant with medications.',
      mse: 'Appearance: Casually dressed, mildly disheveled\nBehavior: Cooperative, psychomotor slowing noted\nSpeech: Soft, reduced rate\nMood: "Terrible"\nAffect: Constricted, tearful at times\nThought Process: Linear, impoverished at times\nThought Content: No suicidal ideation, No homicidal ideation, feelings of worthlessness\nPerception: No hallucinations\nCognition: Alert and oriented x4\nInsight: Fair\nJudgment: Fair',
      assessment: 'MDD worsening on Sertraline 50mg. GAD stable. No acute safety concerns. Medication adjustment indicated.',
      plan: '1. Increase Sertraline from 50mg to 100mg daily\n2. Add Trazodone 50mg QHS for insomnia\n3. PHQ-9: 16 (moderately severe)\n4. Discussed sleep hygiene strategies\n5. Return in 4 weeks',
      safety: { siLevel: 'None', hiLevel: 'None', selfHarm: false, substanceUse: false, safetyPlanUpdated: false, crisisResources: false, safetyNotes: '' },
      followUp: '4 Weeks', disposition: 'Stable - follow up as scheduled',
    },
  ],
  p2: [
    {
      id: 'enc-hist-3', date: '2026-03-25', time: '10:00', provider: 'Elena Martinez', credentials: 'MD, PhD',
      visitType: 'Follow-Up', cptCode: '99215', icdCode: 'F43.10 - Post-traumatic stress disorder',
      reason: 'PTSD follow-up, medication review', duration: '52 min',
      chiefComplaint: 'Continuing PTSD treatment. Reports increase in nightmares after anniversary of trauma.',
      hpi: 'Ms. Garcia presents for PTSD follow-up. Reports increased nightmares (4-5/week, up from 1-2/week) coinciding with trauma anniversary. Hypervigilance has increased. Using grounding techniques learned in PE therapy with moderate success. Prazosin 2mg QHS provides partial relief. Sertraline 150mg continued — daytime anxiety improved but still present.',
      intervalNote: 'Anniversary reaction noted. Nightmares increased 4-5x/week. Hypervigilance and startle response worsened. Continuing PE therapy weekly. Using grounding and safety plan. No flashbacks during day. Social isolation increasing.',
      mse: 'Appearance: Well-groomed, guarded posture\nBehavior: Cooperative but hypervigilant, scanning room\nSpeech: Normal rate, slightly pressured when discussing trauma content\nMood: "Anxious and on edge"\nAffect: Anxious, tearful when discussing nightmares\nThought Process: Linear, occasionally tangential when discussing trauma\nThought Content: No suicidal ideation, No homicidal ideation, intrusive trauma memories\nPerception: No hallucinations, flashback-like experiences when triggered\nCognition: Alert and oriented x4\nInsight: Good\nJudgment: Good',
      assessment: 'PTSD with anniversary reaction. Nightmare frequency increased. Current medication partially effective. Consider prazosin adjustment.',
      plan: '1. Increase Prazosin from 2mg to 4mg QHS for nightmares\n2. Continue Sertraline 150mg\n3. Continue PE therapy (session 8 of 12)\n4. PCL-5 score: 48 (above clinical threshold)\n5. Safety plan reviewed and updated\n6. Return in 3 weeks given symptom increase',
      safety: { siLevel: 'None', hiLevel: 'None', selfHarm: false, substanceUse: false, safetyPlanUpdated: true, crisisResources: true, safetyNotes: 'Crisis line number reviewed. Safety plan updated with new coping strategies.' },
      followUp: '3 Weeks', disposition: 'Stable with symptom exacerbation - close follow up',
    },
  ],
  p4: [
    {
      id: 'enc-hist-4', date: '2026-03-15', time: '14:00', provider: 'Michael Johnson', credentials: 'PMHNP-BC',
      visitType: 'Follow-Up', cptCode: '99214', icdCode: 'F90.0 - ADHD, predominantly inattentive type',
      reason: 'ADHD follow-up, stimulant management', duration: '25 min',
      chiefComplaint: 'ADHD medication refill. Reports good response to current regimen.',
      hpi: 'Ms. Chen returns for ADHD follow-up on Adderall XR 20mg. Reports significant improvement in focus and productivity at school. Able to complete assignments within deadlines. Appetite slightly decreased but manageable. Sleep onset delayed by approximately 30 minutes. No cardiovascular symptoms. Heart rate and BP stable.',
      intervalNote: 'Since last visit: grades improved from B- to B+, able to focus in lectures for full duration, organization improved with planner use. Weight stable. Sleep onset delayed but total hours adequate (7 hrs).',
      mse: 'Appearance: Well-groomed, bright affect\nBehavior: Cooperative, organized\nSpeech: Normal rate and volume\nMood: "Good"\nAffect: Full range, congruent\nThought Process: Linear and goal-directed\nThought Content: No suicidal ideation, No homicidal ideation\nPerception: No hallucinations\nCognition: Alert and oriented x4, attention improved on medication\nInsight: Good\nJudgment: Good',
      assessment: 'ADHD-I, well controlled on Adderall XR 20mg. Mild appetite suppression and delayed sleep onset — tolerable side effects.',
      plan: '1. Continue Adderall XR 20mg QAM\n2. Monitor weight and appetite\n3. BP and HR checked today — within normal limits\n4. Counseled on sleep hygiene\n5. 90-day Rx provided via EPCS\n6. Return in 3 months or sooner if concerns',
      safety: { siLevel: 'None', hiLevel: 'None', selfHarm: false, substanceUse: false, safetyPlanUpdated: false, crisisResources: false, safetyNotes: '' },
      followUp: '3 Months', disposition: 'Stable - routine follow up',
    },
  ],
  p6: [
    {
      id: 'enc-hist-5', date: '2026-03-20', time: '11:00', provider: 'Elena Martinez', credentials: 'MD, PhD',
      visitType: 'Follow-Up', cptCode: '99214', icdCode: 'F31.32 - Bipolar disorder, current episode depressed, moderate',
      reason: 'Bipolar disorder management', duration: '35 min',
      chiefComplaint: 'Mood has been depressed for past 2 weeks despite Lithium. Having difficulty getting out of bed.',
      hpi: 'Ms. Patel presents with depressed mood for 2 weeks. Currently on Lithium 900mg with level 0.8. No manic symptoms. Reports hypersomnia (sleeping 12-14 hrs), loss of interest in activities, difficulty with ADLs. Denies substance use. Weight gain 8 lbs over past month — attributes to increased appetite and inactivity.',
      intervalNote: 'Depressive episode onset ~2 weeks ago without clear trigger. PHQ-9: 18 (moderately severe). Previously euthymic for 4 months on current regimen. Last lithium level 0.8 (therapeutic). TSH normal 3 months ago.',
      mse: 'Appearance: Disheveled, fatigued appearance\nBehavior: Cooperative, psychomotor retardation\nSpeech: Slow rate, low volume\nMood: "Depressed"\nAffect: Flat, tearful\nThought Process: Linear but slowed\nThought Content: No suicidal ideation, No homicidal ideation, hopelessness present\nPerception: No hallucinations\nCognition: Alert and oriented x4, concentration impaired\nInsight: Fair\nJudgment: Fair',
      assessment: 'Bipolar I disorder, current episode depressed, moderate. Breakthrough depression despite therapeutic lithium level. Consider adjunctive treatment.',
      plan: '1. Add Lamotrigine 25mg daily x2 weeks, then titrate to 50mg\n2. Continue Lithium 900mg, recheck level in 2 weeks\n3. Labs: Lithium level, TSH, CBC, BMP\n4. PHQ-9: 18\n5. Discussed activity scheduling for behavioral activation\n6. Return in 2 weeks for Lamotrigine titration',
      safety: { siLevel: 'None', hiLevel: 'None', selfHarm: false, substanceUse: false, safetyPlanUpdated: false, crisisResources: true, safetyNotes: 'Hopelessness present but no suicidal ideation. Crisis resources reviewed.' },
      followUp: '2 Weeks', disposition: 'Stable - close follow up for medication titration',
    },
  ],
};

// ========== BTG AUDIT LOG ==========
export const btgAuditLog = [
  { id: 'btg1', patientId: 'p5', patientName: 'Robert Wilson', accessedBy: 'u4', accessedByName: 'Kelly Chen, RN', reason: 'Patient called in crisis - needed to verify current medications for ER communication', timestamp: '2026-04-05T14:30:00Z', approved: true },
  { id: 'btg2', patientId: 'p6', patientName: 'Aisha Patel', accessedBy: 'u2', accessedByName: 'NP Michael Johnson', reason: 'Covering for Dr. Chris L. - urgent medication question from pharmacy', timestamp: '2026-04-03T16:45:00Z', approved: true },
];

// ========== MEDICATION DATABASE (for ordering) ==========
export const medicationDatabase = [
  // ══════════════════════════════════════════════════════════════
  //  PSYCHIATRY / BEHAVIORAL HEALTH
  // ══════════════════════════════════════════════════════════════

  // ── SSRIs ──────────────────────────────────────────────────
  { name: 'Sertraline (Zoloft)', class: 'SSRI', doses: ['25mg', '50mg', '100mg', '150mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fluoxetine (Prozac)', class: 'SSRI', doses: ['10mg', '20mg', '40mg', '60mg'], routes: ['Oral'], isControlled: false },
  { name: 'Escitalopram (Lexapro)', class: 'SSRI', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Paroxetine (Paxil)', class: 'SSRI', doses: ['10mg', '20mg', '30mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Citalopram (Celexa)', class: 'SSRI', doses: ['10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fluvoxamine (Luvox)', class: 'SSRI', doses: ['25mg', '50mg', '100mg', '150mg', '200mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Vilazodone (Viibryd)', class: 'SSRI', doses: ['10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Vortioxetine (Trintellix)', class: 'Serotonin Modulator', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },

  // ── SNRIs ─────────────────────────────────────────────────
  { name: 'Venlafaxine XR (Effexor XR)', class: 'SNRI', doses: ['37.5mg', '75mg', '150mg', '225mg'], routes: ['Oral'], isControlled: false },
  { name: 'Duloxetine (Cymbalta)', class: 'SNRI', doses: ['20mg', '30mg', '60mg', '90mg', '120mg'], routes: ['Oral'], isControlled: false },
  { name: 'Desvenlafaxine (Pristiq)', class: 'SNRI', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Levomilnacipran (Fetzima)', class: 'SNRI', doses: ['20mg', '40mg', '80mg', '120mg'], routes: ['Oral'], isControlled: false },
  { name: 'Milnacipran (Savella)', class: 'SNRI', doses: ['12.5mg', '25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },

  // ── Atypical Antidepressants ──────────────────────────────
  { name: 'Bupropion XL (Wellbutrin XL)', class: 'Atypical Antidepressant', doses: ['150mg', '300mg', '450mg'], routes: ['Oral'], isControlled: false },
  { name: 'Bupropion SR (Wellbutrin SR)', class: 'Atypical Antidepressant', doses: ['100mg', '150mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Mirtazapine (Remeron)', class: 'Atypical Antidepressant', doses: ['7.5mg', '15mg', '30mg', '45mg'], routes: ['Oral'], isControlled: false },
  { name: 'Trazodone', class: 'Atypical Antidepressant', doses: ['25mg', '50mg', '100mg', '150mg', '200mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nefazodone', class: 'Atypical Antidepressant', doses: ['50mg', '100mg', '150mg', '200mg', '250mg'], routes: ['Oral'], isControlled: false },

  // ── Tricyclic Antidepressants ─────────────────────────────
  { name: 'Amitriptyline (Elavil)', class: 'Tricyclic Antidepressant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nortriptyline (Pamelor)', class: 'Tricyclic Antidepressant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Doxepin (Sinequan)', class: 'Tricyclic Antidepressant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Imipramine (Tofranil)', class: 'Tricyclic Antidepressant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clomipramine (Anafranil)', class: 'Tricyclic Antidepressant', doses: ['25mg', '50mg', '75mg', '100mg', '150mg', '200mg', '250mg'], routes: ['Oral'], isControlled: false },
  { name: 'Desipramine (Norpramin)', class: 'Tricyclic Antidepressant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },

  // ── MAOIs ─────────────────────────────────────────────────
  { name: 'Phenelzine (Nardil)', class: 'MAOI', doses: ['15mg', '30mg', '45mg', '60mg', '90mg'], routes: ['Oral'], isControlled: false },
  { name: 'Tranylcypromine (Parnate)', class: 'MAOI', doses: ['10mg', '20mg', '30mg', '40mg', '60mg'], routes: ['Oral'], isControlled: false },
  { name: 'Selegiline Patch (Emsam)', class: 'MAOI', doses: ['6mg/24hr', '9mg/24hr', '12mg/24hr'], routes: ['Transdermal'], isControlled: false },

  // ── Atypical Antipsychotics ───────────────────────────────
  { name: 'Quetiapine (Seroquel)', class: 'Atypical Antipsychotic', doses: ['25mg', '50mg', '100mg', '200mg', '300mg', '400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Quetiapine XR (Seroquel XR)', class: 'Atypical Antipsychotic', doses: ['50mg', '150mg', '200mg', '300mg', '400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Aripiprazole (Abilify)', class: 'Atypical Antipsychotic', doses: ['2mg', '5mg', '10mg', '15mg', '20mg', '30mg'], routes: ['Oral'], isControlled: false },
  { name: 'Aripiprazole Lauroxil (Aristada)', class: 'Atypical Antipsychotic', doses: ['441mg', '662mg', '882mg', '1064mg'], routes: ['IM'], isControlled: false },
  { name: 'Olanzapine (Zyprexa)', class: 'Atypical Antipsychotic', doses: ['2.5mg', '5mg', '10mg', '15mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Risperidone (Risperdal)', class: 'Atypical Antipsychotic', doses: ['0.5mg', '1mg', '2mg', '3mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Paliperidone ER (Invega)', class: 'Atypical Antipsychotic', doses: ['1.5mg', '3mg', '6mg', '9mg', '12mg'], routes: ['Oral'], isControlled: false },
  { name: 'Paliperidone Palmitate (Invega Sustenna)', class: 'Atypical Antipsychotic', doses: ['39mg', '78mg', '117mg', '156mg', '234mg'], routes: ['IM'], isControlled: false },
  { name: 'Ziprasidone (Geodon)', class: 'Atypical Antipsychotic', doses: ['20mg', '40mg', '60mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Lurasidone (Latuda)', class: 'Atypical Antipsychotic', doses: ['20mg', '40mg', '60mg', '80mg', '120mg', '160mg'], routes: ['Oral'], isControlled: false },
  { name: 'Brexpiprazole (Rexulti)', class: 'Atypical Antipsychotic', doses: ['0.25mg', '0.5mg', '1mg', '2mg', '3mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Cariprazine (Vraylar)', class: 'Atypical Antipsychotic', doses: ['1.5mg', '3mg', '4.5mg', '6mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pimozide (Orap)', class: 'Atypical Antipsychotic', doses: ['1mg', '2mg', '4mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clozapine (Clozaril)', class: 'Atypical Antipsychotic', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['Oral'], isControlled: false },

  // ── Typical Antipsychotics ────────────────────────────────
  { name: 'Haloperidol (Haldol)', class: 'Typical Antipsychotic', doses: ['0.5mg', '1mg', '2mg', '5mg', '10mg', '20mg'], routes: ['Oral', 'IM'], isControlled: false },
  { name: 'Haloperidol Decanoate', class: 'Typical Antipsychotic', doses: ['50mg/mL', '100mg/mL'], routes: ['IM'], isControlled: false },
  { name: 'Chlorpromazine (Thorazine)', class: 'Typical Antipsychotic', doses: ['10mg', '25mg', '50mg', '100mg', '200mg'], routes: ['Oral', 'IM'], isControlled: false },
  { name: 'Fluphenazine Decanoate (Prolixin)', class: 'Typical Antipsychotic', doses: ['12.5mg', '25mg'], routes: ['IM'], isControlled: false },
  { name: 'Thiothixene (Navane)', class: 'Typical Antipsychotic', doses: ['1mg', '2mg', '5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Perphenazine (Trilafon)', class: 'Typical Antipsychotic', doses: ['2mg', '4mg', '8mg', '16mg'], routes: ['Oral'], isControlled: false },

  // ── Mood Stabilizers ──────────────────────────────────────
  { name: 'Lamotrigine (Lamictal)', class: 'Mood Stabilizer', doses: ['25mg', '50mg', '100mg', '150mg', '200mg', '250mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Lithium Carbonate', class: 'Mood Stabilizer', doses: ['150mg', '300mg', '600mg', '900mg'], routes: ['Oral'], isControlled: false },
  { name: 'Lithium Citrate (Liquid)', class: 'Mood Stabilizer', doses: ['8mEq/5mL'], routes: ['Oral'], isControlled: false },
  { name: 'Valproic Acid (Depakote)', class: 'Mood Stabilizer', doses: ['250mg', '500mg', '750mg', '1000mg'], routes: ['Oral'], isControlled: false },
  { name: 'Carbamazepine (Tegretol)', class: 'Mood Stabilizer', doses: ['100mg', '200mg', '400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Oxcarbazepine (Trileptal)', class: 'Mood Stabilizer', doses: ['150mg', '300mg', '600mg'], routes: ['Oral'], isControlled: false },

  // ── Anxiolytics – Non-controlled ──────────────────────────
  { name: 'Buspirone', class: 'Anxiolytic', doses: ['5mg', '7.5mg', '10mg', '15mg', '30mg'], routes: ['Oral'], isControlled: false },
  { name: 'Hydroxyzine HCl', class: 'Anxiolytic', doses: ['10mg', '25mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Hydroxyzine Pamoate (Vistaril)', class: 'Anxiolytic', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Gabapentin (Neurontin)', class: 'Anxiolytic / Anticonvulsant', doses: ['100mg', '300mg', '400mg', '600mg', '800mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pregabalin (Lyrica)', class: 'Anxiolytic / Anticonvulsant', doses: ['25mg', '50mg', '75mg', '100mg', '150mg', '200mg', '300mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule V' },

  // ── Benzodiazepines (Controlled) ──────────────────────────
  { name: 'Lorazepam (Ativan)', class: 'Benzodiazepine', doses: ['0.5mg', '1mg', '2mg'], routes: ['Oral', 'IM', 'IV'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Clonazepam (Klonopin)', class: 'Benzodiazepine', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Alprazolam (Xanax)', class: 'Benzodiazepine', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Diazepam (Valium)', class: 'Benzodiazepine', doses: ['2mg', '5mg', '10mg'], routes: ['Oral', 'IM', 'IV'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Chlordiazepoxide (Librium)', class: 'Benzodiazepine', doses: ['5mg', '10mg', '25mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Midazolam (Versed)', class: 'Benzodiazepine', doses: ['1mg/mL', '2mg/mL', '5mg/mL'], routes: ['IV', 'IM', 'Intranasal'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Temazepam (Restoril)', class: 'Benzodiazepine', doses: ['7.5mg', '15mg', '22.5mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Oxazepam (Serax)', class: 'Benzodiazepine', doses: ['10mg', '15mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Clorazepate (Tranxene)', class: 'Benzodiazepine', doses: ['3.75mg', '7.5mg', '15mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },

  // ── Stimulants (Controlled) ───────────────────────────────
  { name: 'Adderall XR (Amphetamine/Dextroamphetamine)', class: 'Stimulant', doses: ['5mg', '10mg', '15mg', '20mg', '25mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Adderall IR (Amphetamine/Dextroamphetamine)', class: 'Stimulant', doses: ['5mg', '7.5mg', '10mg', '12.5mg', '15mg', '20mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Methylphenidate ER (Concerta)', class: 'Stimulant', doses: ['18mg', '27mg', '36mg', '54mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Methylphenidate IR (Ritalin)', class: 'Stimulant', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Lisdexamfetamine (Vyvanse)', class: 'Stimulant', doses: ['10mg', '20mg', '30mg', '40mg', '50mg', '60mg', '70mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Dexmethylphenidate (Focalin XR)', class: 'Stimulant', doses: ['5mg', '10mg', '15mg', '20mg', '25mg', '30mg', '35mg', '40mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Modafinil (Provigil)', class: 'Wakefulness Agent', doses: ['100mg', '200mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Armodafinil (Nuvigil)', class: 'Wakefulness Agent', doses: ['50mg', '150mg', '200mg', '250mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },

  // ── Non-stimulant ADHD ────────────────────────────────────
  { name: 'Atomoxetine (Strattera)', class: 'Non-Stimulant ADHD', doses: ['10mg', '18mg', '25mg', '40mg', '60mg', '80mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Guanfacine ER (Intuniv)', class: 'Non-Stimulant ADHD', doses: ['1mg', '2mg', '3mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clonidine ER (Kapvay)', class: 'Non-Stimulant ADHD', doses: ['0.1mg', '0.2mg'], routes: ['Oral'], isControlled: false },

  // ── Sleep ─────────────────────────────────────────────────
  { name: 'Zolpidem (Ambien)', class: 'Sedative-Hypnotic', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Zolpidem CR (Ambien CR)', class: 'Sedative-Hypnotic', doses: ['6.25mg', '12.5mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Eszopiclone (Lunesta)', class: 'Sedative-Hypnotic', doses: ['1mg', '2mg', '3mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Suvorexant (Belsomra)', class: 'Sedative-Hypnotic', doses: ['5mg', '10mg', '15mg', '20mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Lemborexant (Dayvigo)', class: 'Sedative-Hypnotic', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Ramelteon (Rozerem)', class: 'Melatonin Agonist', doses: ['8mg'], routes: ['Oral'], isControlled: false },
  { name: 'Melatonin', class: 'Supplement / Sleep Aid', doses: ['1mg', '3mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Doxepin (Silenor)', class: 'Sedative-Hypnotic', doses: ['3mg', '6mg'], routes: ['Oral'], isControlled: false },
  { name: 'Tasimelteon (Hetlioz)', class: 'Melatonin Agonist', doses: ['20mg'], routes: ['Oral'], isControlled: false },

  // ── PTSD / Alpha Blockers ─────────────────────────────────
  { name: 'Prazosin', class: 'Alpha-1 Blocker', doses: ['1mg', '2mg', '5mg', '10mg', '15mg', '20mg'], routes: ['Oral'], isControlled: false },

  // ── Substance Use Disorder ────────────────────────────────
  { name: 'Naltrexone (Oral)', class: 'Opioid Antagonist', doses: ['50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Naltrexone ER (Vivitrol)', class: 'Opioid Antagonist', doses: ['380mg'], routes: ['IM'], isControlled: false },
  { name: 'Buprenorphine/Naloxone (Suboxone)', class: 'Opioid Partial Agonist', doses: ['2mg/0.5mg', '4mg/1mg', '8mg/2mg', '12mg/3mg'], routes: ['Sublingual'], isControlled: true, schedule: 'Schedule III' },
  { name: 'Buprenorphine (Sublocade)', class: 'Opioid Partial Agonist', doses: ['100mg', '300mg'], routes: ['Subcutaneous'], isControlled: true, schedule: 'Schedule III' },
  { name: 'Methadone', class: 'Opioid Agonist', doses: ['5mg', '10mg', '40mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Acamprosate (Campral)', class: 'GABA Analog', doses: ['333mg'], routes: ['Oral'], isControlled: false },
  { name: 'Disulfiram (Antabuse)', class: 'Alcohol Deterrent', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Naloxone Nasal Spray (Narcan)', class: 'Opioid Antagonist', doses: ['4mg'], routes: ['Intranasal'], isControlled: false },
  { name: 'Varenicline (Chantix)', class: 'Smoking Cessation', doses: ['0.5mg', '1mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nicotine Patch', class: 'Smoking Cessation', doses: ['7mg/24hr', '14mg/24hr', '21mg/24hr'], routes: ['Transdermal'], isControlled: false },
  { name: 'Nicotine Gum', class: 'Smoking Cessation', doses: ['2mg', '4mg'], routes: ['Buccal'], isControlled: false },
  { name: 'Nicotine Lozenge', class: 'Smoking Cessation', doses: ['2mg', '4mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  CARDIOLOGY
  // ══════════════════════════════════════════════════════════════

  // ── ACE Inhibitors ────────────────────────────────────────
  { name: 'Lisinopril (Zestril)', class: 'ACE Inhibitor', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Enalapril (Vasotec)', class: 'ACE Inhibitor', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ramipril (Altace)', class: 'ACE Inhibitor', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Benazepril (Lotensin)', class: 'ACE Inhibitor', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Quinapril (Accupril)', class: 'ACE Inhibitor', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Captopril', class: 'ACE Inhibitor', doses: ['12.5mg', '25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },

  // ── ARBs ──────────────────────────────────────────────────
  { name: 'Losartan (Cozaar)', class: 'ARB', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Valsartan (Diovan)', class: 'ARB', doses: ['40mg', '80mg', '160mg', '320mg'], routes: ['Oral'], isControlled: false },
  { name: 'Olmesartan (Benicar)', class: 'ARB', doses: ['5mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Irbesartan (Avapro)', class: 'ARB', doses: ['75mg', '150mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Candesartan (Atacand)', class: 'ARB', doses: ['4mg', '8mg', '16mg', '32mg'], routes: ['Oral'], isControlled: false },
  { name: 'Telmisartan (Micardis)', class: 'ARB', doses: ['20mg', '40mg', '80mg'], routes: ['Oral'], isControlled: false },

  // ── ARNI ──────────────────────────────────────────────────
  { name: 'Sacubitril/Valsartan (Entresto)', class: 'ARNI', doses: ['24mg/26mg', '49mg/51mg', '97mg/103mg'], routes: ['Oral'], isControlled: false },

  // ── Beta Blockers ─────────────────────────────────────────
  { name: 'Metoprolol Succinate ER (Toprol XL)', class: 'Beta Blocker', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Metoprolol Tartrate (Lopressor)', class: 'Beta Blocker', doses: ['25mg', '50mg', '100mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Atenolol (Tenormin)', class: 'Beta Blocker', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Carvedilol (Coreg)', class: 'Beta Blocker', doses: ['3.125mg', '6.25mg', '12.5mg', '25mg'], routes: ['Oral'], isControlled: false },
  { name: 'Propranolol (Inderal)', class: 'Beta Blocker', doses: ['10mg', '20mg', '40mg', '60mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Propranolol LA (Inderal LA)', class: 'Beta Blocker', doses: ['60mg', '80mg', '120mg', '160mg'], routes: ['Oral'], isControlled: false },
  { name: 'Bisoprolol (Zebeta)', class: 'Beta Blocker', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nebivolol (Bystolic)', class: 'Beta Blocker', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Labetalol (Trandate)', class: 'Beta Blocker', doses: ['100mg', '200mg', '300mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Sotalol (Betapace)', class: 'Beta Blocker / Antiarrhythmic', doses: ['80mg', '120mg', '160mg', '240mg'], routes: ['Oral'], isControlled: false },

  // ── Calcium Channel Blockers ──────────────────────────────
  { name: 'Amlodipine (Norvasc)', class: 'Calcium Channel Blocker', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nifedipine ER (Procardia XL)', class: 'Calcium Channel Blocker', doses: ['30mg', '60mg', '90mg'], routes: ['Oral'], isControlled: false },
  { name: 'Diltiazem CD (Cardizem CD)', class: 'Calcium Channel Blocker', doses: ['120mg', '180mg', '240mg', '300mg', '360mg'], routes: ['Oral'], isControlled: false },
  { name: 'Verapamil SR (Calan SR)', class: 'Calcium Channel Blocker', doses: ['120mg', '180mg', '240mg', '360mg'], routes: ['Oral'], isControlled: false },
  { name: 'Felodipine (Plendil)', class: 'Calcium Channel Blocker', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },

  // ── Diuretics ─────────────────────────────────────────────
  { name: 'Hydrochlorothiazide (HCTZ)', class: 'Thiazide Diuretic', doses: ['12.5mg', '25mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Chlorthalidone', class: 'Thiazide-like Diuretic', doses: ['12.5mg', '25mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Indapamide (Lozol)', class: 'Thiazide-like Diuretic', doses: ['1.25mg', '2.5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Furosemide (Lasix)', class: 'Loop Diuretic', doses: ['20mg', '40mg', '80mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Bumetanide (Bumex)', class: 'Loop Diuretic', doses: ['0.5mg', '1mg', '2mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Torsemide (Demadex)', class: 'Loop Diuretic', doses: ['5mg', '10mg', '20mg', '100mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Spironolactone (Aldactone)', class: 'Potassium-Sparing Diuretic', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Eplerenone (Inspra)', class: 'Potassium-Sparing Diuretic', doses: ['25mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Triamterene/HCTZ (Dyazide)', class: 'Combination Diuretic', doses: ['37.5mg/25mg', '75mg/50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Metolazone (Zaroxolyn)', class: 'Thiazide-like Diuretic', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Acetazolamide (Diamox)', class: 'Carbonic Anhydrase Inhibitor', doses: ['125mg', '250mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },

  // ── Antiarrhythmics ───────────────────────────────────────
  { name: 'Amiodarone (Cordarone)', class: 'Antiarrhythmic', doses: ['100mg', '200mg', '400mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Flecainide (Tambocor)', class: 'Antiarrhythmic', doses: ['50mg', '100mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dronedarone (Multaq)', class: 'Antiarrhythmic', doses: ['400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Digoxin (Lanoxin)', class: 'Cardiac Glycoside', doses: ['0.0625mg', '0.125mg', '0.25mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Adenosine (Adenocard)', class: 'Antiarrhythmic', doses: ['6mg', '12mg'], routes: ['IV'], isControlled: false },

  // ── Nitrates / Antianginals ───────────────────────────────
  { name: 'Nitroglycerin SL', class: 'Nitrate', doses: ['0.3mg', '0.4mg', '0.6mg'], routes: ['Sublingual'], isControlled: false },
  { name: 'Isosorbide Mononitrate ER (Imdur)', class: 'Nitrate', doses: ['30mg', '60mg', '120mg'], routes: ['Oral'], isControlled: false },
  { name: 'Isosorbide Dinitrate (Isordil)', class: 'Nitrate', doses: ['5mg', '10mg', '20mg', '30mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ranolazine (Ranexa)', class: 'Antianginal', doses: ['500mg', '1000mg'], routes: ['Oral'], isControlled: false },

  // ── Statins / Lipid Agents ────────────────────────────────
  { name: 'Atorvastatin (Lipitor)', class: 'Statin', doses: ['10mg', '20mg', '40mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rosuvastatin (Crestor)', class: 'Statin', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Simvastatin (Zocor)', class: 'Statin', doses: ['5mg', '10mg', '20mg', '40mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pravastatin (Pravachol)', class: 'Statin', doses: ['10mg', '20mg', '40mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Lovastatin (Mevacor)', class: 'Statin', doses: ['10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pitavastatin (Livalo)', class: 'Statin', doses: ['1mg', '2mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ezetimibe (Zetia)', class: 'Cholesterol Absorption Inhibitor', doses: ['10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ezetimibe/Simvastatin (Vytorin)', class: 'Combination Lipid Agent', doses: ['10mg/10mg', '10mg/20mg', '10mg/40mg', '10mg/80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fenofibrate (Tricor)', class: 'Fibrate', doses: ['48mg', '145mg'], routes: ['Oral'], isControlled: false },
  { name: 'Gemfibrozil (Lopid)', class: 'Fibrate', doses: ['600mg'], routes: ['Oral'], isControlled: false },
  { name: 'Icosapent Ethyl (Vascepa)', class: 'Omega-3 Fatty Acid', doses: ['1g'], routes: ['Oral'], isControlled: false },
  { name: 'Evolocumab (Repatha)', class: 'PCSK9 Inhibitor', doses: ['140mg/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Alirocumab (Praluent)', class: 'PCSK9 Inhibitor', doses: ['75mg/mL', '150mg/mL'], routes: ['Subcutaneous'], isControlled: false },

  // ── Anticoagulants ────────────────────────────────────────
  { name: 'Warfarin (Coumadin)', class: 'Anticoagulant', doses: ['1mg', '2mg', '2.5mg', '3mg', '4mg', '5mg', '6mg', '7.5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Apixaban (Eliquis)', class: 'DOAC', doses: ['2.5mg', '5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rivaroxaban (Xarelto)', class: 'DOAC', doses: ['2.5mg', '10mg', '15mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dabigatran (Pradaxa)', class: 'DOAC', doses: ['75mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Edoxaban (Savaysa)', class: 'DOAC', doses: ['15mg', '30mg', '60mg'], routes: ['Oral'], isControlled: false },
  { name: 'Heparin (Unfractionated)', class: 'Anticoagulant', doses: ['1000 units/mL', '5000 units/mL', '10000 units/mL'], routes: ['IV', 'Subcutaneous'], isControlled: false },
  { name: 'Enoxaparin (Lovenox)', class: 'LMWH', doses: ['30mg', '40mg', '60mg', '80mg', '100mg', '120mg', '150mg'], routes: ['Subcutaneous'], isControlled: false },

  // ── Antiplatelets ─────────────────────────────────────────
  { name: 'Aspirin (Low-dose)', class: 'Antiplatelet', doses: ['81mg', '325mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clopidogrel (Plavix)', class: 'Antiplatelet', doses: ['75mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ticagrelor (Brilinta)', class: 'Antiplatelet', doses: ['60mg', '90mg'], routes: ['Oral'], isControlled: false },
  { name: 'Prasugrel (Effient)', class: 'Antiplatelet', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dipyridamole/Aspirin (Aggrenox)', class: 'Antiplatelet', doses: ['200mg/25mg'], routes: ['Oral'], isControlled: false },

  // ── Vasodilators ──────────────────────────────────────────
  { name: 'Hydralazine', class: 'Vasodilator', doses: ['10mg', '25mg', '50mg', '100mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Minoxidil (Oral)', class: 'Vasodilator', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clonidine (Catapres)', class: 'Alpha-2 Agonist', doses: ['0.1mg', '0.2mg', '0.3mg'], routes: ['Oral', 'Transdermal'], isControlled: false },
  { name: 'Doxazosin (Cardura)', class: 'Alpha-1 Blocker', doses: ['1mg', '2mg', '4mg', '8mg'], routes: ['Oral'], isControlled: false },
  { name: 'Terazosin (Hytrin)', class: 'Alpha-1 Blocker', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  ENDOCRINOLOGY / DIABETES
  // ══════════════════════════════════════════════════════════════

  // ── Biguanides ────────────────────────────────────────────
  { name: 'Metformin (Glucophage)', class: 'Biguanide', doses: ['500mg', '850mg', '1000mg'], routes: ['Oral'], isControlled: false },
  { name: 'Metformin ER', class: 'Biguanide', doses: ['500mg', '750mg', '1000mg'], routes: ['Oral'], isControlled: false },

  // ── Sulfonylureas ─────────────────────────────────────────
  { name: 'Glipizide (Glucotrol)', class: 'Sulfonylurea', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Glimepiride (Amaryl)', class: 'Sulfonylurea', doses: ['1mg', '2mg', '4mg', '8mg'], routes: ['Oral'], isControlled: false },
  { name: 'Glyburide (DiaBeta)', class: 'Sulfonylurea', doses: ['1.25mg', '2.5mg', '5mg'], routes: ['Oral'], isControlled: false },

  // ── SGLT2 Inhibitors ──────────────────────────────────────
  { name: 'Empagliflozin (Jardiance)', class: 'SGLT2 Inhibitor', doses: ['10mg', '25mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dapagliflozin (Farxiga)', class: 'SGLT2 Inhibitor', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Canagliflozin (Invokana)', class: 'SGLT2 Inhibitor', doses: ['100mg', '300mg'], routes: ['Oral'], isControlled: false },

  // ── DPP-4 Inhibitors ──────────────────────────────────────
  { name: 'Sitagliptin (Januvia)', class: 'DPP-4 Inhibitor', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Linagliptin (Tradjenta)', class: 'DPP-4 Inhibitor', doses: ['5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Saxagliptin (Onglyza)', class: 'DPP-4 Inhibitor', doses: ['2.5mg', '5mg'], routes: ['Oral'], isControlled: false },

  // ── GLP-1 Receptor Agonists ───────────────────────────────
  { name: 'Semaglutide (Ozempic)', class: 'GLP-1 Agonist', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Semaglutide (Rybelsus)', class: 'GLP-1 Agonist', doses: ['3mg', '7mg', '14mg'], routes: ['Oral'], isControlled: false },
  { name: 'Semaglutide (Wegovy)', class: 'GLP-1 Agonist', doses: ['0.25mg', '0.5mg', '1mg', '1.7mg', '2.4mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Liraglutide (Victoza)', class: 'GLP-1 Agonist', doses: ['0.6mg', '1.2mg', '1.8mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Dulaglutide (Trulicity)', class: 'GLP-1 Agonist', doses: ['0.75mg', '1.5mg', '3mg', '4.5mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Exenatide ER (Bydureon)', class: 'GLP-1 Agonist', doses: ['2mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Tirzepatide (Mounjaro)', class: 'GIP/GLP-1 Agonist', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'], routes: ['Subcutaneous'], isControlled: false },

  // ── Thiazolidinediones ────────────────────────────────────
  { name: 'Pioglitazone (Actos)', class: 'Thiazolidinedione', doses: ['15mg', '30mg', '45mg'], routes: ['Oral'], isControlled: false },

  // ── Insulins ──────────────────────────────────────────────
  { name: 'Insulin Glargine (Lantus)', class: 'Long-Acting Insulin', doses: ['100 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin Glargine U-300 (Toujeo)', class: 'Long-Acting Insulin', doses: ['300 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin Degludec (Tresiba)', class: 'Ultra Long-Acting Insulin', doses: ['100 units/mL', '200 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin Detemir (Levemir)', class: 'Long-Acting Insulin', doses: ['100 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin NPH (Humulin N)', class: 'Intermediate-Acting Insulin', doses: ['100 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin Lispro (Humalog)', class: 'Rapid-Acting Insulin', doses: ['100 units/mL', '200 units/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Insulin Aspart (NovoLog)', class: 'Rapid-Acting Insulin', doses: ['100 units/mL'], routes: ['Subcutaneous', 'IV'], isControlled: false },
  { name: 'Insulin Regular (Humulin R)', class: 'Short-Acting Insulin', doses: ['100 units/mL', '500 units/mL'], routes: ['Subcutaneous', 'IV'], isControlled: false },
  { name: 'Insulin 70/30 (Humulin 70/30)', class: 'Premixed Insulin', doses: ['100 units/mL'], routes: ['Subcutaneous'], isControlled: false },

  // ── Thyroid ───────────────────────────────────────────────
  { name: 'Levothyroxine (Synthroid)', class: 'Thyroid Hormone', doses: ['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '137mcg', '150mcg', '175mcg', '200mcg', '300mcg'], routes: ['Oral'], isControlled: false },
  { name: 'Liothyronine (Cytomel)', class: 'Thyroid Hormone', doses: ['5mcg', '25mcg', '50mcg'], routes: ['Oral'], isControlled: false },
  { name: 'Methimazole (Tapazole)', class: 'Antithyroid', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Propylthiouracil (PTU)', class: 'Antithyroid', doses: ['50mg'], routes: ['Oral'], isControlled: false },

  // ── Corticosteroids (Systemic) ────────────────────────────
  { name: 'Prednisone', class: 'Corticosteroid', doses: ['1mg', '2.5mg', '5mg', '10mg', '20mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Prednisolone', class: 'Corticosteroid', doses: ['5mg', '15mg/5mL'], routes: ['Oral'], isControlled: false },
  { name: 'Methylprednisolone (Medrol)', class: 'Corticosteroid', doses: ['4mg', '8mg', '16mg', '32mg'], routes: ['Oral'], isControlled: false },
  { name: 'Methylprednisolone (Solu-Medrol)', class: 'Corticosteroid', doses: ['40mg', '125mg', '500mg', '1g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Dexamethasone (Decadron)', class: 'Corticosteroid', doses: ['0.5mg', '0.75mg', '1mg', '1.5mg', '4mg', '6mg'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Hydrocortisone (Cortef)', class: 'Corticosteroid', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fludrocortisone (Florinef)', class: 'Mineralocorticoid', doses: ['0.1mg'], routes: ['Oral'], isControlled: false },

  // ── Bone / Calcium ────────────────────────────────────────
  { name: 'Alendronate (Fosamax)', class: 'Bisphosphonate', doses: ['5mg', '10mg', '35mg', '70mg'], routes: ['Oral'], isControlled: false },
  { name: 'Risedronate (Actonel)', class: 'Bisphosphonate', doses: ['5mg', '35mg', '150mg'], routes: ['Oral'], isControlled: false },
  { name: 'Zoledronic Acid (Reclast)', class: 'Bisphosphonate', doses: ['5mg/100mL'], routes: ['IV'], isControlled: false },
  { name: 'Denosumab (Prolia)', class: 'RANK Ligand Inhibitor', doses: ['60mg/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Calcium Carbonate', class: 'Mineral Supplement', doses: ['500mg', '600mg', '1000mg', '1250mg'], routes: ['Oral'], isControlled: false },
  { name: 'Vitamin D3 (Cholecalciferol)', class: 'Vitamin', doses: ['400 IU', '1000 IU', '2000 IU', '5000 IU', '50000 IU'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  PULMONOLOGY / RESPIRATORY
  // ══════════════════════════════════════════════════════════════

  // ── Short-Acting Bronchodilators ──────────────────────────
  { name: 'Albuterol HFA (ProAir / Ventolin)', class: 'SABA', doses: ['90mcg/actuation'], routes: ['Inhalation'], isControlled: false },
  { name: 'Albuterol Nebulizer Solution', class: 'SABA', doses: ['0.63mg/3mL', '1.25mg/3mL', '2.5mg/3mL'], routes: ['Nebulization'], isControlled: false },
  { name: 'Ipratropium (Atrovent HFA)', class: 'SAMA', doses: ['17mcg/actuation'], routes: ['Inhalation'], isControlled: false },
  { name: 'Ipratropium/Albuterol (DuoNeb)', class: 'SAMA/SABA Combo', doses: ['0.5mg/2.5mg per 3mL'], routes: ['Nebulization'], isControlled: false },
  { name: 'Levalbuterol (Xopenex)', class: 'SABA', doses: ['0.31mg/3mL', '0.63mg/3mL', '1.25mg/3mL'], routes: ['Nebulization'], isControlled: false },

  // ── Long-Acting Bronchodilators ───────────────────────────
  { name: 'Tiotropium (Spiriva HandiHaler)', class: 'LAMA', doses: ['18mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Tiotropium (Spiriva Respimat)', class: 'LAMA', doses: ['1.25mcg', '2.5mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Umeclidinium (Incruse Ellipta)', class: 'LAMA', doses: ['62.5mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Salmeterol (Serevent)', class: 'LABA', doses: ['50mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Formoterol (Perforomist)', class: 'LABA', doses: ['20mcg/2mL'], routes: ['Nebulization'], isControlled: false },
  { name: 'Umeclidinium/Vilanterol (Anoro Ellipta)', class: 'LAMA/LABA Combo', doses: ['62.5mcg/25mcg'], routes: ['Inhalation'], isControlled: false },

  // ── Inhaled Corticosteroids ───────────────────────────────
  { name: 'Fluticasone (Flovent HFA)', class: 'Inhaled Corticosteroid', doses: ['44mcg', '110mcg', '220mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Budesonide (Pulmicort)', class: 'Inhaled Corticosteroid', doses: ['0.25mg/2mL', '0.5mg/2mL', '1mg/2mL'], routes: ['Nebulization'], isControlled: false },
  { name: 'Beclomethasone (QVAR RediHaler)', class: 'Inhaled Corticosteroid', doses: ['40mcg', '80mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Mometasone (Asmanex)', class: 'Inhaled Corticosteroid', doses: ['110mcg', '220mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Ciclesonide (Alvesco)', class: 'Inhaled Corticosteroid', doses: ['80mcg', '160mcg'], routes: ['Inhalation'], isControlled: false },

  // ── ICS / LABA Combos ─────────────────────────────────────
  { name: 'Fluticasone/Salmeterol (Advair Diskus)', class: 'ICS/LABA', doses: ['100/50mcg', '250/50mcg', '500/50mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Budesonide/Formoterol (Symbicort)', class: 'ICS/LABA', doses: ['80/4.5mcg', '160/4.5mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Fluticasone/Vilanterol (Breo Ellipta)', class: 'ICS/LABA', doses: ['100/25mcg', '200/25mcg'], routes: ['Inhalation'], isControlled: false },
  { name: 'Mometasone/Formoterol (Dulera)', class: 'ICS/LABA', doses: ['100/5mcg', '200/5mcg'], routes: ['Inhalation'], isControlled: false },

  // ── Triple-Therapy Inhalers ───────────────────────────────
  { name: 'Fluticasone/Umeclidinium/Vilanterol (Trelegy Ellipta)', class: 'ICS/LAMA/LABA', doses: ['100/62.5/25mcg', '200/62.5/25mcg'], routes: ['Inhalation'], isControlled: false },

  // ── Leukotriene Modifiers ─────────────────────────────────
  { name: 'Montelukast (Singulair)', class: 'Leukotriene Modifier', doses: ['4mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Zafirlukast (Accolate)', class: 'Leukotriene Modifier', doses: ['10mg', '20mg'], routes: ['Oral'], isControlled: false },

  // ── Other Respiratory ─────────────────────────────────────
  { name: 'Theophylline ER', class: 'Methylxanthine', doses: ['100mg', '200mg', '300mg', '400mg', '450mg', '600mg'], routes: ['Oral'], isControlled: false },
  { name: 'Roflumilast (Daliresp)', class: 'PDE4 Inhibitor', doses: ['500mcg'], routes: ['Oral'], isControlled: false },
  { name: 'Guaifenesin (Mucinex)', class: 'Expectorant', doses: ['200mg', '400mg', '600mg', '1200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Benzonatate (Tessalon Perles)', class: 'Antitussive', doses: ['100mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dextromethorphan/Guaifenesin (Mucinex DM)', class: 'Antitussive/Expectorant', doses: ['30mg/600mg', '60mg/1200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Codeine/Guaifenesin', class: 'Antitussive/Expectorant', doses: ['10mg/100mg per 5mL'], routes: ['Oral'], isControlled: true, schedule: 'Schedule V' },
  { name: 'Promethazine/Codeine', class: 'Antitussive', doses: ['6.25mg/10mg per 5mL'], routes: ['Oral'], isControlled: true, schedule: 'Schedule V' },

  // ══════════════════════════════════════════════════════════════
  //  GASTROENTEROLOGY
  // ══════════════════════════════════════════════════════════════

  // ── PPIs ──────────────────────────────────────────────────
  { name: 'Omeprazole (Prilosec)', class: 'Proton Pump Inhibitor', doses: ['10mg', '20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pantoprazole (Protonix)', class: 'Proton Pump Inhibitor', doses: ['20mg', '40mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Esomeprazole (Nexium)', class: 'Proton Pump Inhibitor', doses: ['20mg', '40mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Lansoprazole (Prevacid)', class: 'Proton Pump Inhibitor', doses: ['15mg', '30mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rabeprazole (Aciphex)', class: 'Proton Pump Inhibitor', doses: ['20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dexlansoprazole (Dexilant)', class: 'Proton Pump Inhibitor', doses: ['30mg', '60mg'], routes: ['Oral'], isControlled: false },

  // ── H2 Blockers ───────────────────────────────────────────
  { name: 'Famotidine (Pepcid)', class: 'H2 Blocker', doses: ['10mg', '20mg', '40mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Ranitidine (Zantac)', class: 'H2 Blocker', doses: ['150mg', '300mg'], routes: ['Oral'], isControlled: false },

  // ── Antacids / GI Protectants ─────────────────────────────
  { name: 'Sucralfate (Carafate)', class: 'GI Protectant', doses: ['1g'], routes: ['Oral'], isControlled: false },
  { name: 'Calcium Carbonate/Simethicone (Tums)', class: 'Antacid', doses: ['500mg', '750mg', '1000mg'], routes: ['Oral'], isControlled: false },
  { name: 'Aluminum/Magnesium Hydroxide (Maalox)', class: 'Antacid', doses: ['200mg/200mg per 5mL'], routes: ['Oral'], isControlled: false },
  { name: 'Bismuth Subsalicylate (Pepto-Bismol)', class: 'Antidiarrheal/GI Protectant', doses: ['262mg', '524mg'], routes: ['Oral'], isControlled: false },

  // ── Antiemetics ───────────────────────────────────────────
  { name: 'Ondansetron (Zofran)', class: 'Antiemetic', doses: ['4mg', '8mg'], routes: ['Oral', 'IV', 'ODT'], isControlled: false },
  { name: 'Promethazine (Phenergan)', class: 'Antiemetic', doses: ['12.5mg', '25mg', '50mg'], routes: ['Oral', 'IM', 'Rectal'], isControlled: false },
  { name: 'Metoclopramide (Reglan)', class: 'Prokinetic / Antiemetic', doses: ['5mg', '10mg'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Prochlorperazine (Compazine)', class: 'Antiemetic', doses: ['5mg', '10mg', '25mg'], routes: ['Oral', 'IM', 'IV', 'Rectal'], isControlled: false },
  { name: 'Scopolamine Patch (Transderm Scop)', class: 'Antiemetic', doses: ['1.5mg/72hr'], routes: ['Transdermal'], isControlled: false },
  { name: 'Granisetron (Kytril)', class: 'Antiemetic', doses: ['1mg', '2mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Meclizine (Antivert)', class: 'Antiemetic / Antivertigo', doses: ['12.5mg', '25mg', '50mg'], routes: ['Oral'], isControlled: false },

  // ── Laxatives ─────────────────────────────────────────────
  { name: 'Polyethylene Glycol 3350 (MiraLAX)', class: 'Osmotic Laxative', doses: ['17g'], routes: ['Oral'], isControlled: false },
  { name: 'Docusate Sodium (Colace)', class: 'Stool Softener', doses: ['100mg', '250mg'], routes: ['Oral'], isControlled: false },
  { name: 'Senna (Senokot)', class: 'Stimulant Laxative', doses: ['8.6mg', '17.2mg'], routes: ['Oral'], isControlled: false },
  { name: 'Bisacodyl (Dulcolax)', class: 'Stimulant Laxative', doses: ['5mg', '10mg'], routes: ['Oral', 'Rectal'], isControlled: false },
  { name: 'Lactulose', class: 'Osmotic Laxative', doses: ['10g/15mL', '20g/30mL'], routes: ['Oral'], isControlled: false },
  { name: 'Psyllium (Metamucil)', class: 'Bulk-Forming Laxative', doses: ['3.4g'], routes: ['Oral'], isControlled: false },
  { name: 'Linaclotide (Linzess)', class: 'Guanylate Cyclase-C Agonist', doses: ['72mcg', '145mcg', '290mcg'], routes: ['Oral'], isControlled: false },
  { name: 'Lubiprostone (Amitiza)', class: 'Chloride Channel Activator', doses: ['8mcg', '24mcg'], routes: ['Oral'], isControlled: false },

  // ── Antidiarrheals ────────────────────────────────────────
  { name: 'Loperamide (Imodium)', class: 'Antidiarrheal', doses: ['2mg'], routes: ['Oral'], isControlled: false },
  { name: 'Diphenoxylate/Atropine (Lomotil)', class: 'Antidiarrheal', doses: ['2.5mg/0.025mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule V' },

  // ── IBD ───────────────────────────────────────────────────
  { name: 'Mesalamine (Asacol HD)', class: '5-ASA', doses: ['400mg', '800mg'], routes: ['Oral'], isControlled: false },
  { name: 'Sulfasalazine (Azulfidine)', class: '5-ASA / DMARD', doses: ['500mg'], routes: ['Oral'], isControlled: false },

  // ── Hepatology ────────────────────────────────────────────
  { name: 'Ursodiol (Actigall)', class: 'Bile Acid', doses: ['250mg', '300mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rifaximin (Xifaxan)', class: 'Antibiotic (GI)', doses: ['200mg', '550mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  INFECTIOUS DISEASE
  // ══════════════════════════════════════════════════════════════

  // ── Penicillins ───────────────────────────────────────────
  { name: 'Amoxicillin', class: 'Penicillin', doses: ['250mg', '500mg', '875mg'], routes: ['Oral'], isControlled: false },
  { name: 'Amoxicillin/Clavulanate (Augmentin)', class: 'Penicillin/Beta-lactamase Inhibitor', doses: ['250mg/125mg', '500mg/125mg', '875mg/125mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ampicillin', class: 'Penicillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Ampicillin/Sulbactam (Unasyn)', class: 'Penicillin/Beta-lactamase Inhibitor', doses: ['1.5g', '3g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Piperacillin/Tazobactam (Zosyn)', class: 'Extended-Spectrum Penicillin', doses: ['2.25g', '3.375g', '4.5g'], routes: ['IV'], isControlled: false },
  { name: 'Penicillin VK', class: 'Penicillin', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dicloxacillin', class: 'Penicillin', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Nafcillin', class: 'Penicillin', doses: ['1g', '2g'], routes: ['IV'], isControlled: false },

  // ── Cephalosporins ────────────────────────────────────────
  { name: 'Cephalexin (Keflex)', class: 'Cephalosporin (1st Gen)', doses: ['250mg', '500mg', '750mg'], routes: ['Oral'], isControlled: false },
  { name: 'Cefazolin (Ancef)', class: 'Cephalosporin (1st Gen)', doses: ['500mg', '1g', '2g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Cefuroxime (Ceftin)', class: 'Cephalosporin (2nd Gen)', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Cefdinir (Omnicef)', class: 'Cephalosporin (3rd Gen)', doses: ['300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Cefpodoxime (Vantin)', class: 'Cephalosporin (3rd Gen)', doses: ['100mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ceftriaxone (Rocephin)', class: 'Cephalosporin (3rd Gen)', doses: ['250mg', '500mg', '1g', '2g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Ceftazidime (Fortaz)', class: 'Cephalosporin (3rd Gen)', doses: ['500mg', '1g', '2g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Cefepime (Maxipime)', class: 'Cephalosporin (4th Gen)', doses: ['1g', '2g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Ceftaroline (Teflaro)', class: 'Cephalosporin (5th Gen)', doses: ['600mg'], routes: ['IV'], isControlled: false },

  // ── Carbapenems ───────────────────────────────────────────
  { name: 'Meropenem (Merrem)', class: 'Carbapenem', doses: ['500mg', '1g', '2g'], routes: ['IV'], isControlled: false },
  { name: 'Ertapenem (Invanz)', class: 'Carbapenem', doses: ['1g'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Imipenem/Cilastatin (Primaxin)', class: 'Carbapenem', doses: ['250mg', '500mg'], routes: ['IV'], isControlled: false },

  // ── Fluoroquinolones ──────────────────────────────────────
  { name: 'Ciprofloxacin (Cipro)', class: 'Fluoroquinolone', doses: ['250mg', '500mg', '750mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Levofloxacin (Levaquin)', class: 'Fluoroquinolone', doses: ['250mg', '500mg', '750mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Moxifloxacin (Avelox)', class: 'Fluoroquinolone', doses: ['400mg'], routes: ['Oral', 'IV'], isControlled: false },

  // ── Macrolides ────────────────────────────────────────────
  { name: 'Azithromycin (Zithromax)', class: 'Macrolide', doses: ['250mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Clarithromycin (Biaxin)', class: 'Macrolide', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Erythromycin', class: 'Macrolide', doses: ['250mg', '333mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },

  // ── Tetracyclines ─────────────────────────────────────────
  { name: 'Doxycycline (Vibramycin)', class: 'Tetracycline', doses: ['50mg', '100mg', '200mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Minocycline (Minocin)', class: 'Tetracycline', doses: ['50mg', '75mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Tetracycline', class: 'Tetracycline', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },

  // ── Sulfonamides ──────────────────────────────────────────
  { name: 'Sulfamethoxazole/Trimethoprim (Bactrim)', class: 'Sulfonamide', doses: ['400mg/80mg', '800mg/160mg'], routes: ['Oral', 'IV'], isControlled: false },

  // ── Glycopeptides ─────────────────────────────────────────
  { name: 'Vancomycin (IV)', class: 'Glycopeptide', doses: ['500mg', '750mg', '1g', '1.25g', '1.5g', '1.75g', '2g'], routes: ['IV'], isControlled: false },
  { name: 'Vancomycin (Oral)', class: 'Glycopeptide', doses: ['125mg', '250mg'], routes: ['Oral'], isControlled: false },

  // ── Aminoglycosides ───────────────────────────────────────
  { name: 'Gentamicin', class: 'Aminoglycoside', doses: ['40mg/mL', '80mg/2mL'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Tobramycin', class: 'Aminoglycoside', doses: ['40mg/mL', '80mg/2mL'], routes: ['IV', 'IM', 'Inhalation'], isControlled: false },
  { name: 'Amikacin', class: 'Aminoglycoside', doses: ['250mg/mL', '500mg/2mL'], routes: ['IV', 'IM'], isControlled: false },

  // ── Lincosamides / Oxazolidinones / Others ────────────────
  { name: 'Clindamycin (Cleocin)', class: 'Lincosamide', doses: ['150mg', '300mg', '450mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Linezolid (Zyvox)', class: 'Oxazolidinone', doses: ['600mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Daptomycin (Cubicin)', class: 'Lipopeptide', doses: ['350mg', '500mg'], routes: ['IV'], isControlled: false },
  { name: 'Nitrofurantoin (Macrobid)', class: 'Nitrofuran', doses: ['100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fosfomycin (Monurol)', class: 'Phosphonic Acid', doses: ['3g'], routes: ['Oral'], isControlled: false },
  { name: 'Metronidazole (Flagyl)', class: 'Nitroimidazole', doses: ['250mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Trimethoprim (Primsol)', class: 'Dihydrofolate Reductase Inhibitor', doses: ['100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Colistimethate (Colistin)', class: 'Polymyxin', doses: ['150mg'], routes: ['IV', 'Inhalation'], isControlled: false },
  { name: 'Tigecycline (Tygacil)', class: 'Glycylcycline', doses: ['50mg'], routes: ['IV'], isControlled: false },

  // ── Antifungals ───────────────────────────────────────────
  { name: 'Fluconazole (Diflucan)', class: 'Antifungal (Azole)', doses: ['50mg', '100mg', '150mg', '200mg', '400mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Itraconazole (Sporanox)', class: 'Antifungal (Azole)', doses: ['100mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Voriconazole (Vfend)', class: 'Antifungal (Azole)', doses: ['50mg', '200mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Posaconazole (Noxafil)', class: 'Antifungal (Azole)', doses: ['100mg', '200mg/5mL'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Nystatin', class: 'Antifungal (Polyene)', doses: ['100000 units/mL'], routes: ['Oral'], isControlled: false },
  { name: 'Amphotericin B (Liposomal — AmBisome)', class: 'Antifungal (Polyene)', doses: ['50mg'], routes: ['IV'], isControlled: false },
  { name: 'Micafungin (Mycamine)', class: 'Antifungal (Echinocandin)', doses: ['50mg', '100mg', '150mg'], routes: ['IV'], isControlled: false },
  { name: 'Caspofungin (Cancidas)', class: 'Antifungal (Echinocandin)', doses: ['50mg', '70mg'], routes: ['IV'], isControlled: false },
  { name: 'Terbinafine (Lamisil)', class: 'Antifungal', doses: ['250mg'], routes: ['Oral'], isControlled: false },
  { name: 'Griseofulvin', class: 'Antifungal', doses: ['125mg', '250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clotrimazole Troche', class: 'Antifungal (Topical/Oral)', doses: ['10mg'], routes: ['Oral'], isControlled: false },

  // ── Antivirals ────────────────────────────────────────────
  { name: 'Acyclovir (Zovirax)', class: 'Antiviral', doses: ['200mg', '400mg', '800mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Valacyclovir (Valtrex)', class: 'Antiviral', doses: ['500mg', '1g'], routes: ['Oral'], isControlled: false },
  { name: 'Oseltamivir (Tamiflu)', class: 'Antiviral (Neuraminidase Inhibitor)', doses: ['30mg', '45mg', '75mg'], routes: ['Oral'], isControlled: false },
  { name: 'Baloxavir (Xofluza)', class: 'Antiviral (Cap-dependent Endonuclease Inhibitor)', doses: ['20mg', '40mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Famciclovir (Famvir)', class: 'Antiviral', doses: ['125mg', '250mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ganciclovir (Cytovene)', class: 'Antiviral', doses: ['250mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Valganciclovir (Valcyte)', class: 'Antiviral', doses: ['450mg'], routes: ['Oral'], isControlled: false },
  { name: 'Remdesivir (Veklury)', class: 'Antiviral', doses: ['100mg'], routes: ['IV'], isControlled: false },
  { name: 'Nirmatrelvir/Ritonavir (Paxlovid)', class: 'Antiviral (Protease Inhibitor)', doses: ['150mg/100mg'], routes: ['Oral'], isControlled: false },

  // ── Antimalarials ─────────────────────────────────────────
  { name: 'Hydroxychloroquine (Plaquenil)', class: 'Antimalarial / DMARD', doses: ['200mg', '400mg'], routes: ['Oral'], isControlled: false },

  // ── Antiparasitics ────────────────────────────────────────
  { name: 'Ivermectin (Stromectol)', class: 'Antiparasitic', doses: ['3mg'], routes: ['Oral'], isControlled: false },
  { name: 'Albendazole', class: 'Antiparasitic', doses: ['200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Permethrin 5% Cream', class: 'Antiparasitic (Topical)', doses: ['60g'], routes: ['Topical'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  PAIN MANAGEMENT / ANALGESICS
  // ══════════════════════════════════════════════════════════════

  // ── Non-Opioid Analgesics ─────────────────────────────────
  { name: 'Acetaminophen (Tylenol)', class: 'Analgesic / Antipyretic', doses: ['325mg', '500mg', '650mg', '1000mg'], routes: ['Oral', 'IV', 'Rectal'], isControlled: false },
  { name: 'Ibuprofen (Advil / Motrin)', class: 'NSAID', doses: ['200mg', '400mg', '600mg', '800mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Naproxen (Aleve / Naprosyn)', class: 'NSAID', doses: ['220mg', '250mg', '375mg', '500mg'], routes: ['Oral'], isControlled: false },
  { name: 'Meloxicam (Mobic)', class: 'NSAID', doses: ['7.5mg', '15mg'], routes: ['Oral'], isControlled: false },
  { name: 'Diclofenac (Voltaren)', class: 'NSAID', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['Oral', 'Topical'], isControlled: false },
  { name: 'Celecoxib (Celebrex)', class: 'COX-2 Inhibitor', doses: ['50mg', '100mg', '200mg', '400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ketorolac (Toradol)', class: 'NSAID', doses: ['10mg', '15mg', '30mg', '60mg'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Indomethacin (Indocin)', class: 'NSAID', doses: ['25mg', '50mg', '75mg'], routes: ['Oral', 'Rectal'], isControlled: false },
  { name: 'Piroxicam (Feldene)', class: 'NSAID', doses: ['10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Etodolac', class: 'NSAID', doses: ['200mg', '300mg', '400mg', '500mg'], routes: ['Oral'], isControlled: false },

  // ── Muscle Relaxants ──────────────────────────────────────
  { name: 'Cyclobenzaprine (Flexeril)', class: 'Muscle Relaxant', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Methocarbamol (Robaxin)', class: 'Muscle Relaxant', doses: ['500mg', '750mg'], routes: ['Oral'], isControlled: false },
  { name: 'Tizanidine (Zanaflex)', class: 'Muscle Relaxant', doses: ['2mg', '4mg', '6mg'], routes: ['Oral'], isControlled: false },
  { name: 'Baclofen', class: 'Muscle Relaxant', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Metaxalone (Skelaxin)', class: 'Muscle Relaxant', doses: ['400mg', '800mg'], routes: ['Oral'], isControlled: false },
  { name: 'Carisoprodol (Soma)', class: 'Muscle Relaxant', doses: ['250mg', '350mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Dantrolene (Dantrium)', class: 'Muscle Relaxant', doses: ['25mg', '50mg', '100mg'], routes: ['Oral', 'IV'], isControlled: false },

  // ── Neuropathic Pain ──────────────────────────────────────
  { name: 'Lidocaine Patch 5% (Lidoderm)', class: 'Local Anesthetic', doses: ['5%'], routes: ['Topical'], isControlled: false },
  { name: 'Capsaicin Cream', class: 'Topical Analgesic', doses: ['0.025%', '0.075%'], routes: ['Topical'], isControlled: false },
  { name: 'Carbamazepine (Tegretol)', class: 'Anticonvulsant / Neuropathic Pain', doses: ['100mg', '200mg', '400mg'], routes: ['Oral'], isControlled: false },

  // ── Opioid Analgesics (Controlled) ────────────────────────
  { name: 'Tramadol (Ultram)', class: 'Opioid Analgesic', doses: ['50mg', '100mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Tramadol ER', class: 'Opioid Analgesic', doses: ['100mg', '200mg', '300mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Hydrocodone/Acetaminophen (Norco)', class: 'Opioid Analgesic', doses: ['5mg/325mg', '7.5mg/325mg', '10mg/325mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Oxycodone IR', class: 'Opioid Analgesic', doses: ['5mg', '10mg', '15mg', '20mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Oxycodone/Acetaminophen (Percocet)', class: 'Opioid Analgesic', doses: ['2.5mg/325mg', '5mg/325mg', '7.5mg/325mg', '10mg/325mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Oxycodone ER (OxyContin)', class: 'Opioid Analgesic', doses: ['10mg', '15mg', '20mg', '30mg', '40mg', '60mg', '80mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Morphine Sulfate IR', class: 'Opioid Analgesic', doses: ['15mg', '30mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Morphine Sulfate ER (MS Contin)', class: 'Opioid Analgesic', doses: ['15mg', '30mg', '60mg', '100mg', '200mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Hydromorphone (Dilaudid)', class: 'Opioid Analgesic', doses: ['2mg', '4mg', '8mg'], routes: ['Oral', 'IV'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Fentanyl Patch (Duragesic)', class: 'Opioid Analgesic', doses: ['12mcg/hr', '25mcg/hr', '50mcg/hr', '75mcg/hr', '100mcg/hr'], routes: ['Transdermal'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Fentanyl Citrate (Injectable)', class: 'Opioid Analgesic', doses: ['50mcg/mL', '100mcg/2mL'], routes: ['IV', 'IM'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Tapentadol (Nucynta)', class: 'Opioid Analgesic', doses: ['50mg', '75mg', '100mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule II' },
  { name: 'Codeine/Acetaminophen (Tylenol #3)', class: 'Opioid Analgesic', doses: ['30mg/300mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule III' },
  { name: 'Butorphanol (Stadol) Nasal Spray', class: 'Opioid Analgesic', doses: ['1mg/spray'], routes: ['Intranasal'], isControlled: true, schedule: 'Schedule IV' },

  // ── Migraine ──────────────────────────────────────────────
  { name: 'Sumatriptan (Imitrex)', class: 'Triptan', doses: ['25mg', '50mg', '100mg', '6mg/0.5mL'], routes: ['Oral', 'Subcutaneous', 'Intranasal'], isControlled: false },
  { name: 'Rizatriptan (Maxalt)', class: 'Triptan', doses: ['5mg', '10mg'], routes: ['Oral', 'ODT'], isControlled: false },
  { name: 'Zolmitriptan (Zomig)', class: 'Triptan', doses: ['2.5mg', '5mg'], routes: ['Oral', 'Intranasal'], isControlled: false },
  { name: 'Eletriptan (Relpax)', class: 'Triptan', doses: ['20mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ergotamine/Caffeine (Cafergot)', class: 'Ergot Alkaloid', doses: ['1mg/100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Erenumab (Aimovig)', class: 'CGRP Antagonist', doses: ['70mg/mL', '140mg/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Fremanezumab (Ajovy)', class: 'CGRP Antagonist', doses: ['225mg/1.5mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Galcanezumab (Emgality)', class: 'CGRP Antagonist', doses: ['120mg/mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Topiramate (Topamax)', class: 'Anticonvulsant / Migraine Prophylaxis', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  NEUROLOGY
  // ══════════════════════════════════════════════════════════════

  // ── Anticonvulsants (not already listed) ──────────────────
  { name: 'Levetiracetam (Keppra)', class: 'Anticonvulsant', doses: ['250mg', '500mg', '750mg', '1000mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Phenytoin (Dilantin)', class: 'Anticonvulsant', doses: ['30mg', '100mg', '200mg', '300mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Fosphenytoin (Cerebyx)', class: 'Anticonvulsant', doses: ['100mg PE/2mL', '500mg PE/10mL'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Phenobarbital', class: 'Barbiturate / Anticonvulsant', doses: ['15mg', '30mg', '60mg', '100mg'], routes: ['Oral', 'IV', 'IM'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Lacosamide (Vimpat)', class: 'Anticonvulsant', doses: ['50mg', '100mg', '150mg', '200mg'], routes: ['Oral', 'IV'], isControlled: true, schedule: 'Schedule V' },
  { name: 'Brivaracetam (Briviact)', class: 'Anticonvulsant', doses: ['10mg', '25mg', '50mg', '75mg', '100mg'], routes: ['Oral', 'IV'], isControlled: true, schedule: 'Schedule V' },
  { name: 'Zonisamide (Zonegran)', class: 'Anticonvulsant', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clobazam (Onfi)', class: 'Anticonvulsant (Benzodiazepine)', doses: ['5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: true, schedule: 'Schedule IV' },
  { name: 'Ethosuximide (Zarontin)', class: 'Anticonvulsant', doses: ['250mg'], routes: ['Oral'], isControlled: false },

  // ── Parkinson's Disease ───────────────────────────────────
  { name: 'Carbidopa/Levodopa (Sinemet)', class: 'Dopaminergic', doses: ['10mg/100mg', '25mg/100mg', '25mg/250mg'], routes: ['Oral'], isControlled: false },
  { name: 'Carbidopa/Levodopa CR (Sinemet CR)', class: 'Dopaminergic', doses: ['25mg/100mg', '50mg/200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Pramipexole (Mirapex)', class: 'Dopamine Agonist', doses: ['0.125mg', '0.25mg', '0.5mg', '1mg', '1.5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ropinirole (Requip)', class: 'Dopamine Agonist', doses: ['0.25mg', '0.5mg', '1mg', '2mg', '3mg', '4mg', '5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Amantadine (Symmetrel)', class: 'NMDA Antagonist / Dopaminergic', doses: ['100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Entacapone (Comtan)', class: 'COMT Inhibitor', doses: ['200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rasagiline (Azilect)', class: 'MAO-B Inhibitor', doses: ['0.5mg', '1mg'], routes: ['Oral'], isControlled: false },
  { name: 'Benztropine (Cogentin)', class: 'Anticholinergic', doses: ['0.5mg', '1mg', '2mg'], routes: ['Oral', 'IM', 'IV'], isControlled: false },
  { name: 'Trihexyphenidyl (Artane)', class: 'Anticholinergic', doses: ['2mg', '5mg'], routes: ['Oral'], isControlled: false },

  // ── Alzheimer's / Dementia ────────────────────────────────
  { name: 'Donepezil (Aricept)', class: 'Cholinesterase Inhibitor', doses: ['5mg', '10mg', '23mg'], routes: ['Oral'], isControlled: false },
  { name: 'Rivastigmine (Exelon Patch)', class: 'Cholinesterase Inhibitor', doses: ['4.6mg/24hr', '9.5mg/24hr', '13.3mg/24hr'], routes: ['Transdermal'], isControlled: false },
  { name: 'Galantamine (Razadyne)', class: 'Cholinesterase Inhibitor', doses: ['4mg', '8mg', '12mg'], routes: ['Oral'], isControlled: false },
  { name: 'Memantine (Namenda)', class: 'NMDA Antagonist', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Memantine XR (Namenda XR)', class: 'NMDA Antagonist', doses: ['7mg', '14mg', '21mg', '28mg'], routes: ['Oral'], isControlled: false },

  // ── Multiple Sclerosis ────────────────────────────────────
  { name: 'Dimethyl Fumarate (Tecfidera)', class: 'MS Disease-Modifying', doses: ['120mg', '240mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fingolimod (Gilenya)', class: 'MS Disease-Modifying', doses: ['0.5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Ocrelizumab (Ocrevus)', class: 'MS Disease-Modifying', doses: ['300mg/10mL'], routes: ['IV'], isControlled: false },
  { name: 'Natalizumab (Tysabri)', class: 'MS Disease-Modifying', doses: ['300mg/15mL'], routes: ['IV'], isControlled: false },
  { name: 'Glatiramer (Copaxone)', class: 'MS Disease-Modifying', doses: ['20mg/mL', '40mg/mL'], routes: ['Subcutaneous'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  RHEUMATOLOGY / IMMUNOLOGY
  // ══════════════════════════════════════════════════════════════
  { name: 'Methotrexate', class: 'DMARD / Antimetabolite', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '15mg', '20mg', '25mg'], routes: ['Oral', 'Subcutaneous', 'IM'], isControlled: false },
  { name: 'Leflunomide (Arava)', class: 'DMARD', doses: ['10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Adalimumab (Humira)', class: 'TNF Inhibitor', doses: ['40mg/0.8mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Etanercept (Enbrel)', class: 'TNF Inhibitor', doses: ['25mg', '50mg'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Infliximab (Remicade)', class: 'TNF Inhibitor', doses: ['100mg'], routes: ['IV'], isControlled: false },
  { name: 'Tofacitinib (Xeljanz)', class: 'JAK Inhibitor', doses: ['5mg', '10mg', '11mg'], routes: ['Oral'], isControlled: false },
  { name: 'Baricitinib (Olumiant)', class: 'JAK Inhibitor', doses: ['1mg', '2mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Upadacitinib (Rinvoq)', class: 'JAK Inhibitor', doses: ['15mg', '30mg', '45mg'], routes: ['Oral'], isControlled: false },
  { name: 'Azathioprine (Imuran)', class: 'Immunosuppressant', doses: ['50mg', '75mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Mycophenolate Mofetil (CellCept)', class: 'Immunosuppressant', doses: ['250mg', '500mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Tacrolimus (Prograf)', class: 'Calcineurin Inhibitor', doses: ['0.5mg', '1mg', '5mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Cyclosporine (Neoral)', class: 'Calcineurin Inhibitor', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Colchicine (Colcrys)', class: 'Anti-inflammatory (Gout)', doses: ['0.6mg'], routes: ['Oral'], isControlled: false },
  { name: 'Allopurinol (Zyloprim)', class: 'Xanthine Oxidase Inhibitor', doses: ['100mg', '200mg', '300mg'], routes: ['Oral'], isControlled: false },
  { name: 'Febuxostat (Uloric)', class: 'Xanthine Oxidase Inhibitor', doses: ['40mg', '80mg'], routes: ['Oral'], isControlled: false },
  { name: 'Probenecid', class: 'Uricosuric', doses: ['250mg', '500mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  NEPHROLOGY / UROLOGY
  // ══════════════════════════════════════════════════════════════
  { name: 'Tamsulosin (Flomax)', class: 'Alpha Blocker (BPH)', doses: ['0.4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Finasteride (Proscar)', class: '5-Alpha Reductase Inhibitor', doses: ['5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dutasteride (Avodart)', class: '5-Alpha Reductase Inhibitor', doses: ['0.5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Sildenafil (Viagra)', class: 'PDE5 Inhibitor', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Tadalafil (Cialis)', class: 'PDE5 Inhibitor', doses: ['2.5mg', '5mg', '10mg', '20mg'], routes: ['Oral'], isControlled: false },
  { name: 'Oxybutynin (Ditropan)', class: 'Anticholinergic (Overactive Bladder)', doses: ['5mg', '10mg', '15mg'], routes: ['Oral', 'Transdermal'], isControlled: false },
  { name: 'Tolterodine (Detrol LA)', class: 'Anticholinergic (Overactive Bladder)', doses: ['2mg', '4mg'], routes: ['Oral'], isControlled: false },
  { name: 'Solifenacin (Vesicare)', class: 'Anticholinergic (Overactive Bladder)', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Mirabegron (Myrbetriq)', class: 'Beta-3 Agonist', doses: ['25mg', '50mg'], routes: ['Oral'], isControlled: false },
  { name: 'Sodium Polystyrene Sulfonate (Kayexalate)', class: 'Potassium Binder', doses: ['15g', '30g', '60g'], routes: ['Oral', 'Rectal'], isControlled: false },
  { name: 'Patiromer (Veltassa)', class: 'Potassium Binder', doses: ['8.4g', '16.8g', '25.2g'], routes: ['Oral'], isControlled: false },
  { name: 'Sevelamer (Renvela)', class: 'Phosphate Binder', doses: ['400mg', '800mg'], routes: ['Oral'], isControlled: false },
  { name: 'Sodium Bicarbonate', class: 'Alkalinizing Agent', doses: ['325mg', '650mg'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Potassium Chloride (K-Dur)', class: 'Electrolyte Supplement', doses: ['10mEq', '20mEq', '40mEq'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Magnesium Oxide', class: 'Electrolyte Supplement', doses: ['200mg', '400mg'], routes: ['Oral'], isControlled: false },
  { name: 'Magnesium Sulfate', class: 'Electrolyte', doses: ['1g', '2g', '4g'], routes: ['IV', 'IM'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  HEMATOLOGY / ONCOLOGY (Supportive)
  // ══════════════════════════════════════════════════════════════
  { name: 'Ferrous Sulfate', class: 'Iron Supplement', doses: ['325mg'], routes: ['Oral'], isControlled: false },
  { name: 'Iron Sucrose (Venofer)', class: 'IV Iron', doses: ['200mg/10mL'], routes: ['IV'], isControlled: false },
  { name: 'Ferric Carboxymaltose (Injectafer)', class: 'IV Iron', doses: ['750mg/15mL'], routes: ['IV'], isControlled: false },
  { name: 'Epoetin Alfa (Epogen/Procrit)', class: 'Erythropoietin', doses: ['2000 units', '3000 units', '4000 units', '10000 units', '40000 units'], routes: ['Subcutaneous', 'IV'], isControlled: false },
  { name: 'Darbepoetin Alfa (Aranesp)', class: 'Erythropoietin', doses: ['25mcg', '40mcg', '60mcg', '100mcg', '200mcg', '300mcg'], routes: ['Subcutaneous', 'IV'], isControlled: false },
  { name: 'Filgrastim (Neupogen)', class: 'Colony-Stimulating Factor', doses: ['300mcg', '480mcg'], routes: ['Subcutaneous', 'IV'], isControlled: false },
  { name: 'Pegfilgrastim (Neulasta)', class: 'Colony-Stimulating Factor', doses: ['6mg/0.6mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Vitamin B12 (Cyanocobalamin)', class: 'Vitamin', doses: ['100mcg', '250mcg', '500mcg', '1000mcg'], routes: ['Oral', 'IM', 'Subcutaneous'], isControlled: false },
  { name: 'Folic Acid', class: 'Vitamin', doses: ['0.4mg', '0.8mg', '1mg', '5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Phytonadione (Vitamin K)', class: 'Vitamin', doses: ['1mg', '2.5mg', '5mg', '10mg'], routes: ['Oral', 'IV', 'Subcutaneous'], isControlled: false },
  { name: 'Tranexamic Acid (Lysteda)', class: 'Antifibrinolytic', doses: ['650mg', '1g'], routes: ['Oral', 'IV'], isControlled: false },
  { name: 'Aminocaproic Acid (Amicar)', class: 'Antifibrinolytic', doses: ['500mg', '1g'], routes: ['Oral', 'IV'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  ALLERGY / ENT / DERMATOLOGY
  // ══════════════════════════════════════════════════════════════

  // ── Antihistamines ────────────────────────────────────────
  { name: 'Cetirizine (Zyrtec)', class: 'Antihistamine (2nd Gen)', doses: ['5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Loratadine (Claritin)', class: 'Antihistamine (2nd Gen)', doses: ['10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Fexofenadine (Allegra)', class: 'Antihistamine (2nd Gen)', doses: ['60mg', '180mg'], routes: ['Oral'], isControlled: false },
  { name: 'Levocetirizine (Xyzal)', class: 'Antihistamine (2nd Gen)', doses: ['5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Diphenhydramine (Benadryl)', class: 'Antihistamine (1st Gen)', doses: ['25mg', '50mg'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Chlorpheniramine', class: 'Antihistamine (1st Gen)', doses: ['4mg'], routes: ['Oral'], isControlled: false },

  // ── Nasal Sprays ──────────────────────────────────────────
  { name: 'Fluticasone Nasal (Flonase)', class: 'Intranasal Corticosteroid', doses: ['50mcg/spray'], routes: ['Intranasal'], isControlled: false },
  { name: 'Mometasone Nasal (Nasonex)', class: 'Intranasal Corticosteroid', doses: ['50mcg/spray'], routes: ['Intranasal'], isControlled: false },
  { name: 'Azelastine Nasal (Astelin)', class: 'Intranasal Antihistamine', doses: ['137mcg/spray'], routes: ['Intranasal'], isControlled: false },
  { name: 'Oxymetazoline (Afrin)', class: 'Nasal Decongestant', doses: ['0.05%'], routes: ['Intranasal'], isControlled: false },

  // ── Epinephrine ───────────────────────────────────────────
  { name: 'Epinephrine Auto-Injector (EpiPen)', class: 'Sympathomimetic', doses: ['0.15mg', '0.3mg'], routes: ['IM'], isControlled: false },
  { name: 'Epinephrine (Injectable)', class: 'Sympathomimetic', doses: ['0.1mg/mL', '1mg/mL'], routes: ['IV', 'IM', 'Subcutaneous'], isControlled: false },

  // ── Topical Corticosteroids ───────────────────────────────
  { name: 'Hydrocortisone Cream 1%', class: 'Topical Corticosteroid (Low)', doses: ['1%'], routes: ['Topical'], isControlled: false },
  { name: 'Triamcinolone Cream (Kenalog)', class: 'Topical Corticosteroid (Medium)', doses: ['0.025%', '0.1%', '0.5%'], routes: ['Topical'], isControlled: false },
  { name: 'Betamethasone Dipropionate (Diprolene)', class: 'Topical Corticosteroid (High)', doses: ['0.05%'], routes: ['Topical'], isControlled: false },
  { name: 'Clobetasol Propionate (Temovate)', class: 'Topical Corticosteroid (Super-High)', doses: ['0.05%'], routes: ['Topical'], isControlled: false },
  { name: 'Fluocinonide (Lidex)', class: 'Topical Corticosteroid (High)', doses: ['0.05%'], routes: ['Topical'], isControlled: false },
  { name: 'Desonide (DesOwen)', class: 'Topical Corticosteroid (Low)', doses: ['0.05%'], routes: ['Topical'], isControlled: false },

  // ── Topical Anti-infectives ───────────────────────────────
  { name: 'Mupirocin (Bactroban)', class: 'Topical Antibiotic', doses: ['2%'], routes: ['Topical'], isControlled: false },
  { name: 'Bacitracin Ointment', class: 'Topical Antibiotic', doses: ['500 units/g'], routes: ['Topical'], isControlled: false },
  { name: 'Silver Sulfadiazine (Silvadene)', class: 'Topical Antibiotic', doses: ['1%'], routes: ['Topical'], isControlled: false },
  { name: 'Ketoconazole Cream', class: 'Topical Antifungal', doses: ['2%'], routes: ['Topical'], isControlled: false },
  { name: 'Clotrimazole Cream', class: 'Topical Antifungal', doses: ['1%'], routes: ['Topical'], isControlled: false },
  { name: 'Miconazole (Monistat)', class: 'Topical Antifungal', doses: ['2%'], routes: ['Topical', 'Vaginal'], isControlled: false },

  // ── Dermatology (Other) ───────────────────────────────────
  { name: 'Tretinoin (Retin-A)', class: 'Retinoid (Topical)', doses: ['0.025%', '0.05%', '0.1%'], routes: ['Topical'], isControlled: false },
  { name: 'Adapalene (Differin)', class: 'Retinoid (Topical)', doses: ['0.1%', '0.3%'], routes: ['Topical'], isControlled: false },
  { name: 'Isotretinoin (Accutane)', class: 'Retinoid (Systemic)', doses: ['10mg', '20mg', '30mg', '40mg'], routes: ['Oral'], isControlled: false },
  { name: 'Benzoyl Peroxide', class: 'Topical Acne Agent', doses: ['2.5%', '5%', '10%'], routes: ['Topical'], isControlled: false },
  { name: 'Calcipotriene (Dovonex)', class: 'Vitamin D Analog (Topical)', doses: ['0.005%'], routes: ['Topical'], isControlled: false },
  { name: 'Tacrolimus Ointment (Protopic)', class: 'Topical Calcineurin Inhibitor', doses: ['0.03%', '0.1%'], routes: ['Topical'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  OPHTHALMOLOGY
  // ══════════════════════════════════════════════════════════════
  { name: 'Latanoprost (Xalatan)', class: 'Prostaglandin Analog (Glaucoma)', doses: ['0.005%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Timolol (Timoptic)', class: 'Beta Blocker (Ophthalmic)', doses: ['0.25%', '0.5%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Brimonidine (Alphagan P)', class: 'Alpha-2 Agonist (Ophthalmic)', doses: ['0.1%', '0.15%', '0.2%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Dorzolamide/Timolol (Cosopt)', class: 'CAI/Beta Blocker (Ophthalmic)', doses: ['2%/0.5%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Prednisolone Acetate (Pred Forte)', class: 'Ophthalmic Corticosteroid', doses: ['1%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Erythromycin Ophthalmic Ointment', class: 'Ophthalmic Antibiotic', doses: ['0.5%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Ciprofloxacin Ophthalmic (Ciloxan)', class: 'Ophthalmic Antibiotic', doses: ['0.3%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Moxifloxacin Ophthalmic (Vigamox)', class: 'Ophthalmic Antibiotic', doses: ['0.5%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Artificial Tears (Systane)', class: 'Ophthalmic Lubricant', doses: ['15mL', '30mL'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Cyclopentolate (Cyclogyl)', class: 'Cycloplegic / Mydriatic', doses: ['0.5%', '1%', '2%'], routes: ['Ophthalmic'], isControlled: false },
  { name: 'Tropicamide (Mydriacyl)', class: 'Mydriatic', doses: ['0.5%', '1%'], routes: ['Ophthalmic'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  OB/GYN / REPRODUCTIVE HEALTH
  // ══════════════════════════════════════════════════════════════
  { name: 'Prenatal Vitamins', class: 'Vitamin / Supplement', doses: ['1 tablet'], routes: ['Oral'], isControlled: false },
  { name: 'Combined Oral Contraceptive (Ethinyl Estradiol/Norgestimate)', class: 'Oral Contraceptive', doses: ['35mcg/0.25mg'], routes: ['Oral'], isControlled: false },
  { name: 'Norethindrone (Micronor)', class: 'Progestin-Only Contraceptive', doses: ['0.35mg'], routes: ['Oral'], isControlled: false },
  { name: 'Medroxyprogesterone (Depo-Provera)', class: 'Injectable Contraceptive', doses: ['150mg/mL'], routes: ['IM'], isControlled: false },
  { name: 'Medroxyprogesterone (Provera)', class: 'Progestin', doses: ['2.5mg', '5mg', '10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Conjugated Estrogens (Premarin)', class: 'Estrogen', doses: ['0.3mg', '0.45mg', '0.625mg', '0.9mg', '1.25mg'], routes: ['Oral'], isControlled: false },
  { name: 'Estradiol (Oral)', class: 'Estrogen', doses: ['0.5mg', '1mg', '2mg'], routes: ['Oral'], isControlled: false },
  { name: 'Estradiol Patch (Vivelle-Dot)', class: 'Estrogen', doses: ['0.025mg/day', '0.0375mg/day', '0.05mg/day', '0.075mg/day', '0.1mg/day'], routes: ['Transdermal'], isControlled: false },
  { name: 'Progesterone (Prometrium)', class: 'Progestin', doses: ['100mg', '200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Oxytocin (Pitocin)', class: 'Uterotonic', doses: ['10 units/mL', '20 units/mL'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Misoprostol (Cytotec)', class: 'Prostaglandin', doses: ['100mcg', '200mcg'], routes: ['Oral', 'Vaginal', 'Sublingual', 'Rectal'], isControlled: false },
  { name: 'Methylergonovine (Methergine)', class: 'Ergot Alkaloid', doses: ['0.2mg'], routes: ['Oral', 'IM'], isControlled: false },
  { name: 'Tranexamic Acid (for Heavy Menstrual Bleeding)', class: 'Antifibrinolytic', doses: ['650mg'], routes: ['Oral'], isControlled: false },
  { name: 'Letrozole (Femara)', class: 'Aromatase Inhibitor', doses: ['2.5mg', '5mg', '7.5mg'], routes: ['Oral'], isControlled: false },
  { name: 'Clomiphene (Clomid)', class: 'Selective Estrogen Receptor Modulator', doses: ['50mg', '100mg'], routes: ['Oral'], isControlled: false },
  { name: 'Terconazole (Terazol)', class: 'Antifungal (Vaginal)', doses: ['0.4%', '0.8%', '80mg'], routes: ['Vaginal'], isControlled: false },
  { name: 'Fluconazole (single-dose for VVC)', class: 'Antifungal (Azole)', doses: ['150mg'], routes: ['Oral'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  EMERGENCY / CRITICAL CARE
  // ══════════════════════════════════════════════════════════════
  { name: 'Atropine', class: 'Anticholinergic', doses: ['0.5mg', '1mg'], routes: ['IV', 'IM', 'ET'], isControlled: false },
  { name: 'Vasopressin', class: 'Vasopressor', doses: ['20 units/mL', '40 units'], routes: ['IV'], isControlled: false },
  { name: 'Norepinephrine (Levophed)', class: 'Vasopressor', doses: ['1mg/mL', '4mg/4mL'], routes: ['IV'], isControlled: false },
  { name: 'Dopamine', class: 'Vasopressor / Inotrope', doses: ['200mg/5mL', '400mg/5mL', '800mg/5mL'], routes: ['IV'], isControlled: false },
  { name: 'Dobutamine', class: 'Inotrope', doses: ['250mg/20mL'], routes: ['IV'], isControlled: false },
  { name: 'Phenylephrine (Injectable)', class: 'Alpha-1 Agonist', doses: ['10mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Milrinone (Primacor)', class: 'PDE3 Inhibitor / Inotrope', doses: ['1mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Sodium Nitroprusside (Nipride)', class: 'Vasodilator', doses: ['50mg'], routes: ['IV'], isControlled: false },
  { name: 'Nicardipine (Cardene)', class: 'Calcium Channel Blocker (IV)', doses: ['2.5mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Clevidipine (Cleviprex)', class: 'Calcium Channel Blocker (IV)', doses: ['0.5mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Esmolol (Brevibloc)', class: 'Ultra-Short-Acting Beta Blocker', doses: ['10mg/mL', '250mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Amiodarone (IV)', class: 'Antiarrhythmic (IV)', doses: ['150mg/3mL', '450mg/9mL'], routes: ['IV'], isControlled: false },
  { name: 'Lidocaine (Injectable)', class: 'Local Anesthetic / Antiarrhythmic', doses: ['1%', '2%', '10mg/mL', '20mg/mL'], routes: ['IV', 'Local Infiltration'], isControlled: false },
  { name: 'Naloxone (Injectable — Narcan)', class: 'Opioid Antagonist', doses: ['0.4mg/mL', '1mg/mL'], routes: ['IV', 'IM', 'Subcutaneous'], isControlled: false },
  { name: 'Flumazenil (Romazicon)', class: 'Benzodiazepine Antagonist', doses: ['0.1mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Activated Charcoal', class: 'Adsorbent', doses: ['25g', '50g'], routes: ['Oral'], isControlled: false },
  { name: 'Dextrose 50% (D50)', class: 'Carbohydrate', doses: ['25g/50mL'], routes: ['IV'], isControlled: false },
  { name: 'Glucagon', class: 'Hyperglycemic Agent', doses: ['1mg'], routes: ['IM', 'IV', 'Subcutaneous'], isControlled: false },
  { name: 'Calcium Gluconate (Injectable)', class: 'Electrolyte', doses: ['1g/10mL'], routes: ['IV'], isControlled: false },
  { name: 'Calcium Chloride (Injectable)', class: 'Electrolyte', doses: ['1g/10mL'], routes: ['IV'], isControlled: false },
  { name: 'Normal Saline (0.9% NaCl)', class: 'IV Fluid', doses: ['250mL', '500mL', '1000mL'], routes: ['IV'], isControlled: false },
  { name: 'Lactated Ringer\'s Solution', class: 'IV Fluid', doses: ['500mL', '1000mL'], routes: ['IV'], isControlled: false },
  { name: 'Dextrose 5% in Water (D5W)', class: 'IV Fluid', doses: ['250mL', '500mL', '1000mL'], routes: ['IV'], isControlled: false },
  { name: 'Albumin 5%', class: 'Colloid', doses: ['250mL', '500mL'], routes: ['IV'], isControlled: false },
  { name: 'Albumin 25%', class: 'Colloid', doses: ['50mL', '100mL'], routes: ['IV'], isControlled: false },
  { name: 'Mannitol 20%', class: 'Osmotic Diuretic', doses: ['250mL', '500mL'], routes: ['IV'], isControlled: false },

  // ── Anesthesia / Sedation ─────────────────────────────────
  { name: 'Propofol (Diprivan)', class: 'General Anesthetic', doses: ['10mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Ketamine (Ketalar)', class: 'Dissociative Anesthetic', doses: ['10mg/mL', '50mg/mL', '100mg/mL'], routes: ['IV', 'IM'], isControlled: true, schedule: 'Schedule III' },
  { name: 'Etomidate (Amidate)', class: 'General Anesthetic', doses: ['2mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Succinylcholine (Anectine)', class: 'Depolarizing Neuromuscular Blocker', doses: ['20mg/mL'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Rocuronium (Zemuron)', class: 'Non-Depolarizing Neuromuscular Blocker', doses: ['10mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Vecuronium (Norcuron)', class: 'Non-Depolarizing Neuromuscular Blocker', doses: ['10mg', '20mg'], routes: ['IV'], isControlled: false },
  { name: 'Sugammadex (Bridion)', class: 'Neuromuscular Reversal', doses: ['200mg/2mL', '500mg/5mL'], routes: ['IV'], isControlled: false },
  { name: 'Neostigmine', class: 'Cholinesterase Inhibitor (Reversal)', doses: ['0.5mg/mL', '1mg/mL'], routes: ['IV'], isControlled: false },
  { name: 'Glycopyrrolate (Robinul)', class: 'Anticholinergic', doses: ['0.2mg/mL'], routes: ['IV', 'IM'], isControlled: false },
  { name: 'Dexmedetomidine (Precedex)', class: 'Alpha-2 Agonist (Sedation)', doses: ['100mcg/mL', '200mcg/2mL'], routes: ['IV'], isControlled: false },
  { name: 'Bupivacaine', class: 'Local Anesthetic', doses: ['0.25%', '0.5%'], routes: ['Local Infiltration', 'Epidural'], isControlled: false },
  { name: 'Ropivacaine', class: 'Local Anesthetic', doses: ['0.2%', '0.5%', '0.75%', '1%'], routes: ['Local Infiltration', 'Epidural'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  VACCINES (Teaching Hospital Formulary)
  // ══════════════════════════════════════════════════════════════
  { name: 'Influenza Vaccine (Fluzone / Fluarix)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Influenza Vaccine High-Dose (Fluzone HD)', class: 'Vaccine', doses: ['0.7mL'], routes: ['IM'], isControlled: false },
  { name: 'COVID-19 Vaccine (Moderna, updated)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'COVID-19 Vaccine (Pfizer-BioNTech, updated)', class: 'Vaccine', doses: ['0.3mL'], routes: ['IM'], isControlled: false },
  { name: 'Tdap (Boostrix / Adacel)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Td (Tenivac)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Pneumococcal PCV20 (Prevnar 20)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Pneumococcal PPSV23 (Pneumovax 23)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM', 'Subcutaneous'], isControlled: false },
  { name: 'Hepatitis A (Havrix)', class: 'Vaccine', doses: ['0.5mL', '1mL'], routes: ['IM'], isControlled: false },
  { name: 'Hepatitis B (Engerix-B)', class: 'Vaccine', doses: ['0.5mL', '1mL'], routes: ['IM'], isControlled: false },
  { name: 'Hepatitis A+B (Twinrix)', class: 'Vaccine', doses: ['1mL'], routes: ['IM'], isControlled: false },
  { name: 'Shingles (Shingrix)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'HPV (Gardasil 9)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'MMR (M-M-R II)', class: 'Vaccine', doses: ['0.5mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Varicella (Varivax)', class: 'Vaccine', doses: ['0.5mL'], routes: ['Subcutaneous'], isControlled: false },
  { name: 'Meningococcal ACWY (Menactra / Menveo)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Meningococcal B (Bexsero / Trumenba)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'RSV (Arexvy / Abrysvo)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM'], isControlled: false },
  { name: 'Polio (IPV — IPOL)', class: 'Vaccine', doses: ['0.5mL'], routes: ['IM', 'Subcutaneous'], isControlled: false },
  { name: 'Rotavirus (RotaTeq)', class: 'Vaccine', doses: ['2mL'], routes: ['Oral'], isControlled: false },
  { name: 'BCG Vaccine', class: 'Vaccine', doses: ['0.1mL'], routes: ['Intradermal'], isControlled: false },

  // ══════════════════════════════════════════════════════════════
  //  MISCELLANEOUS / OTC ESSENTIALS
  // ══════════════════════════════════════════════════════════════
  { name: 'Pseudoephedrine (Sudafed)', class: 'Decongestant', doses: ['30mg', '60mg', '120mg', '240mg'], routes: ['Oral'], isControlled: false },
  { name: 'Phenylephrine (Oral Decongestant)', class: 'Decongestant', doses: ['10mg'], routes: ['Oral'], isControlled: false },
  { name: 'Dextromethorphan (Delsym)', class: 'Antitussive', doses: ['10mg/5mL', '30mg/5mL'], routes: ['Oral'], isControlled: false },
  { name: 'Docusate/Senna (Peri-Colace)', class: 'Stool Softener/Stimulant Laxative', doses: ['50mg/8.6mg'], routes: ['Oral'], isControlled: false },
  { name: 'Zinc Sulfate', class: 'Mineral Supplement', doses: ['220mg'], routes: ['Oral'], isControlled: false },
  { name: 'Multivitamin (Daily)', class: 'Vitamin / Supplement', doses: ['1 tablet'], routes: ['Oral'], isControlled: false },
  { name: 'Fish Oil (Omega-3)', class: 'Supplement', doses: ['1000mg', '1200mg'], routes: ['Oral'], isControlled: false },
  { name: 'Probiotic (Lactobacillus)', class: 'Supplement', doses: ['1 capsule'], routes: ['Oral'], isControlled: false },
  { name: 'Thiamine (Vitamin B1)', class: 'Vitamin', doses: ['100mg', '250mg', '500mg'], routes: ['Oral', 'IV', 'IM'], isControlled: false },
  { name: 'Pyridoxine (Vitamin B6)', class: 'Vitamin', doses: ['25mg', '50mg', '100mg'], routes: ['Oral'], isControlled: false },
];

// ========== LAB ORDER DATABASE ==========
export const labOrderDatabase = [
  { name: 'CBC w/ Differential', code: '85025', category: 'Hematology' },
  { name: 'Comprehensive Metabolic Panel (CMP)', code: '80053', category: 'Chemistry' },
  { name: 'Basic Metabolic Panel (BMP)', code: '80048', category: 'Chemistry' },
  { name: 'Hepatic Function Panel', code: '80076', category: 'Chemistry' },
  { name: 'Lipid Panel', code: '80061', category: 'Chemistry' },
  { name: 'TSH', code: '84443', category: 'Endocrine' },
  { name: 'Free T4', code: '84439', category: 'Endocrine' },
  { name: 'HbA1c', code: '83036', category: 'Endocrine' },
  { name: 'Lithium Level', code: '80178', category: 'Therapeutic Drug Monitoring' },
  { name: 'Valproic Acid Level', code: '80164', category: 'Therapeutic Drug Monitoring' },
  { name: 'Lamotrigine Level', code: '80175', category: 'Therapeutic Drug Monitoring' },
  { name: 'Urine Drug Screen (10-panel)', code: '80307', category: 'Toxicology' },
  { name: 'Urine Drug Screen (12-panel w/ confirmation)', code: '80308', category: 'Toxicology' },
  { name: 'Blood Alcohol Level', code: '80320', category: 'Toxicology' },
  { name: 'Vitamin D 25-Hydroxy', code: '82306', category: 'Chemistry' },
  { name: 'Vitamin B12', code: '82607', category: 'Chemistry' },
  { name: 'Folate', code: '82746', category: 'Chemistry' },
  { name: 'Prolactin', code: '84146', category: 'Endocrine' },
  { name: 'RPR (Syphilis Screen)', code: '86592', category: 'Infectious Disease' },
  { name: 'HIV 1/2 Antibody', code: '86703', category: 'Infectious Disease' },
  { name: 'Hepatitis Panel (A, B, C)', code: '80074', category: 'Infectious Disease' },
  { name: 'Urinalysis w/ Reflex Culture', code: '81001', category: 'Urinalysis' },
  { name: 'CRP (C-Reactive Protein)', code: '86140', category: 'Inflammatory' },
  { name: 'ESR (Sed Rate)', code: '85652', category: 'Inflammatory' },
  { name: 'Pregnancy Test (Urine)', code: '81025', category: 'Urinalysis' },
  { name: 'Pregnancy Test (Serum hCG)', code: '84703', category: 'Chemistry' },
];

// ========== ILLINOIS PHARMACIES ==========
export const pharmacies = [
  { id: 'ph1', name: 'Walgreens #5734', chain: 'Walgreens', address: '757 N Michigan Ave', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 664-8681', fax: '(312) 664-8682', npi: '0010100002' },
  { id: 'ph2', name: 'Walgreens #3218', chain: 'Walgreens', address: '2 E Roosevelt Rd', city: 'Chicago', state: 'IL', zip: '60605', phone: '(312) 427-0863', fax: '(312) 427-0864', npi: '0010100003' },
  { id: 'ph3', name: 'Walgreens #4590', chain: 'Walgreens', address: '6140 N Broadway', city: 'Chicago', state: 'IL', zip: '60660', phone: '(773) 973-0430', fax: '(773) 973-0431', npi: '0010100004' },
  { id: 'ph4', name: 'Walgreens #12835', chain: 'Walgreens', address: '1601 N Wells St', city: 'Chicago', state: 'IL', zip: '60614', phone: '(312) 642-4008', fax: '(312) 642-4009', npi: '0010100005' },
  { id: 'ph5', name: 'Walgreens #2867', chain: 'Walgreens', address: '200 W Adams St', city: 'Chicago', state: 'IL', zip: '60606', phone: '(312) 332-1862', fax: '(312) 332-1863', npi: '0010100006' },
  { id: 'ph6', name: 'Walgreens #9021', chain: 'Walgreens', address: '1500 N Clybourn Ave', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 944-5515', fax: '(312) 944-5516', npi: '0010100007' },
  { id: 'ph7', name: 'Walgreens #7834', chain: 'Walgreens', address: '3501 N Halsted St', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 549-1144', fax: '(773) 549-1145', npi: '0010100008' },
  { id: 'ph8', name: 'Walgreens #9462', chain: 'Walgreens', address: '4200 W Irving Park Rd', city: 'Chicago', state: 'IL', zip: '60641', phone: '(773) 282-5010', fax: '(773) 282-5011', npi: '0010100009' },
  { id: 'ph9', name: 'Walgreens #2103', chain: 'Walgreens', address: '8101 S Cottage Grove Ave', city: 'Chicago', state: 'IL', zip: '60619', phone: '(773) 488-3010', fax: '(773) 488-3011', npi: '0010100010' },
  { id: 'ph10', name: 'Walgreens #5882', chain: 'Walgreens', address: '1372 N Milwaukee Ave', city: 'Chicago', state: 'IL', zip: '60622', phone: '(773) 395-6811', fax: '(773) 395-6812', npi: '0010100011' },
  { id: 'ph11', name: 'Walgreens #3640', chain: 'Walgreens', address: '2950 E 79th St', city: 'Chicago', state: 'IL', zip: '60649', phone: '(773) 731-4211', fax: '(773) 731-4212', npi: '0010100012' },
  { id: 'ph12', name: 'Walgreens #7129', chain: 'Walgreens', address: '3201 N Harlem Ave', city: 'Chicago', state: 'IL', zip: '60634', phone: '(773) 637-8280', fax: '(773) 637-8281', npi: '0010100013' },
  { id: 'ph13', name: 'Walgreens #4851', chain: 'Walgreens', address: '5150 S Pulaski Rd', city: 'Chicago', state: 'IL', zip: '60632', phone: '(773) 476-2300', fax: '(773) 476-2301', npi: '0010100014' },
  { id: 'ph14', name: 'Walgreens #6705', chain: 'Walgreens', address: '2701 N Clark St', city: 'Chicago', state: 'IL', zip: '60614', phone: '(773) 549-3860', fax: '(773) 549-3861', npi: '0010100015' },
  { id: 'ph15', name: 'Walgreens #8230', chain: 'Walgreens', address: '1200 N Lake Shore Dr', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 440-1900', fax: '(312) 440-1901', npi: '0010100016' },
  { id: 'ph16', name: 'Walgreens #9915', chain: 'Walgreens', address: '5400 N Western Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 561-3210', fax: '(773) 561-3211', npi: '0010100017' },
  { id: 'ph17', name: 'Walgreens #3472', chain: 'Walgreens', address: '1300 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60605', phone: '(312) 461-0001', fax: '(312) 461-0002', npi: '0010100018' },
  { id: 'ph18', name: 'Walgreens #8821', chain: 'Walgreens', address: '4051 N Pulaski Rd', city: 'Chicago', state: 'IL', zip: '60641', phone: '(773) 725-1052', fax: '(773) 725-1053', npi: '0010100019' },
  { id: 'ph19', name: 'Walgreens #5236', chain: 'Walgreens', address: '9 W Division St', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 642-0862', fax: '(312) 642-0863', npi: '0010100020' },
  { id: 'ph20', name: 'Walgreens #4482', chain: 'Walgreens', address: '303 E Ontario St', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 280-0550', fax: '(312) 280-0551', npi: '0010100021' },
  { id: 'ph21', name: 'Walgreens #6912', chain: 'Walgreens', address: '6625 N Sheridan Rd', city: 'Chicago', state: 'IL', zip: '60626', phone: '(773) 274-5151', fax: '(773) 274-5152', npi: '0010100022' },
  { id: 'ph22', name: 'Walgreens #7531', chain: 'Walgreens', address: '3146 W 26th St', city: 'Chicago', state: 'IL', zip: '60623', phone: '(773) 847-8741', fax: '(773) 847-8742', npi: '0010100023' },
  { id: 'ph23', name: 'Walgreens #8104', chain: 'Walgreens', address: '10 N State St', city: 'Chicago', state: 'IL', zip: '60602', phone: '(312) 984-0727', fax: '(312) 984-0728', npi: '0010100024' },
  { id: 'ph24', name: 'Walgreens #9351', chain: 'Walgreens', address: '4201 S Archer Ave', city: 'Chicago', state: 'IL', zip: '60632', phone: '(773) 927-4171', fax: '(773) 927-4172', npi: '0010100025' },
  { id: 'ph25', name: 'Walgreens #3902', chain: 'Walgreens', address: '1801 N Harlem Ave', city: 'Chicago', state: 'IL', zip: '60707', phone: '(773) 836-0330', fax: '(773) 836-0331', npi: '0010100026' },
  { id: 'ph26', name: 'Walgreens #6140', chain: 'Walgreens', address: '1825 Waukegan Rd', city: 'Glenview', state: 'IL', zip: '60025', phone: '(847) 729-8190', fax: '(847) 729-8191', npi: '0010100027' },
  { id: 'ph27', name: 'Walgreens #3890', chain: 'Walgreens', address: '621 Waukegan Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 945-2522', fax: '(847) 945-2523', npi: '0010100028' },
  { id: 'ph28', name: 'Walgreens #7481', chain: 'Walgreens', address: '100 N Milwaukee Ave', city: 'Libertyville', state: 'IL', zip: '60048', phone: '(847) 362-2400', fax: '(847) 362-2401', npi: '0010100029' },
  { id: 'ph29', name: 'Walgreens #5129', chain: 'Walgreens', address: '2100 N Mannheim Rd', city: 'Melrose Park', state: 'IL', zip: '60160', phone: '(708) 338-2110', fax: '(708) 338-2111', npi: '0010100030' },
  { id: 'ph30', name: 'Walgreens #8672', chain: 'Walgreens', address: '3651 N Harlem Ave', city: 'Elmwood Park', state: 'IL', zip: '60707', phone: '(708) 452-8840', fax: '(708) 452-8841', npi: '0010100031' },
  { id: 'ph31', name: 'Walgreens #7638', chain: 'Walgreens', address: '1350 E Belvidere Rd', city: 'Gurnee', state: 'IL', zip: '60031', phone: '(847) 249-5560', fax: '(847) 249-5561', npi: '0010100032' },
  { id: 'ph32', name: 'Walgreens #4310', chain: 'Walgreens', address: '1101 S Main St', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 622-8090', fax: '(847) 622-8091', npi: '0010100033' },
  { id: 'ph33', name: 'Walgreens #9152', chain: 'Walgreens', address: '701 N McLean Blvd', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 741-2311', fax: '(847) 741-2312', npi: '0010100034' },
  { id: 'ph34', name: 'Walgreens #6280', chain: 'Walgreens', address: '1301 E Dundee Rd', city: 'Palatine', state: 'IL', zip: '60074', phone: '(847) 358-0420', fax: '(847) 358-0421', npi: '0010100035' },
  { id: 'ph35', name: 'Walgreens #2914', chain: 'Walgreens', address: '155 S Arlington Heights Rd', city: 'Arlington Heights', state: 'IL', zip: '60005', phone: '(847) 253-4252', fax: '(847) 253-4253', npi: '0010100036' },
  { id: 'ph36', name: 'Walgreens #7063', chain: 'Walgreens', address: '1225 S Elmhurst Rd', city: 'Mount Prospect', state: 'IL', zip: '60056', phone: '(847) 228-2224', fax: '(847) 228-2225', npi: '0010100037' },
  { id: 'ph37', name: 'Walgreens #4720', chain: 'Walgreens', address: '701 S Waukegan Rd', city: 'Lake Forest', state: 'IL', zip: '60045', phone: '(847) 615-1690', fax: '(847) 615-1691', npi: '0010100038' },
  { id: 'ph38', name: 'Walgreens #5841', chain: 'Walgreens', address: '9101 Waukegan Rd', city: 'Morton Grove', state: 'IL', zip: '60053', phone: '(847) 583-1172', fax: '(847) 583-1173', npi: '0010100039' },
  { id: 'ph39', name: 'Walgreens #3298', chain: 'Walgreens', address: '4800 Golf Rd', city: 'Skokie', state: 'IL', zip: '60077', phone: '(847) 677-4120', fax: '(847) 677-4121', npi: '0010100040' },
  { id: 'ph40', name: 'Walgreens #6750', chain: 'Walgreens', address: '1 Elm Place', city: 'Winnetka', state: 'IL', zip: '60093', phone: '(847) 441-1140', fax: '(847) 441-1141', npi: '0010100041' },
  { id: 'ph41', name: 'Walgreens #4103', chain: 'Walgreens', address: '2001 Butterfield Rd', city: 'Downers Grove', state: 'IL', zip: '60515', phone: '(630) 963-0126', fax: '(630) 963-0127', npi: '0010100042' },
  { id: 'ph42', name: 'Walgreens #9034', chain: 'Walgreens', address: '550 N Lake St', city: 'Aurora', state: 'IL', zip: '60506', phone: '(630) 896-0220', fax: '(630) 896-0221', npi: '0010100043' },
  { id: 'ph43', name: 'Walgreens #7120', chain: 'Walgreens', address: '801 W Galena Blvd', city: 'Aurora', state: 'IL', zip: '60506', phone: '(630) 844-8420', fax: '(630) 844-8421', npi: '0010100044' },
  { id: 'ph44', name: 'Walgreens #5834', chain: 'Walgreens', address: '800 S Route 59', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 369-8870', fax: '(630) 369-8871', npi: '0010100045' },
  { id: 'ph45', name: 'Walgreens #4293', chain: 'Walgreens', address: '220 E Fullerton Ave', city: 'Carol Stream', state: 'IL', zip: '60188', phone: '(630) 682-9440', fax: '(630) 682-9441', npi: '0010100046' },
  { id: 'ph46', name: 'Walgreens #3127', chain: 'Walgreens', address: '2530 W Jefferson St', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-1044', fax: '(815) 744-1045', npi: '0010100047' },
  { id: 'ph47', name: 'Walgreens #8411', chain: 'Walgreens', address: '14001 S Harlem Ave', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 349-1110', fax: '(708) 349-1111', npi: '0010100048' },
  { id: 'ph48', name: 'Walgreens #6593', chain: 'Walgreens', address: '7201 W 159th St', city: 'Tinley Park', state: 'IL', zip: '60477', phone: '(708) 429-1522', fax: '(708) 429-1523', npi: '0010100049' },
  { id: 'ph49', name: 'Walgreens #5045', chain: 'Walgreens', address: '9417 S Western Ave', city: 'Evergreen Park', state: 'IL', zip: '60805', phone: '(708) 422-0340', fax: '(708) 422-0341', npi: '0010100050' },
  { id: 'ph50', name: 'Walgreens #8390', chain: 'Walgreens', address: '3400 W 115th St', city: 'Merrionette Park', state: 'IL', zip: '60803', phone: '(708) 385-7801', fax: '(708) 385-7802', npi: '0010100051' },
  { id: 'ph51', name: 'Walgreens #7204', chain: 'Walgreens', address: '16600 S Oak Park Ave', city: 'Tinley Park', state: 'IL', zip: '60477', phone: '(708) 532-3121', fax: '(708) 532-3122', npi: '0010100052' },
  { id: 'ph52', name: 'Walgreens #8456', chain: 'Walgreens', address: '2000 Wabash Ave', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 787-1330', fax: '(217) 787-1331', npi: '0010100053' },
  { id: 'ph53', name: 'Walgreens #11302', chain: 'Walgreens', address: '501 N State St', city: 'Springfield', state: 'IL', zip: '62702', phone: '(217) 544-2101', fax: '(217) 544-2102', npi: '0010100054' },
  { id: 'ph54', name: 'Walgreens #7205', chain: 'Walgreens', address: '2316 W Monroe St', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 546-8234', fax: '(217) 546-8235', npi: '0010100055' },
  { id: 'ph55', name: 'Walgreens #2873', chain: 'Walgreens', address: '2408 S 6th St', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 753-1082', fax: '(217) 753-1083', npi: '0010100056' },
  { id: 'ph56', name: 'Walgreens #4710', chain: 'Walgreens', address: '1320 E Empire St', city: 'Bloomington', state: 'IL', zip: '61701', phone: '(309) 662-0389', fax: '(309) 662-0390', npi: '0010100057' },
  { id: 'ph57', name: 'Walgreens #3841', chain: 'Walgreens', address: '1705 S Neil St', city: 'Champaign', state: 'IL', zip: '61820', phone: '(217) 359-8010', fax: '(217) 359-8011', npi: '0010100058' },
  { id: 'ph58', name: 'Walgreens #5290', chain: 'Walgreens', address: '2005 W Springfield Ave', city: 'Champaign', state: 'IL', zip: '61821', phone: '(217) 351-4210', fax: '(217) 351-4211', npi: '0010100059' },
  { id: 'ph59', name: 'Walgreens #12040', chain: 'Walgreens', address: '300 S Neil St', city: 'Champaign', state: 'IL', zip: '61820', phone: '(217) 359-2200', fax: '(217) 359-2201', npi: '0010100060' },
  { id: 'ph60', name: 'Walgreens #6318', chain: 'Walgreens', address: '7501 N University St', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 692-2148', fax: '(309) 692-2149', npi: '0010100061' },
  { id: 'ph61', name: 'Walgreens #5871', chain: 'Walgreens', address: '5001 N Knoxville Ave', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 689-5440', fax: '(309) 689-5441', npi: '0010100062' },
  { id: 'ph62', name: 'Walgreens #7403', chain: 'Walgreens', address: '2202 E Main St', city: 'Carbondale', state: 'IL', zip: '62901', phone: '(618) 457-0391', fax: '(618) 457-0392', npi: '0010100063' },
  { id: 'ph63', name: 'Walgreens #8864', chain: 'Walgreens', address: '3950 N Vermilion St', city: 'Danville', state: 'IL', zip: '61832', phone: '(217) 443-2620', fax: '(217) 443-2621', npi: '0010100064' },
  { id: 'ph64', name: 'Walgreens #4031', chain: 'Walgreens', address: '1000 E Court St', city: 'Kankakee', state: 'IL', zip: '60901', phone: '(815) 933-0491', fax: '(815) 933-0492', npi: '0010100065' },
  { id: 'ph65', name: 'Walgreens #6517', chain: 'Walgreens', address: '3120 Broadway Ave', city: 'Quincy', state: 'IL', zip: '62301', phone: '(217) 228-0440', fax: '(217) 228-0441', npi: '0010100066' },
  { id: 'ph66', name: 'Walgreens #9280', chain: 'Walgreens', address: '1501 W Wabash Ave', city: 'Effingham', state: 'IL', zip: '62401', phone: '(217) 342-6501', fax: '(217) 342-6502', npi: '0010100067' },
  { id: 'ph67', name: 'Walgreens #9342', chain: 'Walgreens', address: '1602 Wabash Ave', city: 'Decatur', state: 'IL', zip: '62526', phone: '(217) 875-0081', fax: '(217) 875-0082', npi: '0010100068' },
  { id: 'ph68', name: 'Walgreens #8721', chain: 'Walgreens', address: '920 E Sangamon Ave', city: 'Rantoul', state: 'IL', zip: '61866', phone: '(217) 893-0041', fax: '(217) 893-0042', npi: '0010100069' },
  { id: 'ph69', name: 'Walgreens #5103', chain: 'Walgreens', address: '1201 W Morton Ave', city: 'Jacksonville', state: 'IL', zip: '62650', phone: '(217) 245-2812', fax: '(217) 245-2813', npi: '0010100070' },
  { id: 'ph70', name: 'Walgreens #6841', chain: 'Walgreens', address: '1412 N Court St', city: 'Rockford', state: 'IL', zip: '61103', phone: '(815) 968-6110', fax: '(815) 968-6111', npi: '0010100071' },
  { id: 'ph71', name: 'Walgreens #7290', chain: 'Walgreens', address: '4202 E State St', city: 'Rockford', state: 'IL', zip: '61108', phone: '(815) 399-2301', fax: '(815) 399-2302', npi: '0010100072' },
  // Additional Illinois Walgreens locations
  { id: 'ph_w73', name: 'Walgreens #5201', chain: 'Walgreens', address: '1722 Central St', city: 'Evanston', state: 'IL', zip: '60201', phone: '(847) 864-1690', fax: '(847) 864-1691', npi: '1710900073' },
  { id: 'ph_w74', name: 'Walgreens #3847', chain: 'Walgreens', address: '1200 Chicago Ave', city: 'Evanston', state: 'IL', zip: '60202', phone: '(847) 864-5880', fax: '(847) 864-5881', npi: '1710900074' },
  { id: 'ph_w75', name: 'Walgreens #6430', chain: 'Walgreens', address: '810 Waukegan Rd', city: 'Wilmette', state: 'IL', zip: '60091', phone: '(847) 251-1620', fax: '(847) 251-1621', npi: '1710900075' },
  { id: 'ph_w76', name: 'Walgreens #4892', chain: 'Walgreens', address: '1455 Waukegan Rd', city: 'Highland Park', state: 'IL', zip: '60035', phone: '(847) 433-7630', fax: '(847) 433-7631', npi: '1710900076' },
  { id: 'ph_w77', name: 'Walgreens #7301', chain: 'Walgreens', address: '401 N Waukegan Rd', city: 'Lake Bluff', state: 'IL', zip: '60044', phone: '(847) 295-8040', fax: '(847) 295-8041', npi: '1710900077' },
  { id: 'ph_w78', name: 'Walgreens #5632', chain: 'Walgreens', address: '1275 E Touhy Ave', city: 'Des Plaines', state: 'IL', zip: '60018', phone: '(847) 297-0700', fax: '(847) 297-0701', npi: '1710900078' },
  { id: 'ph_w79', name: 'Walgreens #8241', chain: 'Walgreens', address: '1700 E Algonquin Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 397-1640', fax: '(847) 397-1641', npi: '1710900079' },
  { id: 'ph_w80', name: 'Walgreens #6103', chain: 'Walgreens', address: '700 W Golf Rd', city: 'Schaumburg', state: 'IL', zip: '60194', phone: '(847) 885-7820', fax: '(847) 885-7821', npi: '1710900080' },
  { id: 'ph_w81', name: 'Walgreens #9412', chain: 'Walgreens', address: '2370 W Higgins Rd', city: 'Hoffman Estates', state: 'IL', zip: '60169', phone: '(847) 519-0720', fax: '(847) 519-0721', npi: '1710900081' },
  { id: 'ph_w82', name: 'Walgreens #4531', chain: 'Walgreens', address: '1750 W Higgins Rd', city: 'Elk Grove Village', state: 'IL', zip: '60007', phone: '(847) 439-3050', fax: '(847) 439-3051', npi: '1710900082' },
  { id: 'ph_w83', name: 'Walgreens #7823', chain: 'Walgreens', address: '200 W Lake St', city: 'Bloomingdale', state: 'IL', zip: '60108', phone: '(630) 529-2540', fax: '(630) 529-2541', npi: '1710900083' },
  { id: 'ph_w84', name: 'Walgreens #3920', chain: 'Walgreens', address: '2100 W Army Trail Rd', city: 'Hanover Park', state: 'IL', zip: '60133', phone: '(630) 213-0260', fax: '(630) 213-0261', npi: '1710900084' },
  { id: 'ph_w85', name: 'Walgreens #6714', chain: 'Walgreens', address: '1502 W Lake St', city: 'Roselle', state: 'IL', zip: '60172', phone: '(630) 894-1010', fax: '(630) 894-1011', npi: '1710900085' },
  { id: 'ph_w86', name: 'Walgreens #5374', chain: 'Walgreens', address: '400 W Roosevelt Rd', city: 'Wheaton', state: 'IL', zip: '60187', phone: '(630) 260-0520', fax: '(630) 260-0521', npi: '1710900086' },
  { id: 'ph_w87', name: 'Walgreens #8901', chain: 'Walgreens', address: '1 S County Farm Rd', city: 'Wheaton', state: 'IL', zip: '60189', phone: '(630) 668-0050', fax: '(630) 668-0051', npi: '1710900087' },
  { id: 'ph_w88', name: 'Walgreens #4267', chain: 'Walgreens', address: '800 Roosevelt Rd', city: 'Glen Ellyn', state: 'IL', zip: '60137', phone: '(630) 942-0060', fax: '(630) 942-0061', npi: '1710900088' },
  { id: 'ph_w89', name: 'Walgreens #7140', chain: 'Walgreens', address: '1001 S Finley Rd', city: 'Lombard', state: 'IL', zip: '60148', phone: '(630) 627-0500', fax: '(630) 627-0501', npi: '1710900089' },
  { id: 'ph_w90', name: 'Walgreens #5823', chain: 'Walgreens', address: '301 W Lake St', city: 'Elmhurst', state: 'IL', zip: '60126', phone: '(630) 279-3880', fax: '(630) 279-3881', npi: '1710900090' },
  { id: 'ph_w91', name: 'Walgreens #3651', chain: 'Walgreens', address: '1203 S Villa Ave', city: 'Villa Park', state: 'IL', zip: '60181', phone: '(630) 279-1750', fax: '(630) 279-1751', npi: '1710900091' },
  { id: 'ph_w92', name: 'Walgreens #6490', chain: 'Walgreens', address: '6801 Cass Ave', city: 'Westmont', state: 'IL', zip: '60559', phone: '(630) 960-0260', fax: '(630) 960-0261', npi: '1710900092' },
  { id: 'ph_w93', name: 'Walgreens #8310', chain: 'Walgreens', address: '4800 Lincoln Ave', city: 'Lisle', state: 'IL', zip: '60532', phone: '(630) 505-0380', fax: '(630) 505-0381', npi: '1710900093' },
  { id: 'ph_w94', name: 'Walgreens #5091', chain: 'Walgreens', address: '2610 Ogden Ave', city: 'Lisle', state: 'IL', zip: '60532', phone: '(630) 971-0540', fax: '(630) 971-0541', npi: '1710900094' },
  { id: 'ph_w95', name: 'Walgreens #7632', chain: 'Walgreens', address: '1201 E Main St', city: 'St. Charles', state: 'IL', zip: '60174', phone: '(630) 584-2120', fax: '(630) 584-2121', npi: '1710900095' },
  { id: 'ph_w96', name: 'Walgreens #4830', chain: 'Walgreens', address: '1100 S Randall Rd', city: 'Geneva', state: 'IL', zip: '60134', phone: '(630) 262-0440', fax: '(630) 262-0441', npi: '1710900096' },
  { id: 'ph_w97', name: 'Walgreens #6201', chain: 'Walgreens', address: '222 N Randall Rd', city: 'Batavia', state: 'IL', zip: '60510', phone: '(630) 406-0190', fax: '(630) 406-0191', npi: '1710900097' },
  { id: 'ph_w98', name: 'Walgreens #9043', chain: 'Walgreens', address: '840 N Milwaukee Ave', city: 'Buffalo Grove', state: 'IL', zip: '60089', phone: '(847) 634-2130', fax: '(847) 634-2131', npi: '1710900098' },
  { id: 'ph_w99', name: 'Walgreens #5714', chain: 'Walgreens', address: '100 S Buffalo Grove Rd', city: 'Buffalo Grove', state: 'IL', zip: '60089', phone: '(847) 520-1040', fax: '(847) 520-1041', npi: '1710900099' },
  { id: 'ph_w100', name: 'Walgreens #7891', chain: 'Walgreens', address: '2020 N Rand Rd', city: 'Wheeling', state: 'IL', zip: '60090', phone: '(847) 459-2180', fax: '(847) 459-2181', npi: '1710900100' },
  { id: 'ph_w101', name: 'Walgreens #4203', chain: 'Walgreens', address: '680 N Milwaukee Ave', city: 'Vernon Hills', state: 'IL', zip: '60061', phone: '(847) 680-1100', fax: '(847) 680-1101', npi: '1710900101' },
  { id: 'ph_w102', name: 'Walgreens #6531', chain: 'Walgreens', address: '1205 N Milwaukee Ave', city: 'Mundelein', state: 'IL', zip: '60060', phone: '(847) 970-0340', fax: '(847) 970-0341', npi: '1710900102' },
  { id: 'ph_w103', name: 'Walgreens #8712', chain: 'Walgreens', address: '820 W Grand Ave', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 623-1050', fax: '(847) 623-1051', npi: '1710900103' },
  { id: 'ph_w104', name: 'Walgreens #5390', chain: 'Walgreens', address: '3401 Belvidere Rd', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 623-4820', fax: '(847) 623-4821', npi: '1710900104' },
  { id: 'ph_w105', name: 'Walgreens #7024', chain: 'Walgreens', address: '2820 W Washington St', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 360-0260', fax: '(847) 360-0261', npi: '1710900105' },
  { id: 'ph_w106', name: 'Walgreens #3812', chain: 'Walgreens', address: '1900 S Lewis Ave', city: 'Zion', state: 'IL', zip: '60099', phone: '(847) 731-0780', fax: '(847) 731-0781', npi: '1710900106' },
  { id: 'ph_w107', name: 'Walgreens #6940', chain: 'Walgreens', address: '600 S Greenleaf St', city: 'Gurnee', state: 'IL', zip: '60031', phone: '(847) 856-0340', fax: '(847) 856-0341', npi: '1710900107' },
  { id: 'ph_w108', name: 'Walgreens #4721', chain: 'Walgreens', address: '9400 S Cicero Ave', city: 'Oak Lawn', state: 'IL', zip: '60453', phone: '(708) 425-8900', fax: '(708) 425-8901', npi: '1710900108' },
  { id: 'ph_w109', name: 'Walgreens #8103', chain: 'Walgreens', address: '5901 W 95th St', city: 'Oak Lawn', state: 'IL', zip: '60453', phone: '(708) 424-4100', fax: '(708) 424-4101', npi: '1710900109' },
  { id: 'ph_w110', name: 'Walgreens #5634', chain: 'Walgreens', address: '7350 W 87th St', city: 'Bridgeview', state: 'IL', zip: '60455', phone: '(708) 598-0540', fax: '(708) 598-0541', npi: '1710900110' },
  { id: 'ph_w111', name: 'Walgreens #9201', chain: 'Walgreens', address: '10800 S Roberts Rd', city: 'Palos Hills', state: 'IL', zip: '60465', phone: '(708) 974-5050', fax: '(708) 974-5051', npi: '1710900111' },
  { id: 'ph_w112', name: 'Walgreens #7430', chain: 'Walgreens', address: '2501 W 183rd St', city: 'Homewood', state: 'IL', zip: '60430', phone: '(708) 798-2420', fax: '(708) 798-2421', npi: '1710900112' },
  { id: 'ph_w113', name: 'Walgreens #4981', chain: 'Walgreens', address: '20201 S LaGrange Rd', city: 'Frankfort', state: 'IL', zip: '60423', phone: '(815) 469-9220', fax: '(815) 469-9221', npi: '1710900113' },
  { id: 'ph_w114', name: 'Walgreens #6320', chain: 'Walgreens', address: '12345 S Harlem Ave', city: 'Palos Park', state: 'IL', zip: '60464', phone: '(708) 361-1020', fax: '(708) 361-1021', npi: '1710900114' },
  { id: 'ph_w115', name: 'Walgreens #8531', chain: 'Walgreens', address: '4800 W 167th St', city: 'Markham', state: 'IL', zip: '60428', phone: '(708) 596-1440', fax: '(708) 596-1441', npi: '1710900115' },
  { id: 'ph_w116', name: 'Walgreens #5103', chain: 'Walgreens', address: '21205 S Governors Hwy', city: 'Matteson', state: 'IL', zip: '60443', phone: '(708) 748-3850', fax: '(708) 748-3851', npi: '1710900116' },
  { id: 'ph_w117', name: 'Walgreens #7812', chain: 'Walgreens', address: '18505 S Halsted St', city: 'Glenwood', state: 'IL', zip: '60425', phone: '(708) 758-1740', fax: '(708) 758-1741', npi: '1710900117' },
  { id: 'ph_w118', name: 'Walgreens #3940', chain: 'Walgreens', address: '155 W Joe Orr Rd', city: 'Chicago Heights', state: 'IL', zip: '60411', phone: '(708) 756-4200', fax: '(708) 756-4201', npi: '1710900118' },
  { id: 'ph_w119', name: 'Walgreens #6280', chain: 'Walgreens', address: '2400 Vollmer Rd', city: 'Olympia Fields', state: 'IL', zip: '60461', phone: '(708) 503-9880', fax: '(708) 503-9881', npi: '1710900119' },
  { id: 'ph_w120', name: 'Walgreens #4603', chain: 'Walgreens', address: '240 W North Ave', city: 'Melrose Park', state: 'IL', zip: '60160', phone: '(708) 343-3890', fax: '(708) 343-3891', npi: '1710900120' },
  { id: 'ph_w121', name: 'Walgreens #9023', chain: 'Walgreens', address: '1100 Harlem Ave', city: 'Berwyn', state: 'IL', zip: '60402', phone: '(708) 795-0080', fax: '(708) 795-0081', npi: '1710900121' },
  { id: 'ph_w122', name: 'Walgreens #5841', chain: 'Walgreens', address: '6736 W Cermak Rd', city: 'Berwyn', state: 'IL', zip: '60402', phone: '(708) 749-3720', fax: '(708) 749-3721', npi: '1710900122' },
  { id: 'ph_w123', name: 'Walgreens #7201', chain: 'Walgreens', address: '1234 S Oak Park Ave', city: 'Oak Park', state: 'IL', zip: '60304', phone: '(708) 445-1020', fax: '(708) 445-1021', npi: '1710900123' },
  { id: 'ph_w124', name: 'Walgreens #4130', chain: 'Walgreens', address: '714 Lake St', city: 'Oak Park', state: 'IL', zip: '60301', phone: '(708) 386-8040', fax: '(708) 386-8041', npi: '1710900124' },
  { id: 'ph_w125', name: 'Walgreens #8490', chain: 'Walgreens', address: '5800 W Cermak Rd', city: 'Cicero', state: 'IL', zip: '60804', phone: '(708) 656-1060', fax: '(708) 656-1061', npi: '1710900125' },
  { id: 'ph_w126', name: 'Walgreens #6731', chain: 'Walgreens', address: '2202 S Cicero Ave', city: 'Cicero', state: 'IL', zip: '60804', phone: '(708) 652-0640', fax: '(708) 652-0641', npi: '1710900126' },
  { id: 'ph_w127', name: 'Walgreens #5014', chain: 'Walgreens', address: '1350 S Bolingbrook Dr', city: 'Bolingbrook', state: 'IL', zip: '60490', phone: '(630) 226-9510', fax: '(630) 226-9511', npi: '1710900127' },
  { id: 'ph_w128', name: 'Walgreens #7392', chain: 'Walgreens', address: '475 E Boughton Rd', city: 'Bolingbrook', state: 'IL', zip: '60440', phone: '(630) 378-0500', fax: '(630) 378-0501', npi: '1710900128' },
  { id: 'ph_w129', name: 'Walgreens #8631', chain: 'Walgreens', address: '401 S Weber Rd', city: 'Romeoville', state: 'IL', zip: '60446', phone: '(815) 886-0540', fax: '(815) 886-0541', npi: '1710900129' },
  { id: 'ph_w130', name: 'Walgreens #4890', chain: 'Walgreens', address: '1755 N Larkin Ave', city: 'Crest Hill', state: 'IL', zip: '60403', phone: '(815) 744-9310', fax: '(815) 744-9311', npi: '1710900130' },
  { id: 'ph_w131', name: 'Walgreens #6201', chain: 'Walgreens', address: '3240 W Jefferson St', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-4030', fax: '(815) 744-4031', npi: '1710900131' },
  { id: 'ph_w132', name: 'Walgreens #9340', chain: 'Walgreens', address: '2815 Black Rd', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 267-0700', fax: '(815) 267-0701', npi: '1710900132' },
  { id: 'ph_w133', name: 'Walgreens #7510', chain: 'Walgreens', address: '1527 N Rock Run Dr', city: 'Joliet', state: 'IL', zip: '60432', phone: '(815) 436-2490', fax: '(815) 436-2491', npi: '1710900133' },
  { id: 'ph_w134', name: 'Walgreens #5203', chain: 'Walgreens', address: '14840 S Route 59', city: 'Plainfield', state: 'IL', zip: '60544', phone: '(815) 254-4400', fax: '(815) 254-4401', npi: '1710900134' },
  { id: 'ph_w135', name: 'Walgreens #8012', chain: 'Walgreens', address: '2520 W Lockport St', city: 'Plainfield', state: 'IL', zip: '60544', phone: '(815) 436-0780', fax: '(815) 436-0781', npi: '1710900135' },
  { id: 'ph_w136', name: 'Walgreens #6430', chain: 'Walgreens', address: '1635 N Naper Blvd', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 955-9010', fax: '(630) 955-9011', npi: '1710900136' },
  { id: 'ph_w137', name: 'Walgreens #4721', chain: 'Walgreens', address: '3003 W Ogden Ave', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 420-1480', fax: '(630) 420-1481', npi: '1710900137' },
  { id: 'ph_w138', name: 'Walgreens #9801', chain: 'Walgreens', address: '1255 E Ogden Ave', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 778-2660', fax: '(630) 778-2661', npi: '1710900138' },
  { id: 'ph_w139', name: 'Walgreens #5630', chain: 'Walgreens', address: '1900 75th St', city: 'Woodridge', state: 'IL', zip: '60517', phone: '(630) 985-3040', fax: '(630) 985-3041', npi: '1710900139' },
  { id: 'ph_w140', name: 'Walgreens #7230', chain: 'Walgreens', address: '6201 S Cass Ave', city: 'Westmont', state: 'IL', zip: '60559', phone: '(630) 852-1500', fax: '(630) 852-1501', npi: '1710900140' },
  { id: 'ph_w141', name: 'Walgreens #4012', chain: 'Walgreens', address: '7320 W 191st St', city: 'Mokena', state: 'IL', zip: '60448', phone: '(708) 478-4410', fax: '(708) 478-4411', npi: '1710900141' },
  { id: 'ph_w142', name: 'Walgreens #8630', chain: 'Walgreens', address: '511 W Lincoln Hwy', city: 'New Lenox', state: 'IL', zip: '60451', phone: '(815) 485-1860', fax: '(815) 485-1861', npi: '1710900142' },
  { id: 'ph_w143', name: 'Walgreens #6102', chain: 'Walgreens', address: '14900 S Harlem Ave', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 349-7500', fax: '(708) 349-7501', npi: '1710900143' },
  { id: 'ph_w144', name: 'Walgreens #5391', chain: 'Walgreens', address: '1235 Riverside Dr', city: 'Loves Park', state: 'IL', zip: '61111', phone: '(815) 654-0490', fax: '(815) 654-0491', npi: '1710900144' },
  { id: 'ph_w145', name: 'Walgreens #7831', chain: 'Walgreens', address: '9050 N Second St', city: 'Machesney Park', state: 'IL', zip: '61115', phone: '(815) 633-1690', fax: '(815) 633-1691', npi: '1710900145' },
  { id: 'ph_w146', name: 'Walgreens #4203', chain: 'Walgreens', address: '4901 E State St', city: 'Rockford', state: 'IL', zip: '61108', phone: '(815) 226-9430', fax: '(815) 226-9431', npi: '1710900146' },
  { id: 'ph_w147', name: 'Walgreens #8920', chain: 'Walgreens', address: '5680 N Perryville Rd', city: 'Rockford', state: 'IL', zip: '61107', phone: '(815) 316-0320', fax: '(815) 316-0321', npi: '1710900147' },
  { id: 'ph_w148', name: 'Walgreens #6311', chain: 'Walgreens', address: '1020 S Main St', city: 'Galesburg', state: 'IL', zip: '61401', phone: '(309) 344-2141', fax: '(309) 344-2142', npi: '1710900148' },
  { id: 'ph_w149', name: 'Walgreens #5094', chain: 'Walgreens', address: '1801 Eastland Dr', city: 'Bloomington', state: 'IL', zip: '61704', phone: '(309) 664-4490', fax: '(309) 664-4491', npi: '1710900149' },
  { id: 'ph_w150', name: 'Walgreens #7401', chain: 'Walgreens', address: '801 N Main St', city: 'Normal', state: 'IL', zip: '61761', phone: '(309) 452-3460', fax: '(309) 452-3461', npi: '1710900150' },
  { id: 'ph_w151', name: 'Walgreens #9012', chain: 'Walgreens', address: '620 N Veterans Pkwy', city: 'Normal', state: 'IL', zip: '61761', phone: '(309) 454-8240', fax: '(309) 454-8241', npi: '1710900151' },
  { id: 'ph_w152', name: 'Walgreens #4831', chain: 'Walgreens', address: '301 W War Memorial Dr', city: 'Peoria', state: 'IL', zip: '61615', phone: '(309) 693-4020', fax: '(309) 693-4021', npi: '1710900152' },
  { id: 'ph_w153', name: 'Walgreens #6590', chain: 'Walgreens', address: '4316 N Brandywine Dr', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 682-3870', fax: '(309) 682-3871', npi: '1710900153' },
  { id: 'ph_w154', name: 'Walgreens #8201', chain: 'Walgreens', address: '3901 Court St', city: 'Pekin', state: 'IL', zip: '61554', phone: '(309) 347-8810', fax: '(309) 347-8811', npi: '1710900154' },
  { id: 'ph_w155', name: 'Walgreens #5720', chain: 'Walgreens', address: '100 N Broadway', city: 'Macomb', state: 'IL', zip: '61455', phone: '(309) 836-1560', fax: '(309) 836-1561', npi: '1710900155' },
  { id: 'ph_w156', name: 'Walgreens #7043', chain: 'Walgreens', address: '1715 N Henderson St', city: 'Galesburg', state: 'IL', zip: '61401', phone: '(309) 343-5410', fax: '(309) 343-5411', npi: '1710900156' },
  { id: 'ph_w157', name: 'Walgreens #4512', chain: 'Walgreens', address: '2701 4th Ave', city: 'Rock Island', state: 'IL', zip: '61201', phone: '(309) 793-0370', fax: '(309) 793-0371', npi: '1710900157' },
  { id: 'ph_w158', name: 'Walgreens #8831', chain: 'Walgreens', address: '1600 41st St', city: 'Moline', state: 'IL', zip: '61265', phone: '(309) 764-1440', fax: '(309) 764-1441', npi: '1710900158' },
  { id: 'ph_w159', name: 'Walgreens #6103', chain: 'Walgreens', address: '4301 Avenue of the Cities', city: 'Moline', state: 'IL', zip: '61265', phone: '(309) 736-0510', fax: '(309) 736-0511', npi: '1710900159' },
  { id: 'ph_w160', name: 'Walgreens #9231', chain: 'Walgreens', address: '7 Ludwig Dr', city: 'Fairview Heights', state: 'IL', zip: '62208', phone: '(618) 398-7890', fax: '(618) 398-7891', npi: '1710900160' },
  { id: 'ph_w161', name: 'Walgreens #5830', chain: 'Walgreens', address: '420 S Illinois St', city: 'Belleville', state: 'IL', zip: '62220', phone: '(618) 235-8710', fax: '(618) 235-8711', npi: '1710900161' },
  { id: 'ph_w162', name: 'Walgreens #7401', chain: 'Walgreens', address: '1000 W Highway 50', city: 'O\'Fallon', state: 'IL', zip: '62269', phone: '(618) 624-5060', fax: '(618) 624-5061', npi: '1710900162' },
  { id: 'ph_w163', name: 'Walgreens #4920', chain: 'Walgreens', address: '6501 Center Grove Rd', city: 'Edwardsville', state: 'IL', zip: '62025', phone: '(618) 659-0990', fax: '(618) 659-0991', npi: '1710900163' },
  { id: 'ph_w164', name: 'Walgreens #8612', chain: 'Walgreens', address: '1800 Homer Adams Pkwy', city: 'Alton', state: 'IL', zip: '62002', phone: '(618) 462-1870', fax: '(618) 462-1871', npi: '1710900164' },
  { id: 'ph_w165', name: 'Walgreens #6350', chain: 'Walgreens', address: '3400 Nameoki Rd', city: 'Granite City', state: 'IL', zip: '62040', phone: '(618) 876-0540', fax: '(618) 876-0541', npi: '1710900165' },
  { id: 'ph_w166', name: 'Walgreens #5031', chain: 'Walgreens', address: '4 Collinsville Crossing', city: 'Collinsville', state: 'IL', zip: '62234', phone: '(618) 345-7760', fax: '(618) 345-7761', npi: '1710900166' },
  { id: 'ph_w167', name: 'Walgreens #9401', chain: 'Walgreens', address: '4101 N Illinois St', city: 'Swansea', state: 'IL', zip: '62226', phone: '(618) 277-0430', fax: '(618) 277-0431', npi: '1710900167' },
  { id: 'ph_w168', name: 'Walgreens #7210', chain: 'Walgreens', address: '1501 E Main St', city: 'Marion', state: 'IL', zip: '62959', phone: '(618) 993-5850', fax: '(618) 993-5851', npi: '1710900168' },
  { id: 'ph_w169', name: 'Walgreens #4831', chain: 'Walgreens', address: '4206 Broadway', city: 'Mt. Vernon', state: 'IL', zip: '62864', phone: '(618) 244-4050', fax: '(618) 244-4051', npi: '1710900169' },
  { id: 'ph_w170', name: 'Walgreens #6920', chain: 'Walgreens', address: '1101 E Main St', city: 'Carbondale', state: 'IL', zip: '62901', phone: '(618) 549-1440', fax: '(618) 549-1441', npi: '1710900170' },
  { id: 'ph_w171', name: 'Walgreens #8340', chain: 'Walgreens', address: '900 N Ottawa St', city: 'Ottawa', state: 'IL', zip: '61350', phone: '(815) 433-0781', fax: '(815) 433-0782', npi: '1710900171' },
  { id: 'ph_w172', name: 'Walgreens #5612', chain: 'Walgreens', address: '2490 N State Route 251', city: 'Peru', state: 'IL', zip: '61354', phone: '(815) 220-1640', fax: '(815) 220-1641', npi: '1710900172' },
  { id: 'ph_w173', name: 'Walgreens #7903', chain: 'Walgreens', address: '1300 W Jefferson St', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-7030', fax: '(815) 744-7031', npi: '1710900173' },
  { id: 'ph_w174', name: 'Walgreens #4501', chain: 'Walgreens', address: '1400 W Lincoln Hwy', city: 'DeKalb', state: 'IL', zip: '60115', phone: '(815) 748-0440', fax: '(815) 748-0441', npi: '1710900174' },
  { id: 'ph_w175', name: 'Walgreens #8102', chain: 'Walgreens', address: '2500 Sycamore Rd', city: 'DeKalb', state: 'IL', zip: '60115', phone: '(815) 758-2990', fax: '(815) 758-2991', npi: '1710900175' },
  // ── Walgreens — Huntley, IL ────────────────────────────────────────────────
  { id: 'ph_w176', name: 'Walgreens #11865', chain: 'Walgreens', address: '11120 Haligus Rd', city: 'Huntley', state: 'IL', zip: '60142', phone: '(847) 515-0244', fax: '(847) 515-0245', npi: '1710900176' },
  { id: 'ph_w177', name: 'Walgreens #5923', chain: 'Walgreens', address: '13004 IL Route 47', city: 'Huntley', state: 'IL', zip: '60142', phone: '(847) 515-8810', fax: '(847) 515-8811', npi: '1710900177' },
  // ── Walgreens — nearby Huntley area (Algonquin, Lake in the Hills, Carpentersville) ──
  { id: 'ph_w178', name: 'Walgreens #9240', chain: 'Walgreens', address: '1400 S Randall Rd', city: 'Algonquin', state: 'IL', zip: '60102', phone: '(847) 854-1020', fax: '(847) 854-1021', npi: '1710900178' },
  { id: 'ph_w179', name: 'Walgreens #7614', chain: 'Walgreens', address: '300 S Randall Rd', city: 'Lake in the Hills', state: 'IL', zip: '60156', phone: '(847) 658-0340', fax: '(847) 658-0341', npi: '1710900179' },
  { id: 'ph_w180', name: 'Walgreens #8831', chain: 'Walgreens', address: '1430 Huntley Rd', city: 'Carpentersville', state: 'IL', zip: '60110', phone: '(847) 428-0562', fax: '(847) 428-0563', npi: '1710900180' },, chain: 'CVS', address: '205 W Randolph St', city: 'Chicago', state: 'IL', zip: '60606', phone: '(312) 782-8820', fax: '(312) 782-8821', npi: '0010200073' },
  { id: 'ph73', name: 'CVS Pharmacy #8205', chain: 'CVS', address: '600 W Diversey Pkwy', city: 'Chicago', state: 'IL', zip: '60614', phone: '(773) 525-2500', fax: '(773) 525-2501', npi: '0010200074' },
  { id: 'ph74', name: 'CVS Pharmacy #8671', chain: 'CVS', address: '4051 N Broadway', city: 'Chicago', state: 'IL', zip: '60613', phone: '(773) 477-2350', fax: '(773) 477-2351', npi: '0010200075' },
  { id: 'ph75', name: 'CVS Pharmacy #8310', chain: 'CVS', address: '6150 N Lincoln Ave', city: 'Chicago', state: 'IL', zip: '60659', phone: '(773) 267-1210', fax: '(773) 267-1211', npi: '0010200076' },
  { id: 'ph76', name: 'CVS Pharmacy #8530', chain: 'CVS', address: '3033 N Halsted St', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 935-3011', fax: '(773) 935-3012', npi: '0010200077' },
  { id: 'ph77', name: 'CVS Pharmacy #7831', chain: 'CVS', address: '1200 N Dearborn St', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 337-4910', fax: '(312) 337-4911', npi: '0010200078' },
  { id: 'ph78', name: 'CVS Pharmacy #7512', chain: 'CVS', address: '4201 W Madison St', city: 'Chicago', state: 'IL', zip: '60624', phone: '(773) 826-1020', fax: '(773) 826-1021', npi: '0010200079' },
  { id: 'ph79', name: 'CVS Pharmacy #9043', chain: 'CVS', address: '2345 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60616', phone: '(312) 842-4010', fax: '(312) 842-4011', npi: '0010200080' },
  { id: 'ph80', name: 'CVS Pharmacy #6820', chain: 'CVS', address: '5400 N Sheridan Rd', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 275-8810', fax: '(773) 275-8811', npi: '0010200081' },
  { id: 'ph81', name: 'CVS Pharmacy #9318', chain: 'CVS', address: '7001 S Stony Island Ave', city: 'Chicago', state: 'IL', zip: '60649', phone: '(773) 947-1244', fax: '(773) 947-1245', npi: '0010200082' },
  { id: 'ph82', name: 'CVS Pharmacy #7204', chain: 'CVS', address: '420 E 87th St', city: 'Chicago', state: 'IL', zip: '60619', phone: '(773) 723-0801', fax: '(773) 723-0802', npi: '0010200083' },
  { id: 'ph83', name: 'CVS Pharmacy #8563', chain: 'CVS', address: '5901 N Clark St', city: 'Chicago', state: 'IL', zip: '60660', phone: '(773) 561-0020', fax: '(773) 561-0021', npi: '0010200084' },
  { id: 'ph84', name: 'CVS Pharmacy #7845', chain: 'CVS', address: '2800 N Lincoln Ave', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 472-8230', fax: '(773) 472-8231', npi: '0010200085' },
  { id: 'ph85', name: 'CVS Pharmacy #6912', chain: 'CVS', address: '33 S State St', city: 'Chicago', state: 'IL', zip: '60603', phone: '(312) 781-8300', fax: '(312) 781-8301', npi: '0010200086' },
  { id: 'ph86', name: 'CVS Pharmacy #9154', chain: 'CVS', address: '6401 N Central Ave', city: 'Chicago', state: 'IL', zip: '60646', phone: '(773) 763-6911', fax: '(773) 763-6912', npi: '0010200087' },
  { id: 'ph87', name: 'CVS Pharmacy #8037', chain: 'CVS', address: '3131 N Clybourn Ave', city: 'Chicago', state: 'IL', zip: '60618', phone: '(773) 549-8210', fax: '(773) 549-8211', npi: '0010200088' },
  { id: 'ph88', name: 'CVS Pharmacy #7623', chain: 'CVS', address: '4630 N Sheridan Rd', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 271-1055', fax: '(773) 271-1056', npi: '0010200089' },
  { id: 'ph89', name: 'CVS Pharmacy #8934', chain: 'CVS', address: '8201 S Western Ave', city: 'Chicago', state: 'IL', zip: '60620', phone: '(773) 434-0201', fax: '(773) 434-0202', npi: '0010200090' },
  { id: 'ph90', name: 'CVS Pharmacy #6754', chain: 'CVS', address: '1041 W Madison St', city: 'Chicago', state: 'IL', zip: '60607', phone: '(312) 421-6221', fax: '(312) 421-6222', npi: '0010200091' },
  { id: 'ph91', name: 'CVS Pharmacy #9512', chain: 'CVS', address: '1360 N Sandburg Ter', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 642-0841', fax: '(312) 642-0842', npi: '0010200092' },
  { id: 'ph92', name: 'CVS Pharmacy #8103', chain: 'CVS', address: '11250 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60628', phone: '(773) 785-1011', fax: '(773) 785-1012', npi: '0010200093' },
  { id: 'ph93', name: 'CVS Pharmacy #7452', chain: 'CVS', address: '2159 N Clybourn Ave', city: 'Chicago', state: 'IL', zip: '60614', phone: '(773) 348-0040', fax: '(773) 348-0041', npi: '0010200094' },
  { id: 'ph94', name: 'CVS Pharmacy #9241', chain: 'CVS', address: '1101 W Chicago Ave', city: 'Chicago', state: 'IL', zip: '60642', phone: '(312) 491-6201', fax: '(312) 491-6202', npi: '0010200095' },
  { id: 'ph95', name: 'CVS Pharmacy #8919', chain: 'CVS', address: '7520 W North Ave', city: 'Elmwood Park', state: 'IL', zip: '60707', phone: '(708) 453-4410', fax: '(708) 453-4411', npi: '0010200096' },
  { id: 'ph96', name: 'CVS Pharmacy #8271', chain: 'CVS', address: '1700 E Golf Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 517-3880', fax: '(847) 517-3881', npi: '0010200097' },
  { id: 'ph97', name: 'CVS Pharmacy #7934', chain: 'CVS', address: '2780 Mannheim Rd', city: 'Des Plaines', state: 'IL', zip: '60018', phone: '(847) 296-9840', fax: '(847) 296-9841', npi: '0010200098' },
  { id: 'ph98', name: 'CVS Pharmacy #9034', chain: 'CVS', address: '4910 Oakton St', city: 'Skokie', state: 'IL', zip: '60077', phone: '(847) 673-4340', fax: '(847) 673-4341', npi: '0010200099' },
  { id: 'ph99', name: 'CVS Pharmacy #8410', chain: 'CVS', address: '1290 Waukegan Rd', city: 'Northbrook', state: 'IL', zip: '60062', phone: '(847) 272-5910', fax: '(847) 272-5911', npi: '0010200100' },
  { id: 'ph100', name: 'CVS Pharmacy #7182', chain: 'CVS', address: '200 S Weber Rd', city: 'Bolingbrook', state: 'IL', zip: '60490', phone: '(630) 759-1320', fax: '(630) 759-1321', npi: '0010200101' },
  { id: 'ph101', name: 'CVS Pharmacy #9631', chain: 'CVS', address: '8660 W 159th St', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 403-2040', fax: '(708) 403-2041', npi: '0010200102' },
  { id: 'ph102', name: 'CVS Pharmacy #8702', chain: 'CVS', address: '1165 Ogden Ave', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 961-4012', fax: '(630) 961-4013', npi: '0010200103' },
  { id: 'ph103', name: 'CVS Pharmacy #8145', chain: 'CVS', address: '4809 Cal Sag Rd', city: 'Crestwood', state: 'IL', zip: '60418', phone: '(708) 385-7700', fax: '(708) 385-7701', npi: '0010200104' },
  { id: 'ph104', name: 'CVS Pharmacy #6831', chain: 'CVS', address: '901 Waukegan Rd', city: 'Glenview', state: 'IL', zip: '60025', phone: '(847) 998-2101', fax: '(847) 998-2102', npi: '0010200105' },
  { id: 'ph105', name: 'CVS Pharmacy #7520', chain: 'CVS', address: '730 Dundee Rd', city: 'Northbrook', state: 'IL', zip: '60062', phone: '(847) 564-0041', fax: '(847) 564-0042', npi: '0010200106' },
  { id: 'ph106', name: 'CVS Pharmacy #8913', chain: 'CVS', address: '1600 N Rand Rd', city: 'Palatine', state: 'IL', zip: '60074', phone: '(847) 397-9010', fax: '(847) 397-9011', npi: '0010200107' },
  { id: 'ph107', name: 'CVS Pharmacy #7210', chain: 'CVS', address: '500 E Rand Rd', city: 'Arlington Heights', state: 'IL', zip: '60004', phone: '(847) 392-3850', fax: '(847) 392-3851', npi: '0010200108' },
  { id: 'ph108', name: 'CVS Pharmacy #7513', chain: 'CVS', address: '2415 N University St', city: 'Peoria', state: 'IL', zip: '61604', phone: '(309) 688-0101', fax: '(309) 688-0102', npi: '0010200109' },
  { id: 'ph109', name: 'CVS Pharmacy #8043', chain: 'CVS', address: '1515 E State St', city: 'Rockford', state: 'IL', zip: '61104', phone: '(815) 399-5010', fax: '(815) 399-5011', npi: '0010200110' },
  { id: 'ph110', name: 'CVS Pharmacy #8821', chain: 'CVS', address: '3101 Montvale Dr', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 698-2250', fax: '(217) 698-2251', npi: '0010200111' },
  { id: 'ph111', name: 'CVS Pharmacy #8054', chain: 'CVS', address: '2108 N Veterans Pkwy', city: 'Bloomington', state: 'IL', zip: '61704', phone: '(309) 662-4730', fax: '(309) 662-4731', npi: '0010200112' },
  { id: 'ph112', name: 'CVS Pharmacy #9214', chain: 'CVS', address: '1515 W Springfield Ave', city: 'Champaign', state: 'IL', zip: '61821', phone: '(217) 355-9410', fax: '(217) 355-9411', npi: '0010200113' },
  { id: 'ph113', name: 'CVS Pharmacy #8721', chain: 'CVS', address: '3221 S 6th St', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 529-1400', fax: '(217) 529-1401', npi: '0010200114' },
  { id: 'ph114', name: 'CVS Pharmacy #7831b', chain: 'CVS', address: '840 W 75th St', city: 'Naperville', state: 'IL', zip: '60565', phone: '(630) 548-0031', fax: '(630) 548-0032', npi: '0010200115' },
  { id: 'ph115', name: 'CVS Pharmacy #8413', chain: 'CVS', address: '21 E North Ave', city: 'Villa Park', state: 'IL', zip: '60181', phone: '(630) 832-0040', fax: '(630) 832-0041', npi: '0010200116' },
  { id: 'ph116', name: 'Jewel-Osco Pharmacy #3042', chain: 'Jewel-Osco', address: '1224 S Wabash Ave', city: 'Chicago', state: 'IL', zip: '60605', phone: '(312) 663-0974', fax: '(312) 663-0975', npi: '0010300117' },
  { id: 'ph117', name: 'Jewel-Osco Pharmacy #3156', chain: 'Jewel-Osco', address: '550 N State St', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 923-0285', fax: '(312) 923-0286', npi: '0010300118' },
  { id: 'ph118', name: 'Jewel-Osco Pharmacy #3310', chain: 'Jewel-Osco', address: '4660 N Broadway', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 275-3820', fax: '(773) 275-3821', npi: '0010300119' },
  { id: 'ph119', name: 'Jewel-Osco Pharmacy #3125', chain: 'Jewel-Osco', address: '1340 S Canal St', city: 'Chicago', state: 'IL', zip: '60607', phone: '(312) 563-1481', fax: '(312) 563-1482', npi: '0010300120' },
  { id: 'ph120', name: 'Jewel-Osco Pharmacy #3480', chain: 'Jewel-Osco', address: '3531 N Broadway', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 348-1012', fax: '(773) 348-1013', npi: '0010300121' },
  { id: 'ph121', name: 'Jewel-Osco Pharmacy #3522', chain: 'Jewel-Osco', address: '1955 E Oakton St', city: 'Des Plaines', state: 'IL', zip: '60018', phone: '(847) 635-0423', fax: '(847) 635-0424', npi: '0010300122' },
  { id: 'ph122', name: 'Jewel-Osco Pharmacy #3690', chain: 'Jewel-Osco', address: '160 S Lincolnway', city: 'North Aurora', state: 'IL', zip: '60542', phone: '(630) 897-7440', fax: '(630) 897-7441', npi: '0010300123' },
  { id: 'ph123', name: 'Jewel-Osco Pharmacy #3201', chain: 'Jewel-Osco', address: '1301 S Naper Blvd', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 369-1720', fax: '(630) 369-1721', npi: '0010300124' },
  { id: 'ph124', name: 'Jewel-Osco Pharmacy #3344', chain: 'Jewel-Osco', address: '2855 W 95th St', city: 'Evergreen Park', state: 'IL', zip: '60805', phone: '(708) 424-2012', fax: '(708) 424-2013', npi: '0010300125' },
  { id: 'ph125', name: 'Jewel-Osco Pharmacy #3890', chain: 'Jewel-Osco', address: '2940 N Ashland Ave', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 868-4001', fax: '(773) 868-4002', npi: '0010300126' },
  { id: 'ph126', name: 'Jewel-Osco Pharmacy #3402', chain: 'Jewel-Osco', address: '6700 N Cicero Ave', city: 'Lincolnwood', state: 'IL', zip: '60712', phone: '(847) 676-5010', fax: '(847) 676-5011', npi: '0010300127' },
  { id: 'ph127', name: 'Jewel-Osco Pharmacy #3561', chain: 'Jewel-Osco', address: '2000 Pfingsten Rd', city: 'Glenview', state: 'IL', zip: '60026', phone: '(847) 998-2540', fax: '(847) 998-2541', npi: '0010300128' },
  { id: 'ph128', name: 'Jewel-Osco Pharmacy #3243', chain: 'Jewel-Osco', address: '7251 S Stony Island Ave', city: 'Chicago', state: 'IL', zip: '60649', phone: '(773) 752-6940', fax: '(773) 752-6941', npi: '0010300129' },
  { id: 'ph129', name: 'Jewel-Osco Pharmacy #3814', chain: 'Jewel-Osco', address: '14450 S LaGrange Rd', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 349-0820', fax: '(708) 349-0821', npi: '0010300130' },
  { id: 'ph130', name: 'Jewel-Osco Pharmacy #3628', chain: 'Jewel-Osco', address: '6751 W Belmont Ave', city: 'Chicago', state: 'IL', zip: '60634', phone: '(773) 637-0820', fax: '(773) 637-0821', npi: '0010300131' },
  { id: 'ph131', name: 'Jewel-Osco Pharmacy #3710', chain: 'Jewel-Osco', address: '350 Skokie Blvd', city: 'Wilmette', state: 'IL', zip: '60091', phone: '(847) 251-3210', fax: '(847) 251-3211', npi: '0010300132' },
  { id: 'ph132', name: 'Jewel-Osco Pharmacy #3504', chain: 'Jewel-Osco', address: '1220 N Larkin Ave', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-9330', fax: '(815) 744-9331', npi: '0010300133' },
  { id: 'ph133', name: 'Jewel-Osco Pharmacy #3832', chain: 'Jewel-Osco', address: '600 E Ogden Ave', city: 'Westmont', state: 'IL', zip: '60559', phone: '(630) 789-3310', fax: '(630) 789-3311', npi: '0010300134' },
  { id: 'ph134', name: 'Jewel-Osco Pharmacy #3941', chain: 'Jewel-Osco', address: '2135 Waukegan Rd', city: 'Bannockburn', state: 'IL', zip: '60015', phone: '(847) 940-0511', fax: '(847) 940-0512', npi: '0010300135' },
  { id: 'ph135', name: 'Jewel-Osco Pharmacy #3720', chain: 'Jewel-Osco', address: '1515 S Arlington Heights Rd', city: 'Arlington Heights', state: 'IL', zip: '60005', phone: '(847) 228-3740', fax: '(847) 228-3741', npi: '0010300136' },
  { id: 'ph136', name: 'Jewel-Osco Pharmacy #3604', chain: 'Jewel-Osco', address: '3400 W Touhy Ave', city: 'Lincolnwood', state: 'IL', zip: '60712', phone: '(847) 673-3010', fax: '(847) 673-3011', npi: '0010300137' },
  { id: 'ph137', name: 'Jewel-Osco Pharmacy #3812', chain: 'Jewel-Osco', address: '2323 S Mannheim Rd', city: 'Westchester', state: 'IL', zip: '60154', phone: '(708) 562-3010', fax: '(708) 562-3011', npi: '0010300138' },
  { id: 'ph138', name: 'Jewel-Osco Pharmacy #3480b', chain: 'Jewel-Osco', address: '1320 W Lake St', city: 'Addison', state: 'IL', zip: '60101', phone: '(630) 279-3840', fax: '(630) 279-3841', npi: '0010300139' },
  { id: 'ph139', name: 'Jewel-Osco Pharmacy #3902', chain: 'Jewel-Osco', address: '2101 W Galena Blvd', city: 'Aurora', state: 'IL', zip: '60506', phone: '(630) 859-1201', fax: '(630) 859-1202', npi: '0010300140' },
  { id: 'ph140', name: 'Jewel-Osco Pharmacy #3570', chain: 'Jewel-Osco', address: '200 W Army Trail Rd', city: 'Bloomingdale', state: 'IL', zip: '60108', phone: '(630) 893-2340', fax: '(630) 893-2341', npi: '0010300141' },
  { id: 'ph141', name: 'Jewel-Osco Pharmacy #3660', chain: 'Jewel-Osco', address: '2012 N Rand Rd', city: 'Palatine', state: 'IL', zip: '60074', phone: '(847) 991-3930', fax: '(847) 991-3931', npi: '0010300142' },
  { id: 'ph142', name: 'Jewel-Osco Pharmacy #3730', chain: 'Jewel-Osco', address: '2040 E Higgins Rd', city: 'Elk Grove Village', state: 'IL', zip: '60007', phone: '(847) 228-1020', fax: '(847) 228-1021', npi: '0010300143' },
  { id: 'ph143', name: 'Jewel-Osco Pharmacy #3810', chain: 'Jewel-Osco', address: '1601 Deerfield Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 945-2780', fax: '(847) 945-2781', npi: '0010300144' },
  { id: 'ph144', name: 'Jewel-Osco Pharmacy #3880', chain: 'Jewel-Osco', address: '3601 Oakton St', city: 'Skokie', state: 'IL', zip: '60076', phone: '(847) 673-4790', fax: '(847) 673-4791', npi: '0010300145' },
  { id: 'ph145', name: 'Jewel-Osco Pharmacy #3950', chain: 'Jewel-Osco', address: '6 W Grand Ave', city: 'Lake Villa', state: 'IL', zip: '60046', phone: '(847) 356-3310', fax: '(847) 356-3311', npi: '0010300146' },
  { id: 'ph146', name: 'Mariano\'s Pharmacy #502', chain: 'Mariano\'s', address: '333 E Benton Pl', city: 'Chicago', state: 'IL', zip: '60601', phone: '(312) 729-7200', fax: '(312) 729-7201', npi: '0010500147' },
  { id: 'ph147', name: 'Mariano\'s Pharmacy #508', chain: 'Mariano\'s', address: '2021 W Chicago Ave', city: 'Chicago', state: 'IL', zip: '60622', phone: '(773) 489-6910', fax: '(773) 489-6911', npi: '0010500148' },
  { id: 'ph148', name: 'Mariano\'s Pharmacy #514', chain: 'Mariano\'s', address: '6009 N Broadway', city: 'Chicago', state: 'IL', zip: '60660', phone: '(773) 465-1040', fax: '(773) 465-1041', npi: '0010500149' },
  { id: 'ph149', name: 'Mariano\'s Pharmacy #521', chain: 'Mariano\'s', address: '3030 N Broadway', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 248-0920', fax: '(773) 248-0921', npi: '0010500150' },
  { id: 'ph150', name: 'Mariano\'s Pharmacy #527', chain: 'Mariano\'s', address: '4651 N Lincoln Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 769-1050', fax: '(773) 769-1051', npi: '0010500151' },
  { id: 'ph151', name: 'Mariano\'s Pharmacy #533', chain: 'Mariano\'s', address: '1800 S Halsted St', city: 'Chicago', state: 'IL', zip: '60608', phone: '(312) 243-1020', fax: '(312) 243-1021', npi: '0010500152' },
  { id: 'ph152', name: 'Mariano\'s Pharmacy #540', chain: 'Mariano\'s', address: '2401 N Elston Ave', city: 'Chicago', state: 'IL', zip: '60647', phone: '(773) 276-5410', fax: '(773) 276-5411', npi: '0010500153' },
  { id: 'ph153', name: 'Mariano\'s Pharmacy #546', chain: 'Mariano\'s', address: '6020 N Cicero Ave', city: 'Chicago', state: 'IL', zip: '60646', phone: '(773) 545-8820', fax: '(773) 545-8821', npi: '0010500154' },
  { id: 'ph154', name: 'Mariano\'s Pharmacy #553', chain: 'Mariano\'s', address: '100 W Hillcrest Blvd', city: 'Schaumburg', state: 'IL', zip: '60195', phone: '(847) 524-1040', fax: '(847) 524-1041', npi: '0010500155' },
  { id: 'ph155', name: 'Mariano\'s Pharmacy #559', chain: 'Mariano\'s', address: '1363 W Lake St', city: 'Addison', state: 'IL', zip: '60101', phone: '(630) 889-0511', fax: '(630) 889-0512', npi: '0010500156' },
  { id: 'ph156', name: 'Mariano\'s Pharmacy #565', chain: 'Mariano\'s', address: '1210 S Naper Blvd', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 983-2810', fax: '(630) 983-2811', npi: '0010500157' },
  { id: 'ph157', name: 'Mariano\'s Pharmacy #572', chain: 'Mariano\'s', address: '111 W Maple Ave', city: 'Mundelein', state: 'IL', zip: '60060', phone: '(847) 970-1010', fax: '(847) 970-1011', npi: '0010500158' },
  { id: 'ph158', name: 'Mariano\'s Pharmacy #578', chain: 'Mariano\'s', address: '7420 N Milwaukee Ave', city: 'Niles', state: 'IL', zip: '60714', phone: '(847) 647-5210', fax: '(847) 647-5211', npi: '0010500159' },
  { id: 'ph159', name: 'Mariano\'s Pharmacy #584', chain: 'Mariano\'s', address: '1720 Shermer Rd', city: 'Northbrook', state: 'IL', zip: '60062', phone: '(847) 272-0830', fax: '(847) 272-0831', npi: '0010500160' },
  { id: 'ph160', name: 'Mariano\'s Pharmacy #590', chain: 'Mariano\'s', address: '3015 W Peterson Ave', city: 'Chicago', state: 'IL', zip: '60659', phone: '(773) 267-9010', fax: '(773) 267-9011', npi: '0010500161' },
  { id: 'ph161', name: 'Mariano\'s Pharmacy #601', chain: 'Mariano\'s', address: '1 N Wacker Dr', city: 'Chicago', state: 'IL', zip: '60606', phone: '(312) 782-8040', fax: '(312) 782-8041', npi: '0010500162' },
  { id: 'ph162', name: 'Mariano\'s Pharmacy #612', chain: 'Mariano\'s', address: '3735 N Country Club Rd', city: 'Woodstock', state: 'IL', zip: '60098', phone: '(815) 334-0820', fax: '(815) 334-0821', npi: '0010500163' },
  { id: 'ph163', name: 'Mariano\'s Pharmacy #624', chain: 'Mariano\'s', address: '101 S Waukegan Rd', city: 'Lake Bluff', state: 'IL', zip: '60044', phone: '(847) 604-0411', fax: '(847) 604-0412', npi: '0010500164' },
  { id: 'ph164', name: 'Walmart Pharmacy #2608', chain: 'Walmart', address: '4650 W North Ave', city: 'Chicago', state: 'IL', zip: '60639', phone: '(773) 384-1200', fax: '(773) 384-1201', npi: '0010400165' },
  { id: 'ph165', name: 'Walmart Pharmacy #5184', chain: 'Walmart', address: '7535 S Ashland Ave', city: 'Chicago', state: 'IL', zip: '60620', phone: '(773) 925-5800', fax: '(773) 925-5801', npi: '0010400166' },
  { id: 'ph166', name: 'Walmart Pharmacy #2901', chain: 'Walmart', address: '155 Skokie Blvd', city: 'Skokie', state: 'IL', zip: '60077', phone: '(847) 675-9630', fax: '(847) 675-9631', npi: '0010400167' },
  { id: 'ph167', name: 'Walmart Pharmacy #3412', chain: 'Walmart', address: '2500 W Schaumburg Rd', city: 'Schaumburg', state: 'IL', zip: '60194', phone: '(847) 519-0710', fax: '(847) 519-0711', npi: '0010400168' },
  { id: 'ph168', name: 'Walmart Pharmacy #1824', chain: 'Walmart', address: '2020 S Washington St', city: 'Naperville', state: 'IL', zip: '60565', phone: '(630) 416-3120', fax: '(630) 416-3121', npi: '0010400169' },
  { id: 'ph169', name: 'Walmart Pharmacy #2187', chain: 'Walmart', address: '4320 E New York St', city: 'Aurora', state: 'IL', zip: '60504', phone: '(630) 820-8100', fax: '(630) 820-8101', npi: '0010400170' },
  { id: 'ph170', name: 'Walmart Pharmacy #3756', chain: 'Walmart', address: '1800 Larkin Ave', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 741-2020', fax: '(847) 741-2021', npi: '0010400171' },
  { id: 'ph171', name: 'Walmart Pharmacy #2093', chain: 'Walmart', address: '3101 Plainfield Rd', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 254-5900', fax: '(815) 254-5901', npi: '0010400172' },
  { id: 'ph172', name: 'Walmart Pharmacy #4218', chain: 'Walmart', address: '2450 S Sullivan Rd', city: 'Aurora', state: 'IL', zip: '60505', phone: '(630) 898-0901', fax: '(630) 898-0902', npi: '0010400173' },
  { id: 'ph173', name: 'Walmart Pharmacy #2634', chain: 'Walmart', address: '6650 W North Ave', city: 'Elmwood Park', state: 'IL', zip: '60707', phone: '(708) 452-5310', fax: '(708) 452-5311', npi: '0010400174' },
  { id: 'ph174', name: 'Walmart Pharmacy #1502', chain: 'Walmart', address: '201 N Larkin Ave', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-2410', fax: '(815) 744-2411', npi: '0010400175' },
  { id: 'ph175', name: 'Walmart Pharmacy #3871', chain: 'Walmart', address: '1001 W Randall Rd', city: 'Algonquin', state: 'IL', zip: '60102', phone: '(847) 854-9710', fax: '(847) 854-9711', npi: '0010400176' },
  { id: 'ph176', name: 'Walmart Pharmacy #2940', chain: 'Walmart', address: '100 S Route 83', city: 'Mundelein', state: 'IL', zip: '60060', phone: '(847) 970-3720', fax: '(847) 970-3721', npi: '0010400177' },
  { id: 'ph177', name: 'Walmart Pharmacy #4103', chain: 'Walmart', address: '1200 N Michael Dr', city: 'Wood Dale', state: 'IL', zip: '60191', phone: '(630) 766-5060', fax: '(630) 766-5061', npi: '0010400178' },
  { id: 'ph178', name: 'Walmart Pharmacy #1834', chain: 'Walmart', address: '405 E Rollins Rd', city: 'Round Lake Beach', state: 'IL', zip: '60073', phone: '(847) 546-8220', fax: '(847) 546-8221', npi: '0010400179' },
  { id: 'ph179', name: 'Walmart Pharmacy #2752', chain: 'Walmart', address: '500 N Perryville Rd', city: 'Rockford', state: 'IL', zip: '61107', phone: '(815) 877-0210', fax: '(815) 877-0211', npi: '0010400180' },
  { id: 'ph180', name: 'Walmart Pharmacy #3290', chain: 'Walmart', address: '4550 N Prospect Rd', city: 'Peoria Heights', state: 'IL', zip: '61616', phone: '(309) 686-3840', fax: '(309) 686-3841', npi: '0010400181' },
  { id: 'ph181', name: 'Walmart Pharmacy #1625', chain: 'Walmart', address: '3401 S 6th Street Rd', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 787-8900', fax: '(217) 787-8901', npi: '0010400182' },
  { id: 'ph182', name: 'Walmart Pharmacy #2483', chain: 'Walmart', address: '1701 E Empire St', city: 'Bloomington', state: 'IL', zip: '61701', phone: '(309) 662-1200', fax: '(309) 662-1201', npi: '0010400183' },
  { id: 'ph183', name: 'Walmart Pharmacy #3104', chain: 'Walmart', address: '1801 N Market St', city: 'Champaign', state: 'IL', zip: '61820', phone: '(217) 359-5801', fax: '(217) 359-5802', npi: '0010400184' },
  { id: 'ph184', name: 'Walmart Pharmacy #2571', chain: 'Walmart', address: '1275 State Hwy 121 W', city: 'Lincoln', state: 'IL', zip: '62656', phone: '(217) 732-2110', fax: '(217) 732-2111', npi: '0010400185' },
  { id: 'ph185', name: 'Walmart Pharmacy #1893', chain: 'Walmart', address: '5000 E Main St', city: 'Carbondale', state: 'IL', zip: '62901', phone: '(618) 457-2240', fax: '(618) 457-2241', npi: '0010400186' },
  { id: 'ph186', name: 'Walmart Pharmacy #3402', chain: 'Walmart', address: '1905 N Lakewood Dr', city: 'Effingham', state: 'IL', zip: '62401', phone: '(217) 347-0020', fax: '(217) 347-0021', npi: '0010400187' },
  { id: 'ph187', name: 'Walmart Pharmacy #2214', chain: 'Walmart', address: '3901 S MacArthur Blvd', city: 'Springfield', state: 'IL', zip: '62711', phone: '(217) 787-0080', fax: '(217) 787-0081', npi: '0010400188' },
  { id: 'ph188', name: 'Walmart Pharmacy #4051', chain: 'Walmart', address: '3241 Broadway St', city: 'Quincy', state: 'IL', zip: '62301', phone: '(217) 223-6110', fax: '(217) 223-6111', npi: '0010400189' },
  { id: 'ph189', name: 'Walmart Pharmacy #3180', chain: 'Walmart', address: '1301 W Wabash Ave', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 623-7040', fax: '(847) 623-7041', npi: '0010400190' },
  { id: 'ph190', name: 'Walmart Pharmacy #2840', chain: 'Walmart', address: '15 S Route 59', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 579-1020', fax: '(630) 579-1021', npi: '0010400191' },
  { id: 'ph191', name: 'Walmart Pharmacy #3630', chain: 'Walmart', address: '1150 W US Hwy 30', city: 'Matteson', state: 'IL', zip: '60443', phone: '(708) 748-4100', fax: '(708) 748-4101', npi: '0010400192' },
  { id: 'ph192', name: 'Walmart Pharmacy #4310', chain: 'Walmart', address: '8151 Oakton St', city: 'Niles', state: 'IL', zip: '60714', phone: '(847) 635-9030', fax: '(847) 635-9031', npi: '0010400193' },
  { id: 'ph193', name: 'Walmart Pharmacy #2710', chain: 'Walmart', address: '2401 W War Memorial Dr', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 693-0020', fax: '(309) 693-0021', npi: '0010400194' },
  { id: 'ph194', name: 'Walmart Pharmacy #3940', chain: 'Walmart', address: '1000 S Galena Ave', city: 'Freeport', state: 'IL', zip: '61032', phone: '(815) 232-1820', fax: '(815) 232-1821', npi: '0010400195' },
  { id: 'ph195', name: 'Walmart Pharmacy #2950', chain: 'Walmart', address: '1920 N Vermilion St', city: 'Danville', state: 'IL', zip: '61832', phone: '(217) 431-8850', fax: '(217) 431-8851', npi: '0010400196' },
  { id: 'ph196', name: 'Meijer Pharmacy #253', chain: 'Meijer', address: '8300 S Holland Rd', city: 'Chicago', state: 'IL', zip: '60620', phone: '(773) 488-3410', fax: '(773) 488-3411', npi: '0010600197' },
  { id: 'ph197', name: 'Meijer Pharmacy #289', chain: 'Meijer', address: '4901 W North Ave', city: 'Chicago', state: 'IL', zip: '60639', phone: '(773) 745-2550', fax: '(773) 745-2551', npi: '0010600198' },
  { id: 'ph198', name: 'Meijer Pharmacy #302', chain: 'Meijer', address: '2500 W Lake St', city: 'Melrose Park', state: 'IL', zip: '60160', phone: '(708) 338-1260', fax: '(708) 338-1261', npi: '0010600199' },
  { id: 'ph199', name: 'Meijer Pharmacy #267', chain: 'Meijer', address: '7000 Cermak Rd', city: 'Berwyn', state: 'IL', zip: '60402', phone: '(708) 484-7310', fax: '(708) 484-7311', npi: '0010600200' },
  { id: 'ph200', name: 'Meijer Pharmacy #198', chain: 'Meijer', address: '12001 S Pulaski Rd', city: 'Alsip', state: 'IL', zip: '60803', phone: '(708) 396-0105', fax: '(708) 396-0106', npi: '0010600201' },
  { id: 'ph201', name: 'Meijer Pharmacy #275', chain: 'Meijer', address: '4200 Conestoga Dr', city: 'Springfield', state: 'IL', zip: '62711', phone: '(217) 679-3290', fax: '(217) 679-3291', npi: '0010600202' },
  { id: 'ph202', name: 'Meijer Pharmacy #310', chain: 'Meijer', address: '1601 E Empire St', city: 'Bloomington', state: 'IL', zip: '61701', phone: '(309) 664-5420', fax: '(309) 664-5421', npi: '0010600203' },
  { id: 'ph203', name: 'Meijer Pharmacy #245', chain: 'Meijer', address: '3600 E Lincolnway', city: 'Sterling', state: 'IL', zip: '61081', phone: '(815) 564-2340', fax: '(815) 564-2341', npi: '0010600204' },
  { id: 'ph204', name: 'Meijer Pharmacy #320', chain: 'Meijer', address: '2501 N Prospect Ave', city: 'Champaign', state: 'IL', zip: '61822', phone: '(217) 373-1250', fax: '(217) 373-1251', npi: '0010600205' },
  { id: 'ph205', name: 'Meijer Pharmacy #188', chain: 'Meijer', address: '5001 W War Memorial Dr', city: 'Peoria', state: 'IL', zip: '61615', phone: '(309) 693-8720', fax: '(309) 693-8721', npi: '0010600206' },
  { id: 'ph206', name: 'Meijer Pharmacy #334', chain: 'Meijer', address: '1300 S Randall Rd', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 888-3010', fax: '(847) 888-3011', npi: '0010600207' },
  { id: 'ph207', name: 'Meijer Pharmacy #358', chain: 'Meijer', address: '2101 W Schaumburg Rd', city: 'Schaumburg', state: 'IL', zip: '60194', phone: '(847) 330-4110', fax: '(847) 330-4111', npi: '0010600208' },
  { id: 'ph208', name: 'Meijer Pharmacy #371', chain: 'Meijer', address: '1070 N Route 59', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 355-2800', fax: '(630) 355-2801', npi: '0010600209' },
  { id: 'ph209', name: 'Meijer Pharmacy #384', chain: 'Meijer', address: '1611 McConnell Blvd', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-0280', fax: '(815) 744-0281', npi: '0010600210' },
  { id: 'ph210', name: 'Meijer Pharmacy #397', chain: 'Meijer', address: '7800 S Cicero Ave', city: 'Burbank', state: 'IL', zip: '60459', phone: '(708) 425-5020', fax: '(708) 425-5021', npi: '0010600211' },
  { id: 'ph211', name: 'Meijer Pharmacy #410', chain: 'Meijer', address: '1501 Essington Rd', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 577-8010', fax: '(815) 577-8011', npi: '0010600212' },
  { id: 'ph212', name: 'Meijer Pharmacy #424', chain: 'Meijer', address: '6145 E State St', city: 'Rockford', state: 'IL', zip: '61108', phone: '(815) 229-5610', fax: '(815) 229-5611', npi: '0010600213' },
  { id: 'ph213', name: 'Meijer Pharmacy #438', chain: 'Meijer', address: '4601 N Harlem Ave', city: 'Norridge', state: 'IL', zip: '60706', phone: '(708) 456-3820', fax: '(708) 456-3821', npi: '0010600214' },
  { id: 'ph214', name: 'Meijer Pharmacy #451', chain: 'Meijer', address: '2350 Butterfield Rd', city: 'Aurora', state: 'IL', zip: '60502', phone: '(630) 820-8490', fax: '(630) 820-8491', npi: '0010600215' },
  { id: 'ph215', name: 'Meijer Pharmacy #465', chain: 'Meijer', address: '300 W Kirchoff Rd', city: 'Rolling Meadows', state: 'IL', zip: '60008', phone: '(847) 398-2110', fax: '(847) 398-2111', npi: '0010600216' },
  { id: 'ph216', name: 'Costco Pharmacy #452', chain: 'Costco', address: '1430 S Ashland Ave', city: 'Chicago', state: 'IL', zip: '60608', phone: '(312) 421-1250', fax: '(312) 421-1251', npi: '0010700217' },
  { id: 'ph217', name: 'Costco Pharmacy #488', chain: 'Costco', address: '4999 Old Orchard Ctr', city: 'Skokie', state: 'IL', zip: '60077', phone: '(847) 763-4620', fax: '(847) 763-4621', npi: '0010700218' },
  { id: 'ph218', name: 'Costco Pharmacy #510', chain: 'Costco', address: '2020 N Sterling Ave', city: 'Peoria', state: 'IL', zip: '61604', phone: '(309) 683-5810', fax: '(309) 683-5811', npi: '0010700219' },
  { id: 'ph219', name: 'Costco Pharmacy #534', chain: 'Costco', address: '1500 McConnell Blvd', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 254-0840', fax: '(815) 254-0841', npi: '0010700220' },
  { id: 'ph220', name: 'Costco Pharmacy #562', chain: 'Costco', address: '700 E Ogden Ave', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 305-1740', fax: '(630) 305-1741', npi: '0010700221' },
  { id: 'ph221', name: 'Costco Pharmacy #580', chain: 'Costco', address: '2411 W Schaumburg Rd', city: 'Schaumburg', state: 'IL', zip: '60194', phone: '(847) 884-7830', fax: '(847) 884-7831', npi: '0010700222' },
  { id: 'ph222', name: 'Costco Pharmacy #602', chain: 'Costco', address: '1100 N Milwaukee Ave', city: 'Vernon Hills', state: 'IL', zip: '60061', phone: '(847) 573-1290', fax: '(847) 573-1291', npi: '0010700223' },
  { id: 'ph223', name: 'Costco Pharmacy #624', chain: 'Costco', address: '2000 Spring Rd', city: 'Oak Brook', state: 'IL', zip: '60523', phone: '(630) 368-5640', fax: '(630) 368-5641', npi: '0010700224' },
  { id: 'ph224', name: 'Costco Pharmacy #648', chain: 'Costco', address: '15105 S LaGrange Rd', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 873-5310', fax: '(708) 873-5311', npi: '0010700225' },
  { id: 'ph225', name: 'Costco Pharmacy #672', chain: 'Costco', address: '2575 Boughton Rd', city: 'Bolingbrook', state: 'IL', zip: '60490', phone: '(630) 783-3110', fax: '(630) 783-3111', npi: '0010700226' },
  { id: 'ph226', name: 'Costco Pharmacy #695', chain: 'Costco', address: '501 Waukegan Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 405-5810', fax: '(847) 405-5811', npi: '0010700227' },
  { id: 'ph227', name: 'Costco Pharmacy #718', chain: 'Costco', address: '815 E Golf Rd', city: 'Arlington Heights', state: 'IL', zip: '60005', phone: '(847) 342-8820', fax: '(847) 342-8821', npi: '0010700228' },
  { id: 'ph228', name: 'Costco Pharmacy #741', chain: 'Costco', address: '680 S State Route 59', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 548-0891', fax: '(630) 548-0892', npi: '0010700229' },
  { id: 'ph229', name: 'Costco Pharmacy #764', chain: 'Costco', address: '1201 Lake Cook Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 940-9210', fax: '(847) 940-9211', npi: '0010700230' },
  { id: 'ph230', name: 'Sam\'s Club Pharmacy #4921', chain: 'Sam\'s Club', address: '8331 N Milwaukee Ave', city: 'Niles', state: 'IL', zip: '60714', phone: '(847) 470-9830', fax: '(847) 470-9831', npi: '0010900231' },
  { id: 'ph231', name: 'Sam\'s Club Pharmacy #4854', chain: 'Sam\'s Club', address: '1001 N Lake St', city: 'Aurora', state: 'IL', zip: '60506', phone: '(630) 896-3810', fax: '(630) 896-3811', npi: '0010900232' },
  { id: 'ph232', name: 'Sam\'s Club Pharmacy #5103', chain: 'Sam\'s Club', address: '1800 E Rand Rd', city: 'Arlington Heights', state: 'IL', zip: '60004', phone: '(847) 259-1820', fax: '(847) 259-1821', npi: '0010900233' },
  { id: 'ph233', name: 'Sam\'s Club Pharmacy #4765', chain: 'Sam\'s Club', address: '7510 Lemont Rd', city: 'Darien', state: 'IL', zip: '60561', phone: '(630) 960-5010', fax: '(630) 960-5011', npi: '0010900234' },
  { id: 'ph234', name: 'Sam\'s Club Pharmacy #5234', chain: 'Sam\'s Club', address: '2551 W 75th St', city: 'Naperville', state: 'IL', zip: '60565', phone: '(630) 983-4720', fax: '(630) 983-4721', npi: '0010900235' },
  { id: 'ph235', name: 'Sam\'s Club Pharmacy #4680', chain: 'Sam\'s Club', address: '2211 E Empire St', city: 'Bloomington', state: 'IL', zip: '61704', phone: '(309) 662-3920', fax: '(309) 662-3921', npi: '0010900236' },
  { id: 'ph236', name: 'Sam\'s Club Pharmacy #5312', chain: 'Sam\'s Club', address: '4201 W Lake Ave', city: 'Peoria', state: 'IL', zip: '61615', phone: '(309) 693-1810', fax: '(309) 693-1811', npi: '0010900237' },
  { id: 'ph237', name: 'Sam\'s Club Pharmacy #4930', chain: 'Sam\'s Club', address: '3301 Prairie Ave', city: 'Mattoon', state: 'IL', zip: '61938', phone: '(217) 235-5820', fax: '(217) 235-5821', npi: '0010900238' },
  { id: 'ph238', name: 'Sam\'s Club Pharmacy #5150', chain: 'Sam\'s Club', address: '6401 N Illinois St', city: 'Fairview Heights', state: 'IL', zip: '62208', phone: '(618) 489-2110', fax: '(618) 489-2111', npi: '0010900239' },
  { id: 'ph239', name: 'Sam\'s Club Pharmacy #4847', chain: 'Sam\'s Club', address: '3351 W Dirksen Pkwy', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 793-4830', fax: '(217) 793-4831', npi: '0010900240' },
  { id: 'ph240', name: 'Sam\'s Club Pharmacy #5271', chain: 'Sam\'s Club', address: '1 E Rand Rd', city: 'Mount Prospect', state: 'IL', zip: '60056', phone: '(847) 258-0210', fax: '(847) 258-0211', npi: '0010900241' },
  { id: 'ph241', name: 'Sam\'s Club Pharmacy #4903', chain: 'Sam\'s Club', address: '1600 N Route 59', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 527-5610', fax: '(630) 527-5611', npi: '0010900242' },
  { id: 'ph242', name: 'Target Pharmacy (CVS) #T-1482', chain: 'Target (CVS)', address: '3 E Chicago Ave', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 494-7710', fax: '(312) 494-7711', npi: '0010800243' },
  { id: 'ph243', name: 'Target Pharmacy (CVS) #T-1635', chain: 'Target (CVS)', address: '2656 N Elston Ave', city: 'Chicago', state: 'IL', zip: '60647', phone: '(773) 342-4010', fax: '(773) 342-4011', npi: '0010800244' },
  { id: 'ph244', name: 'Target Pharmacy (CVS) #T-1720', chain: 'Target (CVS)', address: '1154 S Clark St', city: 'Chicago', state: 'IL', zip: '60605', phone: '(312) 922-9040', fax: '(312) 922-9041', npi: '0010800245' },
  { id: 'ph245', name: 'Target Pharmacy (CVS) #T-1841', chain: 'Target (CVS)', address: '4555 N Lincoln Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 784-0040', fax: '(773) 784-0041', npi: '0010800246' },
  { id: 'ph246', name: 'Target Pharmacy (CVS) #T-1958', chain: 'Target (CVS)', address: '7601 S Cicero Ave', city: 'Chicago', state: 'IL', zip: '60652', phone: '(773) 582-5210', fax: '(773) 582-5211', npi: '0010800247' },
  { id: 'ph247', name: 'Target Pharmacy (CVS) #T-2043', chain: 'Target (CVS)', address: '2100 N Mannheim Rd', city: 'Franklin Park', state: 'IL', zip: '60131', phone: '(847) 678-0920', fax: '(847) 678-0921', npi: '0010800248' },
  { id: 'ph248', name: 'Target Pharmacy (CVS) #T-2184', chain: 'Target (CVS)', address: '4 Woodfield Mall', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 619-3840', fax: '(847) 619-3841', npi: '0010800249' },
  { id: 'ph249', name: 'Target Pharmacy (CVS) #T-2270', chain: 'Target (CVS)', address: '1301 W 22nd St', city: 'Oak Brook', state: 'IL', zip: '60523', phone: '(630) 572-3060', fax: '(630) 572-3061', npi: '0010800250' },
  { id: 'ph250', name: 'Target Pharmacy (CVS) #T-2352', chain: 'Target (CVS)', address: '1000 N Rohlwing Rd', city: 'Rolling Meadows', state: 'IL', zip: '60008', phone: '(847) 253-0810', fax: '(847) 253-0811', npi: '0010800251' },
  { id: 'ph251', name: 'Target Pharmacy (CVS) #T-2445', chain: 'Target (CVS)', address: '7436 W 191st St', city: 'Tinley Park', state: 'IL', zip: '60477', phone: '(708) 532-2840', fax: '(708) 532-2841', npi: '0010800252' },
  { id: 'ph252', name: 'Target Pharmacy (CVS) #T-2530', chain: 'Target (CVS)', address: '1260 W 75th St', city: 'Downers Grove', state: 'IL', zip: '60516', phone: '(630) 963-0070', fax: '(630) 963-0071', npi: '0010800253' },
  { id: 'ph253', name: 'Target Pharmacy (CVS) #T-2618', chain: 'Target (CVS)', address: '2100 E Golf Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 839-1810', fax: '(847) 839-1811', npi: '0010800254' },
  { id: 'ph254', name: 'Target Pharmacy (CVS) #T-2703', chain: 'Target (CVS)', address: '1500 N Randall Rd', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 608-9010', fax: '(847) 608-9011', npi: '0010800255' },
  { id: 'ph255', name: 'Target Pharmacy (CVS) #T-2790', chain: 'Target (CVS)', address: '1575 N Naper Blvd', city: 'Naperville', state: 'IL', zip: '60563', phone: '(630) 536-0821', fax: '(630) 536-0822', npi: '0010800256' },
  { id: 'ph256', name: 'Rite Aid Pharmacy #4821', chain: 'Rite Aid', address: '6840 N Western Ave', city: 'Chicago', state: 'IL', zip: '60645', phone: '(773) 743-1210', fax: '(773) 743-1211', npi: '0011000257' },
  { id: 'ph257', name: 'Rite Aid Pharmacy #4932', chain: 'Rite Aid', address: '1901 N Narragansett Ave', city: 'Chicago', state: 'IL', zip: '60639', phone: '(773) 889-0841', fax: '(773) 889-0842', npi: '0011000258' },
  { id: 'ph258', name: 'Rite Aid Pharmacy #5043', chain: 'Rite Aid', address: '7501 W Belmont Ave', city: 'Chicago', state: 'IL', zip: '60634', phone: '(773) 889-5040', fax: '(773) 889-5041', npi: '0011000259' },
  { id: 'ph259', name: 'Rite Aid Pharmacy #4756', chain: 'Rite Aid', address: '3655 W Devon Ave', city: 'Chicago', state: 'IL', zip: '60659', phone: '(773) 267-0020', fax: '(773) 267-0021', npi: '0011000260' },
  { id: 'ph260', name: 'Rite Aid Pharmacy #5121', chain: 'Rite Aid', address: '1127 N State St', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 337-1830', fax: '(312) 337-1831', npi: '0011000261' },
  { id: 'ph261', name: 'Rite Aid Pharmacy #4890', chain: 'Rite Aid', address: '9035 N Milwaukee Ave', city: 'Niles', state: 'IL', zip: '60714', phone: '(847) 965-2230', fax: '(847) 965-2231', npi: '0011000262' },
  { id: 'ph262', name: 'Rite Aid Pharmacy #5210', chain: 'Rite Aid', address: '3715 W Dempster St', city: 'Skokie', state: 'IL', zip: '60076', phone: '(847) 673-2610', fax: '(847) 673-2611', npi: '0011000263' },
  { id: 'ph263', name: 'Rite Aid Pharmacy #4965', chain: 'Rite Aid', address: '201 E Rand Rd', city: 'Mount Prospect', state: 'IL', zip: '60056', phone: '(847) 398-1420', fax: '(847) 398-1421', npi: '0011000264' },
  { id: 'ph264', name: 'Rite Aid Pharmacy #5302', chain: 'Rite Aid', address: '600 N Waukegan Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 940-0120', fax: '(847) 940-0121', npi: '0011000265' },
  { id: 'ph265', name: 'Rite Aid Pharmacy #5084', chain: 'Rite Aid', address: '321 E Ogden Ave', city: 'La Grange', state: 'IL', zip: '60525', phone: '(708) 354-8310', fax: '(708) 354-8311', npi: '0011000266' },
  { id: 'ph266', name: 'Rite Aid Pharmacy #4830', chain: 'Rite Aid', address: '5100 W Devon Ave', city: 'Chicago', state: 'IL', zip: '60646', phone: '(773) 631-1420', fax: '(773) 631-1421', npi: '0011000267' },
  { id: 'ph267', name: 'Rite Aid Pharmacy #5170', chain: 'Rite Aid', address: '3100 W Irving Park Rd', city: 'Chicago', state: 'IL', zip: '60618', phone: '(773) 267-3220', fax: '(773) 267-3221', npi: '0011000268' },
  { id: 'ph268', name: 'HyVee Pharmacy #1452', chain: 'HyVee', address: '1010 N Henderson St', city: 'Galesburg', state: 'IL', zip: '61401', phone: '(309) 343-5380', fax: '(309) 343-5381', npi: '0011100269' },
  { id: 'ph269', name: 'HyVee Pharmacy #1380', chain: 'HyVee', address: '801 W 12th St', city: 'Rock Island', state: 'IL', zip: '61201', phone: '(309) 786-0280', fax: '(309) 786-0281', npi: '0011100270' },
  { id: 'ph270', name: 'HyVee Pharmacy #1501', chain: 'HyVee', address: '4000 Avenue of the Cities', city: 'Moline', state: 'IL', zip: '61265', phone: '(309) 762-4220', fax: '(309) 762-4221', npi: '0011100271' },
  { id: 'ph271', name: 'HyVee Pharmacy #1424', chain: 'HyVee', address: '720 N Broad St', city: 'Galesburg', state: 'IL', zip: '61401', phone: '(309) 341-1040', fax: '(309) 341-1041', npi: '0011100272' },
  { id: 'ph272', name: 'HyVee Pharmacy #1466', chain: 'HyVee', address: '1635 41st Ave', city: 'Silvis', state: 'IL', zip: '61282', phone: '(309) 792-3810', fax: '(309) 792-3811', npi: '0011100273' },
  { id: 'ph273', name: 'Schnucks Pharmacy #401', chain: 'Schnucks', address: '6001 N Illinois St', city: 'Fairview Heights', state: 'IL', zip: '62208', phone: '(618) 394-3010', fax: '(618) 394-3011', npi: '0011200274' },
  { id: 'ph274', name: 'Schnucks Pharmacy #412', chain: 'Schnucks', address: '1025 Beltline Rd', city: 'Collinsville', state: 'IL', zip: '62234', phone: '(618) 344-8820', fax: '(618) 344-8821', npi: '0011200275' },
  { id: 'ph275', name: 'Schnucks Pharmacy #423', chain: 'Schnucks', address: '1801 Salem Rd', city: 'Mount Vernon', state: 'IL', zip: '62864', phone: '(618) 244-3010', fax: '(618) 244-3011', npi: '0011200276' },
  { id: 'ph276', name: 'Schnucks Pharmacy #435', chain: 'Schnucks', address: '301 Exchange St', city: 'O\'Fallon', state: 'IL', zip: '62269', phone: '(618) 632-4040', fax: '(618) 632-4041', npi: '0011200277' },
  { id: 'ph277', name: 'Schnucks Pharmacy #441', chain: 'Schnucks', address: '4601 E Main St', city: 'Belleville', state: 'IL', zip: '62221', phone: '(618) 234-8010', fax: '(618) 234-8011', npi: '0011200278' },
  { id: 'ph278', name: 'Schnucks Pharmacy #452', chain: 'Schnucks', address: '1001 E Union Ave', city: 'Alton', state: 'IL', zip: '62002', phone: '(618) 462-3730', fax: '(618) 462-3731', npi: '0011200279' },
  { id: 'ph279', name: 'Schnucks Pharmacy #463', chain: 'Schnucks', address: '300 S Buchanan St', city: 'Edwardsville', state: 'IL', zip: '62025', phone: '(618) 656-2420', fax: '(618) 656-2421', npi: '0011200280' },
  { id: 'ph280', name: 'Schnucks Pharmacy #474', chain: 'Schnucks', address: '2501 Nameoki Rd', city: 'Granite City', state: 'IL', zip: '62040', phone: '(618) 877-0820', fax: '(618) 877-0821', npi: '0011200281' },
  { id: 'ph281', name: 'Northwestern Medicine Outpatient Pharmacy', chain: 'Northwestern Medicine', address: '251 E Huron St', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 926-5770', fax: '(312) 926-5771', npi: '1130000001' },
  { id: 'ph282', name: 'Rush University Medical Center Pharmacy', chain: 'Rush Health', address: '1653 W Congress Pkwy', city: 'Chicago', state: 'IL', zip: '60612', phone: '(312) 942-5000', fax: '(312) 942-5001', npi: '1130000002' },
  { id: 'ph283', name: 'UI Health Outpatient Pharmacy', chain: 'UI Health', address: '1740 W Taylor St', city: 'Chicago', state: 'IL', zip: '60612', phone: '(312) 413-7250', fax: '(312) 413-7251', npi: '1130000003' },
  { id: 'ph284', name: 'Advocate Christ Medical Center Pharmacy', chain: 'Advocate Health', address: '4440 W 95th St', city: 'Oak Lawn', state: 'IL', zip: '60453', phone: '(708) 684-8780', fax: '(708) 684-8781', npi: '1130000004' },
  { id: 'ph285', name: 'OSF Saint Francis Medical Center Pharmacy', chain: 'OSF HealthCare', address: '530 NE Glen Oak Ave', city: 'Peoria', state: 'IL', zip: '61637', phone: '(309) 655-2400', fax: '(309) 655-2401', npi: '1130000005' },
  { id: 'ph286', name: 'Memorial Medical Center Outpatient Pharmacy', chain: 'Memorial Health', address: '701 N First St', city: 'Springfield', state: 'IL', zip: '62781', phone: '(217) 788-3500', fax: '(217) 788-3501', npi: '1130000006' },
  { id: 'ph287', name: 'Carle Foundation Hospital Pharmacy', chain: 'Carle Health', address: '611 W Park St', city: 'Urbana', state: 'IL', zip: '61801', phone: '(217) 383-3000', fax: '(217) 383-3001', npi: '1130000007' },
  { id: 'ph288', name: 'Loyola Medicine Outpatient Pharmacy', chain: 'Trinity Health', address: '2160 S First Ave', city: 'Maywood', state: 'IL', zip: '60153', phone: '(708) 216-9300', fax: '(708) 216-9301', npi: '1130000008' },
  { id: 'ph289', name: 'Edward-Elmhurst Health Pharmacy', chain: 'Edward-Elmhurst Health', address: '801 S Washington St', city: 'Naperville', state: 'IL', zip: '60540', phone: '(630) 527-3200', fax: '(630) 527-3201', npi: '1130000009' },
  { id: 'ph290', name: 'NorthShore University HealthSystem Pharmacy', chain: 'NorthShore', address: '2650 Ridge Ave', city: 'Evanston', state: 'IL', zip: '60201', phone: '(847) 570-2850', fax: '(847) 570-2851', npi: '1130000010' },
  { id: 'ph291', name: 'Amita Health Saint Joseph Medical Pharmacy', chain: 'Amita Health', address: '333 N Madison St', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 725-7180', fax: '(815) 725-7181', npi: '1130000011' },
  { id: 'ph292', name: 'UnityPoint Health Methodist Pharmacy', chain: 'UnityPoint Health', address: '221 NE Glen Oak Ave', city: 'Peoria', state: 'IL', zip: '61636', phone: '(309) 672-5000', fax: '(309) 672-5001', npi: '1130000012' },
  { id: 'ph293', name: 'Advocate Good Samaritan Hospital Pharmacy', chain: 'Advocate Health', address: '3815 Highland Ave', city: 'Downers Grove', state: 'IL', zip: '60515', phone: '(630) 275-5800', fax: '(630) 275-5801', npi: '1130000013' },
  { id: 'ph294', name: 'SwedishAmerican Hospital Pharmacy', chain: 'UW Health', address: '1401 E State St', city: 'Rockford', state: 'IL', zip: '61104', phone: '(815) 968-4400', fax: '(815) 968-4401', npi: '1130000014' },
  { id: 'ph295', name: 'Stroger Hospital Outpatient Pharmacy', chain: 'Cook County Health', address: '1901 W Harrison St', city: 'Chicago', state: 'IL', zip: '60612', phone: '(312) 864-7050', fax: '(312) 864-7051', npi: '1130000015' },
  { id: 'ph296', name: 'Walgreens Specialty Pharmacy — Chicago', chain: 'Walgreens Specialty', address: '104 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60603', phone: '(312) 984-0410', fax: '(312) 984-0411', npi: '1140000001' },
  { id: 'ph297', name: 'CVS Specialty Pharmacy — Deerfield', chain: 'CVS Specialty', address: '2030 Waukegan Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 405-1100', fax: '(847) 405-1101', npi: '1140000002' },
  { id: 'ph298', name: 'Accredo Health Group — Chicago', chain: 'Accredo', address: '55 E Monroe St Suite 2900', city: 'Chicago', state: 'IL', zip: '60603', phone: '(312) 566-9300', fax: '(312) 566-9301', npi: '1140000003' },
  { id: 'ph299', name: 'BioPlus Specialty Pharmacy — Lincolnshire', chain: 'BioPlus', address: '1 Overlook Point', city: 'Lincolnshire', state: 'IL', zip: '60069', phone: '(847) 295-0101', fax: '(847) 295-0102', npi: '1140000004' },
  { id: 'ph300', name: 'PharMerica — Broadview', chain: 'PharMerica', address: '2401 S 25th Ave', city: 'Broadview', state: 'IL', zip: '60155', phone: '(708) 344-0700', fax: '(708) 344-0701', npi: '1140000005' },
  { id: 'ph301', name: 'Diplomat Pharmacy — Chicago', chain: 'Diplomat', address: '211 E Ontario St Suite 1110', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 943-5810', fax: '(312) 943-5811', npi: '1140000006' },
  { id: 'ph302', name: 'Omnicare Long-Term Care Pharmacy — Chicago', chain: 'Omnicare', address: '4055 W Arthington St', city: 'Chicago', state: 'IL', zip: '60624', phone: '(773) 533-9200', fax: '(773) 533-9201', npi: '1140000007' },
  { id: 'ph303', name: 'Express Scripts Specialty Pharmacy — IL', chain: 'Express Scripts', address: '600 N Elston Ave', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 280-6900', fax: '(312) 280-6901', npi: '1140000008' },
  { id: 'ph304', name: 'Ravenswood Pharmacy', chain: 'Independent', address: '4553 N Damen Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 769-0010', fax: '(773) 769-0011', npi: '1150000001' },
  { id: 'ph305', name: 'Lincoln Square Pharmacy', chain: 'Independent', address: '4738 N Western Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 561-5444', fax: '(773) 561-5445', npi: '1150000002' },
  { id: 'ph306', name: 'Hyde Park Drugs', chain: 'Independent', address: '1512 E 55th St', city: 'Chicago', state: 'IL', zip: '60615', phone: '(773) 667-1400', fax: '(773) 667-1401', npi: '1150000003' },
  { id: 'ph307', name: 'Wicker Park Pharmacy', chain: 'Independent', address: '1500 N Milwaukee Ave', city: 'Chicago', state: 'IL', zip: '60622', phone: '(773) 342-0880', fax: '(773) 342-0881', npi: '1150000004' },
  { id: 'ph308', name: 'South Loop Pharmacy', chain: 'Independent', address: '1720 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60616', phone: '(312) 326-0040', fax: '(312) 326-0041', npi: '1150000005' },
  { id: 'ph309', name: 'Lakeview Pharmacy', chain: 'Independent', address: '3457 N Southport Ave', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 472-7300', fax: '(773) 472-7301', npi: '1150000006' },
  { id: 'ph310', name: 'Pilsen Pharmacy', chain: 'Independent', address: '1800 W 18th St', city: 'Chicago', state: 'IL', zip: '60608', phone: '(312) 733-5411', fax: '(312) 733-5412', npi: '1150000007' },
  { id: 'ph311', name: 'Bridgeport Pharmacy', chain: 'Independent', address: '3101 S Halsted St', city: 'Chicago', state: 'IL', zip: '60608', phone: '(312) 842-0020', fax: '(312) 842-0021', npi: '1150000008' },
  { id: 'ph312', name: 'Beverly Family Pharmacy', chain: 'Independent', address: '10348 S Western Ave', city: 'Chicago', state: 'IL', zip: '60643', phone: '(773) 233-3400', fax: '(773) 233-3401', npi: '1150000009' },
  { id: 'ph313', name: 'Rogers Park Pharmacy', chain: 'Independent', address: '1501 W Howard St', city: 'Chicago', state: 'IL', zip: '60626', phone: '(773) 761-0020', fax: '(773) 761-0021', npi: '1150000010' },
  { id: 'ph314', name: 'Andersonville Pharmacy', chain: 'Independent', address: '5201 N Clark St', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 334-2222', fax: '(773) 334-2223', npi: '1150000011' },
  { id: 'ph315', name: 'Chatham Pharmacy', chain: 'Independent', address: '8100 S Cottage Grove Ave', city: 'Chicago', state: 'IL', zip: '60619', phone: '(773) 487-0110', fax: '(773) 487-0111', npi: '1150000012' },
  { id: 'ph316', name: 'Pullman Pharmacy', chain: 'Independent', address: '11155 S Cottage Grove Ave', city: 'Chicago', state: 'IL', zip: '60628', phone: '(773) 785-1300', fax: '(773) 785-1301', npi: '1150000013' },
  { id: 'ph317', name: 'Bucktown Pharmacy', chain: 'Independent', address: '2100 N Western Ave', city: 'Chicago', state: 'IL', zip: '60647', phone: '(773) 489-3010', fax: '(773) 489-3011', npi: '1150000014' },
  { id: 'ph318', name: 'Elmhurst Community Pharmacy', chain: 'Independent', address: '190 S Addison Ave', city: 'Elmhurst', state: 'IL', zip: '60126', phone: '(630) 833-0040', fax: '(630) 833-0041', npi: '1150000015' },
  { id: 'ph319', name: 'Wheaton Family Pharmacy', chain: 'Independent', address: '225 N Main St', city: 'Wheaton', state: 'IL', zip: '60187', phone: '(630) 653-0820', fax: '(630) 653-0821', npi: '1150000016' },
  { id: 'ph320', name: 'Geneva Community Pharmacy', chain: 'Independent', address: '420 S Third St', city: 'Geneva', state: 'IL', zip: '60134', phone: '(630) 232-5010', fax: '(630) 232-5011', npi: '1150000017' },
  { id: 'ph321', name: 'St. Charles Pharmacy', chain: 'Independent', address: '2 E Main St', city: 'St. Charles', state: 'IL', zip: '60174', phone: '(630) 584-1020', fax: '(630) 584-1021', npi: '1150000018' },
  { id: 'ph322', name: 'Barrington Family Pharmacy', chain: 'Independent', address: '142 E Station St', city: 'Barrington', state: 'IL', zip: '60010', phone: '(847) 381-3050', fax: '(847) 381-3051', npi: '1150000019' },
  { id: 'ph323', name: 'Crystal Lake Pharmacy', chain: 'Independent', address: '35 N Williams St', city: 'Crystal Lake', state: 'IL', zip: '60014', phone: '(815) 459-0120', fax: '(815) 459-0121', npi: '1150000020' },
  { id: 'ph324', name: 'Libertyville Pharmacy', chain: 'Independent', address: '712 N Milwaukee Ave', city: 'Libertyville', state: 'IL', zip: '60048', phone: '(847) 362-2100', fax: '(847) 362-2101', npi: '1150000021' },
  { id: 'ph325', name: 'Downtown Bloomington Pharmacy', chain: 'Independent', address: '303 N Main St', city: 'Bloomington', state: 'IL', zip: '61701', phone: '(309) 827-0301', fax: '(309) 827-0302', npi: '1150000022' },
  { id: 'ph326', name: 'Prairie Capital Pharmacy', chain: 'Independent', address: '1030 S Sixth St', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 544-0101', fax: '(217) 544-0102', npi: '1150000023' },
  { id: 'ph327', name: 'Heartland Pharmacy — Champaign', chain: 'Independent', address: '902 W Springfield Ave', city: 'Champaign', state: 'IL', zip: '61820', phone: '(217) 352-1080', fax: '(217) 352-1081', npi: '1150000024' },
  { id: 'ph328', name: 'College of Pharmacy Clinic Rx', chain: 'Independent', address: '833 S Wood St', city: 'Chicago', state: 'IL', zip: '60612', phone: '(312) 996-9600', fax: '(312) 996-9601', npi: '1150000025' },

  // ── Additional CVS Pharmacy — Chicago (expanded) ───────────────────────────
  { id: 'ph329', name: 'CVS Pharmacy #2616', chain: 'CVS', address: '3033 N Broadway', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 248-2550', fax: '(773) 248-2551', npi: '1200000329' },
  { id: 'ph330', name: 'CVS Pharmacy #9771', chain: 'CVS', address: '301 S Halsted St', city: 'Chicago', state: 'IL', zip: '60661', phone: '(312) 474-9080', fax: '(312) 474-9081', npi: '1200000330' },
  { id: 'ph331', name: 'CVS Pharmacy #5402', chain: 'CVS', address: '1212 N Wells St', city: 'Chicago', state: 'IL', zip: '60610', phone: '(312) 266-1031', fax: '(312) 266-1032', npi: '1200000331' },
  { id: 'ph332', name: 'CVS Pharmacy #4981', chain: 'CVS', address: '1 E Delaware Pl', city: 'Chicago', state: 'IL', zip: '60611', phone: '(312) 337-3802', fax: '(312) 337-3803', npi: '1200000332' },
  { id: 'ph333', name: 'CVS Pharmacy #6204', chain: 'CVS', address: '57 W Grand Ave', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 670-2020', fax: '(312) 670-2021', npi: '1200000333' },
  { id: 'ph334', name: 'CVS Pharmacy #7044', chain: 'CVS', address: '1603 E 55th St', city: 'Chicago', state: 'IL', zip: '60615', phone: '(773) 363-3400', fax: '(773) 363-3401', npi: '1200000334' },
  { id: 'ph335', name: 'CVS Pharmacy #8119', chain: 'CVS', address: '1500 E 53rd St', city: 'Chicago', state: 'IL', zip: '60615', phone: '(773) 288-1540', fax: '(773) 288-1541', npi: '1200000335' },
  { id: 'ph336', name: 'CVS Pharmacy #5821', chain: 'CVS', address: '2559 N Milwaukee Ave', city: 'Chicago', state: 'IL', zip: '60647', phone: '(773) 252-0810', fax: '(773) 252-0811', npi: '1200000336' },
  { id: 'ph337', name: 'CVS Pharmacy #7302', chain: 'CVS', address: '4020 N Sheridan Rd', city: 'Chicago', state: 'IL', zip: '60613', phone: '(773) 525-4040', fax: '(773) 525-4041', npi: '1200000337' },
  { id: 'ph338', name: 'CVS Pharmacy #8650', chain: 'CVS', address: '6840 N Western Ave', city: 'Chicago', state: 'IL', zip: '60645', phone: '(773) 743-2011', fax: '(773) 743-2012', npi: '1200000338' },
  { id: 'ph339', name: 'CVS Pharmacy #7910', chain: 'CVS', address: '2000 W Peterson Ave', city: 'Chicago', state: 'IL', zip: '60659', phone: '(773) 728-0030', fax: '(773) 728-0031', npi: '1200000339' },
  { id: 'ph340', name: 'CVS Pharmacy #9200', chain: 'CVS', address: '6145 N Broadway', city: 'Chicago', state: 'IL', zip: '60660', phone: '(773) 262-0081', fax: '(773) 262-0082', npi: '1200000340' },
  { id: 'ph341', name: 'CVS Pharmacy #6033', chain: 'CVS', address: '2201 N Clybourn Ave', city: 'Chicago', state: 'IL', zip: '60614', phone: '(773) 327-0914', fax: '(773) 327-0915', npi: '1200000341' },
  { id: 'ph342', name: 'CVS Pharmacy #8291', chain: 'CVS', address: '3159 N Lincoln Ave', city: 'Chicago', state: 'IL', zip: '60657', phone: '(773) 975-0660', fax: '(773) 975-0661', npi: '1200000342' },
  { id: 'ph343', name: 'CVS Pharmacy #5710', chain: 'CVS', address: '4722 N Western Ave', city: 'Chicago', state: 'IL', zip: '60625', phone: '(773) 989-2210', fax: '(773) 989-2211', npi: '1200000343' },
  { id: 'ph344', name: 'CVS Pharmacy #9444', chain: 'CVS', address: '9401 S Commercial Ave', city: 'Chicago', state: 'IL', zip: '60617', phone: '(773) 933-0510', fax: '(773) 933-0511', npi: '1200000344' },
  { id: 'ph345', name: 'CVS Pharmacy #7088', chain: 'CVS', address: '1039 W Madison St', city: 'Chicago', state: 'IL', zip: '60607', phone: '(312) 421-3920', fax: '(312) 421-3921', npi: '1200000345' },
  { id: 'ph346', name: 'CVS Pharmacy #8502', chain: 'CVS', address: '1440 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60605', phone: '(312) 922-4100', fax: '(312) 922-4101', npi: '1200000346' },
  { id: 'ph347', name: 'CVS Pharmacy #6844', chain: 'CVS', address: '11220 S Halsted St', city: 'Chicago', state: 'IL', zip: '60628', phone: '(773) 928-3600', fax: '(773) 928-3601', npi: '1200000347' },
  { id: 'ph348', name: 'CVS Pharmacy #9062', chain: 'CVS', address: '3755 W 26th St', city: 'Chicago', state: 'IL', zip: '60623', phone: '(773) 521-0940', fax: '(773) 521-0941', npi: '1200000348' },
  { id: 'ph349', name: 'CVS Pharmacy #8177', chain: 'CVS', address: '4201 S Pulaski Rd', city: 'Chicago', state: 'IL', zip: '60632', phone: '(773) 579-0140', fax: '(773) 579-0141', npi: '1200000349' },
  { id: 'ph350', name: 'CVS Pharmacy #7530', chain: 'CVS', address: '6330 S Cottage Grove Ave', city: 'Chicago', state: 'IL', zip: '60637', phone: '(773) 955-0322', fax: '(773) 955-0323', npi: '1200000350' },

  // ── CVS Pharmacy — North Shore & NW Suburbs ────────────────────────────────
  { id: 'ph351', name: 'CVS Pharmacy #8804', chain: 'CVS', address: '824 Green Bay Rd', city: 'Wilmette', state: 'IL', zip: '60091', phone: '(847) 256-3020', fax: '(847) 256-3021', npi: '1200000351' },
  { id: 'ph352', name: 'CVS Pharmacy #9315', chain: 'CVS', address: '620 Green Bay Rd', city: 'Kenilworth', state: 'IL', zip: '60043', phone: '(847) 256-8800', fax: '(847) 256-8801', npi: '1200000352' },
  { id: 'ph353', name: 'CVS Pharmacy #7112', chain: 'CVS', address: '727 Green Bay Rd', city: 'Winnetka', state: 'IL', zip: '60093', phone: '(847) 441-2210', fax: '(847) 441-2211', npi: '1200000353' },
  { id: 'ph354', name: 'CVS Pharmacy #8430', chain: 'CVS', address: '650 N Western Ave', city: 'Lake Forest', state: 'IL', zip: '60045', phone: '(847) 295-2011', fax: '(847) 295-2012', npi: '1200000354' },
  { id: 'ph355', name: 'CVS Pharmacy #6722', chain: 'CVS', address: '1801 Deerfield Rd', city: 'Highland Park', state: 'IL', zip: '60035', phone: '(847) 831-2040', fax: '(847) 831-2041', npi: '1200000355' },
  { id: 'ph356', name: 'CVS Pharmacy #9001', chain: 'CVS', address: '500 N Milwaukee Ave', city: 'Libertyville', state: 'IL', zip: '60048', phone: '(847) 362-3010', fax: '(847) 362-3011', npi: '1200000356' },
  { id: 'ph357', name: 'CVS Pharmacy #7840', chain: 'CVS', address: '701 N Milwaukee Ave', city: 'Vernon Hills', state: 'IL', zip: '60061', phone: '(847) 680-0420', fax: '(847) 680-0421', npi: '1200000357' },
  { id: 'ph358', name: 'CVS Pharmacy #8563b', chain: 'CVS', address: '1490 S Waukegan Rd', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 623-0181', fax: '(847) 623-0182', npi: '1200000358' },
  { id: 'ph359', name: 'CVS Pharmacy #7241', chain: 'CVS', address: '2625 Grand Ave', city: 'Waukegan', state: 'IL', zip: '60085', phone: '(847) 244-1020', fax: '(847) 244-1021', npi: '1200000359' },
  { id: 'ph360', name: 'CVS Pharmacy #6812', chain: 'CVS', address: '1221 Waukegan Rd', city: 'Deerfield', state: 'IL', zip: '60015', phone: '(847) 945-0230', fax: '(847) 945-0231', npi: '1200000360' },
  { id: 'ph361', name: 'CVS Pharmacy #9102', chain: 'CVS', address: '1400 N Buffalo Grove Rd', city: 'Buffalo Grove', state: 'IL', zip: '60089', phone: '(847) 459-2010', fax: '(847) 459-2011', npi: '1200000361' },
  { id: 'ph362', name: 'CVS Pharmacy #8014', chain: 'CVS', address: '350 S Elmhurst Rd', city: 'Mount Prospect', state: 'IL', zip: '60056', phone: '(847) 255-3010', fax: '(847) 255-3011', npi: '1200000362' },
  { id: 'ph363', name: 'CVS Pharmacy #7620', chain: 'CVS', address: '1050 E Oakton St', city: 'Des Plaines', state: 'IL', zip: '60018', phone: '(847) 699-0510', fax: '(847) 699-0511', npi: '1200000363' },
  { id: 'ph364', name: 'CVS Pharmacy #9441', chain: 'CVS', address: '2401 Dempster St', city: 'Evanston', state: 'IL', zip: '60201', phone: '(847) 328-4011', fax: '(847) 328-4012', npi: '1200000364' },
  { id: 'ph365', name: 'CVS Pharmacy #8301', chain: 'CVS', address: '1714 Maple Ave', city: 'Evanston', state: 'IL', zip: '60201', phone: '(847) 475-1020', fax: '(847) 475-1021', npi: '1200000365' },
  { id: 'ph366', name: 'CVS Pharmacy #7055', chain: 'CVS', address: '4711 Main St', city: 'Skokie', state: 'IL', zip: '60076', phone: '(847) 674-0290', fax: '(847) 674-0291', npi: '1200000366' },
  { id: 'ph367', name: 'CVS Pharmacy #8742', chain: 'CVS', address: '9401 Skokie Blvd', city: 'Skokie', state: 'IL', zip: '60077', phone: '(847) 677-0910', fax: '(847) 677-0911', npi: '1200000367' },
  { id: 'ph368', name: 'CVS Pharmacy #6503', chain: 'CVS', address: '200 Waukegan Rd', city: 'Glenview', state: 'IL', zip: '60025', phone: '(847) 729-0820', fax: '(847) 729-0821', npi: '1200000368' },
  { id: 'ph369', name: 'CVS Pharmacy #9214b', chain: 'CVS', address: '1825 N Rolling Meadows Dr', city: 'Rolling Meadows', state: 'IL', zip: '60008', phone: '(847) 303-0500', fax: '(847) 303-0501', npi: '1200000369' },
  { id: 'ph370', name: 'CVS Pharmacy #7831c', chain: 'CVS', address: '100 E Euclid Ave', city: 'Arlington Heights', state: 'IL', zip: '60004', phone: '(847) 255-0201', fax: '(847) 255-0202', npi: '1200000370' },
  { id: 'ph371', name: 'CVS Pharmacy #8610', chain: 'CVS', address: '1000 N Roselle Rd', city: 'Schaumburg', state: 'IL', zip: '60195', phone: '(847) 882-0310', fax: '(847) 882-0311', npi: '1200000371' },
  { id: 'ph372', name: 'CVS Pharmacy #7423', chain: 'CVS', address: '301 N Martingale Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 330-0810', fax: '(847) 330-0811', npi: '1200000372' },
  { id: 'ph373', name: 'CVS Pharmacy #9033', chain: 'CVS', address: '920 E Golf Rd', city: 'Hoffman Estates', state: 'IL', zip: '60169', phone: '(847) 882-0101', fax: '(847) 882-0102', npi: '1200000373' },
  { id: 'ph374', name: 'CVS Pharmacy #6821', chain: 'CVS', address: '1285 N Meacham Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 517-0430', fax: '(847) 517-0431', npi: '1200000374' },
  { id: 'ph375', name: 'CVS Pharmacy #8104', chain: 'CVS', address: '6700 Lake St', city: 'Hanover Park', state: 'IL', zip: '60133', phone: '(630) 830-0720', fax: '(630) 830-0721', npi: '1200000375' },
  { id: 'ph376', name: 'CVS Pharmacy #9340', chain: 'CVS', address: '810 S Bartlett Rd', city: 'Streamwood', state: 'IL', zip: '60107', phone: '(630) 289-1020', fax: '(630) 289-1021', npi: '1200000376' },
  { id: 'ph377', name: 'CVS Pharmacy #7503', chain: 'CVS', address: '250 N Smith St', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 741-0920', fax: '(847) 741-0921', npi: '1200000377' },
  { id: 'ph378', name: 'CVS Pharmacy #8840', chain: 'CVS', address: '800 E Chicago St', city: 'Elgin', state: 'IL', zip: '60120', phone: '(847) 695-3010', fax: '(847) 695-3011', npi: '1200000378' },
  { id: 'ph379', name: 'CVS Pharmacy #6614', chain: 'CVS', address: '1440 S Randall Rd', city: 'Elgin', state: 'IL', zip: '60123', phone: '(847) 783-0220', fax: '(847) 783-0221', npi: '1200000379' },

  // ── CVS Pharmacy — West & SW Suburbs ──────────────────────────────────────
  { id: 'ph380', name: 'CVS Pharmacy #9521', chain: 'CVS', address: '150 S Gary Ave', city: 'Carol Stream', state: 'IL', zip: '60188', phone: '(630) 653-0440', fax: '(630) 653-0441', npi: '1200000380' },
  { id: 'ph381', name: 'CVS Pharmacy #7714', chain: 'CVS', address: '620 E North Ave', city: 'Lombard', state: 'IL', zip: '60148', phone: '(630) 620-0210', fax: '(630) 620-0211', npi: '1200000381' },
  { id: 'ph382', name: 'CVS Pharmacy #8330', chain: 'CVS', address: '2020 S Route 59', city: 'Plainfield', state: 'IL', zip: '60586', phone: '(815) 436-0320', fax: '(815) 436-0321', npi: '1200000382' },
  { id: 'ph383', name: 'CVS Pharmacy #9081', chain: 'CVS', address: '1320 N Farnsworth Ave', city: 'Aurora', state: 'IL', zip: '60505', phone: '(630) 851-2010', fax: '(630) 851-2011', npi: '1200000383' },
  { id: 'ph384', name: 'CVS Pharmacy #7201', chain: 'CVS', address: '875 S Eola Rd', city: 'Aurora', state: 'IL', zip: '60504', phone: '(630) 820-0330', fax: '(630) 820-0331', npi: '1200000384' },
  { id: 'ph385', name: 'CVS Pharmacy #8802', chain: 'CVS', address: '2150 W Galena Blvd', city: 'Aurora', state: 'IL', zip: '60506', phone: '(630) 844-1040', fax: '(630) 844-1041', npi: '1200000385' },
  { id: 'ph386', name: 'CVS Pharmacy #6401', chain: 'CVS', address: '7220 S Lemont Rd', city: 'Woodridge', state: 'IL', zip: '60517', phone: '(630) 783-0820', fax: '(630) 783-0821', npi: '1200000386' },
  { id: 'ph387', name: 'CVS Pharmacy #9115', chain: 'CVS', address: '7305 S Cass Ave', city: 'Darien', state: 'IL', zip: '60561', phone: '(630) 323-0540', fax: '(630) 323-0541', npi: '1200000387' },
  { id: 'ph388', name: 'CVS Pharmacy #7660', chain: 'CVS', address: '6245 S Cass Ave', city: 'Westmont', state: 'IL', zip: '60559', phone: '(630) 241-1110', fax: '(630) 241-1111', npi: '1200000388' },
  { id: 'ph389', name: 'CVS Pharmacy #8912', chain: 'CVS', address: '455 E Ogden Ave', city: 'Westmont', state: 'IL', zip: '60559', phone: '(630) 968-0420', fax: '(630) 968-0421', npi: '1200000389' },
  { id: 'ph390', name: 'CVS Pharmacy #7040', chain: 'CVS', address: '14740 La Grange Rd', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 349-3020', fax: '(708) 349-3021', npi: '1200000390' },
  { id: 'ph391', name: 'CVS Pharmacy #9260', chain: 'CVS', address: '18400 S 80th Ave', city: 'Tinley Park', state: 'IL', zip: '60477', phone: '(708) 614-0120', fax: '(708) 614-0121', npi: '1200000391' },
  { id: 'ph392', name: 'CVS Pharmacy #8031', chain: 'CVS', address: '15850 S Oak Park Ave', city: 'Tinley Park', state: 'IL', zip: '60477', phone: '(708) 532-2010', fax: '(708) 532-2011', npi: '1200000392' },
  { id: 'ph393', name: 'CVS Pharmacy #7514', chain: 'CVS', address: '19134 Wolf Rd', city: 'Mokena', state: 'IL', zip: '60448', phone: '(708) 479-2050', fax: '(708) 479-2051', npi: '1200000393' },
  { id: 'ph394', name: 'CVS Pharmacy #9340b', chain: 'CVS', address: '1300 N Cedar Rd', city: 'New Lenox', state: 'IL', zip: '60451', phone: '(815) 462-0220', fax: '(815) 462-0221', npi: '1200000394' },
  { id: 'ph395', name: 'CVS Pharmacy #8211', chain: 'CVS', address: '3100 W Jefferson St', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 744-1020', fax: '(815) 744-1021', npi: '1200000395' },
  { id: 'ph396', name: 'CVS Pharmacy #7811', chain: 'CVS', address: '2001 W Caton Farm Rd', city: 'Joliet', state: 'IL', zip: '60586', phone: '(815) 436-3010', fax: '(815) 436-3011', npi: '1200000396' },
  { id: 'ph397', name: 'CVS Pharmacy #9050', chain: 'CVS', address: '1140 N Larkin Ave', city: 'Joliet', state: 'IL', zip: '60435', phone: '(815) 729-3030', fax: '(815) 729-3031', npi: '1200000397' },
  { id: 'ph398', name: 'CVS Pharmacy #6730', chain: 'CVS', address: '2625 N Illinois St', city: 'Swansea', state: 'IL', zip: '62226', phone: '(618) 236-0420', fax: '(618) 236-0421', npi: '1200000398' },
  { id: 'ph399', name: 'CVS Pharmacy #8441', chain: 'CVS', address: '4505 Green Mount Crossing Dr', city: 'Shiloh', state: 'IL', zip: '62221', phone: '(618) 624-0310', fax: '(618) 624-0311', npi: '1200000399' },

  // ── CVS Pharmacy — South Suburbs ──────────────────────────────────────────
  { id: 'ph400', name: 'CVS Pharmacy #8310b', chain: 'CVS', address: '2401 Lincoln Hwy', city: 'Chicago Heights', state: 'IL', zip: '60411', phone: '(708) 754-0630', fax: '(708) 754-0631', npi: '1200000400' },
  { id: 'ph401', name: 'CVS Pharmacy #7140', chain: 'CVS', address: '19101 S Halsted St', city: 'Homewood', state: 'IL', zip: '60430', phone: '(708) 957-3010', fax: '(708) 957-3011', npi: '1200000401' },
  { id: 'ph402', name: 'CVS Pharmacy #9602', chain: 'CVS', address: '17001 Dixie Hwy', city: 'Hazel Crest', state: 'IL', zip: '60429', phone: '(708) 335-0220', fax: '(708) 335-0221', npi: '1200000402' },
  { id: 'ph403', name: 'CVS Pharmacy #7903', chain: 'CVS', address: '14350 S Cicero Ave', city: 'Midlothian', state: 'IL', zip: '60445', phone: '(708) 385-0810', fax: '(708) 385-0811', npi: '1200000403' },
  { id: 'ph404', name: 'CVS Pharmacy #8512', chain: 'CVS', address: '1 Orland Park Pl', city: 'Orland Park', state: 'IL', zip: '60462', phone: '(708) 403-3010', fax: '(708) 403-3011', npi: '1200000404' },

  // ── CVS Pharmacy — Crystal Lake / McHenry County ──────────────────────────
  { id: 'ph405', name: 'CVS Pharmacy #8201', chain: 'CVS', address: '6710 Northwest Hwy', city: 'Crystal Lake', state: 'IL', zip: '60014', phone: '(815) 459-0320', fax: '(815) 459-0321', npi: '1200000405' },
  { id: 'ph406', name: 'CVS Pharmacy #9040', chain: 'CVS', address: '4811 W Elm St', city: 'McHenry', state: 'IL', zip: '60050', phone: '(815) 344-1040', fax: '(815) 344-1041', npi: '1200000406' },
  { id: 'ph407', name: 'CVS Pharmacy #7321', chain: 'CVS', address: '1120 N Route 31', city: 'Crystal Lake', state: 'IL', zip: '60012', phone: '(815) 477-0220', fax: '(815) 477-0221', npi: '1200000407' },

  // ── CVS Pharmacy — Rockford Metro ─────────────────────────────────────────
  { id: 'ph408', name: 'CVS Pharmacy #7481', chain: 'CVS', address: '1703 N Alpine Rd', city: 'Rockford', state: 'IL', zip: '61107', phone: '(815) 227-0310', fax: '(815) 227-0311', npi: '1200000408' },
  { id: 'ph409', name: 'CVS Pharmacy #8821b', chain: 'CVS', address: '4801 E State St', city: 'Rockford', state: 'IL', zip: '61108', phone: '(815) 226-0120', fax: '(815) 226-0121', npi: '1200000409' },
  { id: 'ph410', name: 'CVS Pharmacy #9103', chain: 'CVS', address: '6900 Broadcast Pkwy', city: 'Loves Park', state: 'IL', zip: '61111', phone: '(815) 654-0440', fax: '(815) 654-0441', npi: '1200000410' },

  // ── CVS Pharmacy — Peoria / Central IL ────────────────────────────────────
  { id: 'ph411', name: 'CVS Pharmacy #8044', chain: 'CVS', address: '4620 N Sheridan Rd', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 691-2010', fax: '(309) 691-2011', npi: '1200000411' },
  { id: 'ph412', name: 'CVS Pharmacy #7612', chain: 'CVS', address: '1516 W Glen Ave', city: 'Peoria', state: 'IL', zip: '61614', phone: '(309) 689-0120', fax: '(309) 689-0121', npi: '1200000412' },
  { id: 'ph413', name: 'CVS Pharmacy #9201', chain: 'CVS', address: '501 W War Memorial Dr', city: 'Peoria', state: 'IL', zip: '61615', phone: '(309) 681-0410', fax: '(309) 681-0411', npi: '1200000413' },
  { id: 'ph414', name: 'CVS Pharmacy #8310c', chain: 'CVS', address: '3600 N Knoxville Ave', city: 'Peoria', state: 'IL', zip: '61603', phone: '(309) 685-0220', fax: '(309) 685-0221', npi: '1200000414' },
  { id: 'ph415', name: 'CVS Pharmacy #7042', chain: 'CVS', address: '5700 N Allen Rd', city: 'Peoria Heights', state: 'IL', zip: '61616', phone: '(309) 682-0110', fax: '(309) 682-0111', npi: '1200000415' },
  { id: 'ph416', name: 'CVS Pharmacy #8903', chain: 'CVS', address: '200 W Anthony Dr', city: 'Champaign', state: 'IL', zip: '61822', phone: '(217) 356-0820', fax: '(217) 356-0821', npi: '1200000416' },
  { id: 'ph417', name: 'CVS Pharmacy #7530b', chain: 'CVS', address: '502 E Green St', city: 'Champaign', state: 'IL', zip: '61820', phone: '(217) 352-0310', fax: '(217) 352-0311', npi: '1200000417' },
  { id: 'ph418', name: 'CVS Pharmacy #9411', chain: 'CVS', address: '602 W Springfield Ave', city: 'Urbana', state: 'IL', zip: '61801', phone: '(217) 367-0210', fax: '(217) 367-0211', npi: '1200000418' },
  { id: 'ph419', name: 'CVS Pharmacy #8020', chain: 'CVS', address: '2605 E Oakland Ave', city: 'Bloomington', state: 'IL', zip: '61701', phone: '(309) 663-0320', fax: '(309) 663-0321', npi: '1200000419' },
  { id: 'ph420', name: 'CVS Pharmacy #7814', chain: 'CVS', address: '1 Veterans Pkwy', city: 'Normal', state: 'IL', zip: '61761', phone: '(309) 451-0220', fax: '(309) 451-0221', npi: '1200000420' },
  { id: 'ph421', name: 'CVS Pharmacy #9302', chain: 'CVS', address: '1701 E College Ave', city: 'Normal', state: 'IL', zip: '61761', phone: '(309) 454-0120', fax: '(309) 454-0121', npi: '1200000421' },

  // ── CVS Pharmacy — Springfield Area ───────────────────────────────────────
  { id: 'ph422', name: 'CVS Pharmacy #8041', chain: 'CVS', address: '2741 S MacArthur Blvd', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 546-0320', fax: '(217) 546-0321', npi: '1200000422' },
  { id: 'ph423', name: 'CVS Pharmacy #7213', chain: 'CVS', address: '2735 W Jefferson St', city: 'Springfield', state: 'IL', zip: '62702', phone: '(217) 787-0140', fax: '(217) 787-0141', npi: '1200000423' },
  { id: 'ph424', name: 'CVS Pharmacy #9512', chain: 'CVS', address: '1615 W Wabash Ave', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 793-0210', fax: '(217) 793-0211', npi: '1200000424' },

  // ── CVS Pharmacy — Decatur / Quincy / Downstate ───────────────────────────
  { id: 'ph425', name: 'CVS Pharmacy #8602', chain: 'CVS', address: '3011 N Water St', city: 'Decatur', state: 'IL', zip: '62526', phone: '(217) 876-0320', fax: '(217) 876-0321', npi: '1200000425' },
  { id: 'ph426', name: 'CVS Pharmacy #7420', chain: 'CVS', address: '125 W Eldorado St', city: 'Decatur', state: 'IL', zip: '62522', phone: '(217) 422-0110', fax: '(217) 422-0111', npi: '1200000426' },
  { id: 'ph427', name: 'CVS Pharmacy #9110', chain: 'CVS', address: '2200 Broadway', city: 'Quincy', state: 'IL', zip: '62301', phone: '(217) 224-0320', fax: '(217) 224-0321', npi: '1200000427' },
  { id: 'ph428', name: 'CVS Pharmacy #8340', chain: 'CVS', address: '301 N Henderson St', city: 'Galesburg', state: 'IL', zip: '61401', phone: '(309) 342-0130', fax: '(309) 342-0131', npi: '1200000428' },
  { id: 'ph429', name: 'CVS Pharmacy #7601', chain: 'CVS', address: '3111 N Vermilion St', city: 'Danville', state: 'IL', zip: '61832', phone: '(217) 443-0220', fax: '(217) 443-0221', npi: '1200000429' },
  { id: 'ph430', name: 'CVS Pharmacy #9210', chain: 'CVS', address: '1300 W Court St', city: 'Kankakee', state: 'IL', zip: '60901', phone: '(815) 939-0120', fax: '(815) 939-0121', npi: '1200000430' },
  { id: 'ph431', name: 'CVS Pharmacy #8104b', chain: 'CVS', address: '1601 N Kankakee St', city: 'Watseka', state: 'IL', zip: '60970', phone: '(815) 432-0110', fax: '(815) 432-0111', npi: '1200000431' },

  // ── CVS Pharmacy — Metro East (St. Louis IL) ──────────────────────────────
  { id: 'ph432', name: 'CVS Pharmacy #8020b', chain: 'CVS', address: '6801 State Rte 159', city: 'Maryville', state: 'IL', zip: '62062', phone: '(618) 288-0220', fax: '(618) 288-0221', npi: '1200000432' },
  { id: 'ph433', name: 'CVS Pharmacy #9301', chain: 'CVS', address: '201 S Belt W', city: 'Belleville', state: 'IL', zip: '62220', phone: '(618) 235-0410', fax: '(618) 235-0411', npi: '1200000433' },
  { id: 'ph434', name: 'CVS Pharmacy #7812', chain: 'CVS', address: '2 Regency Park Dr', city: 'O\'Fallon', state: 'IL', zip: '62269', phone: '(618) 632-0310', fax: '(618) 632-0311', npi: '1200000434' },
  { id: 'ph435', name: 'CVS Pharmacy #8440', chain: 'CVS', address: '1000 Troy Rd', city: 'Edwardsville', state: 'IL', zip: '62025', phone: '(618) 656-0220', fax: '(618) 656-0221', npi: '1200000435' },
  { id: 'ph436', name: 'CVS Pharmacy #9022', chain: 'CVS', address: '5000 Nameoki Rd', city: 'Granite City', state: 'IL', zip: '62040', phone: '(618) 877-0310', fax: '(618) 877-0311', npi: '1200000436' },
  { id: 'ph437', name: 'CVS Pharmacy #7340', chain: 'CVS', address: '3425 Pontoon Rd', city: 'Pontoon Beach', state: 'IL', zip: '62040', phone: '(618) 931-0120', fax: '(618) 931-0121', npi: '1200000437' },

  // ── CVS Pharmacy — Southern IL ─────────────────────────────────────────────
  { id: 'ph438', name: 'CVS Pharmacy #8811', chain: 'CVS', address: '2903 W Main St', city: 'Marion', state: 'IL', zip: '62959', phone: '(618) 993-0120', fax: '(618) 993-0121', npi: '1200000438' },
  { id: 'ph439', name: 'CVS Pharmacy #7412', chain: 'CVS', address: '1 Doctor Martin Luther King Jr Dr', city: 'Carbondale', state: 'IL', zip: '62901', phone: '(618) 457-0210', fax: '(618) 457-0211', npi: '1200000439' },
  { id: 'ph440', name: 'CVS Pharmacy #9114', chain: 'CVS', address: '4720 Broadway', city: 'Mt. Vernon', state: 'IL', zip: '62864', phone: '(618) 244-0110', fax: '(618) 244-0111', npi: '1200000440' },
  { id: 'ph441', name: 'CVS Pharmacy #8201b', chain: 'CVS', address: '201 Richview Rd', city: 'Mt. Vernon', state: 'IL', zip: '62864', phone: '(618) 242-0320', fax: '(618) 242-0321', npi: '1200000441' },

  // ── CVS Pharmacy — I-39 Corridor (Ottawa / Peru / Dixon) ──────────────────
  { id: 'ph442', name: 'CVS Pharmacy #7620b', chain: 'CVS', address: '1500 Columbus St', city: 'Ottawa', state: 'IL', zip: '61350', phone: '(815) 434-0320', fax: '(815) 434-0321', npi: '1200000442' },
  { id: 'ph443', name: 'CVS Pharmacy #8302', chain: 'CVS', address: '2020 Fourth St', city: 'Peru', state: 'IL', zip: '61354', phone: '(815) 224-0110', fax: '(815) 224-0111', npi: '1200000443' },
  { id: 'ph444', name: 'CVS Pharmacy #9021', chain: 'CVS', address: '1551 S Galena Ave', city: 'Dixon', state: 'IL', zip: '61021', phone: '(815) 284-0220', fax: '(815) 284-0221', npi: '1200000444' },
  { id: 'ph445', name: 'CVS Pharmacy #7501', chain: 'CVS', address: '1401 Sycamore Rd', city: 'DeKalb', state: 'IL', zip: '60115', phone: '(815) 748-0310', fax: '(815) 748-0311', npi: '1200000445' },

  // ── CVS Pharmacy — Additional Rolling Meadows / NW Suburbs ────────────────
  { id: 'ph446', name: 'CVS Pharmacy #6940', chain: 'CVS', address: '3501 Kirchoff Rd', city: 'Rolling Meadows', state: 'IL', zip: '60008', phone: '(847) 818-0120', fax: '(847) 818-0121', npi: '1200000446' },
  { id: 'ph447', name: 'CVS Pharmacy #8120', chain: 'CVS', address: '1250 S Elmhurst Rd', city: 'Des Plaines', state: 'IL', zip: '60018', phone: '(847) 297-0310', fax: '(847) 297-0311', npi: '1200000447' },
  { id: 'ph448', name: 'CVS Pharmacy #7804', chain: 'CVS', address: '1900 E Algonquin Rd', city: 'Schaumburg', state: 'IL', zip: '60173', phone: '(847) 397-0310', fax: '(847) 397-0311', npi: '1200000448' },
  { id: 'ph449', name: 'CVS Pharmacy #9241', chain: 'CVS', address: '2500 W Algonquin Rd', city: 'Algonquin', state: 'IL', zip: '60102', phone: '(847) 658-0220', fax: '(847) 658-0221', npi: '1200000449' },
  { id: 'ph450', name: 'CVS Pharmacy #8604', chain: 'CVS', address: '1700 N Rand Rd', city: 'Wauconda', state: 'IL', zip: '60084', phone: '(847) 526-0120', fax: '(847) 526-0121', npi: '1200000450' },
];

// ========== ILLINOIS LAB FACILITIES ==========
export const labFacilities = [
  // ── Quest Diagnostics ──────────────────────────────────
  { id: 'lab1',  name: 'Quest Diagnostics — Chicago Loop',          chain: 'Quest Diagnostics', address: '200 W Adams St, Suite 200',              city: 'Chicago',         state: 'IL', zip: '60606', phone: '(312) 782-4480', fax: '(312) 782-4481', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab2',  name: 'Quest Diagnostics — Streeterville',         chain: 'Quest Diagnostics', address: '680 N Lake Shore Dr, Suite 820',          city: 'Chicago',         state: 'IL', zip: '60611', phone: '(312) 943-7400', fax: '(312) 943-7401', services: ['Blood Draw', 'Urine Collection', 'Genetic Testing', 'Drug Screening'] },
  { id: 'lab3',  name: 'Quest Diagnostics — Lincoln Park',          chain: 'Quest Diagnostics', address: '2525 N Clark St',                         city: 'Chicago',         state: 'IL', zip: '60614', phone: '(773) 281-7600', fax: '(773) 281-7601', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab4',  name: 'Quest Diagnostics — Skokie',                chain: 'Quest Diagnostics', address: '9933 Lawler Ave, Suite 550',              city: 'Skokie',          state: 'IL', zip: '60077', phone: '(847) 568-2250', fax: '(847) 568-2251', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab5',  name: 'Quest Diagnostics — Naperville',            chain: 'Quest Diagnostics', address: '1020 E Ogden Ave, Suite 106',             city: 'Naperville',      state: 'IL', zip: '60563', phone: '(630) 527-6120', fax: '(630) 527-6121', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab6',  name: 'Quest Diagnostics — Schaumburg',            chain: 'Quest Diagnostics', address: '1699 E Woodfield Rd, Suite 200',          city: 'Schaumburg',      state: 'IL', zip: '60173', phone: '(847) 517-3200', fax: '(847) 517-3201', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab7',  name: 'Quest Diagnostics — Oak Brook',             chain: 'Quest Diagnostics', address: '2011 York Rd, Suite 100',                 city: 'Oak Brook',       state: 'IL', zip: '60523', phone: '(630) 571-8000', fax: '(630) 571-8001', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab8',  name: 'Quest Diagnostics — Orland Park',           chain: 'Quest Diagnostics', address: '16311 S Harlem Ave',                      city: 'Orland Park',     state: 'IL', zip: '60462', phone: '(708) 460-5510', fax: '(708) 460-5511', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab9',  name: 'Quest Diagnostics — Springfield',           chain: 'Quest Diagnostics', address: '350 W Carpenter St, Suite 100',           city: 'Springfield',     state: 'IL', zip: '62702', phone: '(217) 544-9800', fax: '(217) 544-9801', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab10', name: 'Quest Diagnostics — Bloomington',           chain: 'Quest Diagnostics', address: '801 N Hershey Rd, Suite A',               city: 'Bloomington',     state: 'IL', zip: '61704', phone: '(309) 661-6200', fax: '(309) 661-6201', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab11', name: 'Quest Diagnostics — Peoria',                chain: 'Quest Diagnostics', address: '5401 N Knoxville Ave',                    city: 'Peoria',          state: 'IL', zip: '61614', phone: '(309) 589-3200', fax: '(309) 589-3201', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab12', name: 'Quest Diagnostics — Rockford',              chain: 'Quest Diagnostics', address: '5302 E State St, Suite 100',              city: 'Rockford',        state: 'IL', zip: '61108', phone: '(815) 227-6800', fax: '(815) 227-6801', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab35', name: 'Quest Diagnostics — Aurora',                chain: 'Quest Diagnostics', address: '2000 W Galena Blvd, Suite 100',           city: 'Aurora',          state: 'IL', zip: '60506', phone: '(630) 896-7100', fax: '(630) 896-7101', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab36', name: 'Quest Diagnostics — Joliet',                chain: 'Quest Diagnostics', address: '3400 Glenwood Ave, Suite A',              city: 'Joliet',          state: 'IL', zip: '60435', phone: '(815) 744-0440', fax: '(815) 744-0441', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab37', name: 'Quest Diagnostics — Elgin',                 chain: 'Quest Diagnostics', address: '1455 Larkin Ave, Suite 100',              city: 'Elgin',           state: 'IL', zip: '60123', phone: '(847) 697-3630', fax: '(847) 697-3631', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab38', name: 'Quest Diagnostics — Waukegan',              chain: 'Quest Diagnostics', address: '2516 Washington St',                      city: 'Waukegan',        state: 'IL', zip: '60085', phone: '(847) 623-1191', fax: '(847) 623-1192', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab39', name: 'Quest Diagnostics — Champaign',             chain: 'Quest Diagnostics', address: '2103 S Neil St, Suite 1',                 city: 'Champaign',       state: 'IL', zip: '61820', phone: '(217) 352-5151', fax: '(217) 352-5152', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab40', name: 'Quest Diagnostics — Decatur',               chain: 'Quest Diagnostics', address: '877 W Wood St',                           city: 'Decatur',         state: 'IL', zip: '62522', phone: '(217) 422-4170', fax: '(217) 422-4171', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },

  // ── LabCorp ────────────────────────────────────────────
  { id: 'lab13', name: 'LabCorp — Chicago Downtown',                chain: 'LabCorp', address: '30 N Michigan Ave, Suite 1110',              city: 'Chicago',         state: 'IL', zip: '60602', phone: '(312) 726-4690', fax: '(312) 726-4691', services: ['Blood Draw', 'Urine Collection', 'Genetic Testing', 'Drug Screening'] },
  { id: 'lab14', name: 'LabCorp — River North',                     chain: 'LabCorp', address: '444 N Michigan Ave, Suite 710',              city: 'Chicago',         state: 'IL', zip: '60611', phone: '(312) 329-0102', fax: '(312) 329-0103', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab15', name: 'LabCorp — Lakeview',                        chain: 'LabCorp', address: '3000 N Halsted St, Suite 610',               city: 'Chicago',         state: 'IL', zip: '60657', phone: '(773) 472-1550', fax: '(773) 472-1551', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab16', name: 'LabCorp — Evanston',                        chain: 'LabCorp', address: '1033 University Pl, Suite 200',              city: 'Evanston',        state: 'IL', zip: '60201', phone: '(847) 866-3100', fax: '(847) 866-3101', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab17', name: 'LabCorp — Arlington Heights',               chain: 'LabCorp', address: '800 W Biesterfield Rd, Suite 206',          city: 'Arlington Heights',state: 'IL', zip: '60005', phone: '(847) 394-1700', fax: '(847) 394-1701', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab18', name: 'LabCorp — Naperville',                      chain: 'LabCorp', address: '1550 N Route 59, Suite 120',                city: 'Naperville',      state: 'IL', zip: '60563', phone: '(630) 527-1770', fax: '(630) 527-1771', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab19', name: 'LabCorp — Oak Lawn',                        chain: 'LabCorp', address: '5201 W 95th St',                            city: 'Oak Lawn',        state: 'IL', zip: '60453', phone: '(708) 424-6200', fax: '(708) 424-6201', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab20', name: 'LabCorp — Tinley Park',                     chain: 'LabCorp', address: '18400 S 80th Ave, Suite 200',               city: 'Tinley Park',     state: 'IL', zip: '60487', phone: '(708) 429-5100', fax: '(708) 429-5101', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab21', name: 'LabCorp — Springfield',                     chain: 'LabCorp', address: '301 N Eighth St, Suite 200',                city: 'Springfield',     state: 'IL', zip: '62702', phone: '(217) 525-2020', fax: '(217) 525-2021', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab22', name: 'LabCorp — Champaign',                       chain: 'LabCorp', address: '2103 S Neil St, Suite 2',                   city: 'Champaign',       state: 'IL', zip: '61820', phone: '(217) 351-6100', fax: '(217) 351-6101', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab23', name: 'LabCorp — Rockford',                        chain: 'LabCorp', address: '920 N Alpine Rd, Suite 104',                city: 'Rockford',        state: 'IL', zip: '61107', phone: '(815) 398-4400', fax: '(815) 398-4401', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab24', name: 'LabCorp — Peoria',                          chain: 'LabCorp', address: '7309 N University St, Suite 103',           city: 'Peoria',          state: 'IL', zip: '61614', phone: '(309) 693-5300', fax: '(309) 693-5301', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab41', name: 'LabCorp — Joliet',                          chain: 'LabCorp', address: '900 Essington Rd, Suite 200',               city: 'Joliet',          state: 'IL', zip: '60435', phone: '(815) 744-2300', fax: '(815) 744-2301', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab42', name: 'LabCorp — Aurora',                          chain: 'LabCorp', address: '1700 N Farnsworth Ave, Suite 7',            city: 'Aurora',          state: 'IL', zip: '60505', phone: '(630) 978-7040', fax: '(630) 978-7041', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab43', name: 'LabCorp — Waukegan',                        chain: 'LabCorp', address: '1188 S Waukegan Rd, Suite 100',             city: 'Waukegan',        state: 'IL', zip: '60085', phone: '(847) 244-9730', fax: '(847) 244-9731', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab44', name: 'LabCorp — Bolingbrook',                     chain: 'LabCorp', address: '200 S Weber Rd, Suite 111',                 city: 'Bolingbrook',     state: 'IL', zip: '60490', phone: '(630) 679-0808', fax: '(630) 679-0809', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab45', name: 'LabCorp — Normal',                          chain: 'LabCorp', address: '1311 Franklin Ave, Suite A',                city: 'Normal',          state: 'IL', zip: '61761', phone: '(309) 452-8510', fax: '(309) 452-8511', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },

  // ── Hospital-Based / Reference Labs ───────────────────
  { id: 'lab25', name: 'Northwestern Memorial Hospital Lab',         chain: 'Northwestern Medicine', address: '251 E Huron St',                    city: 'Chicago',         state: 'IL', zip: '60611', phone: '(312) 926-2000', fax: '(312) 926-2001', services: ['Full Pathology', 'Blood Draw', 'Urine', 'Genetic Testing', 'Toxicology'] },
  { id: 'lab26', name: 'Rush University Medical Center Lab',         chain: 'Rush Health', address: '1653 W Congress Pkwy',                        city: 'Chicago',         state: 'IL', zip: '60612', phone: '(312) 942-5000', fax: '(312) 942-5001', services: ['Full Pathology', 'Blood Draw', 'Toxicology', 'Genetic Testing'] },
  { id: 'lab27', name: 'Advocate Christ Medical Center Lab',         chain: 'Advocate Health', address: '4440 W 95th St',                           city: 'Oak Lawn',        state: 'IL', zip: '60453', phone: '(708) 684-8000', fax: '(708) 684-8001', services: ['Full Pathology', 'Blood Draw', 'Drug Screening', 'Genetic Testing'] },
  { id: 'lab28', name: "OSF Saint Francis Medical Center Lab",       chain: 'OSF HealthCare', address: '530 NE Glen Oak Ave',                       city: 'Peoria',          state: 'IL', zip: '61637', phone: '(309) 655-2000', fax: '(309) 655-2001', services: ['Full Pathology', 'Blood Draw', 'Toxicology'] },
  { id: 'lab29', name: 'Memorial Medical Center Lab',                chain: 'Memorial Health', address: '701 N First St',                           city: 'Springfield',     state: 'IL', zip: '62781', phone: '(217) 788-3000', fax: '(217) 788-3001', services: ['Full Pathology', 'Blood Draw', 'Drug Screening'] },
  { id: 'lab30', name: 'SwedishAmerican Hospital Lab',               chain: 'UW Health', address: '1401 E State St',                                city: 'Rockford',        state: 'IL', zip: '61104', phone: '(815) 968-4400', fax: '(815) 968-4401', services: ['Full Pathology', 'Blood Draw', 'Toxicology'] },
  { id: 'lab31', name: 'Carle Foundation Hospital Lab',              chain: 'Carle Health', address: '611 W Park St',                               city: 'Urbana',          state: 'IL', zip: '61801', phone: '(217) 383-3311', fax: '(217) 383-3312', services: ['Full Pathology', 'Blood Draw', 'Genetic Testing', 'Drug Screening'] },
  { id: 'lab32', name: 'Advocate Good Samaritan Hospital Lab',       chain: 'Advocate Health', address: '3815 Highland Ave',                        city: 'Downers Grove',   state: 'IL', zip: '60515', phone: '(630) 275-5900', fax: '(630) 275-5901', services: ['Full Pathology', 'Blood Draw', 'Drug Screening'] },
  { id: 'lab33', name: 'Edward Hospital Lab',                        chain: 'Edward-Elmhurst Health', address: '801 S Washington St',              city: 'Naperville',      state: 'IL', zip: '60540', phone: '(630) 527-3000', fax: '(630) 527-3001', services: ['Full Pathology', 'Blood Draw', 'Toxicology', 'Genetic Testing'] },
  { id: 'lab34', name: 'Loyola University Medical Center Lab',       chain: 'Trinity Health', address: '2160 S First Ave',                          city: 'Maywood',         state: 'IL', zip: '60153', phone: '(708) 216-9000', fax: '(708) 216-9001', services: ['Full Pathology', 'Blood Draw', 'Genetic Testing', 'Toxicology'] },
  { id: 'lab46', name: 'NorthShore University HealthSystem Lab',     chain: 'NorthShore', address: '2650 Ridge Ave',                                city: 'Evanston',        state: 'IL', zip: '60201', phone: '(847) 570-2000', fax: '(847) 570-2001', services: ['Full Pathology', 'Blood Draw', 'Genetic Testing', 'Drug Screening'] },
  { id: 'lab47', name: 'Amita Health Saint Joseph Medical Lab',      chain: 'Amita Health', address: '333 N Madison St',                            city: 'Joliet',          state: 'IL', zip: '60435', phone: '(815) 725-7133', fax: '(815) 725-7134', services: ['Full Pathology', 'Blood Draw', 'Toxicology'] },
  { id: 'lab48', name: 'Morris Hospital Lab',                        chain: 'Morris Hospital', address: '150 W High St',                            city: 'Morris',          state: 'IL', zip: '60450', phone: '(815) 942-2932', fax: '(815) 942-2933', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab49', name: 'UnityPoint Health Methodist Lab',            chain: 'UnityPoint Health', address: '221 NE Glen Oak Ave',                    city: 'Peoria',          state: 'IL', zip: '61636', phone: '(309) 672-5522', fax: '(309) 672-5523', services: ['Full Pathology', 'Blood Draw', 'Toxicology', 'Drug Screening'] },

  // ── Specialty / Toxicology ─────────────────────────────
  { id: 'lab50', name: 'Millennium Health — Chicago',                chain: 'Millennium Health', address: '111 W Jackson Blvd, Suite 1700',          city: 'Chicago',         state: 'IL', zip: '60604', phone: '(312) 566-9900', fax: '(312) 566-9901', services: ['Urine Drug Testing', 'Toxicology', 'Oral Fluid Testing', 'PDMP Support'] },
  { id: 'lab51', name: 'Aegis Sciences — Illinois Collection Site',  chain: 'Aegis Sciences', address: '1740 W Harrison St, Suite 200',              city: 'Chicago',         state: 'IL', zip: '60612', phone: '(312) 421-9000', fax: '(312) 421-9001', services: ['Urine Drug Testing', 'Toxicology', 'Oral Fluid Testing'] },
  { id: 'lab52', name: 'USDTL — Drug Testing Labs (Chicago)',        chain: 'USDTL', address: '1700 S Mount Prospect Rd',                           city: 'Des Plaines',     state: 'IL', zip: '60018', phone: '(800) 235-2367', fax: '(847) 299-5600', services: ['Urine Drug Testing', 'Hair Drug Testing', 'Cord Blood Testing', 'Meconium'] },
  { id: 'lab53', name: 'Clinical Reference Lab (CRL) — IL Drop',    chain: 'CRL', address: '601 W Diversey Pkwy, Suite 100',                        city: 'Chicago',         state: 'IL', zip: '60614', phone: '(800) 445-6917', fax: '(913) 492-2843', services: ['Urine Drug Testing', 'Blood Draw', 'Wellness Testing'] },
  { id: 'lab54', name: 'Genoptix / NeoGenomics — Chicago',           chain: 'NeoGenomics', address: '400 N Michigan Ave, Suite 900',                 city: 'Chicago',         state: 'IL', zip: '60611', phone: '(312) 222-9100', fax: '(312) 222-9101', services: ['Genetic Testing', 'Oncology Genomics', 'Blood Draw'] },

  // ── Outpatient / Retail Clinic Labs ───────────────────
  { id: 'lab55', name: 'Walgreens Diagnostic Imaging & Lab (Wicker Park)', chain: 'Walgreens Health', address: '1372 N Milwaukee Ave',              city: 'Chicago',         state: 'IL', zip: '60622', phone: '(773) 395-6811', fax: '', services: ['Blood Draw', 'Urine Collection', 'Wellness Screening'] },
  { id: 'lab56', name: 'CVS MinuteClinic Lab — Chicago N Clark',    chain: 'CVS MinuteClinic', address: '3101 N Clark St',                           city: 'Chicago',         state: 'IL', zip: '60657', phone: '(773) 880-7700', fax: '', services: ['Blood Draw', 'Urine Collection', 'Strep/Flu Testing'] },
  { id: 'lab57', name: 'Immediate Care NW Indiana Lab — Calumet City', chain: 'Immediate Care', address: '1509 Torrence Ave',                        city: 'Calumet City',    state: 'IL', zip: '60409', phone: '(708) 730-4300', fax: '(708) 730-4301', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab58', name: 'Duly Health & Care Lab — Plainfield',       chain: 'Duly Health', address: '13291 S Route 59, Suite 100',                    city: 'Plainfield',      state: 'IL', zip: '60585', phone: '(815) 436-6700', fax: '(815) 436-6701', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
  { id: 'lab59', name: 'Midwest Express Clinic Lab — Homer Glen',   chain: 'Midwest Express Clinic', address: '14315 S Bell Rd',                     city: 'Homer Glen',      state: 'IL', zip: '60491', phone: '(708) 364-6000', fax: '(708) 364-6001', services: ['Blood Draw', 'Urine Collection', 'Drug Screening', 'Employer Testing'] },
  { id: 'lab60', name: 'Touchpoint Health Lab — Decatur',           chain: 'Touchpoint Health', address: '3901 N Woodford St',                       city: 'Decatur',         state: 'IL', zip: '62526', phone: '(217) 876-2831', fax: '(217) 876-2832', services: ['Blood Draw', 'Urine Collection', 'Drug Screening'] },
];


// ========== ENCOUNTERS ==========
export const encounters = {
  p1: [
    {
      id: 'enc-p1-0',
      patientId: 'p1',
      date: '2025-11-03',
      time: '09:00',
      type: 'Psychiatric Evaluation',
      provider: 'u1',
      providerName: 'Dr. Chris L., MD, PhD',
      chiefComplaint: 'Depressed mood, anxiety, insomnia - referred by PCP for psychiatric evaluation',
      status: 'Completed',
      visitType: 'In-Person',
      placeOfService: '11 - Office',
      duration: 60,
      cptCodes: ['90792', '96127'],
      timeSpentMinutes: '60',
      subjective: `IDENTIFYING INFORMATION:
James Anderson is a 41-year-old married White male, English-speaking, referred by his primary care physician Dr. Sarah Mitchell for comprehensive psychiatric evaluation. He presents today accompanied by his wife Lisa.

CHIEF COMPLAINT:
"I've been feeling really down for the past several months. I can't sleep, I don't enjoy anything anymore, and my wife says I'm not the same person."

HISTORY OF PRESENT ILLNESS:
Mr. Anderson describes a gradual onset of depressive symptoms beginning approximately 6 months ago following a significant workplace reorganization in which he was demoted from his project management position. He reports persistent low mood present most of the day, nearly every day. He endorses marked anhedonia - he has stopped playing guitar (previously a daily hobby) and has withdrawn from social activities with friends and family. Sleep disturbance is prominent: he reports difficulty with sleep onset (typically lying awake 1.5-2 hours), middle-of-the-night awakenings (2-3 times per night), and early morning awakening around 4:30 AM with inability to return to sleep. Total sleep is estimated at 4-5 hours per night.

Appetite is decreased with an unintentional weight loss of approximately 12 lbs over the past 4 months (from 185 lbs to 173 lbs). He reports difficulty concentrating at work, describing "brain fog" and difficulty completing routine tasks that previously required minimal effort. He endorsed feelings of worthlessness, stating "I feel like I'm letting everyone down - my wife, my kids, my boss."

He reports generalized anxiety with excessive worry about finances, job security, and his children's well-being. He endorses physical symptoms of anxiety including chest tightness, intermittent shortness of breath, and muscle tension in the neck and shoulders. He reports two episodes consistent with panic attacks over the past 2 months - characterized by sudden onset of palpitations, diaphoresis, trembling, and fear of "losing control." These episodes lasted approximately 10-15 minutes and occurred in crowded settings (grocery store, work meeting).

He denies active suicidal ideation, intent, or plan. He endorses occasional passive thoughts of "things would be easier if I wasn't around" but states he would never act on them due to his family. He denies homicidal ideation. He denies auditory or visual hallucinations, paranoid ideation, or other psychotic symptoms. He denies symptoms of mania or hypomania.

Caffeine intake: 3-4 cups of coffee daily. He denies tobacco use. He reports drinking 2-3 beers on weekends (increased from rare use prior to symptom onset). He denies illicit substance use. He denies any recent use of supplements or herbal remedies.

PSYCHIATRIC HISTORY:
- Prior Diagnoses: No formal psychiatric diagnoses. He saw a counselor briefly in college for adjustment-related stress (approximately age 20) for 3-4 sessions.
- Prior Psychiatric Medications: None.
- Prior Hospitalizations: None psychiatric. One medical hospitalization for appendectomy (2018).
- Prior Suicide Attempts: Denies.
- Prior Self-Harm: Denies.
- Prior substance abuse treatment: Denies.

MEDICAL HISTORY:
- Hypertension (diagnosed 2022) - controlled on lisinopril 10mg daily
- Seasonal allergies - cetirizine PRN
- GERD - famotidine 20mg PRN
- Appendectomy (2018)
- No history of head injury, seizures, or loss of consciousness
- Last physical exam: 08/2025 - unremarkable except mildly elevated BP
- Labs (from PCP, 10/2025): CBC WNL, CMP WNL, TSH 2.1 (normal), Lipid panel - LDL mildly elevated at 142

FAMILY PSYCHIATRIC HISTORY:
- Mother: History of depression, treated with fluoxetine for many years - "it helped her a lot"
- Father: History of alcohol use disorder - achieved sobriety at age 55, in recovery
- Maternal grandmother: "She had nerves" (likely anxiety disorder, untreated)
- Paternal uncle: Completed suicide at age 48
- Brother (age 38): No known psychiatric history
- No known family history of bipolar disorder, schizophrenia, or autism spectrum disorder

SOCIAL HISTORY:
- Born and raised in Springfield, IL. Second of two children.
- Education: Bachelor's degree in business administration (University of Illinois)
- Employment: Currently employed as a project coordinator at a marketing firm (demoted from project manager 6 months ago due to corporate restructuring). He reports workplace dissatisfaction and feelings of inadequacy in new role.
- Marital Status: Married to Lisa Anderson for 14 years. Describes relationship as "strained but she's been supportive." Reports decreased intimacy and communication difficulties.
- Children: Two - Emily (age 12) and Matthew (age 9). Both healthy and doing well in school.
- Housing: Owns a single-family home in Springfield. Stable housing.
- Support System: Wife, brother in the area, two close friends (though he has been isolating)
- Legal History: None
- Firearms: Denies firearms in the home
- Spirituality: Raised Methodist, attends church occasionally, finds some comfort in faith
- Hobbies (prior): Guitar, hiking, cooking - all significantly reduced
- Exercise: Previously walked 3-4 times/week - now sedentary for past 2 months

DEVELOPMENTAL HISTORY:
- Met all developmental milestones per patient report. No history of learning disabilities or special education services. No history of childhood abuse or neglect. Describes childhood as "normal and happy." Parents divorced when he was 16 - reports this was difficult but "managed okay."

REVIEW OF SYSTEMS:
Constitutional: Fatigue, decreased energy, weight loss (12 lbs/4 months)
HEENT: Denies headaches, vision changes, hearing changes
Cardiovascular: Occasional palpitations with anxiety; denies chest pain at rest
Respiratory: Intermittent SOB with anxiety episodes only; denies cough, wheezing
GI: Decreased appetite; occasional nausea; denies vomiting, diarrhea, constipation
GU: Decreased libido; denies urinary symptoms
MSK: Muscle tension in neck/shoulders; denies joint pain or swelling
Neuro: "Brain fog," difficulty concentrating; denies numbness, tingling, weakness, tremor
Skin: Denies rashes, lesions
Endocrine: Denies heat/cold intolerance, excessive thirst or urination`,

      mse: {
        appearance: 'Casually Dressed',
        behavior: 'Cooperative',
        psychomotor: 'Decreased / Slowed',
        eyeContact: 'Fair',
        speech: 'Soft / Quiet',
        mood: 'Depressed and anxious - "I feel like I\'m drowning"',
        affect: 'Dysphoric',
        affectCongruent: 'Congruent with Mood',
        thoughtProcess: 'Linear & Goal-Directed',
        thoughtContent: 'No SI/HI - Future-Oriented',
        suicidalIdeation: 'Passive Ideation Only',
        homicidalIdeation: 'Denied / None',
        perceptions: 'WNL - No Hallucinations',
        orientation: 'Alert & Oriented x4 (Person, Place, Time, Situation)',
        memory: 'Intact - Recent & Remote',
        concentration: 'Mildly Impaired',
        insight: 'Good',
        judgment: 'Good',
        additionalNotes: 'Patient appeared younger than stated age. Grooming adequate but clothing wrinkled. Posture was slouched throughout interview. Frequent sighing noted. Tearful at times when discussing impact on family life. Speech was coherent but notably low in volume and reduced in spontaneity - required prompting for elaboration. No psychomotor agitation. Montreal Cognitive Assessment (MoCA) not administered today - clinical impression is that concentration difficulties are depression-related rather than neurocognitive.',
      },

      objective: `VITAL SIGNS:
BP: 128/82 mmHg | HR: 76 bpm | Temp: 98.4F | RR: 16 | SpO2: 98% on RA | Weight: 173 lbs | Height: 5'10" | BMI: 24.8

PHYSICAL EXAMINATION (focused):
General: Alert, appears fatigued, no acute distress
HEENT: Normocephalic, atraumatic. Pupils equal, round, reactive. Oropharynx clear.
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally
Extremities: No edema, tremors, or involuntary movements
Neurological: Cranial nerves II-XII grossly intact. Gait normal. No focal deficits.

MENTAL STATUS EXAMINATION: (see structured MSE above)

STANDARDIZED ASSESSMENTS:

PHQ-9: 18/27 (Moderately Severe Depression)
  Q1 (Anhedonia): 3 - Nearly every day
  Q2 (Depressed mood): 3 - Nearly every day
  Q3 (Sleep): 3 - Nearly every day
  Q4 (Fatigue): 2 - More than half the days
  Q5 (Appetite): 2 - More than half the days
  Q6 (Self-esteem): 2 - More than half the days
  Q7 (Concentration): 2 - More than half the days
  Q8 (Psychomotor): 1 - Several days
  Q9 (SI/Self-harm): 0 - Not at all
  Functional impairment: "Very difficult" to do work, take care of things at home, get along with others

GAD-7: 14/21 (Moderate Anxiety)
  Endorses: nervousness (3), uncontrolled worry (2), worry about many things (2), difficulty relaxing (2), restlessness (2), irritability (2), feeling afraid (1)

Columbia Suicide Severity Rating Scale (C-SSRS):
  Wish to be dead: Yes (passive)
  Non-specific active SI: No
  Active SI with any methods: No
  Active SI with intent: No
  Active SI with plan: No
  Suicide attempt (lifetime): No
  Preparatory behavior: No
  Classification: LOW RISK - passive ideation only, no intent, no plan, strong protective factors

AUDIT-C: 4 (At-risk drinking - warrants monitoring)
  Frequency: 2-4 times/month (1 pt)
  Quantity: 3-4 drinks (1 pt)
  Binge: Monthly (2 pts)

Insomnia Severity Index (ISI): 19/28 (Clinical Insomnia - Moderate Severity)`,

      assessment: `DIAGNOSTIC FORMULATION:

Mr. Anderson is a 41-year-old married male with no prior psychiatric treatment history presenting with a 6-month history of worsening depressive and anxious symptoms temporally correlated with a significant occupational stressor (workplace demotion). His clinical presentation is consistent with Major Depressive Disorder, manifested by persistent depressed mood, marked anhedonia, significant insomnia, decreased appetite with weight loss, fatigue, difficulty concentrating, psychomotor retardation, and feelings of worthlessness. PHQ-9 score of 18 supports a moderately severe episode.

Comorbid anxiety symptoms meet criteria for Generalized Anxiety Disorder with excessive, difficult-to-control worry across multiple domains, accompanied by restlessness, muscle tension, and concentration difficulty. GAD-7 score of 14 corroborates moderate anxiety. Additionally, he has experienced two discrete panic attacks with characteristic symptoms, though these do not yet meet frequency criteria for Panic Disorder - monitor closely.

Alcohol use has increased from baseline but does not currently meet criteria for Alcohol Use Disorder. AUDIT-C of 4 warrants monitoring and psychoeducation regarding the depressogenic effects of alcohol and risk of self-medication.

Passive suicidal ideation is noted but risk is mitigated by strong protective factors including family commitment, absence of plan/intent, no prior attempts, no access to firearms, and intact future orientation. Family history is notable for depression (mother), alcohol use disorder (father), and completed suicide (paternal uncle) - conferring increased genetic vulnerability.

Medical differential considerations include hypothyroidism (TSH normal), anemia (CBC normal), and vitamin deficiency (not yet tested - will check B12 and folate). His hypertension is controlled.

Biopsychosocial formulation:
Biological: Family history of depression, possible genetic vulnerability (maternal depression, paternal uncle suicide), sleep deprivation exacerbating cognitive and mood symptoms, increased alcohol as depressogenic factor.
Psychological: Cognitive distortions (worthlessness, inadequacy), loss of identity/role following demotion, reduced behavioral activation (withdrawal from hobbies and social supports).
Social: Occupational stress, marital strain, social isolation, reduced support network engagement.

DIAGNOSES:
1. F32.1 - Major Depressive Disorder, Single Episode, Moderate (primary)
2. F41.1 - Generalized Anxiety Disorder (secondary)
3. G47.00 - Insomnia Disorder (secondary to mood/anxiety)
4. I10 - Essential Hypertension (medical, controlled)
5. R63.4 - Abnormal Weight Loss
Rule out: F41.0 Panic Disorder (monitor for frequency of panic attacks)`,

      plan: `COMPREHENSIVE TREATMENT PLAN:

1. PHARMACOTHERAPY:
   a. Start Sertraline (Zoloft) 50mg PO daily in the morning
      Rationale: First-line SSRI with evidence for both MDD and GAD; patient's mother responded well to fluoxetine (SSRI class), suggesting possible family pharmacogenomic favorability
      Titration plan: Increase to 100mg after 2 weeks if tolerated
      Counseled on: Common side effects (GI upset, headache, sexual dysfunction, initial anxiety increase), serotonin syndrome risk, importance of daily compliance, informed that therapeutic response may take 4-6 weeks for full effect
      Black box warning discussed: Risk of increased suicidality in young adults - though patient is 41, standard counseling provided
      Avoid abrupt discontinuation

   b. Start Hydroxyzine 25mg PO at bedtime PRN for insomnia/anxiety
      Non-habit-forming anxiolytic/sedative for acute symptom relief
      May increase to 50mg QHS if tolerated
      Avoid operating heavy machinery until sedation profile known

   c. Continue current medical medications:
      Lisinopril 10mg daily (hypertension)
      Cetirizine 10mg PRN (allergies)
      Famotidine 20mg PRN (GERD)

2. PSYCHOTHERAPY:
   a. Individual therapy referral: Cognitive Behavioral Therapy (CBT) - weekly sessions recommended
      Focus areas: cognitive restructuring (worthlessness schemas), behavioral activation, sleep hygiene (CBT-I components), anxiety management techniques
      Referred to Dr. Sarah Kim, PsyD for intake - appointment to be scheduled by front desk
   b. Consider couples therapy referral if marital strain persists

3. SAFETY PLANNING:
   a. Completed collaborative safety plan with patient and wife:
      Warning signs: Increasing isolation, stopping medications, increased alcohol use, worsening sleep
      Internal coping strategies: Deep breathing, playing guitar, going for a walk
      Social contacts for distraction: Brother (Mark), friend (Tom)
      Professional contacts: This office (555-234-0000), crisis line 988
      Emergency: 911 or nearest ED
      Means restriction: No firearms confirmed. Medications secured by wife Lisa.
   b. Patient and wife verbalized understanding of safety plan
   c. 988 Suicide & Crisis Lifeline card provided

4. LABORATORY ORDERS:
   Vitamin B12 level
   Folate level
   Comprehensive Metabolic Panel (baseline for medication monitoring)
   CBC with differential
   Urinalysis
   Urine Drug Screen (baseline)
   To be collected at Quest Diagnostics within 1 week

5. SLEEP HYGIENE EDUCATION:
   Reviewed stimulus control: Use bed for sleep and intimacy only; leave bedroom if awake > 20 min
   Consistent wake time (6:30 AM daily regardless of sleep onset)
   Eliminate screens 1 hour before bed
   Reduce caffeine to 1 cup before noon (currently 3-4 cups daily)
   Avoid alcohol as sleep aid
   Handout provided on CBT-I principles

6. LIFESTYLE RECOMMENDATIONS:
   Resume walking: Goal 20-30 min daily at minimum
   Resume guitar practice: Behavioral activation - schedule 15 min daily regardless of motivation
   Limit alcohol to 2 or fewer standard drinks on any occasion; monitor for increase
   Nutrition counseling considered if weight loss continues

7. PSYCHOEDUCATION:
   Discussed diagnosis of MDD and GAD in lay terms - patient and wife demonstrated understanding
   Explained biopsychosocial model of depression
   Discussed relationship between sleep, alcohol, and depression
   Wife given caregiver support resources and NAMI family support group information
   Brochure provided: "Understanding Depression - A Guide for Patients & Families"

8. RISK MONITORING:
   Current risk level: LOW (passive SI only, no plan/intent, multiple protective factors)
   Risk factors: Male, age 40s, family Hx of suicide, increased alcohol, occupational stress, mild social isolation
   Protective factors: Married with children, employed, no prior attempts, no firearms access, engaged in treatment, good insight, spiritual connection
   Risk to be reassessed at every visit

9. FOLLOW-UP:
   Return to clinic in 2 weeks (November 17, 2025) for medication tolerability and dose adjustment
   Sooner PRN if worsening symptoms, emergence of active SI, or intolerable side effects
   Patient instructed to call office or 988 if in crisis before next appointment

10. COORDINATION OF CARE:
    Results letter to be sent to PCP Dr. Sarah Mitchell
    Therapy referral to Dr. Sarah Kim, PsyD (CBT)
    Patient signed releases for coordination of care with PCP and therapist

TIME SPENT: 60 minutes face-to-face, of which >50% was spent in counseling and coordination of care.
MEDICAL DECISION MAKING: High complexity - multiple diagnoses, new medications initiated, risk assessment performed.`,

      diagnoses: ['F32.1', 'F41.1', 'G47.00'],
      signedBy: 'Chris L., MD, PhD',
      signedAt: '2025-11-03T10:35:00Z',
      coSignRequired: false,
      billingNotes: 'CPT 90792: Psychiatric Diagnostic Evaluation with Medical Services (60 min). CPT 96127: Brief Emotional/Behavioral Assessment (PHQ-9, GAD-7, C-SSRS, AUDIT-C, ISI administered and scored). Place of Service: 11 (Office). Medical Decision Making: High Complexity. Time-based documentation supports level of service. Insurance pre-authorization confirmed with BCBS.',
      supportivePsychNotes: 'Provided empathic validation of patient\'s distress and normalization of help-seeking. Explored impact of occupational change on self-concept and identity. Patient became tearful discussing feelings of inadequacy as a father. Used reflective listening to facilitate emotional processing. Reinforced patient\'s strengths: stable marriage, engaged parenting, insight into symptoms, willingness to seek help. Wife expressed relief that patient is receiving care. Alliance building was primary therapeutic goal for this intake session.',
      followUp: { needed: true, date: '2025-11-17', time: '09:00', duration: 30, note: 'Sertraline tolerability check, PHQ-9 repeat, dose adjustment to 100mg if tolerated' },
    },
    { id: 'enc-p1-1', patientId: 'p1', date: '2026-03-12', time: '09:00', type: 'Follow-Up', provider: 'u1', providerName: 'Dr. Chris L.', chiefComplaint: 'Persistent low mood, trouble sleeping', status: 'Completed', subjective: 'Patient reports mood has been consistently low for the past 3 weeks. Sleep onset delayed by 1-2 hrs. Appetite decreased. Denies SI.', objective: 'Alert, cooperative. Affect flat. PHQ-9: 14 (moderate depression). BP 122/78, HR 72.', assessment: 'Major Depressive Disorder, moderate � partial response to current sertraline dose.', plan: 'Increase sertraline from 100mg to 150mg daily. Repeat PHQ-9 in 4 weeks. Referred to individual therapy.', diagnoses: ['F32.1'], signedBy: 'Dr. Chris L.', signedAt: '2026-03-12T10:15:00Z' },
    { id: 'enc-p1-2', patientId: 'p1', date: '2026-01-22', time: '09:00', type: 'Medication Management', provider: 'u1', providerName: 'Dr. Chris L.', chiefComplaint: 'Medication refill � sertraline', status: 'Completed', subjective: 'Patient doing well on sertraline 100mg. Reports mild improvement in mood and energy. No side effects.', objective: 'Alert, euthymic. PHQ-9: 10 (mild). BP 118/76.', assessment: 'MDD � improving. Continue current regimen.', plan: 'Refill sertraline 100mg #90. RTC 6 weeks.', diagnoses: ['F32.0'], signedBy: 'Dr. Chris L.', signedAt: '2026-01-22T09:50:00Z' },
  ],
  p2: [
    { id: 'enc-p2-1', patientId: 'p2', date: '2026-03-20', time: '10:00', type: 'Psychiatric Evaluation', provider: 'u1', providerName: 'Dr. Chris L.', chiefComplaint: 'PTSD symptoms, nightmares worsening', status: 'Completed', subjective: 'Patient reports increase in trauma-related nightmares 4-5x/week. Hypervigilance in public places. Avoidance of crowded areas. PCL-5 score: 52.', objective: 'Anxious, guarded. Affect restricted. Maintains appropriate eye contact. Denies SI/HI.', assessment: 'PTSD � acute exacerbation. Consider PE therapy protocol.', plan: 'Start Prolonged Exposure (PE) therapy � scheduled weekly sessions. Continue prazosin 2mg QHS for nightmares. F/U 2 weeks.', diagnoses: ['F43.10'], signedBy: 'Dr. Chris L.', signedAt: '2026-03-20T11:30:00Z' },
  ],
  p3: [
    { id: 'enc-p3-1', patientId: 'p3', date: '2026-02-14', time: '11:00', type: 'Follow-Up', provider: 'u2', providerName: 'Joseph', chiefComplaint: 'AUD management check-in, craving control', status: 'Completed', subjective: 'Patient reports 45 days sobriety. Occasional cravings but managing with naltrexone. Attending AA 3x/week.', objective: 'Alert, well-groomed. Cooperative. Liver function improved on labs. LFTs trending down.', assessment: 'AUD � in remission, early. Positive response to naltrexone.', plan: 'Continue naltrexone 50mg daily. Repeat LFTs in 8 weeks. Encourage AA attendance. RTC 4 weeks.', diagnoses: ['F10.20'], signedBy: 'Joseph', signedAt: '2026-02-14T11:55:00Z' },
  ],
  p4: [
    { id: 'enc-p4-1', patientId: 'p4', date: '2026-03-05', time: '09:30', type: 'Follow-Up', provider: 'u2', providerName: 'Joseph', chiefComplaint: 'ADHD follow-up, school performance', status: 'Completed', subjective: 'Parent reports improvement in focus at school. Teacher feedback positive. Patient completing homework more consistently. Sleep normal.', objective: 'Alert, age-appropriate. Cooperative. Vanderbilt: 18 (improved from 28).', assessment: 'ADHD, combined type � responding well to Adderall XR.', plan: 'Continue Adderall XR 20mg daily. Medication bridge for summer pending. RTC 6 weeks.', diagnoses: ['F90.2'], signedBy: 'Joseph', signedAt: '2026-03-05T10:20:00Z' },
  ],
  p5: [
    { id: 'enc-p5-1', patientId: 'p5', date: '2026-03-18', time: '13:00', type: 'Follow-Up', provider: 'u1', providerName: 'Dr. Chris L.', chiefComplaint: 'Memory concerns, depressive symptoms', status: 'Completed', subjective: 'Family reports increased forgetfulness � misplacing items, forgetting appointments. Patient minimizes. Also reports low mood, fatigue.', objective: 'MMSE: 21/30 (mild cognitive impairment). PHQ-9: 12. BP 138/84.', assessment: 'Mild cognitive impairment. Co-morbid depression may be exacerbating cognitive symptoms.', plan: 'Refer to neuropsychology for full evaluation. Start mirtazapine 7.5mg QHS for depression/sleep. Caregiver education provided.', diagnoses: ['G31.84', 'F32.1'], signedBy: 'Dr. Chris L.', signedAt: '2026-03-18T14:10:00Z' },
  ],
  p6: [
    { id: 'enc-p6-1', patientId: 'p6', date: '2026-03-25', time: '11:00', type: 'Medication Management', provider: 'u1', providerName: 'Dr. Chris L.', chiefComplaint: 'Bipolar mood stabilization, lamotrigine titration', status: 'Completed', subjective: 'Patient in mixed state last month but reports improvement. Current mood is euthymic. No manic symptoms. Good sleep. Denies depressive episodes.', objective: 'Euthymic, organized thinking. Cooperative. Lamotrigine level: 8.2 mcg/mL.', assessment: 'Bipolar I � stabilized on lamotrigine titration. Level therapeutic.', plan: 'Increase lamotrigine to 200mg daily. Monitor for rash. Mood diary encouraged. RTC 4 weeks.', diagnoses: ['F31.10'], signedBy: 'Dr. Chris L.', signedAt: '2026-03-25T11:45:00Z' },
  ],
};
