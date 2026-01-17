# Docker PostgreSQL Quick Start (Easiest Method!)

If you have Docker installed, this is the **fastest way** to get PostgreSQL running.

## ✅ Prerequisites

Install Docker Desktop: https://www.docker.com/products/docker-desktop/

## 🚀 Quick Start (One Command!)

```powershell
docker run --name resibo-postgres `
  -e POSTGRES_PASSWORD=password123 `
  -e POSTGRES_DB=resibo_pos `
  -p 5432:5432 `
  -d postgres:14
```

**That's it!** PostgreSQL is now running. ✅

## 📝 Configure Backend

1. **Create `.env` file:**
```powershell
cd backend
Copy-Item .env.example .env
```

2. **Edit `.env` file** (the DATABASE_URL is already correct):
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
```

3. **Set up database:**
```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. **Start backend:**
```powershell
npm run dev
```

## 🛠️ Useful Docker Commands

```powershell
# Check if container is running
docker ps

# Start container (if stopped)
docker start resibo-postgres

# Stop container
docker stop resibo-postgres

# View logs
docker logs resibo-postgres

# Remove container (if needed)
docker rm resibo-postgres
```

## ✅ You're Done!

PostgreSQL is running and your backend can connect to it!

