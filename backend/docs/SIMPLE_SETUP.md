# 🚀 Simple PostgreSQL Setup (Step-by-Step)

You have Docker installed! Here's the **easiest way** to get started:

## Step 1: Start Docker Desktop

1. Open **Docker Desktop** from Start Menu
2. Wait for it to start (green icon in system tray)
3. Make sure it says "Docker Desktop is running"

## Step 2: Start PostgreSQL (Copy & Paste This!)

Open **PowerShell** in the `backend` folder and run:

```powershell
docker run --name resibo-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_DB=resibo_pos -p 5432:5432 -d postgres:14
```

**What this does:**
- Creates a PostgreSQL database named `resibo_pos`
- Sets password to `password123`
- Runs on port 5432
- Runs in the background (`-d` flag)

**Wait a few seconds for it to start...**

## Step 3: Create .env File

In the `backend` folder:

**Option A: Copy the example file**
```powershell
cd backend
Copy-Item .env.example .env
```

**Option B: Create manually**
Create a file named `.env` in the `backend` folder with this content:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
JWT_SECRET="your-secret-key-change-this"
JWT_REFRESH_SECRET="your-refresh-secret-change-this"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

## Step 4: Set Up Database Schema

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When prompted for migration name, type: `init`

Then press Enter.

## Step 5: Seed Database (Optional)

```powershell
npm run prisma:seed
```

This creates test employees, tables, and customers.

## Step 6: Start Backend Server

```powershell
npm run dev
```

You should see:
```
🚀 Server running on port 3001
```

## ✅ Done!

Your backend is now running with PostgreSQL!

## 🛠️ Useful Commands

**Start PostgreSQL (if you stopped it):**
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

## 🐛 Troubleshooting

**Error: "Docker Desktop is not running"**
- Start Docker Desktop first
- Wait for it to fully start

**Error: "port 5432 already in use"**
- Another PostgreSQL is running
- Stop it or use: `docker stop $(docker ps -q --filter "publish=5432")`

**Error: "container name already exists"**
```powershell
docker rm resibo-postgres
```
Then run the docker run command again.

**Error: "DATABASE_URL is required"**
- Make sure `.env` file exists in `backend` folder
- Check the file has `DATABASE_URL` line

## 📚 For Free Deployment

See `FREE_HOSTING_OPTIONS.md` - I recommend **Railway** for free PostgreSQL + backend hosting! 🚀

