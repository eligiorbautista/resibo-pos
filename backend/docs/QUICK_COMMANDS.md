# Quick Commands Reference

## 🚀 Start Local Database (First Time)

```powershell
# 1. Start PostgreSQL container
docker run --name resibo-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_DB=resibo_pos -p 5432:5432 -d postgres:14

# 2. Create .env file in backend folder (copy content below)

# 3. Set up database
cd backend
npm run prisma:generate
npm run prisma:migrate
# Type: init (when asked)

# 4. Seed data (optional)
npm run prisma:seed

# 5. Start backend
npm run dev
```

## 📝 .env File Content

Create `backend/.env` file:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
JWT_SECRET="dev-secret-key"
JWT_REFRESH_SECRET="dev-refresh-secret"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

## 🛠️ Daily Use Commands

**Start backend:**
```powershell
cd backend
npm run dev
```

**Start PostgreSQL (if stopped):**
```powershell
docker start resibo-postgres
```

**Stop PostgreSQL:**
```powershell
docker stop resibo-postgres
```

**Check if PostgreSQL is running:**
```powershell
docker ps
```

**View PostgreSQL logs:**
```powershell
docker logs resibo-postgres
```

## ✅ Test Backend

**Health check:**
```powershell
curl http://localhost:3001/health
```

**Test login:**
```powershell
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"pin\":\"0000\"}"
```

## 🔄 Switch to Neon

1. Get connection string from Neon dashboard
2. Update `DATABASE_URL` in `.env`
3. Run: `npm run prisma:migrate`
4. Restart: `npm run dev`

## 🧹 Clean Up

**Remove PostgreSQL container:**
```powershell
docker stop resibo-postgres
docker rm resibo-postgres
```

**Then start fresh:**
```powershell
docker run --name resibo-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_DB=resibo_pos -p 5432:5432 -d postgres:14
```

