# Clarity EHR — Comprehensive Application Documentation

**Version:** 2.0 (Phase 2)  
**Release Date:** June 11, 2026  
**Last Updated:** June 11, 2026

---

## 📋 Table of Contents

1. [Product Overview](#product-overview)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Phase 2 Features](#phase-2-features)
5. [Architecture](#architecture)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Data Flow](#data-flow)
8. [Security & Compliance](#security--compliance)
9. [Deployment & Operations](#deployment--operations)
10. [FAQ & Support](#faq--support)

---

## 🎯 Product Overview

### What is Clarity EHR?

Clarity is a cloud-based **Electronic Health Record (EHR) system** designed for small to medium-sized clinics and mental health providers. It simplifies patient management, prescription handling, telehealth, and billing.

### Key Capabilities

- **Patient Management:** Registration, demographics, visit history
- **Clinical Documentation:** Visit notes, vital signs, allergies, medications
- **Prescription Management:** Prescribe, refill, track (NEW Phase 2)
- **Appointments:** Schedule, confirm, reschedule
- **Telehealth:** Video consultations with secure links (NEW Phase 2)
- **Messaging:** Secure patient-provider messaging
- **Billing:** Claim submission, payment processing
- **Reporting:** Analytics, compliance, audit trails

### Target Users

- 👨‍⚕️ **Providers** (MDs, NPs, PAs) - Prescribe, diagnose, document
- 👩‍⚕️ **Nurses** - Intake, vitals, medication management
- 📋 **Front Desk** - Registration, scheduling, refills (NEW Phase 2)
- 🏥 **Clinic Managers** - Analytics, reporting, compliance
- 💻 **IT Administrators** - Setup, deployment, security
- 👥 **Patients** - Access portal, view records, telehealth

---

## 🚀 Getting Started

### For New Users (First Time)

**Step 1: Login**
```
1. Go to: https://app.clarity-ehr.com
2. Enter username (e.g., dr.danso)
3. Enter password (set by IT)
4. Click "Login"
5. Complete any 2FA if prompted
```

**Step 2: Select Your Facility**
```
1. If you work at multiple clinics, select one
2. All data filtered to this facility
3. Can switch in top-right menu
```

**Step 3: Navigate Dashboard**
```
Left Sidebar:
├─ 🏠 Home (dashboard)
├─ 📋 Patients (search, register)
├─ 📅 Appointments (schedule, confirm)
├─ 📊 Chart (open patient records)
├─ 💊 Refills (NEW) ← Phase 2 feature
├─ 💬 Messaging (patient messages)
├─ 🔧 Admin (if you have permission)
└─ ⚙️ Settings (profile, preferences)
```

### For Administrators (Setup)

**See:** IT_SETUP_GUIDE.md

### For Support Staff (Troubleshooting)

**See:** TROUBLESHOOTING_GUIDE.md

---

## 💡 Core Features

### 1. Patient Management

**Register New Patient:**
```
Sidebar → 📋 Patient Search → "+ Add Patient" button
OR
Sidebar → 📝 Patient Registration (NEW)
```

**Features:**
- ✅ 6-step registration form
- ✅ Automatic guardian detection (minors < 18)
- ✅ Insurance capture
- ✅ Emergency contact
- ✅ Consent tracking

**Edit Patient Information:**
```
1. Open patient chart
2. Click "Demographics" tab
3. Click "✏️ Edit Demographics"
4. Update fields
5. Click "💾 Save Changes"
```

### 2. Clinical Documentation

**Add Visit Note:**
```
1. Open patient chart
2. Click "Encounters" tab
3. Click "+ New Encounter"
4. Select visit type (office, telehealth, phone)
5. Add vital signs (BP, HR, Temp, Weight)
6. Document assessment (history, findings)
7. List medications (current, new, changes)
8. Add plan (next steps, follow-up)
9. Click "✅ Sign & Submit"
```

**Features:**
- ✅ Structured templates (prevents missing data)
- ✅ Smart phrases (auto-fill common text)
- ✅ Past visit history (show previous notes)
- ✅ Allergies displayed (prevent adverse effects)
- ✅ Medication interactions (flag conflicts)

### 3. Prescription Management

**Prescribe Medication:**
```
1. Open patient chart
2. Click "Medications" tab
3. Click "+ Prescribe Medication"
4. Select medication from database
5. Enter dose and frequency
6. Set refills (0 to 12)
7. Add special instructions
8. Click "✅ Send to Pharmacy"
```

**Features:**
- ✅ Drug database (60,000+ medications)
- ✅ Duplicate checking (prevent double-dose)
- ✅ Interaction checking (flag conflicts)
- ✅ Allergy checking (prevent reactions)
- ✅ Insurance formulary checking (copay alerts)
- ✅ Electronic transmission to pharmacy

### 4. Refill Queue (NEW — Phase 2)

**Add Refill to Queue:**
```
1. Open patient chart
2. Click "Medications" tab
3. Find medication
4. Click "💊 Add to Queue"
5. Toast: "✅ Added to refill queue"
6. Go to Refill Queue to send
```

**Send Refill:**
```
1. Sidebar → 💊 Refill Queue
2. Find patient/medication
3. Click "✅ Send" (or 📋 Queue first)
4. Modal opens: "Send Refill to Pharmacy"
5. Fill pharmacy, refills, priority
6. (NEW) Check "Verify insurance" → See copay
7. Click "✅ Send to Pharmacy"
8. ✅ Email sent to pharmacy
9. ✅ SMS sent to patient
10. Status changes to "✅ Sent"
```

**Features:**
- ✅ Track refill lifecycle (pending → queued → sent → filled)
- ✅ Verify insurance eligibility (NEW)
- ✅ Show copay estimation (NEW)
- ✅ Email pharmacy (NEW)
- ✅ SMS patient notifications (NEW)
- ✅ Bulk queue/send (save time)
- ✅ Telehealth link generation (NEW)

### 5. Appointments

**Schedule Appointment:**
```
1. Sidebar → 📅 Appointments
2. Click "+ New Appointment"
3. Select patient
4. Choose date/time
5. Set appointment type
6. Add notes
7. Click "✅ Schedule"
```

**Confirm with Patient:**
```
1. Appointments list
2. Find appointment
3. Click "📧 Send Confirmation"
4. Patient gets SMS/email confirmation
5. Patient can confirm or reschedule
```

### 6. Telehealth (NEW — Phase 2)

**Generate Telehealth Link:**
```
1. Refill Queue → Find patient
2. Click "🔗" (telehealth icon)
3. Modal: "Share Telehealth Link"
4. Click "📋 Copy"
5. Send link to patient via:
   • Email
   • SMS
   • Patient portal
   • In-person (write on paper)
```

**Patient Joins Telehealth Call:**
```
1. Patient clicks link
2. Browser/app opens video room
3. No authentication needed (secure token)
4. Provider joins from dashboard
5. Video call starts
6. Document visit after call
```

**Features:**
- ✅ Secure encrypted video (HIPAA)
- ✅ One-click link generation
- ✅ No additional software required
- ✅ Works on desktop, mobile, tablet
- ✅ Screen share capability
- ✅ Visit documentation integrated

---

## 🎁 Phase 2 Features (New)

### Feature 1: Prescription Refill Queue

**What:** Centralized dashboard to manage refill requests

**Who Uses:** Front desk, nurses, providers

**Workflow:**
```
1. Doctor prescribes medication
2. Patient runs out or needs refill
3. Front desk adds to "Refill Queue"
4. Staff sends to pharmacy with one click
5. Patient notified via SMS
6. Pharmacy processes refill
7. Patient picks up at pharmacy
```

**Benefits:**
- ⏱️ **Faster:** 24-48 hours vs. 1 week
- 📱 **Patient notification:** SMS when sent + ready
- 📊 **Tracking:** Full visibility of refill status
- 💪 **Bulk operations:** Send multiple at once
- 🔍 **Search:** Find by patient, medication, pharmacy

### Feature 2: Insurance Eligibility & Copay

**What:** Check insurance coverage and estimate patient cost

**Who Uses:** Front desk, nurses (before sending refill)

**Workflow:**
```
1. Staff sending refill
2. Click "Verify insurance" checkbox
3. Click "Check Eligibility"
4. See result:
   ✓ Eligible
   Coverage: Pharmacy
   Copay: $30.00
5. Tell patient copay amount
6. Send refill
```

**Benefits:**
- 💰 **Patient knows cost upfront:** No surprise at pharmacy
- ✅ **Verify coverage:** Confirms insurance is active
- 🔄 **24-hour cache:** Prevents repeated API calls
- 📝 **Ready for real APIs:** Phase 2C+ integration

### Feature 3: Email to Pharmacy

**What:** Automatically send refill request via email

**How It Works:**
```
1. Staff clicks "Send to Pharmacy"
2. System:
   - Formats refill details
   - Sends secure email to pharmacy
   - Tracks delivery status
   - Records in audit log
3. Pharmacy:
   - Receives email with patient info
   - Confirms receipt (optional)
   - Processes refill
```

**Benefits:**
- 📧 **No manual calls:** Faster than phone
- 📋 **Documented:** Email receipt proof
- 🔍 **Searchable:** Pharmacy has record
- ✅ **HIPAA safe:** Encrypted email

### Feature 4: SMS to Patient

**What:** Text patient when refill is sent and ready

**How It Works:**
```
1. Refill sent to pharmacy
2. System sends SMS:
   "Your Sertraline is ready at CVS Main St"
3. Patient sees notification
4. Patient goes pick up
```

**Benefits:**
- 📱 **Instant notification:** Patient knows immediately
- 🚀 **Higher pickup rate:** Patients remember to pick up
- 📊 **Trackable:** See delivery status
- 🔐 **Privacy:** Phone number masked in logs

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Framework: React 18
- Build: Vite
- Styling: CSS-in-JS
- State: React Context + hooks
- Deployment: Cloudflare Pages

**Backend:**
- Runtime: Node.js (v18+)
- Framework: Express.js
- Database: PostgreSQL (managed DigitalOcean)
- ORM: None (raw SQL with parameter binding)
- Auth: JWT (JSON Web Tokens)
- Deployment: DigitalOcean App Platform

**Infrastructure:**
- CDN: Cloudflare
- Email: Resend API
- SMS: Twilio (Phase 2C+)
- Hosting: DigitalOcean
- Monitoring: PM2 + Cloudflare Analytics

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Patient Browser                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React App (Clarity EHR Frontend)                   │   │
│  │  ├─ Login page                                      │   │
│  │  ├─ Patient chart                                   │   │
│  │  ├─ Refill queue (NEW)                              │   │
│  │  ├─ Telehealth (NEW)                                │   │
│  │  └─ Patient portal                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
        ┌──────────────────────────────────────┐
        │   Cloudflare CDN (Static Cache)      │
        │   ├─ HTML, CSS, JS                   │
        │   └─ Assets (images, fonts)          │
        └──────────────────────────────────────┘
                           ↓ HTTPS
        ┌──────────────────────────────────────┐
        │   API Server (DigitalOcean)          │
        │   ├─ Express.js server (port 5001)   │
        │   ├─ Authentication middleware       │
        │   ├─ Rate limiting                   │
        │   └─ Route handlers                  │
        │       ├─ /api/patients               │
        │       ├─ /api/refills (NEW)          │
        │       ├─ /api/appointments           │
        │       └─ /api/auth                   │
        └──────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │   PostgreSQL Database                │
        │   ├─ patients table                  │
        │   ├─ refills table (NEW)             │
        │   ├─ refill_notifications (NEW)      │
        │   ├─ medications table               │
        │   ├─ encounters table                │
        │   └─ appointments table              │
        └──────────────────────────────────────┘

External Services:
│
├─→ Resend Email API (📧 pharmacy emails)
├─→ Twilio SMS API (💬 patient SMS, Phase 2C+)
├─→ Insurance APIs (⚕️ eligibility check, Phase 2C+)
└─→ Pharmacy APIs (💊 integration, future)
```

---

## 👥 User Roles & Permissions

### Role: Provider (Doctor, NP, PA)

**Permissions:**
- ✅ View own patients
- ✅ Create visit notes
- ✅ Prescribe medications
- ✅ Order labs/imaging
- ✅ Generate telehealth links
- ✅ View refill queue
- ❌ Send refills (front desk does)
- ❌ Manage other providers

**Typical Workflow:**
```
1. Patient checks in (front desk)
2. Provider sees waiting list
3. Provider opens patient chart
4. Completes visit note
5. Prescribes medication
6. Optionally: requests refill
7. Logs out
```

### Role: Nurse (RN, LPN)

**Permissions:**
- ✅ View assigned patients
- ✅ Take vital signs
- ✅ Update medication list
- ✅ Process refill requests
- ✅ Send refills to pharmacy (NEW)
- ✅ Verify insurance (NEW)
- ✅ Generate telehealth links (NEW)
- ❌ Write provider notes
- ❌ Prescribe (without provider)

**Typical Workflow:**
```
1. Patient calls: "I need a refill"
2. Nurse checks chart
3. Finds medication
4. Adds to Refill Queue
5. Verifies insurance (optional)
6. Sends to pharmacy
7. SMS sent to patient
8. Logs refill in chart
```

### Role: Front Desk

**Permissions:**
- ✅ Register new patients
- ✅ Schedule appointments
- ✅ Confirm appointments
- ✅ Add refills to queue (NEW)
- ✅ Send refills to pharmacy (NEW)
- ✅ View refill status (NEW)
- ✅ Generate telehealth links (NEW)
- ❌ View patient medical info (notes, diagnoses)
- ❌ Modify prescriptions

**Typical Workflow:**
```
1. Phone rings: "I need a refill"
2. Front desk: "What's your name?"
3. Searches patient
4. Adds medication to queue
5. Sends to pharmacy
6. "You'll get a text when ready"
7. Hangs up
```

### Role: Clinic Manager

**Permissions:**
- ✅ View all patients (no clinical data)
- ✅ View analytics & reports
- ✅ View refill statistics (NEW)
- ✅ Manage staff accounts
- ✅ Generate revenue reports
- ✅ Audit logs
- ❌ View clinical notes
- ❌ Modify prescriptions
- ❌ Override security controls

### Role: Administrator

**Permissions:**
- ✅ Full system access
- ✅ Create/delete users
- ✅ Manage facilities
- ✅ Configure settings
- ✅ Emergency overrides
- ✅ Security monitoring
- ✅ Database backups

---

## 🔄 Data Flow

### Patient Registration

```
1. User clicks: Sidebar → 📝 Patient Registration
2. Fill form: Step 1 (Personal Info)
   ├─ First name, Last name
   ├─ DOB → Age calculated
   ├─ Gender (Male/Female only)
   ├─ Pronouns (He/Him, She/Her only)
   └─ Race, ethnicity, language
3. Click "Next" → Validation occurs
4. Fill form: Step 2 (Address & Contact)
   ├─ Phone, cell, email
   ├─ Street, city, state, ZIP
   └─ Preferred pharmacy (optional)
5. Click "Next"
6. Step 3: Guardian Info (ONLY if age < 18)
   ├─ Guardian name, relationship
   ├─ Guardian phone, email
   └─ Check "Same address" if yes
7. Click "Next"
8. Step 4: Insurance
   ├─ Insurance plan name
   ├─ Member ID, group number
   └─ Copay amount
9. Click "Next"
10. Step 5: Emergency Contact
    ├─ Name, relationship
    └─ Phone number
11. Click "Next"
12. Step 6: Review All Info (read-only)
13. Click "Save & Schedule" (→ appointments) OR
    Click "Save & Insurance" (→ demographics)
14. Confirmation page shows patient created
```

### Prescription Refill Flow (NEW)

```
Provider:
1. Opens patient chart
2. Prescribes medication
   ├─ Drug name
   ├─ Dose, frequency
   └─ Refills (0-12)
3. Patient leaves with prescription

Days later:
↓

Patient/Front Desk:
1. Patient calls: "Need refill"
2. Front desk searches patient
3. Finds medication in chart
4. Clicks "💊 Add to Queue"
5. Refill status: ⏳ Pending

↓

Staff/Nurse:
1. Sidebar → 💊 Refill Queue
2. Filter: "Pending" status
3. Find patient's refill
4. Click "✅ Send" (or first "📋 Queue")
5. Modal: "Send Refill to Pharmacy"
6. Fill pharmacy: "CVS Main St"
7. Fill refills: "3"
8. (NEW) Check "Verify insurance"
   ├─ Click "Check Eligibility"
   └─ See "Copay: $30.00"
9. Click "✅ Send to Pharmacy"
10. System:
    ├─ Sends email to pharmacy
    ├─ Sends SMS to patient
    ├─ Updates status to "✅ Sent"
    └─ Logs action in audit trail
11. Staff sees: Email ✓ sent, SMS ✓ sent
12. Refill status shows "Sent at 2:30pm"

↓

Pharmacy:
1. Receives email from clinic
2. Sees patient name, DOB, medication
3. Processes refill
4. Calls patient (or patient sees SMS)
5. Patient picks up

↓

Patient:
1. Receives SMS: "Your Sertraline is ready at CVS"
2. Goes to pharmacy
3. Picks up medication
4. Pays copay ($30)
5. Done!
```

---

## 🔒 Security & Compliance

### Authentication

- **Method:** JWT (JSON Web Tokens)
- **Duration:** 8 hours
- **2FA:** Available (optional)
- **Password:** Min 12 chars, complexity required

### Authorization

- **RBAC:** Role-based access control
- **Facility Isolation:** Users see only their clinic's data
- **Row-Level Security:** Nurses see only assigned patients
- **Action Logging:** All sensitive actions recorded

### Data Protection

- **Encryption:** TLS/SSL for transit, AES-256 at rest
- **Database:** PostgreSQL with row-level permissions
- **Secrets:** Environment variables only, never in code
- **Backups:** Daily automatic backups
- **Retention:** 6 years (HIPAA requirement)

### HIPAA Compliance

- ✅ Encrypted data in transit & at rest
- ✅ Audit logs (who accessed what, when)
- ✅ Soft deletes (no hard deletes)
- ✅ Business Associate Agreements (BAAs)
- ✅ Breach notification procedures
- ✅ Password complexity requirements
- ✅ Session timeouts
- ✅ API rate limiting

### Refill Queue Security (NEW)

- ✅ Email: No SSN, full DOB not included
- ✅ SMS: Only first name + med name + pharmacy
- ✅ Phone numbers: Masked in logs (***-***-1234)
- ✅ All actions: Logged with user/timestamp
- ✅ Soft delete: Refills never hard-deleted
- ✅ Telehealth links: Secure token-based, one-time use

---

## 🚀 Deployment & Operations

### Deployment Process

```
1. Code committed to GitHub
2. GitHub Actions CI/CD triggered:
   ├─ Run linter (syntax check)
   ├─ Build frontend (npm run build)
   ├─ Build Docker container
   └─ Push to registry
3. Deployment to Cloudflare Pages (frontend)
4. Deployment to DigitalOcean (backend)
5. Run database migrations (auto on startup)
6. Health checks verify status
7. Slack notification: deployment success/failure
```

### Monitoring & Alerts

- **Frontend:** Cloudflare Analytics
  - Page views, errors, performance
- **Backend:** PM2 dashboard
  - CPU, memory, uptime
  - Error logs, request rate
- **Database:** DigitalOcean dashboard
  - Connections, queries/sec
  - Storage usage, backups
- **Email:** Resend dashboard
  - Delivery rate, bounces, spam complaints
- **SMS:** Twilio dashboard (Phase 2C+)
  - Messages sent, delivery rate, failures

### Scaling

- **Frontend:** CDN caching (Cloudflare)
- **Backend:** Load balancer + multiple instances
- **Database:** Managed PostgreSQL (auto-scaling)
- **API Rate Limit:** 300 req/15min per facility

---

## ❓ FAQ & Support

### General Questions

**Q: Can I use Clarity on mobile?**
A: Yes! Responsive design works on:
- ✅ iPhone (Safari)
- ✅ Android (Chrome)
- ✅ Tablets (iPad, Android tablets)

**Q: What browsers are supported?**
A: Modern browsers:
- ✅ Chrome 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Edge 90+

**Q: How often are updates released?**
A: 
- Security patches: As needed
- Features: Monthly sprints
- Major versions: Quarterly

---

### Refill Queue Questions (NEW)

**Q: Can patients request refills themselves?**
A: Phase 1: No (staff only). Phase 2C+: Patient portal feature planned.

**Q: What if insurance eligibility check fails?**
A: It's optional, not blocking. You can still send the refill. The copay estimate is best-effort.

**Q: Can I use the app without sending emails to pharmacies?**
A: Yes! You can:
- Print refill form and fax
- Call pharmacy directly
- Use SMS only (Phase 2C+)

**Q: Do patients need an account to receive telehealth link?**
A: No! Just click the link. No login required (secure token auth).

---

### Troubleshooting

**Q: Why is my refill stuck in "Pending"?**
A: Possible reasons:
- Not queued yet (click 📋 button first)
- Wrong status filter (check top dropdown)
- Page not refreshed (F5)
- See TROUBLESHOOTING_GUIDE.md

**Q: Email to pharmacy failed, what now?**
A: Options:
1. Click "Resend" button
2. Call pharmacy directly
3. Fax refill form
4. Try alternative pharmacy email
5. Contact IT if persistent

**Q: How do I know if patient got the SMS?**
A: You see delivery status:
- 📱 "SMS sent at 2:30pm" (sent)
- 📱 "SMS failed" (didn't send)
- Not real-time (Twilio updates periodically)

---

### Account & Security Questions

**Q: I forgot my password, how do I reset?**
A: Click "Forgot Password?" on login page:
1. Enter username or email
2. Check email for reset link
3. Create new password
4. Log back in

**Q: Can I log in from multiple devices?**
A: Yes, but:
- New device may require 2FA
- Only one session per device
- Other sessions not automatically logged out

**Q: Is my patient data safe?**
A: Yes:
- ✅ Encrypted in transit (HTTPS)
- ✅ Encrypted at rest (AES-256)
- ✅ HIPAA compliant
- ✅ Daily backups
- ✅ Audit logs everything

---

## 📞 Getting Help

### Support Contacts

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Account locked | IT: 555-123-4567 | 30 min |
| Password reset | IT: 555-123-4567 | 1 hour |
| Refill not working | Support: support@clarity-ehr.com | 2 hours |
| Email/SMS failed | Support: support@clarity-ehr.com | 2 hours |
| Training/demo | Training: training@clarity-ehr.com | 24 hours |
| Feature request | Product: product@clarity-ehr.com | 5 business days |
| Emergency (urgent patient need) | On-call: +1-555-999-8888 | 10 min |

### Resources

- **Staff Guide:** STAFF_QUICK_REFERENCE.md
- **Troubleshooting:** TROUBLESHOOTING_GUIDE.md
- **API Reference:** BACKEND_API_REFERENCE.md
- **IT Setup:** IT_SETUP_GUIDE.md
- **Patient Consent:** PATIENT_CONSENT_FORM.md

---

## ✅ Next Steps

**For Clinical Staff:**
1. Read STAFF_QUICK_REFERENCE.md
2. Watch 5-min training video
3. Try refill queue on test patient
4. Complete competency checklist
5. Start using in daily workflow

**For IT Staff:**
1. Read IT_SETUP_GUIDE.md
2. Deploy Phase 2 (already done!)
3. Run health checks
4. Monitor first week
5. Respond to support tickets

**For Managers:**
1. Read this documentation
2. Brief staff on Phase 2 features
3. Schedule training sessions
4. Track refill queue metrics
5. Adjust workflow based on feedback

---

**Questions? Contact support@clarity-ehr.com**

---

*Clarity EHR: Making healthcare administration simple, secure, and efficient.*

Last updated: June 11, 2026
