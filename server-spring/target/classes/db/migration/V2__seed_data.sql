-- =====================================================
-- Clarity EHR — Seed Data (V2)
-- Passwords: bcrypt hash of 'Pass123!' (10 rounds)
-- 2FA code: 121314
-- =====================================================

-- The bcrypt hash for 'Pass123!' is:
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- (pre-generated; Spring BCryptPasswordEncoder is compatible)

INSERT INTO users (id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, epcs_pin_hash, two_factor_enabled, patient_id) VALUES
('u1', 'dr.chris', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Chris', 'L.', 'prescriber', 'MD, PhD', 'Psychiatry', '1234567890', 'FM1234567', 'chris.l@clarity.health', '$2a$10$rDkzG7QFZEF1QGnX5oPe3OAoTbFuTPa3fD1Ly/Sw3aHyFbKjPbVKi', true, NULL),
('u2', 'np.joseph', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Joseph', '', 'prescriber', 'PMHNP-BC', 'Psychiatric Mental Health', '0987654321', 'FJ9876543', 'joseph@clarity.health', '$2a$10$rDkzG7QFZEF1QGnX5oPe3OAoTbFuTPa3fD1Ly/Sw3aHyFbKjPbVKi', true, NULL),
('u3', 'irina.s', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Irina', 'S.', 'prescriber', 'MD', 'Psychiatry', '1122334455', 'FS1122334', 'irina.s@clarity.health', '$2a$10$rDkzG7QFZEF1QGnX5oPe3OAoTbFuTPa3fD1Ly/Sw3aHyFbKjPbVKi', true, NULL),
('u4', 'nurse.kelly', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Kelly', 'Chen', 'nurse', 'RN', 'Behavioral Health', '', '', 'kelly.chen@clarity.health', NULL, true, NULL),
('u5', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'User', 'front_desk', '', '', '', '', 'admin@clarity.health', NULL, true, NULL),
('u6', 'baz', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Baz', '', 'front_desk', '', '', '', '', 'baz@clarity.health', NULL, true, NULL),
('u7', 'amena', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amena', '', 'front_desk', '', '', '', '', 'amena@clarity.health', NULL, true, NULL),
('u8', 'april.t', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'April', 'Torres', 'therapist', 'LCSW', 'Clinical Social Work', '5566778899', '', 'april.t@clarity.health', NULL, true, NULL),
('pat-p1', 'james.anderson', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'James', 'Anderson', 'patient', '', '', '', '', 'james.anderson@email.com', NULL, false, 'p1'),
('pat-p2', 'maria.garcia', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Maria', 'Garcia', 'patient', '', '', '', '', 'maria.garcia@email.com', NULL, false, 'p2'),
('pat-p3', 'robert.chen', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Robert', 'Chen', 'patient', '', '', '', '', 'robert.chen@email.com', NULL, false, 'p3'),
('pat-p4', 'ashley.kim', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ashley', 'Kim', 'patient', '', '', '', '', 'ashley.kim@email.com', NULL, false, 'p4'),
('pat-p5', 'dorothy.wilson', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dorothy', 'Wilson', 'patient', '', '', '', '', 'dorothy.wilson@email.com', NULL, false, 'p5'),
('pat-p6', 'marcus.brown', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Marcus', 'Brown', 'patient', '', '', '', '', 'marcus.brown@email.com', NULL, false, 'p6');

-- ─── Patients ────────────────────────────────────────
INSERT INTO patients (id, mrn, first_name, last_name, dob, gender, pronouns, ssn, race, ethnicity, language, marital_status, phone, cell_phone, email, address_street, address_city, address_state, address_zip, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, insurance_primary_name, insurance_primary_member_id, insurance_primary_group_number, insurance_primary_copay, insurance_secondary_name, insurance_secondary_member_id, insurance_secondary_group_number, insurance_secondary_copay, pcp, assigned_provider, is_btg, is_active, last_visit, next_appointment, flags) VALUES
('p1','MRN-00001','James','Anderson','1985-03-15','Male','He/Him','***-**-4521','White','Non-Hispanic','English','Married','(555) 234-5678','(555) 987-6543','james.anderson@email.com','1234 Oak Avenue','Springfield','IL','62704','Lisa Anderson','Spouse','(555) 234-5679','Blue Cross Blue Shield','BCB123456789','GRP-5500',30,NULL,NULL,NULL,NULL,'Dr. Robert Smith','u1',false,true,'2026-04-02','2026-04-10','["Fall Risk"]'),
('p2','MRN-00002','Maria','Garcia','1992-07-22','Female','She/Her','***-**-8834','Hispanic','Hispanic/Latino','Spanish','Single','(555) 345-6789','(555) 876-5432','maria.garcia@email.com','5678 Pine Street','Springfield','IL','62701','Carlos Garcia','Brother','(555) 345-6780','Aetna','AET987654321','GRP-8800',25,NULL,NULL,NULL,NULL,'Dr. Jennifer Lee','u1',false,true,'2026-04-05','2026-04-12','["Suicide Risk - Monitor"]'),
('p3','MRN-00003','David','Thompson','1978-11-08','Male','He/Him','***-**-2267','African American','Non-Hispanic','English','Divorced','(555) 456-7890','(555) 765-4321','david.thompson@email.com','9012 Elm Drive','Springfield','IL','62702','Patricia Thompson','Mother','(555) 456-7891','United Healthcare','UHC456789012','GRP-3300',40,'Medicaid','MCD789012345','',0,'Dr. William Davis','u2',false,true,'2026-03-28','2026-04-15','["Substance Use History","Controlled Substance Agreement"]'),
('p4','MRN-00004','Emily','Chen','2001-01-30','Female','She/Her','***-**-9912','Asian','Non-Hispanic','English','Single','(555) 567-8901','(555) 654-3210','emily.chen@email.com','3456 Maple Court','Springfield','IL','62703','Wei Chen','Father','(555) 567-8902','Cigna','CIG321654987','GRP-7700',20,NULL,NULL,NULL,NULL,'Dr. Susan Park','u2',false,true,'2026-04-07','2026-04-14','[]'),
('p5','MRN-00005','Robert','Wilson','1965-09-12','Male','He/Him','***-**-5548','White','Non-Hispanic','English','Widowed','(555) 678-9012','(555) 543-2109','robert.wilson@email.com','7890 Cedar Lane','Springfield','IL','62705','Karen Wilson','Daughter','(555) 678-9013','Medicare','MCR567890123','',0,'AARP Supplemental','AARP123456','GRP-SUP',0,'Dr. Thomas Brown','u1',true,true,'2026-03-20','2026-04-18','["VIP","BTG Protected"]'),
('p6','MRN-00006','Aisha','Patel','1990-05-18','Female','She/Her','***-**-3376','Asian','Non-Hispanic','English','Married','(555) 789-0123','(555) 432-1098','aisha.patel@email.com','2345 Birch Road','Springfield','IL','62706','Raj Patel','Spouse','(555) 789-0124','Anthem','ANT654987321','GRP-4400',35,NULL,NULL,NULL,NULL,'Dr. Michelle Taylor','u1',true,true,'2026-04-01','2026-04-20','["BTG Protected","Interpreter Needed - Hindi"]');

-- ─── Allergies ───────────────────────────────────────
INSERT INTO allergies (id, patient_id, allergen, type, reaction, severity, status, onset_date, source) VALUES
('a1','p1','Penicillin','Medication','Hives, Anaphylaxis','Severe','Active','2005-06-15','Patient Reported'),
('a2','p1','Sulfa Drugs','Medication','Rash','Moderate','Active','2010-03-20','Clinician Verified'),
('a3','p1','Latex','Environmental','Contact Dermatitis','Mild','Active','2015-01-10','Patient Reported'),
('a4','p2','Codeine','Medication','Nausea, Vomiting','Moderate','Active','2018-09-05','Patient Reported'),
('a5','p2','Shellfish','Food','Throat Swelling','Severe','Active','2012-12-25','Clinician Verified'),
('a6','p3','No Known Drug Allergies (NKDA)','None','','','Active','','Patient Reported'),
('a7','p4','Ibuprofen','Medication','GI Bleeding','Severe','Active','2022-04-18','Clinician Verified'),
('a8','p4','Peanuts','Food','Anaphylaxis','Severe','Active','2001-01-30','Patient Reported'),
('a9','p4','Dust Mites','Environmental','Rhinitis, Asthma','Moderate','Active','2015-07-01','Patient Reported'),
('a10','p5','Lisinopril','Medication','Angioedema','Severe','Active','2019-11-30','Clinician Verified'),
('a11','p6','Aspirin','Medication','Bronchospasm','Moderate','Active','2020-02-14','Patient Reported'),
('a12','p6','Bee Stings','Environmental','Anaphylaxis','Severe','Active','2008-08-22','Clinician Verified');

-- ─── Problems ────────────────────────────────────────
INSERT INTO problems (id, patient_id, code, description, status, onset_date, diagnosed_by) VALUES
('pr1','p1','F33.1','Major Depressive Disorder, Recurrent, Moderate','Active','2020-01-15','Dr. Chris L.'),
('pr2','p1','F41.1','Generalized Anxiety Disorder','Active','2020-01-15','Dr. Chris L.'),
('pr3','p1','G47.00','Insomnia, Unspecified','Active','2021-06-10','Dr. Chris L.'),
('pr4','p1','E11.9','Type 2 Diabetes Mellitus','Active','2018-03-20','Dr. Smith (PCP)'),
('pr5','p2','F43.10','Post-Traumatic Stress Disorder','Active','2022-05-01','Dr. Chris L.'),
('pr6','p2','F33.2','Major Depressive Disorder, Recurrent, Severe','Active','2022-05-01','Dr. Chris L.'),
('pr7','p2','F40.10','Social Anxiety Disorder','Active','2023-02-14','Dr. Chris L.'),
('pr8','p3','F10.20','Alcohol Use Disorder, Moderate','Active','2019-08-15','Joseph'),
('pr9','p3','F33.0','Major Depressive Disorder, Recurrent, Mild','Active','2019-08-15','Joseph'),
('pr10','p3','I10','Essential Hypertension','Active','2015-04-10','Dr. Davis (PCP)'),
('pr11','p3','F17.210','Nicotine Dependence, Cigarettes','Active','2010-01-01','Joseph'),
('pr12','p4','F90.2','ADHD, Combined Type','Active','2015-09-01','Joseph'),
('pr13','p4','F41.1','Generalized Anxiety Disorder','Active','2023-01-20','Joseph'),
('pr14','p4','F50.00','Anorexia Nervosa, Unspecified','In Remission','2019-06-15','Dr. Park (PCP)'),
('pr15','p5','F32.2','Major Depressive Disorder, Single Episode, Severe','Active','2025-12-01','Dr. Chris L.'),
('pr16','p5','F41.0','Panic Disorder','Active','2026-01-10','Dr. Chris L.'),
('pr17','p5','G30.9','Alzheimers Disease, Unspecified (Early Onset)','Active','2025-06-15','Dr. Brown (PCP)'),
('pr18','p6','F31.31','Bipolar Disorder, Current Episode Depressed, Mild','Active','2021-03-10','Dr. Chris L.'),
('pr19','p6','F41.1','Generalized Anxiety Disorder','Active','2021-03-10','Dr. Chris L.'),
('pr20','p6','N94.3','Premenstrual Dysphoric Disorder','Active','2022-08-05','Dr. Taylor (PCP)');

-- ─── Vitals ──────────────────────────────────────────
INSERT INTO vitals (id, patient_id, date, time, bp, hr, rr, temp, spo2, weight, height, bmi, pain, taken_by) VALUES
('v1','p1','2026-04-02','09:15','128/82',76,16,98.6,98,185,70,26.5,2,'Kelly Chen, RN'),
('v2','p1','2026-03-05','10:30','132/85',80,18,98.4,97,187,70,26.8,3,'Kelly Chen, RN'),
('v3','p1','2026-02-01','14:00','135/88',82,16,98.6,98,190,70,27.3,4,'Kelly Chen, RN'),
('v4','p2','2026-04-05','11:00','118/72',68,14,98.2,99,135,64,23.2,0,'Kelly Chen, RN'),
('v5','p2','2026-03-08','09:45','120/74',72,16,98.6,98,136,64,23.3,1,'Kelly Chen, RN'),
('v6','p3','2026-03-28','13:30','142/92',88,18,98.8,96,210,72,28.5,5,'Kelly Chen, RN'),
('v7','p3','2026-02-28','10:00','148/95',92,20,98.6,95,215,72,29.2,4,'Kelly Chen, RN'),
('v8','p4','2026-04-07','08:30','110/68',72,14,97.8,99,115,63,20.4,0,'Kelly Chen, RN'),
('v9','p5','2026-03-20','15:00','152/96',84,18,98.4,95,178,68,27.1,6,'Kelly Chen, RN'),
('v10','p6','2026-04-01','10:15','122/76',74,16,98.6,98,145,65,24.1,1,'Kelly Chen, RN');

-- ─── Staff Messaging Channels ────────────────────────
INSERT INTO staff_channels (id, name, type) VALUES
('ch1', 'general', 'channel'),
('ch2', 'clinical', 'channel'),
('ch3', 'scheduling', 'channel'),
('ch4', 'urgent', 'channel');

-- ─── Smart Phrases ───────────────────────────────────
INSERT INTO smart_phrases (id, trigger_text, name, category, content) VALUES
('sp1', '.depression', 'Depression Assessment', 'Clinical', 'Patient presents with symptoms of depression including: depressed mood, anhedonia, sleep disturbance, fatigue, and difficulty concentrating. PHQ-9 score indicates [SCORE]. Current safety assessment: denies suicidal ideation, plan, or intent.'),
('sp2', '.anxiety', 'Anxiety Assessment', 'Clinical', 'Patient reports anxiety symptoms including: excessive worry, restlessness, muscle tension, difficulty sleeping, and irritability. GAD-7 score indicates [SCORE]. Symptoms interfere with daily functioning.'),
('sp3', '.mse', 'Mental Status Exam', 'Clinical', 'APPEARANCE: Well-groomed, appropriately dressed, good hygiene. BEHAVIOR: Cooperative, good eye contact, no psychomotor abnormalities. SPEECH: Normal rate, rhythm, and volume. MOOD: "[PATIENT STATED MOOD]". AFFECT: [Congruent/Incongruent], [full/restricted/flat] range. THOUGHT PROCESS: Linear, logical, goal-directed. THOUGHT CONTENT: Denies SI/HI, no delusions or obsessions. PERCEPTION: Denies auditory/visual hallucinations. COGNITION: Alert and oriented x4. INSIGHT: [Good/Fair/Poor]. JUDGMENT: [Good/Fair/Poor].'),
('sp4', '.followup', 'Follow-Up Plan', 'Clinical', 'PLAN:\n1. Continue current medications as prescribed\n2. Follow up in [TIMEFRAME] weeks\n3. Patient to continue [therapy/counseling] sessions\n4. Safety plan reviewed and updated\n5. Return precautions discussed\n6. Patient verbalized understanding of plan'),
('sp5', '.safety', 'Safety Assessment', 'Clinical', 'SAFETY ASSESSMENT:\n- Suicidal Ideation: [None/Passive/Active]\n- Homicidal Ideation: [None/Passive/Active]\n- Self-Harm: [Denies/Reports]\n- Substance Use: [Denies/Reports]\n- Safety Plan: [Reviewed/Updated/Created]\n- Crisis Resources: 988 Suicide & Crisis Lifeline provided\n- Means Restriction: [Discussed/N/A]');

-- ─── Practice Settings ───────────────────────────────
INSERT INTO practice_settings (setting_key, setting_value, setting_type, category, description) VALUES
('practice_name', 'Clarity Health', 'string', 'practice', 'Practice name'),
('practice_address', '400 Wellness Blvd, Springfield, IL 62704', 'string', 'practice', 'Practice address'),
('practice_phone', '(555) 800-1234', 'string', 'practice', 'Practice phone'),
('practice_fax', '(555) 800-1235', 'string', 'practice', 'Practice fax'),
('practice_npi', '1122334455', 'string', 'practice', 'Practice NPI'),
('practice_tax_id', '12-3456789', 'string', 'practice', 'Tax ID / EIN'),
('billing_contact', 'billing@clarity.health', 'string', 'billing', 'Billing contact email'),
('default_copay', '30', 'number', 'billing', 'Default copay amount'),
('auto_generate_claims', 'true', 'boolean', 'billing', 'Auto-generate claims on encounter close');

-- ─── Fee Schedule ────────────────────────────────────
INSERT INTO fee_schedule (cpt_code, description, fee, effective_date, insurance_type) VALUES
('90791', 'Psychiatric diagnostic evaluation', 350, '2026-01-01', 'default'),
('90792', 'Psychiatric diagnostic evaluation with medical services', 380, '2026-01-01', 'default'),
('90834', 'Psychotherapy, 45 minutes', 150, '2026-01-01', 'default'),
('90837', 'Psychotherapy, 60 minutes', 200, '2026-01-01', 'default'),
('90853', 'Group psychotherapy', 120, '2026-01-01', 'default'),
('99213', 'Office visit, established patient, 20-29 minutes', 140, '2026-01-01', 'default'),
('99214', 'Office visit, established patient, 30-39 minutes', 180, '2026-01-01', 'default'),
('99215', 'Office visit, established patient, 40-54 minutes', 240, '2026-01-01', 'default'),
('96127', 'Brief emotional/behavioral assessment', 25, '2026-01-01', 'default'),
('90791', 'Psychiatric diagnostic evaluation', 280, '2026-01-01', 'medicare'),
('90792', 'Psychiatric diagnostic evaluation with medical services', 310, '2026-01-01', 'medicare'),
('90834', 'Psychotherapy, 45 minutes', 120, '2026-01-01', 'medicare'),
('90837', 'Psychotherapy, 60 minutes', 160, '2026-01-01', 'medicare'),
('99214', 'Office visit, established patient, 30-39 minutes', 145, '2026-01-01', 'medicare');
