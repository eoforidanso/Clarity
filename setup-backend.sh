#!/bin/bash

# Clarity EHR — Backend Setup Script
# This script helps you configure and build the Spring Boot backend

set -e

echo "🚀 Clarity EHR Backend Setup"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "server-spring/pom.xml" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "📝 Step 1: Collect Your DigitalOcean Database Credentials"
echo "=========================================================="
echo ""
echo "Go to: DigitalOcean Dashboard → Databases → Your PostgreSQL Cluster"
echo "Copy these values from 'Connection Details':"
echo ""

read -p "Enter your database host (e.g., db-postgresql-abc123.db.ondigitalocean.com): " DB_HOST
read -p "Enter your database port (usually 25060): " DB_PORT
read -p "Enter your database user (usually doadmin): " DB_USER
read -p "Enter your database password: " DB_PASSWORD
read -p "Enter your database name (e.g., clarity_ehr): " DB_NAME

echo ""
echo "🔐 Step 2: Generate JWT Secret"
echo "=============================="
echo ""

JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT Secret (keep this safe!): $JWT_SECRET"
echo ""

echo "🌐 Step 3: Configure Frontend Domain (Optional)"
echo "==============================================="
echo ""
read -p "Enter your frontend domain for CORS (leave blank for localhost): " FRONTEND_DOMAIN

if [ -z "$FRONTEND_DOMAIN" ]; then
    CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
else
    CORS_ORIGINS="http://localhost:3000,http://localhost:5173,https://$FRONTEND_DOMAIN"
fi

echo ""
echo "✏️  Step 4: Writing Configuration"
echo "================================="
echo ""

# Create application-production.properties
cat > server-spring/src/main/resources/application-production.properties << EOF
server.port=5001
spring.application.name=clarity-ehr

# ─── PostgreSQL ────────────────────────────────────────
spring.datasource.url=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require
spring.datasource.username=$DB_USER
spring.datasource.password=$DB_PASSWORD
spring.datasource.driver-class-name=org.postgresql.Driver

# ─── JPA / Hibernate ──────────────────────────────────
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.open-in-view=false

# ─── Flyway Migrations ────────────────────────────────
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true

# ─── JWT ───────────────────────────────────────────────
app.jwt.secret=$JWT_SECRET
app.jwt.expiration-ms=28800000

# ─── CORS ──────────────────────────────────────────────
app.cors.allowed-origins=$CORS_ORIGINS

# ─── Rate Limiting ─────────────────────────────────────
app.rate-limit.max-requests=1000
app.rate-limit.window-minutes=15

# ─── Server ────────────────────────────────────────────
spring.jackson.default-property-inclusion=non_null
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
EOF

echo "✅ Created: server-spring/src/main/resources/application-production.properties"
echo ""

# Save credentials to a local file (for reference)
cat > .env.backend-production << EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
EOF

echo "✅ Saved credentials to: .env.backend-production (keep this secret!)"
echo ""

echo "📦 Step 5: Building Backend"
echo "==========================="
echo ""

cd server-spring

echo "Running: mvn clean package -DskipTests"
mvn clean package -DskipTests

echo ""
echo "✅ Build successful!"
echo ""

JAR_FILE="target/clarity-ehr-0.0.1-SNAPSHOT.jar"

if [ -f "$JAR_FILE" ]; then
    echo "✅ JAR file ready: $JAR_FILE"
    echo ""
    echo "🧪 Step 6: Test Locally"
    echo "======================="
    echo ""
    read -p "Do you want to test the backend locally now? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting backend on port 5001..."
        echo "Press Ctrl+C to stop"
        echo ""

        # Run with production profile
        export SPRING_PROFILES_ACTIVE=production
        java -jar "$JAR_FILE"
    fi
else
    echo "❌ Error: Build failed"
    exit 1
fi
