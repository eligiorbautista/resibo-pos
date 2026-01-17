# Port Mismatch - Quick Fix

## ❌ Problem

**Backend:** Running on port **8000** (from your terminal output)  
**Frontend:** Trying to connect to port **3001** (default)  
**Error:** `ERR_CONNECTION_REFUSED`

## ✅ Solution

Your backend is running on port 8000, so update the frontend to match.

### Quick Fix:

1. **Add to `.env.local` in root folder:**
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

2. **Restart frontend dev server:**
   - Stop: `Ctrl+C`
   - Start: `npm run dev`

3. **Try login again!**

---

## Alternative: Use Port 3001 Instead

If you prefer port 3001:

1. **Update `backend/.env`:**
   ```env
   PORT=3001
   ```

2. **Update frontend `.env.local`:**
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. **Restart both:**
   - Backend: `Ctrl+C` then `npm run dev`
   - Frontend: `Ctrl+C` then `npm run dev`

---

## ✅ Recommended

Since backend is already running on 8000, just update frontend `.env.local` to use port 8000 - **easiest solution!**

