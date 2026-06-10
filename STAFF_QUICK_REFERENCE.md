# Staff Quick Reference Guide — Refill Queue & Telehealth

**Version:** 2.0 (Phase 2)  
**Last Updated:** June 11, 2026  
**Audience:** Front Desk, Nurses, Providers

---

## 🎯 Quick Start (2 minutes)

### Where to Find Refill Queue
1. **Left Sidebar** → 💊 **Refill Queue**
2. See dashboard with stats (Pending, Queued, Sent, Total)
3. Search by patient name, medication, or pharmacy
4. Filter by status (Pending, Queued, Sent, etc.)

### Common Tasks

#### ✅ Add Medication to Queue (from Patient Chart)
```
1. Open patient chart
2. Click "Medications" tab
3. Find medication → Click "💊 Add to Queue"
4. Toast shows: "✅ Added to refill queue"
5. Go to Refill Queue dashboard to send
```

#### ✅ Send Refill to Pharmacy (1-minute workflow)
```
1. Open Refill Queue dashboard
2. Find patient/medication in table
3. Click "✅ Send" button (green, queued refills)
4. Modal opens: "Send Refill to Pharmacy"
5. Fill required fields:
   • Pharmacy: CVS Main St (required)
   • Refills: 2
   • Priority: Normal
   • Notes: (optional) "Patient has insurance"
6. **NEW:** Check "Verify insurance" (optional)
   • Click "Check Eligibility"
   • See copay: $30.00
7. Click "✅ Send to Pharmacy"
8. ✅ Success! Notifications sent:
   • 📧 Email sent to pharmacy
   • 💬 SMS sent to patient
9. Status changes to "✅ Sent"
```

#### ✅ Bulk Send (Multiple Refills at Once)
```
1. Refill Queue table
2. Select checkboxes: □ Patient A, □ Patient B, □ Patient C
3. Green bar appears: "3 selected"
4. Click "✅ Send to Pharmacy"
5. Fill pharmacy (same for all selected)
6. Click "✅ Send to Pharmacy"
7. All 3 refills sent in 1 action (saves 3 minutes!)
```

#### ✅ Send Telehealth Link to Patient
```
1. Refill Queue table
2. Click "🔗" button (telehealth icon)
3. Modal: "Share Telehealth Link"
4. See long URL: https://clarity-ehr.com/telehealth/join/pt-12345?token=...
5. Click "📋 Copy"
6. Toast: "✅ Copied!"
7. Send via:
   • 📧 Email: Paste in patient email
   • 💬 SMS: Paste in patient text message
   • 💻 Patient Portal: Send link directly
8. Patient clicks link → joins video call
```

---

## 📋 Refill Queue Dashboard

### **Dashboard Stats (Top)**
```
⏳ Pending     📋 Queued     ✅ Sent Today     💼 Total
45 refills    12 refills    8 refills         150 refills
🔴 5 urgent   (≤7 days)
```

- **Pending:** New refills not yet queued
- **Queued:** Staff has approved, ready to send
- **Sent Today:** Sent today only (resets daily)
- **Total:** All refills (all time)
- **Urgent:** ⏰ Less than 7 days of medication left

### **Search & Filter**
```
Search box: Type patient name, medication, or pharmacy
↓ Filter by status: Pending / Queued / Sent / Filled / Rejected
↓ Sort by: Days Remaining / Patient Name / Medication
```

### **Refill Table Columns**

| Column | What It Means | Color Coding |
|--------|---------------|--------------|
| **Patient** | Patient name | Blue text |
| **Medication** | Med name + dose + frequency | Bold header |
| **Days Left** | Days of medication remaining | 🔴 Red = ≤7 days (urgent) |
| **Pharmacy** | CVS, Walgreens, etc. | Gray text |
| **Priority** | Low/Normal/High/Urgent | Color coded badge |
| **Status** | Current refill status | Icon + color |
| **Actions** | Buttons for refill actions | 6 buttons |

---

## 🔘 Action Buttons (Table)

### Status: **Pending** ⏳
```
[🔗] Telehealth link
[📋] Queue this refill
[✉️] Send to pharmacy
[🗑️] Delete
```

### Status: **Queued** 📋
```
[🔗] Telehealth link
[✅] Send to pharmacy (green button - main action)
[🗑️] Delete
```

### Status: **Sent** ✅
```
[🔗] Telehealth link
[👁️] View details (see audit trail)
[🗑️] Delete
```

### Status: **Filled** 💊
```
[🔗] Telehealth link
[👁️] View details
[🗑️] Delete
```

---

## 🆕 Phase 2 Features (NEW!)

### **Insurance Eligibility Check**
**What:** Verify patient has insurance coverage before sending refill

**When to Use:** Optional (checkbox in modal)

**Steps:**
```
1. Click "Send to Pharmacy"
2. Modal opens
3. ✓ Check "Verify insurance eligibility before sending"
4. Click "Check Eligibility" button
5. See result:
   ✓ Eligible • Coverage: pharmacy • Copay: $30.00
6. Click "Send to Pharmacy"
```

**What You See:**
```
✓ Eligible = Patient has active insurance
Coverage: pharmacy = Covers prescription drugs
Copay: $30.00 = Patient's out-of-pocket cost
```

### **Copay Estimation**
**What:** Show patient's estimated cost BEFORE sending

**Where:** Yellow box in "Send Refill" modal

**Display:**
```
💰 Patient Copay
$30.00
This is the estimated patient out-of-pocket cost.
Verify with pharmacy/insurance for accuracy.
```

