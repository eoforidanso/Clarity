# Troubleshooting Guide — Refill Queue & Telehealth Issues

**Version:** 2.0 (Phase 2)  
**Audience:** Support Staff, Front Desk, Nurses, Providers  
**Last Updated:** June 11, 2026

---

## 🆘 Quick Troubleshooting (Most Common Issues)

### Issue #1: "Refill doesn't appear in queue"

**Symptoms:**
- Added medication but don't see it in queue
- Searched for patient but no results
- Queue shows "0 refills"

**Fix (30 seconds):**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Refresh page (F5) | Page reloads, data refreshes |
| 2 | Wait 5 seconds | Data loads from server |
| 3 | Search by patient name | Find refill in search results |
| 4 | Check status filter | Make sure "Pending" is selected |
| 5 | Check date range | Refill created today? |

**Still not working?**
- Clear browser cache (Ctrl+Shift+Delete)
- Try different browser (Chrome, Safari, Firefox)
- Call IT if still missing

---

### Issue #2: "Send button doesn't work / page freezes"

**Symptoms:**
- Click "Send" but nothing happens
- Button appears stuck loading
- Page becomes unresponsive

**Fix (1 minute):**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Wait 3-5 seconds | Button completes loading |
| 2 | Try clicking again | Button responds |
| 3 | Check pharmacy field | Is it filled in? (required!) |
| 4 | Try different refill | Test with another patient |
| 5 | Refresh page (F5) | Clears stuck state |
| 6 | Check console errors | F12 → Console → Look for red errors |

**Error in console?**
- Screenshot the red error
- Send to IT support
- Note the exact patient/medication

**Still stuck?**
- Call IT: ext. 5555
- Tell them: "Refill queue button frozen"

---

### Issue #3: "Pharmacy email shows as failed"

**Symptoms:**
- Email notification stuck as "failed"
- Email says error but doesn't say what
- Can't resend email

**Fix (2 minutes):**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check pharmacy email | Is it spelled correctly? |
| 2 | Call pharmacy | Ask "Did you get our email?" |
| 3 | Try different email | Confirm alternative pharmacy email |
| 4 | Click "Resend" button | Email tries sending again |
| 5 | Wait 30 seconds | Check email delivery status |
| 6 | If still failed | Try alternate method (phone, fax) |

**What to tell the pharmacy:**
```
"Hi, we sent a refill for [Patient Name], 
medication [Med Name]. Did you receive our email? 
Our email is: noreply@clarity-ehr.com"
```

**If pharmacy didn't get it:**
- Use fax instead (number in system)
- Call pharmacy directly
- Send to pharmacy manager email

**Still can't fix?**
- Escalate to IT (possible Resend API issue)
- Document: time sent, pharmacy, patient name

---

### Issue #4: "Patient didn't get SMS notification"

**Symptoms:**
- SMS shows as "sent" but patient says no message
- Patient got old SMS, not current one
- SMS appears in logs but phone was silent

**Fix (2 minutes):**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Verify phone number | Check +1-555-XXX-XXXX format |
| 2 | Ask patient | Did they actually get nothing? |
| 3 | Check spam folder | SMS might be in junk |
| 4 | Test with different patient | Try sending to known phone |
| 5 | Call patient directly | Confirm current phone number |
| 6 | Update phone in chart | If number changed |
| 7 | Click "Resend" | Send SMS again |

**Common reasons:**
- ❌ Patient has old phone number in chart
- ❌ Patient's phone is out of service
- ❌ SMS filtered as spam
- ❌ Message delayed (check in 5 minutes)
- ❌ Phone has SMS blocked

**What to tell patient:**
```
"We sent a text about your refill being ready. 
Check your spam folder or call us at 555-123-4567."
```

**Still not received?**
- Try calling patient instead
- Send email instead of SMS
- Update patient's preferred contact method

---

### Issue #5: "Copay amount is wrong / different at pharmacy"

**Symptoms:**
- We show copay $30 but pharmacy says $50
- Insurance estimate doesn't match actual
- Patient surprised at checkout

**Fix (1 minute explanation to patient):**

**Why copay estimates differ:**

| Reason | Example |
|--------|---------|
| **Deductible not met** | We: $30 copay. Patient still owes $200 deductible |
| **Formulary issue** | Drug not on insurance list = full price |
| **Quantity limit exceeded** | Insurance covers 30 pills/month, patient asks for 60 |
| **Prior auth needed** | Doctor needs insurance approval first |
| **Plan tier change** | Different copay tiers (brand vs generic) |

