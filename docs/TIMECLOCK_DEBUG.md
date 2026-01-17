# Time Clock Database Recording - Debug Guide

## Possible Issues

### 1. Backend Not Restarted
**Problem:** Backend server might not have the latest code with clock-in/out endpoints.

**Solution:** 
- Stop backend server (Ctrl+C)
- Start again: `npm run dev` in backend folder
- Check terminal for any errors

### 2. API Calls Failing
**Problem:** API calls might be failing silently.

**Check:**
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Try clocking in/out
4. Look for:
   - POST `/api/employees/:id/clock-in` or `/clock-out`
   - Check response status (should be 200)
   - Check response body for errors

### 3. Authentication Errors
**Problem:** User might not be authenticated.

**Check:**
- Make sure you're logged in
- Check if token exists: `localStorage.getItem('authToken')` in browser console
- Check Network tab for 401 Unauthorized errors

### 4. Database Connection
**Problem:** Database might not be connected.

**Check:**
- Backend terminal should show successful database connection
- Check for Prisma errors in backend logs

### 5. Database Not Migrated
**Problem:** TimeRecord/BreakRecord tables might not exist.

**Solution:**
```powershell
cd backend
npm run prisma:migrate
```

### 6. Employee ID Mismatch
**Problem:** Frontend might be using wrong employee IDs.

**Check:**
- Employee IDs from frontend should match database UUIDs
- Check browser console for errors when clicking clock in/out

## Quick Test

1. **Check Backend Logs:**
   - Open backend terminal
   - Try clocking in/out
   - Look for any error messages

2. **Check Network Tab:**
   - F12 → Network tab
   - Filter: XHR
   - Try clocking in/out
   - Check if requests are being made
   - Check response status and body

3. **Check Database:**
   ```powershell
   cd backend
   npm run prisma:studio
   ```
   - Open http://localhost:5555
   - Check TimeRecord table
   - Check BreakRecord table

## Expected Behavior

**When Clocking In:**
- POST `/api/employees/:id/clock-in` should return 200
- Response should include timeRecord with id and clockIn time
- New row should appear in TimeRecord table

**When Clocking Out:**
- POST `/api/employees/:id/clock-out` should return 200
- Response should include timeRecord with clockOut time
- Existing TimeRecord should be updated in database

**When Starting Break:**
- POST `/api/employees/:id/breaks/start` should return 200
- New row should appear in BreakRecord table

**When Ending Break:**
- POST `/api/employees/:id/breaks/end` should return 200
- BreakRecord should be updated with endTime

