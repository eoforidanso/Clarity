# Clarity EHR — Production Deployment Guide

## PostgreSQL on DigitalOcean + Spring Boot Backend + React Frontend

---

## **Part 1: Backend Setup (Spring Boot)**

### **1.1 Generate Secure JWT Secret**

```bash
cd /Users/harrietappiah/Desktop/vscode/EHR1-master/server-spring

# Generate a 256-bit base64 secret
openssl rand -base64 32
# Example output: aBcD1234eFgH5678iJkL9012mNoP3456qRsT7890uVwX+yZ=
```

Copy this output — you'll use it in Step 1.3.

### **1.2 Get DigitalOcean PostgreSQL Credentials**

1. Go to **DigitalOcean Dashboard** → **Databases**
2. Click your PostgreSQL cluster
3. Under "Connection Details", copy:
   - **Host** (e.g., `db-postgresql-abc123.db.ondigitalocean.com`)
   - **Port** (usually `25060`)
   - **User** (e.g., `doadmin`)
   - **Password** (shown once!)
   - **Database** (e.g., `clarity_ehr`)

4. Download the **CA Certificate** and save to:
   ```
   /Users/harrietappiah/Desktop/vscode/EHR1-master/server-spring/ca.crt
   ```

### **1.3 Update application.properties**

Edit `server-spring/src/main/resources/application.properties`:

```properties
# ─── PostgreSQL ────────────────────────────────────────
spring.datasource.url=jdbc:postgresql://db-postgresql-abc123.db.ondigitalocean.com:25060/clarity_ehr?sslmode=require
spring.datasource.username=doadmin
spring.datasource.password=YOUR_ACTUAL_PASSWORD_HERE
spring.datasource.driver-class-name=org.postgresql.Driver

# ─── JWT ───────────────────────────────────────────────
app.jwt.secret=YOUR_256BIT_SECRET_FROM_STEP_1_1
app.jwt.expiration-ms=28800000

# ─── CORS ──────────────────────────────────────────────
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.com
```

### **1.4 Build the Spring Boot Application**

```bash
cd /Users/harrietappiah/Desktop/vscode/EHR1-master/server-spring

# Build with Maven
mvn clean package -DskipTests

# Output: target/clarity-ehr-0.0.1-SNAPSHOT.jar
```

### **1.5 Run Locally to Test**

```bash
java -jar target/clarity-ehr-0.0.1-SNAPSHOT.jar

# Should see:
# ✓ Started ClarityEhrApplication
# ✓ Flyway migrations V1__init_schema.sql → V6__update_chris_email.sql
# ✓ Server running on port 5001
```

**Test the API:**
```bash
curl -X GET http://localhost:5001/api/patients
# Should return: []  (empty array, no data yet)
```

---

## **Part 2: Deploy Backend to DigitalOcean**

### **Option A: App Platform (Easiest)**

#### **Step 1: Push to GitHub**
```bash
cd /Users/harrietappiah/Desktop/vscode/EHR1-master

git add .
git commit -m "Configure Spring Boot backend for production"
git push origin main
```

#### **Step 2: Create App on DigitalOcean**

1. Go to **DigitalOcean Dashboard** → **Apps**
2. Click **Create App** → Connect GitHub → Select this repo
3. Configure:
   - **Build Command**: `cd server-spring && mvn clean package -DskipTests`
   - **Run Command**: `java -jar server-spring/target/clarity-ehr-0.0.1-SNAPSHOT.jar`
   - **HTTP Port**: `5001`

4. Set **Environment Variables**:
   ```
   SPRING_DATASOURCE_URL=jdbc:postgresql://db-postgresql-abc.db.ondigitalocean.com:25060/clarity_ehr?sslmode=require
   SPRING_DATASOURCE_USERNAME=doadmin
   SPRING_DATASOURCE_PASSWORD=your_actual_password
   APP_JWT_SECRET=your_256bit_secret
   APP_CORS_ALLOWED_ORIGINS=https://your-app.com,https://app.your-domain.com
   ```

5. Click **Deploy**

#### **Step 3: Get Your Backend URL**
After deployment succeeds, you'll get a URL like:
```
https://clarity-ehr-api-abc123.ondigitalocean.app
```

---

### **Option B: Docker + App Platform (More Control)**

Create `server-spring/Dockerfile`:

```dockerfile
FROM maven:3.9.2-openjdk-17 as builder
WORKDIR /build
COPY . .
RUN mvn clean package -DskipTests

FROM openjdk:17-slim
COPY --from=builder /build/target/clarity-ehr-0.0.1-SNAPSHOT.jar /app/app.jar
EXPOSE 5001
CMD ["java", "-jar", "/app/app.jar"]
```

Then follow App Platform setup above — DigitalOcean will auto-detect the Dockerfile.

---

### **Option C: Droplet + systemd (Most Control)**

#### **Create Droplet**
1. **DigitalOcean** → **Create** → **Droplet**
2. Choose: **Ubuntu 22.04 LTS**, minimum **$6/month** (2GB RAM)
3. Add SSH key

#### **Deploy to Droplet**
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Java
apt-get update && apt-get install -y openjdk-17-jre-headless

# Download JAR
wget https://your-github-release-url/clarity-ehr.jar