**What to tell patient:**
```
"That's an estimate. Your actual copay depends on 
your insurance deductible and formulary. 
Please verify with [Pharmacy Name] before pickup."
```

**How to prevent in future:**
- ✅ Always tell patient "this is an estimate"
- ✅ Suggest patient call pharmacy first
- ✅ Have patient verify insurance card copay
- ✅ Note on refill: "Patient should verify with pharmacy"

**This is NOT a bug!** Insurance copays vary. This is working as designed.

---

## 🔧 Intermediate Troubleshooting

### Issue #6: "Telehealth link not working"

**Symptoms:**
- Link shows as broken
- Patient clicks link but page won't load
- "404 Not Found" error

**Fix (3 minutes):**

| Step | Action | Check |
|------|--------|-------|
| 1 | Generate new link | Click 🔗 button again |
| 2 | Copy fresh link | Copy-paste the new one to patient |
| 3 | Test yourself first | Click link to verify it works |
| 4 | Try different device | Desktop vs mobile vs tablet |
| 5 | Check internet | Patient's WiFi working? |
| 6 | Clear browser cache | Patient: Ctrl+Shift+Delete |
| 7 | Try different browser | Chrome vs Safari vs Firefox |

**If you see error:**
```
❌ "404 Not Found"
→ Link format wrong or server issue
→ Call IT

❌ "Connection refused"  
→ Telehealth server down
→ Call IT

❌ "Unauthorized / 401"
→ Token expired
→ Generate new link (not expired)
```

**Tell patient:**
```
"Try the link on a different device or browser. 
If still not working, call us back and I'll send a new link."
```

**Still broken?**
- Call IT: "Telehealth link returns 404"
- Note the exact error message
- Save the link URL

---

### Issue #7: "Eligibility check shows 'Failed'"

**Symptoms:**
- Click "Check Eligibility"
- See error: "Eligibility check failed"
- Can't verify insurance

**Fix (2 minutes):**

| Step | Action | Result |
|------|--------|--------|
| 1 | Skip verification (not required) | Continue sending refill |
| 2 | Try again in 5 minutes | Server might be temporarily down |
| 3 | Verify manually | Call insurance directly for copay |
| 4 | Check patient's insurance | Is it still active? |
| 5 | Contact insurance | Ask copay amount directly |

**Why eligibility check fails:**

| Reason | Solution |
|--------|----------|
| Insurance system down | Try again in 15 minutes |
| Patient no longer covered | Call insurance to verify status |
| Invalid member ID | Check insurance card, correct in chart |
| API credentials error | IT issue - call support |

**Tell patient:**
```
"We couldn't verify your insurance right now. 
Estimated copay is $30, but please confirm with 
[Insurance Company] at 1-800-XXX-XXXX."
```

**Note:** Eligibility check is **OPTIONAL**. If it fails, just send the refill anyway. Insurance verification is best-effort, not blocking.

---

### Issue #8: "Bulk Send selected all wrong refills"

**Symptoms:**
- Selected 3 refills, but 10 were sent
- Sent to wrong pharmacy
- Sent to wrong patient

**How this happened:**
- Filter was set to show all statuses
- Selected without realizing page scrolled
- Checkboxes checked unintended items

**How to fix:**

| Step | Action |
|------|--------|
| 1 | Check what was actually sent | Refill Queue shows status |
| 2 | Contact patients affected | "Wrong pharmacy, we'll fix it" |
| 3 | Contact pharmacies | "Please ignore, sending replacement" |
| 4 | Update refills in system | Change status back to queued/pending |
| 5 | Resend to correct patients/pharmacies | Now with correct info |

**How to prevent:**
- ✅ Always check filter (make sure "Pending" selected)
- ✅ Verify each checkbox before sending
- ✅ Read the summary: "3 selected" before clicking Send
- ✅ Start with "Select All" to verify count
- ✅ Double-check pharmacy field (required!)

**If mistake happened:**
- Don't panic, it's reversible
- Contact IT if refills locked
- Notify affected patients ASAP
- Document the incident

---

## 💾 Data & System Issues

### Issue #9: "Patient data looks wrong / corrupted"

**Symptoms:**
- Patient age shows negative
- Name is blank or "NULL"
- DOB is 1900-01-01
- Data inconsistencies

**Fix (Escalate to IT):**

```bash
Steps for support staff:
1. Screenshot the error
2. Note patient ID and name
3. Try refreshing patient chart
4. Note if error persists
5. Call IT with details
```