**Why:** Patients appreciate knowing cost upfront

**Note:** "Estimated" — actual copay may differ based on:
- Patient deductible
- Insurance formulary
- Pharmacy benefits

---

## 📊 Status Meanings

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| **Pending** | ⏳ | Gold | New refill, not yet queued |
| **Queued** | 📋 | Blue | Approved, ready to send to pharmacy |
| **Sent** | ✅ | Green | Email/SMS sent, awaiting pharmacy |
| **Filled** | 💊 | Purple | Pharmacy confirmed, ready for pickup |
| **Rejected** | ❌ | Red | Pharmacy rejected (see details) |

---

## ✅ Workflow Summary

### **Ideal Workflow (4 steps)**
```
Step 1: Patient calls → "I need a refill"
  ↓
Step 2: Provider prescribes → "Add to refill queue"
  ↓
Step 3: Staff sends → "Click ✅ Send in Refill Queue"
  ↓
Step 4: Patient picks up → "Your refill is ready"
```

### **Timeline**
```
Patient: "I need a refill"
↓ (0 min)
Staff: Creates refill
↓ (1 min) 
Staff: Opens Refill Queue
↓ (1 min)
Staff: Finds patient, clicks "Send"
↓ (1 min)
Modal: Select pharmacy, click Send
↓ (2 min) 📧 Email sent to pharmacy
↓ (2 min) 💬 SMS sent to patient
↓ (3 min) Status: ✅ Sent
↓ (24-48 hours)
Pharmacy: Fills prescription
↓ (1-2 days)
Patient: "Ready for pickup!"
```

---

## 💡 Pro Tips

### Tip 1: Queue Multiple at Once
```
Instead of: Send 1 → Send 1 → Send 1 (3 actions)
Do this: Select 3 → Send all (1 action)
Saves 2-3 minutes per day!
```

### Tip 2: Use Search Filters
```
👎 Scroll 50 refills to find John's
👍 Type "John" in search → See 2 matches
Saves 30 seconds per search!
```

### Tip 3: Check Insurance First for High-Cost Meds
```
For expensive medications:
1. Check "Verify insurance"
2. See copay BEFORE sending
3. Alert patient if copay is high
Prevents patient surprise at pharmacy!
```

### Tip 4: Telehealth for Urgent Refills
```
If patient needs urgent follow-up:
1. Send refill
2. Click 🔗 telehealth link
3. Patient joins video call
4. Discuss medication side effects, etc.
Quick consultation = Happy patient!
```

### Tip 5: Notes Field for Special Instructions
```
Notes example:
"Patient has high deductible - verify coverage"
"Call patient before sending, insurance changed"
"Generic OK, patient prefers brand"
```

---

## ⚠️ Common Issues & Quick Fixes

### "I don't see the refill in the queue"
```
1. Wait 10 seconds (data loads)
2. Refresh page (F5)
3. Search by patient name (filter might be hiding it)
4. Check status filter (might be set to "Sent" not "Pending")
```

### "I clicked Send but nothing happened"
```
1. Check pharmacy field (must be filled!)
2. Wait 2 seconds (button is loading)
3. Check for error message at bottom
4. Call IT if still stuck
```

### "Pharmacy email shows as failed"
```
1. Check pharmacy email is correct
2. Call pharmacy to confirm email
3. Click "Resend" button in details
4. Try again with fax number instead
```

### "Patient's copay is wrong"
```
1. It's an estimate, not final
2. Actual copay depends on deductible, formulary
3. Patient should verify with pharmacy
4. Call insurance for exact copay
```

### "Telehealth link not working"
```
1. Click 🔗 button again (generate new link)
2. Copy fresh link to patient
3. Make sure link starts with: https://clarity-ehr.com
4. If still broken, patient tries on different device
```

---

## 🔐 Security Reminders

✅ **DO:**
- ✅ Verify patient identity before sending refill
- ✅ Use internal staff messaging (not personal email)
- ✅ Check patient phone number (SMS goes there)
- ✅ Never share patient data in chat

❌ **DON'T:**
- ❌ Send medication details via text (SMS to wrong patient)
- ❌ Share copay amounts publicly
- ❌ Forward pharmacy emails with patient info
- ❌ Screenshot patient records

---

## 📞 When to Call IT

| Issue | Call IT |
|-------|---------|
| Can't access Refill Queue | ✅ |
| Pharmacy email keeps failing | 🟡 (try resend first) |
| SMS not sending to patient | ✅ |
| Database locked / slow | ✅ |
| Copay amount wrong | ❌ (call insurance) |
| Telehealth link broken | 🟡 (try new link first) |

---

## 📚 See Also

- **Full Guide:** PHASE_2_IMPLEMENTATION.md
- **Troubleshooting:** TROUBLESHOOTING_GUIDE.md
- **Patient Consent:** PATIENT_CONSENT_FORM.md
- **IT Setup:** IT_SETUP_GUIDE.md

---

## ✅ You're Ready!

You now know how to:
- ✅ Add medication to refill queue
- ✅ Send refills to pharmacies
- ✅ Verify insurance & show copay
- ✅ Send telehealth links
- ✅ Handle common issues
- ✅ Bulk queue/send multiple refills

**Questions?** Ask your supervisor or call IT extension 5555.

**Training?** Watch the 5-minute demo video on the staff portal.

---

**Happy refilling!** 🎉

Last updated: June 11, 2026