# Create service file
cat > /etc/systemd/system/clarity-ehr.service << 'EOF'
[Unit]
Description=Clarity EHR Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clarity-ehr
Environment="SPRING_DATASOURCE_URL=jdbc:postgresql://db-postgresql-abc.db.ondigitalocean.com:25060/clarity_ehr?sslmode=require"
Environment="SPRING_DATASOURCE_USERNAME=doadmin"
Environment="SPRING_DATASOURCE_PASSWORD=YOUR_PASSWORD"
Environment="APP_JWT_SECRET=YOUR_SECRET"
ExecStart=/usr/bin/java -jar /opt/clarity-ehr/clarity-ehr.jar
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
systemctl daemon-reload
systemctl start clarity-ehr
systemctl enable clarity-ehr

# Check logs
journalctl -u clarity-ehr -f
```

Get your Droplet's public IP and use it as your backend URL.

---

## **Part 3: Frontend Configuration**

### **3.1 Update Frontend to Use Backend**

Edit `.env.production`:
```bash
VITE_API_URL=https://your-backend-domain.com
```

For App Platform example:
```bash
VITE_API_URL=https://clarity-ehr-api-abc123.ondigitalocean.app
```

### **3.2 Build Frontend**

```bash
cd /Users/harrietappiah/Desktop/vscode/EHR1-master

npm run build
# Creates: dist/

# Test build locally
npm run preview
```

### **3.3 Deploy Frontend**

#### **Option 1: GitHub Pages**
```bash
npm run build
npm run deploy
```

#### **Option 2: DigitalOcean App Platform**
1. Create new App → Connect this repo
2. **Build Command**: `npm run build`
3. **Output Dir**: `dist`
4. **Environment**: 
   ```
   VITE_API_URL=https://your-backend-api.com
   ```
5. Deploy

#### **Option 3: DigitalOcean Spaces + CDN**
```bash
# Build
npm run build

# Upload to Spaces
aws s3 sync dist/ s3://your-space/clarity-ehr/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com \
  --region nyc3

# Set up CDN at Spaces → Settings → CDN
# Your frontend URL: https://cdn-your-space.ondigitalocean.com
```

---

## **Part 4: Test the Complete Setup**

### **4.1 Verify Backend is Running**

```bash
curl -X GET https://your-backend-api.com/api/patients
# Should return: [] (empty array)
```

### **4.2 Login to Frontend**

1. Go to your frontend URL
2. Use default demo credentials (or create a real user via backend)
3. Should see empty patient list
4. Open **DevTools** → **Network tab**
5. Should see successful requests to `/api/patients`, `/api/appointments`, etc.

### **4.3 Add Test Data**

Create a test patient via API:

```bash
curl -X POST https://your-backend-api.com/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dob": "1990-01-15",
    "mrn": "MRN-00001",
    "email": "john@example.com",
    "phone": "(555) 123-4567"
  }'
```

---

## **Part 5: Monitoring & Maintenance**

### **View Logs**

**App Platform:**
```
DigitalOcean Dashboard → Apps → Your App → Logs
```

**Droplet:**
```bash
journalctl -u clarity-ehr -f --lines 100
```

### **Database Backups**

DigitalOcean PostgreSQL automatically backs up daily. To restore:
1. **Databases** → **Your Cluster** → **Backups**
2. Click **Restore** → Choose date

### **Scale Backend**

If getting more users:
1. **App Platform**: Increase resources in app settings
2. **Droplet**: Upgrade droplet size or load balance multiple instances

---

## **Troubleshooting**

### **"Connection refused" to database**

- Verify PostgreSQL cluster is running
- Check firewall: **Databases** → **Firewall Rules** → Add App's IP
- Test locally first: `psql -h host -p 25060 -U doadmin -d clarity_ehr`

### **"CORS error" in browser**

- Check `app.cors.allowed-origins` in properties
- Frontend domain must be in the list
- Restart backend after changing

### **"Cannot find table" error**

- Flyway migrations didn't run
- Check logs: `journalctl -u clarity-ehr`
- Verify database user has CREATE TABLE permission

### **Sessions not persisting**

- Check JWT secret is the same across restarts
- Verify `app.jwt.expiration-ms` (default: 8 hours)
- Check httpOnly cookies are being set

---

## **Production Checklist**

- [ ] JWT secret is 256+ bits and unique
- [ ] Database credentials stored in environment (not in code)
- [ ] CORS whitelist configured for your domain
- [ ] SSL/TLS enabled (DigitalOcean handles automatically)
- [ ] Database backups enabled
- [ ] Error logging configured
- [ ] Rate limiting enabled (default: 1000 req/15min)
- [ ] File upload size limited (default: 10MB)
- [ ] Email/SMS alerts configured for critical errors
- [ ] API documentation generated from OpenAPI spec

---

## **Quick Reference: Environment Variables**

```bash
# Spring Boot Backend
SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:25060/clarity_ehr?sslmode=require
SPRING_DATASOURCE_USERNAME=doadmin
SPRING_DATASOURCE_PASSWORD=***
APP_JWT_SECRET=256-bit-base64-secret
APP_CORS_ALLOWED_ORIGINS=https://your-frontend.com
SERVER_PORT=5001

# React Frontend
VITE_API_URL=https://your-backend-api.com
VITE_ENV=production
```

---

**Need help?** Check logs first, then refer to troubleshooting section.