**This requires database repair.** Don't try to fix manually.

**Tell IT:**
- Patient ID (numbers only)
- What field looks wrong (name, age, etc.)
- Screenshot if possible

---

### Issue #10: "Database locked / System is slow"

**Symptoms:**
- Page loads very slowly
- "Database locked" error message
- Refill queue takes 30+ seconds to load
- API requests time out

**Fix (1 minute):**

| Step | Action | Result |
|------|--------|--------|
| 1 | Refresh page | Clears connection |
| 2 | Wait 2 minutes | Database lock clears |
| 3 | Try again | Should be fast again |
| 4 | If still slow | Call IT |

**Why database locks:**
- Large report running
- Backup in progress
- Multiple users on same patient
- Resource exhaustion

**Tell IT if persists:**
- "Refill queue is very slow"
- "Getting 'database locked' error"
- Time it occurred
- How many users online

---

## 🔐 Security & Permission Issues

### Issue #11: "I can't see patient refills (permission denied)"

**Symptoms:**
- Get error: "Access denied" or "Unauthorized"
- Can see other patients but not this one
- Shows blank/empty chart

**Fix (2 minutes):**

| Step | Action | Check |
|------|--------|-------|
| 1 | Log out and back in | Refreshes permissions |
| 2 | Check facility | Are you in the right clinic? |
| 3 | Check user role | Is your role correct? |
| 4 | Verify patient | Is patient assigned to your facility? |
| 5 | Try different patient | Is it all patients or just one? |

**Common causes:**
- ❌ Wrong facility selected
- ❌ Patient is from different clinic
- ❌ User role downgraded
- ❌ Session expired

**Tell IT if:**
- Can't see ANY patients (permission issue)
- Can see some but not one patient (facility mismatch)
- Get "Unauthorized" error (session issue)

---

### Issue #12: "API returns 401 Unauthorized"

**Symptoms:**
- Mobile app not connecting
- API request fails with 401
- "Invalid or expired token"

**Fix (2 minutes):**

| Step | Action |
|------|--------|
| 1 | Log out | App/browser |
| 2 | Log back in | Fresh login session |
| 3 | Accept any permission prompts | Grant app access |
| 4 | Try request again | Should work now |

**Why it happens:**
- Session expired (8 hours)
- Token revoked for security
- User logged in elsewhere
- Server was restarted

**If still fails:**
- Log out completely
- Clear app cache (if app)
- Close browser completely
- Log back in fresh

---

## 📧 Email & Notifications

### Issue #13: "Email sent but doesn't appear in inbox"

**Symptoms:**
- Pharmacy says they didn't get email
- Email never arrived
- Stuck in transit

**Fix (5 minutes):**

| Step | Action | Check |
|------|--------|-------|
| 1 | Verify email address | Correct spelling? |
| 2 | Check spam folder | In junk mail? |
| 3 | Check sent folder | Did it actually send? |
| 4 | Resend email | Click "Resend" button |
| 5 | Wait 5 minutes | Email delivery delayed |
| 6 | Try alternative email | If pharmacy has another address |
| 7 | Use phone/fax instead | Fallback method |

**Email troubleshooting checklist:**

```
For Clarity Support Team:
☐ Email address correct (pharmacy confirmed?)
☐ Email not in spam/junk
☐ Email sent status shows in dashboard
☐ No error message on send
☐ Pharmacy email server accepting (not full)
☐ Try from different user account
☐ Check Resend dashboard (resend.com)
☐ Email deliverability rate (check if >95%)
```

**If pharmacy confirms they got email:**
- Email working correctly
- Pharmacy may have just missed it
- Resend for visibility

---

### Issue #14: "SMS shows as sent but patient says they didn't get it"

**Symptoms:**
- Status shows "SMS sent" 
- Patient has no message
- Phone number is correct

**Fix (3 minutes):**

| Step | Action |
|------|--------|
| 1 | Verify phone number | With patient directly |
| 2 | Check phone is on | Ask patient to power cycle |
| 3 | Check SMS isn't filtered | Patient check spam/blocked |
| 4 | Resend SMS | Click "Resend" button |
| 5 | Call patient instead | Don't wait for SMS |
| 6 | Update contact method | If preferred |

**Common reasons SMS doesn't arrive:**

