# Local Database Setup (Testing Before Neon)

Quick commands to set up local PostgreSQL for testing.

## Step 1: Start Docker Desktop

Make sure Docker Desktop is running (check system tray).

## Step 2: Start PostgreSQL Container

```powershell
docker run --name resibo-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_DB=resibo_pos -p 5432:5432 -d postgres:14
```

**Wait 5 seconds for PostgreSQL to start.**

## Step 3: Verify PostgreSQL is Running

```powershell
docker ps
```

You should see `resibo-postgres` in the list.

## Step 4: Create .env File

In the `backend` folder, create `.env` file with:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

## Step 5: Set Up Database Schema

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When asked for migration name: `init`

## Step 6: Seed Database (Optional)

```powershell
npm run prisma:seed
```

## Step 7: Test Connection

```powershell
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📝 Environment: development
🔗 API URL: http://localhost:3001/api
```

## Step 8: Test API

Open another terminal and test:

```powershell
# Test health endpoint
curl http://localhost:3001/health

# Test login (should return token)
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"pin\":\"0000\"}"
```

## ✅ Local Database is Ready!

Your backend is now connected to local PostgreSQL.

## 🛠️ Useful Commands

**Start PostgreSQL (if stopped):**
```powershell
docker start resibo-postgres
```

**Stop PostgreSQL:**
```powershell
docker stop resibo-postgres
```

**View logs:**
```powershell
docker logs resibo-postgres
```

**Remove container (clean slate):**
```powershell
docker stop resibo-postgres
docker rm resibo-postgres
```

## 📝 Next: Switch to Neon

Once local testing works, you'll:
1. Create Neon account
2. Get connection string
3. Update DATABASE_URL in .env
4. Run migrations again

See `NEON_SETUP.md` for Neon setup instructions.

