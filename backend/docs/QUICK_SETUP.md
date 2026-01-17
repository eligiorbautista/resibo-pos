# 🚀 Quick Setup Guide (You Have Docker!)

Since you have Docker installed, PostgreSQL setup is super easy!

## Step 1: Start PostgreSQL (One Command!)

Open PowerShell in the `backend` folder and run:

```powershell
docker run --name resibo-postgres `
  -e POSTGRES_PASSWORD=password123 `
  -e POSTGRES_DB=resibo_pos `
  -p 5432:5432 `
  -d postgres:14
```

**That's it!** PostgreSQL is now running. ✅

**Note:** The password is `password123` (only for local development!)

## Step 2: Create .env File

In the `backend` folder, create a `.env` file:

```powershell
cd backend
Copy-Item .env.example .env
```

If `.env.example` doesn't exist, create `.env` with this content:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-this"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

## Step 3: Set Up Database

```powershell
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate
# When asked for migration name, type: "init"

# Seed database with test data (optional)
npm run prisma:seed
```

## Step 4: Start Backend

```powershell
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📝 Environment: development
🔗 API URL: http://localhost:3001/api
```

## ✅ You're Done!

Your backend is now running with PostgreSQL!

## 🛠️ Useful Commands

**Start PostgreSQL (if stopped):**
```powershell
docker start resibo-postgres
```

**Stop PostgreSQL:**
```powershell
docker stop resibo-postgres
```

**View PostgreSQL logs:**
```powershell
docker logs resibo-postgres
```

**Remove PostgreSQL container (if needed):**
```powershell
docker stop resibo-postgres
docker rm resibo-postgres
```

## 🐛 Troubleshooting

**Error: "port 5432 already in use"**
- Another PostgreSQL is running
- Stop it or use a different port

**Error: "container name already exists"**
- Run: `docker rm resibo-postgres`
- Then run the docker run command again

**Error: "DATABASE_URL is required"**
- Make sure `.env` file exists in `backend` folder
- Check that DATABASE_URL is set correctly

## 📚 Next: Free Hosting

For deployment, see `FREE_HOSTING_OPTIONS.md` - I recommend **Railway**! 🚀