| Reason | Fix |
|--------|-----|
| Phone off | Patient power on phone |
| No signal | Patient move to better location |
| SMS spam filter | Patient disable filter |
| No service | Patient check with provider |
| Wrong number | Verify with patient |
| Carrier issue | Try again in 5 minutes |

**SMS is best-effort.** Email/call are backups.

---

## 🎯 Performance Issues

### Issue #15: "App is very slow / freezing"

**Symptoms:**
- Clicking buttons takes 5+ seconds
- Page feels sluggish
- Charts/tables won't load
- UI becomes unresponsive

**Fix (2 minutes):**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check internet | Speedtest.net → 10+ Mbps |
| 2 | Close other tabs | Free up browser memory |
| 3 | Clear browser cache | Ctrl+Shift+Delete |
| 4 | Restart browser | Close completely, reopen |
| 5 | Try different browser | Chrome vs Safari vs Firefox |
| 6 | Restart computer | Full restart |
| 7 | Check server status | /api/health endpoint |

**Performance tips:**
- ✅ Close unused browser tabs
- ✅ Use Chrome (fastest for web apps)
- ✅ Disable browser extensions (ad blockers slow things down)
- ✅ Use wired internet (faster than WiFi)
- ✅ Check network monitor (F12 → Network tab)

**If still slow:**
- Check /api/health status
- Tell IT: "System is slow, /api/health working?"
- May be server-side issue

---

## 🚨 Escalation Decision Tree

```
START: Something's broken
    ↓
Is it blocking patient care?
├─ YES → Call IT immediately (ext. 5555)
└─ NO → Try troubleshooting steps

Did troubleshooting help?
├─ YES → Document what worked
└─ NO → Escalate to IT

What's the issue?
├─ Pharmacy email failed → Try resend, if fails → Call IT
├─ Telehealth link broken → Generate new link, if fails → Call IT
├─ Eligibility check failed → Optional, not blocking → Can skip
├─ Patient slow → Clear cache, restart
├─ Permission denied → Log out/in, if fails → Call IT
├─ Database locked → Wait 2 min, if persists → Call IT
└─ Other → Call IT with error details

When calling IT:
1. Describe what you see (error message)
2. Tell steps you already tried
3. Give patient/medication name
4. Note time it happened
5. Screenshot if possible
```

---

## 📞 Contact Information

### Support Tiers

**Tier 1: Immediate (Patient Safety)**
- Refill completely blocked for urgent medication
- Patient in pain/distress
- Data loss occurred
- 📞 Call: 555-123-4567 (emergency)

**Tier 2: High (Business Impact)**
- Email notifications not working
- Multiple patients affected
- 📞 Call: 555-123-4568 (high priority)
- 📧 Email: support@clarity-ehr.com

**Tier 3: Normal (Enhancement)**
- Single patient issue
- Non-urgent question
- Feature request
- 📧 Email: support@clarity-ehr.com
- ⏱️ Response: 24 hours

**Tier 4: Documentation**
- How-to questions
- Best practices
- Training resources
- 📚 Check: Staff quick reference guide

---

## ✅ When NOT to Call IT

| Issue | Why It's OK |
|-------|----------|
| **Copay estimate differs from actual** | Insurance system, not our bug |
| **Pharmacy is slow to respond** | Pharmacy issue, not our system |
| **Patient can't remember password** | User account recovery process |
| **Want to add new feature** | Feature request, not a bug |
| **Eligibility check failed** | Optional, fallback method available |

---

## 📋 Incident Report Template

**When you find a real bug, report it:**

```
FROM: [Your name]
DATE: [When it happened]
TIME: [Exact time, include timezone]
PATIENT: [Name and ID if applicable]
ISSUE: [Describe what went wrong]
STEPS: [How to reproduce the issue]
ERROR: [Any error messages, include screenshot]
SEVERITY: [Critical/High/Medium/Low]
IMPACT: [Who/what affected]
```

**Email to:** support@clarity-ehr.com
**Subject:** BUG REPORT: [Short description]

---

## 🎓 Knowledge Base Links

- **Staff Training:** STAFF_QUICK_REFERENCE.md
- **Setup Guide:** IT_SETUP_GUIDE.md
- **Phase 2 Details:** PHASE_2_IMPLEMENTATION.md
- **Patient Consent:** PATIENT_CONSENT_FORM.md
- **API Reference:** BACKEND_API_REFERENCE.md

---

**Remember:** Most issues are simple and can be fixed with a page refresh or clearing browser cache. Don't hesitate to restart, refresh, or call for help if stuck!

Last updated: June 11, 2026
