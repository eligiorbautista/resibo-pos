# Neon Database Setup (After Local Testing)

Use this guide to switch from local PostgreSQL to Neon cloud database.

## Step 1: Create Neon Account

1. Go to: https://neon.tech/
2. Click "Sign Up" (use GitHub for easiest setup)
3. Verify email if needed

## Step 2: Create Project

1. Click "Create a project"
2. **Project name:** `resibo` (or any name)
3. **Region:** Choose closest to you (Singapore, US, etc.)
4. **PostgreSQL version:** 14 or 15 (both work)
5. Click "Create project"

## Step 3: Get Connection String

1. After project is created, you'll see the dashboard
2. Look for **"Connection string"** section
3. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

**Important:** Neon uses SSL by default. Make sure the connection string includes `?sslmode=require` or add it.

## Step 4: Update .env File

In `backend/.env`, replace `DATABASE_URL`:

**Before (local):**
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
```

**After (Neon):**
```env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

**Or if you want to specify schema:**
```env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require&schema=public"
```

## Step 5: Test Connection

```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

This should connect to Neon and create all tables.

## Step 6: Seed Database (Optional)

```powershell
npm run prisma:seed
```

## Step 7: Start Backend

```powershell
npm run dev
```

Your backend is now using Neon! ✅

## ✅ Switching Between Local and Neon

**To use Local:**
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/resibo_pos?schema=public"
```

**To use Neon:**
```env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

Just update `.env` and restart backend!

## 🔐 Neon Features

- **Free tier:** 3 GB storage
- **Auto-scaling:** Pauses when not in use
- **Branching:** Create database branches (like Git)
- **Dashboard:** View tables, run queries
- **Backups:** Automatic backups

## 🛠️ Neon Dashboard

1. Go to your Neon project
2. Click "SQL Editor" to run queries
3. Click "Tables" to view your database
4. Use "Branches" to create test environments

## 📝 Important Notes

1. **SSL Required:** Neon requires SSL (`sslmode=require`)
2. **Different Database Name:** Neon creates a default database (usually `neondb`)
3. **Schema:** You can still use `public` schema
4. **Connections:** Neon has connection limits on free tier
5. **Auto-pause:** Free tier pauses after inactivity (wakes automatically)

## 🐛 Troubleshooting

**Error: "SSL connection required"**
- Add `?sslmode=require` to connection string

**Error: "database does not exist"**
- Use the database name from Neon connection string (usually `neondb`)
- Or create a new database in Neon dashboard

**Error: "connection timeout"**
- Check if Neon project is paused (it auto-wakes)
- Verify connection string is correct
- Check firewall/network settings

## ✅ You're Ready!

Your backend can now use Neon cloud database! 🚀

