# 🚀 Quick Start: Remove Demo Data & Connect to Real Backend

## **What We Just Did:**
✅ Cleared all 6 demo patients from Clarity EHR  
✅ Cleared all demo appointments, inbox, claims, analytics  
✅ Configured Spring Boot backend for PostgreSQL  
✅ Created deployment guides for DigitalOcean  

---

## **Next Steps (In Order):**

### **🔑 Step 1: Generate Secure JWT Secret** (2 min)
```bash
openssl rand -base64 32
# Copy the output (you'll paste it in Step 3)
```

### **📝 Step 2: Get DigitalOcean PostgreSQL Credentials** (5 min)
1. Go to **DigitalOcean Dashboard**
2. Click **Databases** 
3. Select your PostgreSQL cluster
4. Copy these:
   - **Host** (e.g., `db-postgresql-abc123...`)
   - **Port** (usually `25060`)
   - **User** (usually `doadmin`)
   - **Password** (shown once!)
   - **Database name** (e.g., `clarity_ehr`)

### **⚙️ Step 3: Update Backend Configuration** (2 min)

Edit `server-spring/src/main/resources/application.properties`:

Replace these lines:
```properties
spring.datasource.url=jdbc:postgresql://YOUR_DO_HOST:25060/clarity_ehr?sslmode=require
spring.datasource.username=doadmin
spring.datasource.password=YOUR_DO_PASSWORD_FROM_STEP_2
app.jwt.secret=YOUR_JWT_SECRET_FROM_STEP_1
```

### **🔨 Step 4: Build Backend** (3 min)
```bash
cd server-spring
mvn clean package -DskipTests
```

### **✔️ Step 5: Test Backend Locally** (2 min)
```bash
java -jar target/clarity-ehr-0.0.1-SNAPSHOT.jar
```

In another terminal:
```bash
curl http://localhost:5001/api/patients
# Should return: []
```

### **☁️ Step 6: Deploy Backend** (Choose One)

**A) Easiest - DigitalOcean App Platform:**
- Push code to GitHub
- Create new App in DO → Connect GitHub repo
- Set environment variables (from Step 2-3)
- Click Deploy
- Get your API URL (e.g., `https://clarity-ehr-api-abc123.ondigitalocean.app`)

**B) Most Control - Droplet:**
- Create Ubuntu 22.04 Droplet
- Install Java
- Upload JAR + create systemd service
- Get Droplet IP as your API URL

### **🌐 Step 7: Update Frontend** (2 min)

Edit `.env.production`:
```bash
VITE_API_URL=https://YOUR_BACKEND_URL_FROM_STEP_6
```

### **📦 Step 8: Build & Deploy Frontend** (5 min)

```bash
npm run build
# Upload to GitHub Pages, Vercel, DO App Platform, or Spaces
```

---

## **Verify Everything Works**

1. **Backend API responds:**
   ```bash
   curl https://your-backend-api.com/api/patients
   # Should return: []
   ```

2. **Frontend loads:**
   - Go to your frontend URL
   - Should NOT see "Try Demo" button
   - Should see empty patient list (after login)

3. **No errors in browser console (F12)**
   - Network tab should show `/api/patients` requests going to your backend
   - No "Demo mode" banner at top

---

## **If You Get Stuck**

### **"Connection refused" error**
→ Check PostgreSQL firewall in DigitalOcean Databases panel

### **"CORS error" in browser**
→ Update `app.cors.allowed-origins` in application.properties with your frontend domain

### **Still seeing demo patients**
→ Make sure:
   1. `DEMO_PATIENTS = []` in `src/demo/demoData.js` ✓
   2. Backend is actually running (not local mock data)
   3. Browser cache cleared (Ctrl+Shift+Del)

### **Backend won't start**
→ Check logs: `journalctl -u clarity-ehr -f` (on Droplet)  
Or check **App Logs** in DigitalOcean console

---

## **Current Files Changed:**

| File | Change |
|------|--------|
| `src/demo/demoData.js` | ✅ All demo data cleared |
| `server-spring/src/main/resources/application.properties` | ⚠️ Needs your DO credentials |
| `.env.production` | ⚠️ Needs your backend URL |

---

## **Timeline**

| Step | Time |
|------|------|
| 1-3: Generate secrets & get credentials | 10 min |
| 4-5: Build & test backend locally | 10 min |
| 6: Deploy to DigitalOcean | 5-20 min |
| 7-8: Update & deploy frontend | 10 min |
| **Total** | **~45-60 min** |

---

**Ready to start? Begin with Step 1 above. Feel free to ask if you hit any issues!**
