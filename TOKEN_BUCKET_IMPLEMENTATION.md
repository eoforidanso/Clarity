# Token Bucket Rate Limiting — Clean Architecture

## 📋 Overview

Simple, production-safe token bucket implementation. Each user gets **100 actions/day**, resets at midnight UTC.

---

## 🏗️ Architecture

### **Three Simple Components:**

1. **User Entity** — Two new columns
   - `daily_tokens_remaining` (int, default: 100)
   - `daily_token_reset_at` (timestamp)

2. **TokenBucketService** — Token logic
   - `consumeToken(user)` — Deduct one token, auto-reset if needed
   - `getRemainingTokens(user)` — Check balance
   - `getTokenStatus(user)` — Full status (remaining, limit, reset time)

3. **TokenBucketFilter** — Request interceptor
   - Runs on every authenticated API call
   - Skips `/api/auth/*` endpoints
   - Returns 429 (Too Many Requests) when limit exceeded
   - Adds response headers showing remaining tokens

---

## 🔄 How It Works

```
User makes API call
       ↓
TokenBucketFilter intercepts
       ↓
Check: Is it past daily_token_reset_at?
       ├─ YES: Reset tokens to 100, set reset to tomorrow 00:00 UTC
       └─ NO: Continue
       ↓
Check: daily_tokens_remaining > 0?
       ├─ YES: Deduct 1, allow request to proceed
       └─ NO: Return 429 error
```

---

## 📝 Database Schema

### **Migration V7:**
```sql
ALTER TABLE users ADD COLUMN daily_tokens_remaining INTEGER NOT NULL DEFAULT 100;
ALTER TABLE users ADD COLUMN daily_token_reset_at TIMESTAMP NULL;
```

**That's it!** No sessions table, no extra complexity.

---

## 🔌 API Endpoints

### **Login (Returns Token Status)**
```
POST /api/auth/login
{
  "username": "dr.danso",
  "password": "Pass123!"
}

Response:
{
  "token": "eyJhbGci...",
  "user": { ... },
  "tokenStatus": {
    "remaining": 100,
    "limit": 100,
    "resetsAt": "2026-06-10T00:00:00"
  }
}
```

### **Check Token Status**
```
GET /api/auth/token-status
Authorization: Bearer {token}

Response:
{
  "remaining": 87,
  "limit": 100,
  "resetsAt": "2026-06-10T00:00:00",
  "message": "You have 87 actions remaining today"
}
```

### **Me Endpoint (Updated)**
```
GET /api/auth/me
Authorization: Bearer {token}

Response includes tokenStatus field
```

---

## 📤 Response Headers

Every API response includes token info:

```
X-Token-Remaining: 87
X-Token-Limit: 100
X-Token-Reset: 2026-06-10T00:00:00
```

Clients can display this in UI (e.g., "87/100 actions remaining").

---

## ❌ When Limit Exceeded

```
HTTP 429 Too Many Requests

{
  "error": "Daily token limit exceeded",
  "message": "You have reached your daily action limit. Please try again tomorrow.",
  "remaining": 0,
  "limit": 100,
  "resetsAt": "2026-06-10T00:00:00"
}
```

---

## 🚀 Implementation Summary

| File | Change |
|------|--------|
| `User.java` | ✅ Added 2 columns |
| `V7__add_user_sessions.sql` | ✅ Simple migration |
| `TokenBucketService.java` | ✅ New service |
| `TokenBucketFilter.java` | ✅ New filter |
| `AuthController.java` | ✅ Updated login, added endpoint |

---

## ⚙️ Configuration

**Daily token limit:** Edit `TokenBucketService.java`
```java
private static final int DAILY_TOKEN_LIMIT = 100;
```

**Reset time:** Currently midnight UTC. To change:
```java
user.setDailyTokenResetAt(
    now.toLocalDate().plusDays(1)
       .atTime(9, 0)  // Reset at 9 AM instead
       .atZone(ZoneId.of("America/New_York"))
       .toLocalDateTime()
);
```

---

## 📊 Monitoring

### Check Token Consumption
```sql
-- Users who've used all tokens today
SELECT username, daily_tokens_remaining, daily_token_reset_at
FROM users
WHERE daily_tokens_remaining = 0
AND DATE(daily_token_reset_at) = CURRENT_DATE;

-- Average tokens consumed per user
SELECT 
  username, 
  (100 - daily_tokens_remaining) as tokens_used_today,
  daily_token_reset_at
FROM users
WHERE daily_token_reset_at > NOW()
ORDER BY tokens_used_today DESC;
```

---

## 🎯 Why This Design?

✅ **Simple** — Only 2 columns, 1 service, 1 filter  
✅ **Scalable** — O(1) per request, no database locks  
✅ **Fair** — Every user gets same allocation  
✅ **Transparent** — Clients see remaining tokens in headers  
✅ **No UX friction** — Users can login as many times as they want  
✅ **Production-safe** — Proven pattern used by AWS, Stripe, etc.

---

## 🧪 Testing

### Test Token Consumption
```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dr.danso","password":"Pass123!"}'

# Save token from response
TOKEN="eyJhbGci..."

# Check status
curl -X GET http://localhost:5001/api/auth/token-status \
  -H "Authorization: Bearer $TOKEN"

# Make API calls (each deducts 1 token)
curl -X GET http://localhost:5001/api/patients \
  -H "Authorization: Bearer $TOKEN"

# Check headers
curl -i -X GET http://localhost:5001/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  | grep X-Token
```

---

## ✨ Features

- ✅ Auto-reset at midnight
- ✅ No login restrictions
- ✅ Token status in every response
- ✅ 429 error when limit exceeded
- ✅ Transparent to user experience
- ✅ Easy to audit & monitor
