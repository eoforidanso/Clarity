# IT Setup & Deployment Guide — Phase 2 Refills & Telehealth

**Version:** 2.0 (Phase 2)  
**Audience:** IT Administrators, DevOps, System Administrators  
**Last Updated:** June 11, 2026

---

## 📋 Prerequisites

### Required Access
- [ ] Git repository access (https://github.com/eoforidanso/Clarity)
- [ ] PostgreSQL database access (DigitalOcean managed)
- [ ] Cloudflare Pages dashboard access
- [ ] DigitalOcean account access (app server)
- [ ] Resend API account access (email service)
- [ ] GitHub Actions access

### Required Skills
- Node.js/npm experience
- PostgreSQL basics
- Docker or manual server deployment
- Git version control
- Environment variables management

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Checklist

```bash
# Check git status
git status
# Expected: clean, all changes committed

# Check Node version
node --version
# Expected: v18.0.0 or higher

# Check npm version
npm --version
# Expected: v9.0.0 or higher

# Check database connection
psql $DATABASE_URL -c "SELECT version();"
# Expected: PostgreSQL 12+ running

# Check Resend API key
echo $RESEND_API_KEY
# Expected: re_xxx... (should not be empty)
```

### Step 2: Pull Latest Code

```bash
cd /path/to/clarity-ehr
git pull origin main

# Verify Phase 2 files exist
ls -la server/db/migrations/20260611_000001_refill_system.js
ls -la server/services/Refill*.js
ls -la server/routes/refills.js
# Expected: All files present
```

### Step 3: Install Dependencies

```bash
# Install npm packages
npm install

# Verify packages installed
npm list | head -20
# Expected: no critical errors, some warnings OK
```

### Step 4: Build Frontend

```bash
# Build production bundle
npm run build

# Check build succeeded
ls -la dist/index.html
ls -la dist/static/*.js
# Expected: dist/ folder populated with files
```

### Step 5: Database Migration (Auto-Run)

**Migrations run automatically on server startup.** No manual step needed.

However, to test migration **before** deployment:

```bash
# Start server (migrations run during startup)
npm run dev

# Check logs for migration confirmation
# Expected output:
# [migrations] 1 pending migration(s)
# [migrations] → Running 20260611_000001_refill_system.js…
# [migrations] ✅ 20260611_000001_refill_system.js (245ms)
# [migrations] ✅ 1 migration(s) applied

# Verify tables created
psql $DATABASE_URL -c "\dt refills refill_notifications insurance_eligibility_cache"
# Expected:
# refills | table | postgres
# refill_notifications | table | postgres
# insurance_eligibility_cache | table | postgres
```

### Step 6: Environment Variables

Ensure all required variables are set in **production**:

```bash
# Check all vars are set
env | grep -E "DATABASE_URL|JWT_SECRET|RESEND_API_KEY|ALLOWED_ORIGINS|NODE_ENV"

# Expected output (some redacted):
DATABASE_URL=postgres://user:***@db.ondigitalocean.com:...
JWT_SECRET=your-secret-key-here
RESEND_API_KEY=re_abc123xyz
ALLOWED_ORIGINS=https://app.clarity-ehr.com,https://staging.clarity-ehr.com
NODE_ENV=production
```

### Step 7: Deploy Frontend (Cloudflare Pages)

```bash
# Wrangler CLI deploys automatically on git push
# But can deploy manually:

npm run deploy

# Expected output:
# ✓ Deploying to Cloudflare Pages
# ✓ https://clarity-ehr.pages.dev
# ✓ Preview: https://[commit-hash].clarity-ehr.pages.dev
```

### Step 8: Deploy Backend (DigitalOcean)

```bash
# SSH into DigitalOcean server
ssh root@api.clarity-ehr.com

# Pull latest code
cd /app/clarity-ehr
git pull origin main

# Install dependencies
npm install --production

# Restart server via PM2
pm2 restart clarity-ehr

# Check server is running
pm2 status

# Expected: clarity-ehr | online | 0 restarts | 0% CPU | 45.8 MB
```

### Step 9: Health Check

```bash
# Test API is responding
curl https://api.clarity-ehr.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-06-11T12:00:00.000Z",
  "env": "production"
}

# Test full health check (with DB)
curl https://api.clarity-ehr.com/api/health/full

# Expected response includes:
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok" },
    "migrations": { "status": "ok", "applied": 10 },
    "memory": { "status": "ok", "heapUsedMB": 150 },
    "uptime": { "status": "ok", "seconds": 3600 }
  }
}
```

### Step 10: Verify Production

```bash
# Test frontend loads
curl https://app.clarity-ehr.com | grep "<title>"
# Expected: <title>Clarity EHR</title>

# Test API authentication
curl -H "Authorization: Bearer test-token" \
  https://api.clarity-ehr.com/api/refills

# Expected: 401 Unauthorized (valid response, means API working)

# Check browser console (live app)
# Expected: No critical errors, some warnings OK
```

---

## 🔐 Security Configuration

### Environment Variables (MUST BE SET)

```bash
# 1. Database
DATABASE_URL=postgres://user:pass@host:5432/clarity

# 2. Authentication
JWT_SECRET=<64-char random string>
# Generate: openssl rand -hex 32

# 3. Email Service
RESEND_API_KEY=re_<your-resend-key>
RESEND_FROM=noreply@clarity-ehr.com

# 4. CORS Origins
ALLOWED_ORIGINS=https://app.clarity-ehr.com,https://staging.clarity-ehr.com

# 5. Environment
NODE_ENV=production

# 6. Optional: SMS (Phase 2C+)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15551234567

# 7. Optional: Insurance APIs (Phase 2C+)
INSURANCE_API_PROVIDER=mock
INSURANCE_API_KEY=xxxxx
```

### SSL/TLS Certificates

- ✅ **Cloudflare Pages:** Auto-managed, free HTTPS
- ✅ **DigitalOcean API:** Use Let's Encrypt or managed certificate
- ✅ **Database:** SSL required for remote connection (DigitalOcean enforces)

### Database Security

```bash
# Check password strength
# Expected: Mix of upper, lower, numbers, symbols, 20+ chars

# Check user permissions
psql $DATABASE_URL -c "SELECT * FROM pg_user;"
# Expected: clarity_user has connect, create permissions only

# Disable public schema for app
psql $DATABASE_URL -c "REVOKE ALL ON SCHEMA public FROM PUBLIC;"
psql $DATABASE_URL -c "GRANT USAGE ON SCHEMA public TO clarity_user;"
```

### API Security

```bash
# Check rate limiting is enabled
curl -H "Authorization: Bearer token" \
  https://api.clarity-ehr.com/api/refills
# Should return: RateLimit headers in response

# Check authentication middleware
# All /api/* routes require JWT token

# Check facility isolation
# Users can only access their facility's data
```

---

## 📊 Monitoring & Logs

### Application Logs

```bash
# SSH into DigitalOcean server
ssh root@api.clarity-ehr.com

# View real-time logs
pm2 logs clarity-ehr

# View specific errors
pm2 logs clarity-ehr | grep ERROR

# Check PM2 dashboard
pm2 monit

# Expected: clarity-ehr process running, ~50-150 MB RAM, <5% CPU
```

### Database Logs

```bash
# Check database is responding
psql $DATABASE_URL -c "SELECT NOW();"

# Monitor connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
# Expected: <20 active connections

# Check query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
# Investigate slow queries
```

### Cloudflare Analytics

1. Go to **Cloudflare Dashboard**
2. Select **clarity-ehr** project
3. View **Analytics** tab:
   - Page views
   - Requests
   - Errors (4xx, 5xx)
   - Performance (p50, p95, p99)

### Email Service (Resend)

1. Go to **Resend Dashboard** (resend.com)
2. View **Emails** tab:
   - Sent count
   - Delivery rate (target: >98%)
   - Bounce rate (target: <0.5%)
   - Spam complaints (target: 0%)

---

## 🐛 Troubleshooting Deployment

### Issue: Database Migration Failed

```bash
# Error: "FATAL: relation refills does not exist"
# Cause: Migration didn't run

# Solution:
1. Check migration file exists
   ls -la server/db/migrations/20260611_000001_refill_system.js
   
2. Check schema_migrations table
   psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"
   
3. If migration not listed, manually mark as complete:
   psql $DATABASE_URL -c "INSERT INTO schema_migrations (filename, duration_ms) VALUES ('20260611_000001_refill_system.js', 0);"
   
4. Restart server
   pm2 restart clarity-ehr
```

### Issue: Email Not Sending

```bash
# Error: "Resend API key is missing"
# Cause: RESEND_API_KEY not set

# Solution:
1. Check env var is set
   echo $RESEND_API_KEY
   
2. If empty, add to .env:
   RESEND_API_KEY=re_xxxxx
   
3. Reload server
   pm2 restart clarity-ehr
   
4. Check logs
   pm2 logs clarity-ehr | grep "Resend"
```

### Issue: SMS Not Working

```bash
# Error: "Phone number validation failed"
# Cause: Invalid phone format or service not configured

# Solution:
1. For mock (Phase 2B): Check console logs
   pm2 logs clarity-ehr | grep SMS
   
2. For Twilio (Phase 2C+): Verify credentials
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   
3. Test SMS manually
   curl -X POST https://api.clarity-ehr.com/api/refills/test-sms \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"phone": "+15551234567"}'
```

### Issue: Slow API Responses

```bash
# Symptoms: /api/refills takes >1000ms
# Cause: Missing database indexes or slow query

# Solution:
1. Check indexes exist
   psql $DATABASE_URL -c "\d+ refills"
   # Expected: Multiple indexes on patient_id, status, created_at
   
2. Analyze query performance
   psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM refills WHERE status='pending';"
   # Should use index, not table scan
   
3. If slow, recreate indexes
   psql $DATABASE_URL -c "REINDEX TABLE refills;"
   
4. Restart API
   pm2 restart clarity-ehr
```

### Issue: High Memory Usage

```bash
# Symptoms: clarity-ehr process uses >500 MB RAM
# Cause: Memory leak or large data set

# Solution:
1. Check Node heap
   pm2 logs clarity-ehr | grep "heap"
   
2. Restart server (temporary fix)
   pm2 restart clarity-ehr
   
3. Check for memory leaks in code
   grep -r "setInterval\|setTimeout" server/
   # Look for uncleaned timers
   
4. Profile memory usage
   node --inspect server/index.js
   # Open chrome://inspect to debug
```

---

## 📈 Performance Optimization

### Database Indexes

Already created by migration:
```sql
CREATE INDEX idx_refills_patient_id ON refills(patient_id);
CREATE INDEX idx_refills_status ON refills(status);
CREATE INDEX idx_refills_created_at ON refills(created_at DESC);

CREATE INDEX idx_notifications_refill_id ON refill_notifications(refill_id);
CREATE INDEX idx_notifications_status ON refill_notifications(status);

CREATE INDEX idx_eligibility_patient_id ON insurance_eligibility_cache(patient_id);
CREATE INDEX idx_eligibility_expires_at ON insurance_eligibility_cache(expires_at);
```

### Query Optimization Tips

1. **Always use indexed columns in WHERE:**
   ```sql
   -- GOOD (uses index)
   SELECT * FROM refills WHERE patient_id = 123 AND status = 'pending';
   
   -- BAD (table scan)
   SELECT * FROM refills WHERE notes LIKE '%urgent%';
   ```

2. **Limit returned rows:**
   ```sql
   -- GOOD
   SELECT * FROM refills LIMIT 50;
   
   -- BAD (loads all 10,000 rows)
   SELECT * FROM refills;
   ```

3. **Cache 24-hour eligibility:**
   ```sql
   -- Prevents repeated API calls
   SELECT * FROM insurance_eligibility_cache 
   WHERE patient_id = 123 AND expires_at > NOW();
   ```

### Caching Strategy

- **Insurance Cache:** 24-hour TTL (saves 70-80% of API calls)
- **Patient Data:** 1-hour Redis cache (optional, Phase 2C+)
- **Telehealth Links:** Stateless, no caching needed

---

## 🔄 Backup & Recovery

### Database Backups

```bash
# DigitalOcean automatic backups (daily)
# View in DigitalOcean dashboard:
# Databases → clarity-ehr → Backups

# Manual backup
pg_dump $DATABASE_URL > clarity-backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < clarity-backup-20260611.sql
```

### Code Backups

```bash
# GitHub is primary backup
# Commits are immutable and encrypted

# Create local backup of secrets
cp .env .env.backup
# Keep in secure location (not in git)
```

### Disaster Recovery Plan

**If database lost:**
1. Restore from last backup
2. Run migrations (will skip already-applied)
3. Restore any recent data manually
4. Notify users of data loss

**If API server down:**
1. Restart via PM2: `pm2 restart clarity-ehr`
2. If that fails, redeploy: `git pull && npm install && pm2 start`
3. Check /api/health for status

---

## 📞 Support & Escalation

### Escalation Path

1. **Level 1 (Front Desk):** Basic "app is slow" → Check /api/health
2. **Level 2 (IT):** Server logs, database queries, rate limits
3. **Level 3 (DevOps):** Infrastructure, scaling, disaster recovery
4. **Level 4 (Vendor):** Resend email, Cloudflare, DigitalOcean support

### Getting Help

- **Resend Email Issues:** support@resend.com
- **Cloudflare Pages Issues:** Cloudflare support ticket
- **DigitalOcean Issues:** DigitalOcean support ticket
- **Code Issues:** GitHub issues, commit history

---

## ✅ Post-Deployment Checklist

- [ ] API /api/health returns 200
- [ ] Database migration completed
- [ ] Email notifications working (test send)
- [ ] SMS mock logging (test send)
- [ ] Insurance eligibility check working (test call)
- [ ] Telehealth links generating
- [ ] Frontend loads without errors
- [ ] Patient portal functional
- [ ] Audit logs recording actions
- [ ] Backups running automatically
- [ ] Monitoring dashboards active
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Incident response plan ready

---

## 📚 Related Documentation

- **Staff Guide:** STAFF_QUICK_REFERENCE.md
- **Troubleshooting:** TROUBLESHOOTING_GUIDE.md
- **App Documentation:** APP_DOCUMENTATION.md
- **API Reference:** BACKEND_API_REFERENCE.md
- **Phase 2 Details:** PHASE_2_IMPLEMENTATION.md

---

**Questions?** Contact:
- **IT Support:** it@clarity-ehr.com
- **DevOps:** devops@clarity-ehr.com
- **Emergency:** On-call +1-555-123-4567

---

*Last updated: June 11, 2026*
