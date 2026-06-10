# Complete Testing Checklist — Must Do Tests

## 🔐 Login Credentials

**Test Account:**
```
Username: dr.danso
Password: Pass123!
```

Or use any of these:
```
Username: dr.chris        Password: Pass123!
Username: nurse.kelly     Password: Pass123!
Username: harriet         Password: Pass123!
```

---

## ✅ TEST 1: Patient Registration (Adult)

**Goal:** Verify adult patient registration works correctly

**Steps:**
1. Navigate to: **Sidebar → 📝 Patient Registration**
2. Fill **Step 1: Personal Information**
   - First Name: `John`
   - Last Name: `Smith`
   - DOB: `1985-06-15` (Age 39 - Adult)
   - Gender: `Male` (verify only Male/Female show)
   - Pronouns: `He/Him` (verify only He/Him, She/Her show)
   - Race: `White`
   - Ethnicity: `Not Hispanic or Latino`
   - Language: `English`
   - SSN: Leave blank
3. Click **Next →** (should proceed)
4. Fill **Step 2: Contact & Address**
   - Phone: `(555) 123-4567`
   - Cell Phone: `(555) 987-6543`
   - Email: `john@example.com`
   - Street: `123 Main St`
   - City: `Chicago`
   - State: `IL`
   - ZIP: `60601`
5. Click **Next →**
6. **Step 3: Guardian Information**
   - Should show: 🔵 "Patient is 39 years old — guardian information not required"
   - Guardian fields should be HIDDEN
   - ✅ **PASS:** Guardian section hidden
7. Click **Next →**
8. Fill **Step 4: Insurance**
   - Plan Name: `Blue Cross`
   - Member ID: `ABC123456`
   - Group Number: `GRP789`
   - Copay: `25`
9. Click **Next →**
10. Fill **Step 5: Emergency Contact**
    - Name: `Jane Smith`
    - Relationship: `Spouse`
    - Phone: `(555) 111-2222`
11. Click **Next →**
12. **Step 6: Review & Submit**
    - Review shows: John Smith, DOB 1985-06-15, Address, NO Guardian info
    - ✅ **PASS:** Guardian info not shown
13. Click **📅 Save & Schedule**
14. Should redirect to Appointments page
    - ✅ **PASS:** Patient created + scheduled

**Expected Result:** ✅ Adult patient created, no guardian fields

---

## ✅ TEST 2: Patient Registration (Minor)

**Goal:** Verify minor patient registration with guardian detection

**Steps:**
1. Navigate to: **Sidebar → 📝 Patient Registration**
2. Fill **Step 1: Personal Information**
   - First Name: `Sarah`
   - Last Name: `Johnson`
   - DOB: `2010-06-15` (Age 14 - Minor) ⚠️ KEY
   - Gender: `Female`
   - Pronouns: `She/Her`
   - Race: `Asian`
   - Ethnicity: `Not Hispanic or Latino`
3. Click **Next →**
4. Fill **Step 2: Contact & Address**
   - Phone: `(555) 222-3333`
   - Cell Phone: `(555) 444-5555`
   - Email: `sarah@example.com`
   - Address: Any valid address
5. Click **Next →**
6. **Step 3: Guardian Information**
   - Should show: 🔴 "Minor (14 years old) - Guardian required" ⚠️ KEY
   - Guardian fields should be VISIBLE and REQUIRED
   - Fill Guardian:
     - First Name: `Jane`
     - Last Name: `Johnson`
     - Relationship: `Parent`
     - Phone: `(555) 666-7777`
     - Email: `jane@example.com`
     - Check: "Same address as patient"
   - ✅ **PASS:** Guardian fields shown and required
7. Click **Next →**
8. Fill Insurance & Emergency Contact
9. **Step 6: Review & Submit**
   - Should show Guardian info: Jane Johnson, Parent
   - ✅ **PASS:** Guardian info included
10. Click **💳 Save & Insurance**
11. Should redirect to Demographics page with Insurance tab open
    - ✅ **PASS:** Minor patient created with guardian

**Expected Result:** ✅ Minor patient with auto-detected guardian info

---

## ✅ TEST 3: Guardian Auto-Detection Edge Cases

**Test age exactly 18:**
```
DOB: 2006-06-10 (18 years old today)
Expected: Guardian HIDDEN (age ≥ 18)
```

