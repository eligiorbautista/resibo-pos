# Quick Start Guide

Get your backend up and running in 5 minutes! ⚡

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Database

**Option A: Using Docker (Easiest)**
```bash
docker run --name resibo-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=resibo_pos \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Using Local PostgreSQL**
```sql
CREATE DATABASE resibo_pos;
```

### 3. Configure Environment

Create `.env` file:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/resibo_pos?schema=public"
JWT_SECRET="change-this-to-a-random-string"
JWT_REFRESH_SECRET="change-this-to-another-random-string"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# (Optional) PayMongo Online Payments
PAYMONGO_SECRET_KEY="sk_test_..."

# Recommended: where the POS frontend is reachable (used for PayMongo return_url)
FRONTEND_BASE_URL="http://localhost:3000"
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up Database Schema
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start Server
```bash
npm run dev
```

### 6. Test It!

```bash
# Health check
curl http://localhost:3001/health

# Login (Manager PIN: 0000)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"0000"}'
```

## ✅ You're Done!

The backend is now running at `http://localhost:3001`

## 📝 Test Accounts

After seeding:
- **Manager**: PIN `0000`
- **Cashier**: PIN `1234`
- **Server**: PIN `5678` or `9012`

## 🐛 Troubleshooting

**Database connection error?**
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`

**Port already in use?**
- Change PORT in `.env` to another number

**Need more help?**
- See `SETUP_GUIDE.md` for detailed instructions
- Check `README.md` for API documentation

