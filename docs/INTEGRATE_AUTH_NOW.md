# Integrate Authentication: Step-by-Step

## Current Status
- ❌ Frontend uses mock data (`employees.find()`)
- ✅ Backend API ready (`/api/auth/login`)
- ✅ API service layer ready (`services/apiService.ts`)

## Step 1: Set Environment Variable

Create `.env` or `.env.local` file in the **root** folder (same level as `package.json`):

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

**Important:** Restart the frontend dev server after adding this!

## Step 2: Update App.tsx

Replace the `handleLogin` function in `App.tsx` to use the backend API.

**Current code (mock):**
```typescript
const handleLogin = (providedPin?: string) => {
  const targetPin = providedPin || pin;
  const user = employees.find(e => e.pin === targetPin);
  // ... mock logic
};
```

**New code (API):**
```typescript
const handleLogin = async (providedPin?: string) => {
  try {
    const targetPin = providedPin || pin;
    const response = await authApi.login(targetPin);
    
    setCurrentUser({
      id: response.employee.id,
      name: response.employee.name,
      role: response.employee.role as Role,
      pin: '', // Don't store PIN
      status: response.employee.status as 'IN' | 'OUT',
      totalSales: 0,
      timeRecords: [],
    });
    
    setShowLogin(false);
    setPin('');
    
    if (response.employee.role === 'MANAGER') {
      navigate('/dashboard');
    } else {
      navigate('/pos');
    }
  } catch (error: any) {
    showToast(error.message || 'Invalid PIN', 'error');
  }
};
```

**And update handleLogout:**
```typescript
const handleLogout = async () => {
  try {
    await authApi.logout();
  } catch (error) {
    // Ignore errors on logout
  }
  setCurrentUser(null);
  setShowLogin(true);
  setIsSidebarCollapsed(false);
  navigate('/');
};
```

**Don't forget to import:**
```typescript
import { authApi } from './services/apiService';
```

## Step 3: Test

1. Make sure backend is running (`npm run dev` in backend folder)
2. Restart frontend (to load environment variable)
3. Try logging in with PIN: `0000` (Manager)
4. Check browser console for any errors

## Expected Behavior

- ✅ Login calls backend API
- ✅ Token stored in localStorage
- ✅ User redirected based on role
- ✅ Logout clears token
- ✅ Errors show in toast messages

## Common Issues

**Error: "Cannot connect to server"**
- Check backend is running on port 3001
- Check `VITE_API_BASE_URL` is correct
- Check CORS is configured in backend

**Error: "Invalid PIN"**
- Make sure database is seeded (`npm run prisma:seed`)
- Try PIN: `0000` for Manager

**CORS Error:**
- Check backend `.env` has: `CORS_ORIGIN=http://localhost:3000`