**Test age 17:**
```
DOB: 2008-06-11 (17 years old)
Expected: Guardian SHOWN (age < 18)
```

**Result:** ✅ Guardian detection works correctly at boundaries

---

## ✅ TEST 4: Search Integration - "Add Patient" Button

**Goal:** Verify "Add Patient" button in search results

**Steps:**
1. Navigate to: **Sidebar → 🔍 Patient Search**
2. Search for: `NonexistentPatient999`
3. Should show: Empty state with 🔍 icon
4. Should show: **+ Add Patient "NonexistentPatient999"** button
5. Click button → Registration form opens
6. Verify form shows:
   - First Name: `Nonexistent` (from search term)
   - Last Name: `Patient999` (from search term)
   - ✅ **PASS:** Name pre-filled from search

**Result:** ✅ Search-to-register workflow functional

---

## ✅ TEST 5: Demographics Edit Button (Prominence)

**Goal:** Verify edit button is prominent and working

**Steps:**
1. Navigate to: **Sidebar → 🔍 Patient Search**
2. Click any patient to open their chart
3. Click **Demographics** tab
4. Look for edit button
   - Should see: Large blue button "✏️ Edit Demographics"
   - Should have gradient styling
   - Should have shadow effect
5. Click **✏️ Edit Demographics**
6. Form should become editable:
   - First Name field editable
   - Gender dropdown shows only: Male, Female ✅
   - Pronouns dropdown shows only: He/Him, She/Her ✅
7. Change one field (e.g., First Name)
8. Click **💾 Save Changes**
9. Should show: ✅ "Saved successfully" (green message)
10. Refresh page → Change persists
    - ✅ **PASS:** Edit works and persists

**Result:** ✅ Demographics edit button prominent and functional

---

## ✅ TEST 6: Refill Queue - Add & Process Refills

**Goal:** Verify refill queue basic operations

**Steps:**
1. Navigate to: **Sidebar → 💊 Refill Queue**
2. Should see dashboard stats:
   - ⏳ Pending: X
   - 📋 Queued: X
   - ✅ Sent Today: X
   - 💼 Total: X
3. Should see refill table with columns:
   - Patient, Medication, Days Left, Pharmacy, Priority, Status, Actions
4. Search for any patient name
5. Find patient in system with medications
6. Go to: **Sidebar → 🔍 Patient Search**
7. Click patient → Open chart
8. Click **Medications** tab
9. Find any medication
10. Click **💊 Add to Queue**
11. Should show toast: "✅ Added to refill queue"
12. Go back to **Refill Queue**
13. New refill should appear with status: **⏳ Pending**
14. Click **📋** icon → Status changes to **📋 Queued**
15. Click **✅ Send** → Modal opens:
    - Pharmacy field
    - Refills field
    - Priority dropdown
    - Notes field
16. Fill pharmacy: `CVS Pharmacy`
17. Click **✅ Send to Pharmacy**
18. Status changes to **✅ Sent**
    - ✅ **PASS:** Refill lifecycle complete

**Result:** ✅ Refill queue operations working

---

## ✅ TEST 7: Telehealth Link - Copy & Share

**Goal:** Verify telehealth link generation and copying

**Steps:**
1. Navigate to: **Sidebar → 💊 Refill Queue**
2. Find any patient with refills
3. Look for 🔗 icon in Actions column
4. Click **🔗** icon
5. Modal should open: "🔗 Share Telehealth Link"
6. Should show:
   - Long link like: `https://yourdomain.com/telehealth/join/pt-12345?token=...`
   - **📋 Copy** button
   - 📧 Email Patient button
   - 💬 Text/Message Patient button
7. Click **📋 Copy**
8. Should show toast: "✅ Copied!" or "📧 Link copied!"
9. Check clipboard:
   ```bash
   # In terminal:
   pbpaste  # macOS
   # Should show the telehealth link
   ```
10. Click **📧 Email Patient**
11. Toast shows: "📧 Link copied! Send via email"
12. Click **💬 Text/Message Patient**
13. Toast shows: "💬 Link copied! Send via SMS/message"
    - ✅ **PASS:** All methods show proper feedback

**Result:** ✅ Telehealth link sharing functional

---

## ✅ TEST 8: No Fake Popups

**Goal:** Verify no alert() popups, only toast notifications

