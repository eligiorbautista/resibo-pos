# Fix Port Mismatch Issue

## Problem
- **Backend is running on:** Port 8000
- **Frontend is trying to connect to:** Port 3001
- **Error:** `ERR_CONNECTION_REFUSED`

## Solution: Update Frontend .env

Your backend is running on port 8000. Update the frontend to connect to the correct port.

### Step 1: Create/Update Frontend .env

In the **root folder** (same level as `package.json`), create `.env` or `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Step 2: Restart Frontend

After creating/updating `.env`, restart your frontend dev server:
- Stop: `Ctrl+C`
- Start: `npm run dev`

## Alternative: Change Backend to Port 3001

If you prefer to use port 3001 (default):

### Update Backend .env

In `backend/.env`, make sure PORT is 3001 or remove it to use default:

```env
PORT=3001
```

Then restart backend.

## Quick Fix (Choose One)

**Option 1: Use Port 8000 (Backend current)**
- Frontend `.env`: `VITE_API_BASE_URL=http://localhost:8000/api`

**Option 2: Use Port 3001 (Backend default)**
- Backend `.env`: `PORT=3001` (or remove PORT line)
- Frontend `.env`: `VITE_API_BASE_URL=http://localhost:3001/api`
- Restart backend

I recommend **Option 1** since backend is already running on 8000.

