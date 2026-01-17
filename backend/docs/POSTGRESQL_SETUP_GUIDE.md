# PostgreSQL Setup Guide for Windows

This guide will help you install and set up PostgreSQL on Windows.

## 🚀 Quick Start Options

### Option 1: Docker (Easiest - Recommended) ⭐

If you have Docker installed, this is the **easiest** method:

```powershell
# Run PostgreSQL in Docker (no installation needed!)
docker run --name resibo-postgres `
  -e POSTGRES_PASSWORD=password123 `
  -e POSTGRES_DB=resibo_pos `
  -p 5432:5432 `
  -d postgres:14

# To start it later (if stopped)
docker start resibo-postgres

# To stop it
docker stop resibo-postgres
```

**Connection String:**
```
postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public
```

---

### Option 2: Install PostgreSQL (Traditional Method)

#### Step 1: Download PostgreSQL

1. Go to: https://www.postgresql.org/download/windows/
2. Click "Download the installer"
3. Download **PostgreSQL 14 or 15** (recommended)
4. Run the installer

#### Step 2: Install PostgreSQL

1. **Installation Wizard:**
   - Click "Next" on welcome screen
   - Choose installation directory (default is fine)
   - Select components (keep defaults: PostgreSQL Server, pgAdmin, Command Line Tools)
   - Choose data directory (default is fine)
   - **Set password** for `postgres` user (remember this!)
     - Example: `password123` (for development only!)
   - Port: `5432` (default, keep it)
   - Locale: `[Default locale]`
   - Click "Next" and "Finish"

2. **Stack Builder (optional):**
   - You can skip this for now
   - Click "Cancel" or "Finish"

#### Step 3: Verify Installation

Open **Command Prompt** or **PowerShell**:

```powershell
# Check if PostgreSQL is running
psql --version
```

#### Step 4: Start PostgreSQL Service

PostgreSQL runs as a Windows service and starts automatically.

**To check if it's running:**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Look for "postgresql-x64-14" (or similar)
4. Status should be "Running"

**To start it manually (if stopped):**
1. Right-click on "postgresql-x64-14"
2. Click "Start"

#### Step 5: Create Database

Open **SQL Shell (psql)** from Start Menu, or use Command Prompt:

```powershell
# Connect to PostgreSQL (will ask for password)
psql -U postgres
```

Then in psql, type:
```sql
CREATE DATABASE resibo_pos;
\q
```

Or use this one-liner:
```powershell
psql -U postgres -c "CREATE DATABASE resibo_pos;"
```

---

## ⚙️ Configure Backend

### Step 1: Create .env File

In the `backend` folder, create a `.env` file:

```powershell
cd backend
Copy-Item .env.example .env
```

### Step 2: Edit .env File

Open `backend/.env` and update `DATABASE_URL`:

**For Docker (Option 1):**
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
```

**For Installed PostgreSQL (Option 2):**
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/resibo_pos?schema=public"
```

Replace `YOUR_PASSWORD` with the password you set during installation.

---

## 🗄️ Set Up Database Schema

After configuring `.env`, run:

```powershell
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create database tables (migrations)
npm run prisma:migrate
# When prompted, name it: "init"

# Seed database with test data (optional)
npm run prisma:seed
```

---

## ✅ Verify Everything Works

```powershell
# Test database connection
npm run prisma:studio
```

This opens a web interface where you can see your database tables.

---

## 🛠️ Useful Commands

### PostgreSQL Commands (if installed)

```powershell
# Connect to PostgreSQL
psql -U postgres

# Connect to specific database
psql -U postgres -d resibo_pos

# List all databases
psql -U postgres -c "\l"

# List all tables
psql -U postgres -d resibo_pos -c "\dt"
```

### Docker Commands (if using Docker)

```powershell
# Start PostgreSQL container
docker start resibo-postgres

# Stop PostgreSQL container
docker stop resibo-postgres

# View logs
docker logs resibo-postgres

# Remove container (if needed)
docker rm resibo-postgres
```

---

## 🐛 Troubleshooting

### Error: "password authentication failed"

- Check your password in `.env` matches PostgreSQL password
- Try resetting password in pgAdmin

### Error: "database does not exist"

- Create the database: `CREATE DATABASE resibo_pos;`

### Error: "connection refused"

- Check if PostgreSQL service is running
- Check if port 5432 is available
- For Docker: Check if container is running

### Port 5432 already in use

- Another PostgreSQL instance might be running
- Stop it or use a different port

---

## 📚 Next Steps

Once PostgreSQL is running:

1. ✅ Database is set up
2. ✅ `.env` is configured
3. ✅ Run migrations: `npm run prisma:migrate`
4. ✅ Start backend: `npm run dev`

---

## 🆘 Need Help?

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Prisma Documentation:** https://www.prisma.io/docs
- **Docker Documentation:** https://docs.docker.com/

