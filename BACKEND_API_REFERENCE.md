# Backend API Reference — Refill Queue & Telehealth

**Version:** 2.0 (Phase 2)  
**Base URL:** `https://api.clarity-ehr.com`  
**Authentication:** JWT Bearer Token  
**Last Updated:** June 11, 2026

---

## 📚 Table of Contents

1. [Authentication](#authentication)
2. [Refills Endpoints](#refills-endpoints)
3. [Notifications Endpoints](#notifications-endpoints)
4. [Insurance Endpoints](#insurance-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Data Models](#data-models)

---

## 🔐 Authentication

### Header Format
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Example Request
```bash
curl -X GET https://api.clarity-ehr.com/api/refills \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Getting a Token
```bash
# Login endpoint (separate, handled by auth routes)
POST /api/auth/login
{
  "username": "dr.danso",
  "password": "Pass123!"
}
# Returns: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

---

## 💊 Refills Endpoints

### 1. Create Refill
```
POST /api/refills
```

**Request:**
```json
{
  "patientId": 123,
  "medicationId": 456,
  "medicationName": "Sertraline 100mg",
  "dose": "100mg",
  "frequency": "Once daily",
  "notes": "Patient has insurance"
}
```

**Response (201 Created):**
```json
{
  "refillId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "createdAt": "2026-06-11T12:00:00.000Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Missing required field: medicationName"
}
```

---

### 2. Get Refills by Status
```
GET /api/refills/status/:status?limit=50&offset=0
```

**Parameters:**
- `status` (string): `pending`, `queued`, `sent`, `filled`, `rejected`
- `limit` (number, optional): Max results, default 50, max 500
- `offset` (number, optional): Pagination offset, default 0

**Example:**
```bash
GET /api/refills/status/pending?limit=50&offset=0
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patientId": 123,
    "patientName": "John Smith",
    "medicationName": "Sertraline 100mg",
    "dose": "100mg",
    "frequency": "Once daily",
    "daysRemaining": 5,
    "status": "pending",
    "priority": "urgent",
    "pharmacy": "CVS Main St",
    "copayAmount": 30.00,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "queuedAt": null,
    "sentAt": null
  },
  // ... more refills
]
```

---

### 3. Get Single Refill
```
GET /api/refills/:id
```

**Example:**
```bash
GET /api/refills/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patientId": 123,
  "patientName": "John Smith",
  "medicationName": "Sertraline 100mg",
  "copayAmount": 30.00,
  "insuranceVerifiedAt": "2026-06-11T11:00:00.000Z",
  "auditTrail": [
    {
      "event": "Refill created",
      "timestamp": "2026-06-11T10:00:00.000Z"
    },
    {
      "event": "Insurance verified",
      "timestamp": "2026-06-11T11:00:00.000Z",
      "metadata": { "copayAmount": 30.00 }
    }
  ],
  "notifications": [
    {
      "id": "notif-1",
      "type": "email",
      "recipient": "cvs@pharmacymail.com",
      "status": "sent",
      "sentAt": "2026-06-11T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Get Patient Refills
```
GET /api/refills/patient/:patientId?limit=50
```

**Example:**
```bash
GET /api/refills/patient/123?limit=50
```

**Response:** Same as endpoint #2 (array of refills)

---

### 5. Update Refill Status
```
PATCH /api/refills/:id/status
```

**Request:**
```json
{
  "status": "queued",
  "metadata": {
    "queuedBy": "nurse.kelly",
    "notes": "Patient confirmed insurance"
  }
}
```

**Allowed status transitions:**
```
pending → queued
queued → sent
sent → filled
any → rejected
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "queued",
  "updatedAt": "2026-06-11T12:05:00.000Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Invalid status transition: queued → pending"
}
```

---

### 6. Verify Insurance Eligibility
```
POST /api/refills/:id/verify-insurance
```

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "eligible": true,
  "copayAmount": 30.00,
  "coverageType": "pharmacy",
  "deductible": 500.00,
  "deductibleMet": 250.00,
  "cached": false,
  "checkedAt": "2026-06-11T12:00:00.000Z"
}
```

**Response (Ineligible):**
```json
{
  "eligible": false,
  "copayAmount": null,
  "coverageType": null,
  "error": "Patient no longer covered",
  "cached": false
}
```

**Error (500 Server Error - insurance API down):**
```json
{
  "error": "Insurance verification service unavailable"
}
```

---

### 7. Send Refill to Pharmacy
```
POST /api/refills/:id/send-to-pharmacy
```

**Request:**
```json
{
  "pharmacyEmail": "cvs@pharmacymail.com",
  "pharmacyName": "CVS Main St",
  "verifyInsurance": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "email": {
    "success": true,
    "messageId": "67890-resend-message-id",
    "notificationId": "notif-1"
  },
  "sms": {
    "success": true,
    "messageId": "SMS-12345-67890",
    "notificationId": "notif-2"
  }
}
```

**Error (400 Bad Request - missing pharmacy):**
```json
{
  "error": "Pharmacy email is required"
}
```

**Error (500 Server Error):**
```json
{
  "error": "Failed to send refill: Email service unavailable",
  "details": "Resend API error: Invalid API key"
}
```

---

### 8. Get Refill Audit Trail
```
GET /api/refills/:id/audit-trail
```

**Response (200 OK):**
```json
[
  {
    "event": "Refill created",
    "timestamp": "2026-06-11T10:00:00.000Z",
    "user": "dr.danso"
  },
  {
    "event": "Status changed to queued",
    "timestamp": "2026-06-11T10:30:00.000Z",
    "user": "nurse.kelly",
    "metadata": { "reason": "Patient confirmed" }
  },
  {
    "event": "Email sent to pharmacy",
    "timestamp": "2026-06-11T12:00:00.000Z",
    "metadata": { "pharmacyEmail": "cvs@mail.com", "messageId": "msg-123" }
  },
  {
    "event": "SMS sent to patient",
    "timestamp": "2026-06-11T12:01:00.000Z",
    "metadata": { "phone": "***-***-1234" }
  }
]
```

---

### 9. Delete Refill (Soft Delete)
```
DELETE /api/refills/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "deletedAt": "2026-06-11T13:00:00.000Z"
}
```

---

## 📧 Notifications Endpoints

### 10. Get Refill Notifications
```
GET /api/refills/:id/notifications
```

**Response (200 OK):**
```json
[
  {
    "id": "notif-1",
    "refillId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "email",
    "recipient": "cvs@mail.com",
    "status": "sent",
    "externalId": "resend-msg-123",
    "sentAt": "2026-06-11T12:00:00.000Z",
    "deliveredAt": "2026-06-11T12:01:00.000Z"
  },
  {
    "id": "notif-2",
    "refillId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sms",
    "recipient": "***-***-1234",
    "status": "sent",
    "externalId": "sms-msg-456",
    "sentAt": "2026-06-11T12:01:00.000Z",
    "deliveredAt": "2026-06-11T12:02:00.000Z"
  },
  {
    "id": "notif-3",
    "refillId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "email",
    "recipient": "fallback@mail.com",
    "status": "failed",
    "errorMessage": "Invalid email address",
    "createdAt": "2026-06-11T12:30:00.000Z"
  }
]
```

---

### 11. Resend Failed Notification
```
POST /api/refills/:id/resend-notification
```

**Request:**
```json
{
  "type": "email"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "result": {
    "messageId": "resend-retry-123",
    "notificationId": "notif-retry",
    "sentAt": "2026-06-11T13:00:00.000Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Max retries (3) exceeded for email"
}
```

---

## 🏥 Insurance Endpoints

### 12. Check Insurance Eligibility
```
POST /api/refills/:id/verify-insurance
```

*(See endpoint #6 above)*

---

## 📊 Admin Endpoints

### 13. Get Refill Statistics
```
GET /api/refills/admin/stats
```

**Response (200 OK):**
```json
{
  "pending": 45,
  "queued": 12,
  "sent_today": 8,
  "total": 150,
  "urgent_count": 5,
  "average_days_remaining": 14
}
```

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK - Request succeeded | Fetched refill |
| 201 | Created - New resource made | Created refill |
| 400 | Bad Request - Invalid input | Missing required field |
| 401 | Unauthorized - Invalid token | Expired JWT |
| 403 | Forbidden - No permission | Patient from different facility |
| 404 | Not Found - Resource missing | Refill ID doesn't exist |
| 429 | Too Many Requests - Rate limited | Hit API limit |
| 500 | Server Error - Internal error | Database connection failed |
| 503 | Service Unavailable - Temporarily down | Maintenance mode |

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional: More technical details",
  "timestamp": "2026-06-11T12:00:00.000Z",
  "requestId": "req-12345-67890"
}
```

### Example Errors

**401 Unauthorized (Invalid Token):**
```json
{
  "error": "Invalid or expired JWT token",
  "code": "AUTH_INVALID_TOKEN"
}
```

**429 Rate Limited:**
```json
{
  "error": "Too many requests - you have exceeded the rate limit",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## ⚙️ Rate Limiting

### Limits

- **Default:** 300 requests per 15 minutes per facility
- **Auth endpoints:** 5 failed attempts per 15 minutes per IP
- **Reset:** Automatically after time window

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1623423600
```

### Exceeding Limits

```json
{
  "error": "Rate limit exceeded - 300 requests per 15 minutes",
  "retryAfter": 300
}
```

**What to do:** Wait 5 minutes before retrying.

---

## 📦 Data Models

### Refill Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patientId": 123,
  "medicationId": 456,
  "medicationName": "Sertraline 100mg",
  "dose": "100mg",
  "frequency": "Once daily",
  "pharmacy": "CVS Main St",
  "pharmacyEmail": "cvs@pharmacymail.com",
  "pharmacyPhone": "(555) 123-4567",
  "status": "pending|queued|sent|filled|rejected",
  "priority": "low|normal|high|urgent",
  "daysRemaining": 7,
  "refillsRemaining": 3,
  "copayAmount": 30.00,
  "createdBy": 789,
  "createdAt": "2026-06-11T10:00:00.000Z",
  "queuedAt": "2026-06-11T10:30:00.000Z",
  "sentAt": "2026-06-11T12:00:00.000Z",
  "filledAt": null,
  "insuranceVerifiedAt": "2026-06-11T11:00:00.000Z",
  "notes": "Patient has insurance",
  "deletedAt": null,
  "auditTrail": [
    {
      "event": "Status changed to queued",
      "timestamp": "2026-06-11T10:30:00.000Z",
      "user": "nurse.kelly"
    }
  ]
}
```

### Notification Object

```json
{
  "id": "notif-1",
  "refillId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "email",
  "recipient": "cvs@pharmacymail.com",
  "status": "pending|sent|failed|delivered|read",
  "externalId": "resend-msg-123",
  "errorMessage": null,
  "createdAt": "2026-06-11T12:00:00.000Z",
  "sentAt": "2026-06-11T12:00:00.000Z",
  "deliveredAt": "2026-06-11T12:01:00.000Z",
  "readAt": null
}
```

### Insurance Eligibility Object

```json
{
  "eligible": true,
  "copayAmount": 30.00,
  "coverageType": "pharmacy",
  "deductible": 500.00,
  "deductibleMet": 250.00,
  "outOfPocket": 2000.00,
  "requiresPreauth": false,
  "cached": true,
  "cachedAt": "2026-06-11T11:00:00.000Z",
  "expiresAt": "2026-06-12T11:00:00.000Z"
}
```

---

## 🧪 Testing

### Using cURL

```bash
# Get authorization token first
TOKEN=$(curl -X POST https://api.clarity-ehr.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dr.danso","password":"Pass123!"}' \
  | jq -r .token)

# Get pending refills
curl -X GET https://api.clarity-ehr.com/api/refills/status/pending \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Create refill
curl -X POST https://api.clarity-ehr.com/api/refills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 123,
    "medicationId": 456,
    "medicationName": "Sertraline 100mg",
    "dose": "100mg",
    "frequency": "Once daily"
  }' | jq .
```

### Using Postman

1. Create collection: `Clarity EHR API`
2. Add authentication:
   - Type: Bearer Token
   - Token: (paste JWT from login)
3. Create requests:
   - GET /api/refills/status/pending
   - POST /api/refills
   - etc.

### Using Node.js Fetch

```javascript
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Get refills
const response = await fetch('https://api.clarity-ehr.com/api/refills/status/pending', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

---

## 📞 Pagination

For large result sets, use pagination:

```bash
# First page (50 items)
GET /api/refills/status/pending?limit=50&offset=0

# Next page
GET /api/refills/status/pending?limit=50&offset=50

# Response includes count
{
  "items": [...],
  "total": 150,
  "offset": 0,
  "limit": 50
}
```

---

## 🔗 Related Resources

- **Frontend Implementation:** PHASE_2_IMPLEMENTATION.md
- **Staff Guide:** STAFF_QUICK_REFERENCE.md
- **Troubleshooting:** TROUBLESHOOTING_GUIDE.md
- **IT Setup:** IT_SETUP_GUIDE.md

---

**Last updated:** June 11, 2026  
**API Version:** 2.0  
**Status:** Production Ready