**Steps:**
1. Throughout all testing, watch for alert() popups
   - ✅ Should NOT see: `alert()` dialogs
   - ✅ Should see: Toast notifications (bottom-right)
2. When copying telehealth link:
   - ❌ Should NOT show: `alert("Link copied! You can now...")`
   - ✅ Should show: Toast notification
3. When adding to queue:
   - ❌ Should NOT show: `alert()` popups
   - ✅ Should show: Toast: "✅ Added to refill queue"

**Result:** ✅ No fake popups, only professional toasts

---

## ✅ TEST 9: Mobile Responsiveness

**Goal:** Verify forms work on mobile

**Steps:**
1. Open browser DevTools (F12)
2. Click Device Toolbar (mobile icon)
3. Select iPhone 12 or similar
4. Navigate to: **📝 Patient Registration**
5. Fill form on mobile:
   - Text inputs readable
   - Buttons clickable
   - No horizontal scrolling needed
   - Form layouts stack properly
6. Navigate to: **💊 Refill Queue**
7. On mobile, table should:
   - Be readable (not cut off)
   - Buttons accessible
   - Modal works on mobile
8. Test both portrait and landscape modes
   - ✅ **PASS:** Mobile responsive

**Result:** ✅ All features work on mobile

---

## ✅ TEST 10: Gender & Pronouns Simplified

**Goal:** Verify only Male/Female and He/Him/She/Her show

**Steps:**
1. Go to: **📝 Patient Registration** → Step 1
2. Click Gender dropdown
   - Should see: `Male`, `Female` (ONLY 2 options)
   - ❌ Should NOT see: Non-binary, Transgender, Other, Prefer not to say
3. Click Pronouns dropdown
   - Should see: `He/Him`, `She/Her` (ONLY 2 options)
   - ❌ Should NOT see: They/Them, Other
4. Go to patient chart → Demographics tab
5. Click **✏️ Edit Demographics**
6. Verify same options:
   - Gender: Male, Female only ✅
   - Pronouns: He/Him, She/Her only ✅

**Result:** ✅ Form options simplified as required

---

## 📊 TEST SUMMARY SHEET

```
TEST                                    | EXPECTED        | ACTUAL | PASS/FAIL
─────────────────────────────────────────────────────────────────────────────
1. Adult Patient Registration           | Create patient  |        | ☐ PASS
2. Minor Patient Registration           | Add guardian    |        | ☐ PASS
3. Guardian Auto-Detection              | Age < 18        |        | ☐ PASS
4. Search "Add Patient" Button          | Pre-fill name   |        | ☐ PASS
5. Demographics Edit Button             | Prominent       |        | ☐ PASS
6. Refill Queue Operations              | Add/Queue/Send  |        | ☐ PASS
7. Telehealth Link Copy/Share           | Copy to clip    |        | ☐ PASS
8. No Fake Popups                       | Toast only      |        | ☐ PASS
9. Mobile Responsiveness                | Works on mobile |        | ☐ PASS
10. Gender/Pronouns Simplified          | M/F, He/She     |        | ☐ PASS
─────────────────────────────────────────────────────────────────────────────
OVERALL STATUS                                                      | ☐ PASS
```

---

## 🐛 Issues Found?

If you encounter issues:

1. **Check browser console** (F12 → Console tab)
   - Look for red error messages
   - Report any errors

2. **Check localStorage**
   - F12 → Application → LocalStorage
   - Look for `clarity_refill_queue` (should have refill data)

3. **Try clearing cache**
   ```bash
   # In browser:
   F12 → Application → Clear site data
   # Then refresh page (Ctrl+Shift+R)
   ```

4. **Check git status**
   ```bash
   cd /Users/harrietappiah/Desktop/vscode/EHR1-master
   git status
   # Should be clean (no uncommitted changes)
   ```

---

## ✅ When All Tests Pass

Once all tests pass:
1. Create a test summary document
2. Take screenshots of key features
3. Create training materials
4. Plan deployment date
5. Brief IT/Support team

---

## 🚀 Success Criteria

✅ All 10 tests pass  
✅ No console errors  
✅ Mobile works  
✅ No fake popups  
✅ Features work as documented  

**Then ready for production deployment!** 🎉

---

**Last Updated:** June 10, 2026  
**Status:** Ready for Manual Testing
