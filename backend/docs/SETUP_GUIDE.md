# Backend Setup Guide

This guide will help you set up the backend for Tuboy's POS System.

## 📋 Prerequisites

Before starting, make sure you have installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **PostgreSQL** (v14 or higher)
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

3. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Set Up PostgreSQL Database

#### Option A: Using Local PostgreSQL

1. **Create a database:**
   ```sql
   CREATE DATABASE resibo_pos;
   ```

2. **Note your connection details:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `resibo_pos`
   - Username: `postgres` (or your username)
   - Password: Your PostgreSQL password

#### Option B: Using Docker

```bash
docker run --name resibo-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=resibo_pos \
  -p 5432:5432 \
  -d postgres:14
```

### Step 3: Configure Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/resibo_pos?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_REFRESH_SECRET="your-refresh-secret-key-change-this"
   PORT=3001
   CORS_ORIGIN="http://localhost:3000"
   ```

   **Important:** Replace:
   - `username` with your PostgreSQL username
   - `password` with your PostgreSQL password
   - Generate strong random strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`

   **Generate secure secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 4: Set Up Database Schema

1. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

2. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```
   
   This will:
   - Create all tables in your database
   - Set up relationships and indexes
   - Create the initial migration

3. **Seed the database (optional but recommended):**
   ```bash
   npm run prisma:seed
   ```
   
   This creates:
   - Test employees (Manager, Cashier, Servers)
   - Sample tables
   - Sample customers

### Step 5: Start the Development Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📝 Environment: development
🔗 API URL: http://localhost:3001/api
```

### Step 6: Test the API

1. **Health check:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Test login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"pin":"0000"}'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "employee": {
         "id": "e2",
         "name": "Sarah Manager",
         "role": "MANAGER",
         "status": "OUT"
       },
       "accessToken": "...",
       "refreshToken": "..."
     }
   }
   ```

## 🧪 Test Accounts

After seeding, you can use these test accounts:

| Role | PIN | Description |
|------|-----|-------------|
| Manager | `0000` | Full access |
| Cashier | `1234` | Cashier access |
| Server | `5678` | Server access |
| Server | `9012` | Server access |

## 🔧 Troubleshooting

### Database Connection Issues

**Error: `Can't reach database server`**
- Check if PostgreSQL is running
- Verify connection string in `.env`
- Check firewall settings

**Error: `password authentication failed`**
- Verify username and password in `DATABASE_URL`
- Check PostgreSQL authentication settings

### Prisma Issues

**Error: `Prisma Client has not been generated yet`**
```bash
npm run prisma:generate
```

**Error: `Migration failed`**
- Check if database exists
- Verify `DATABASE_URL` is correct
- Check PostgreSQL logs

### Port Already in Use

**Error: `Port 3001 is already in use`**
- Change `PORT` in `.env` file
- Or stop the process using port 3001:
  ```bash
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:3001 | xargs kill
  ```

## 📁 Database Management

### View Database (Prisma Studio)

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- Browse data
- Edit records
- Add new records

### Create a New Migration

When you modify `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

### Reset Database (⚠️ Deletes all data)

```bash
npx prisma migrate reset
```

## 🔄 Next Steps

1. ✅ Backend is set up and running
2. ⏭️ Implement route controllers (see `backend/src/routes/`)
3. ⏭️ Connect frontend to backend API
4. ⏭️ Test all endpoints
5. ⏭️ Deploy to production

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🆘 Need Help?

- Check the main `README.md` in the backend folder
- Review error messages in the console
- Check Prisma logs
- Verify environment variables

---

**Happy coding! 🚀**

