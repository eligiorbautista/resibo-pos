# Backend Integration Guide

This guide explains how to connect your frontend to the new backend API.

## 📋 Overview

Your backend is now set up with:
- ✅ Express + TypeScript server
- ✅ PostgreSQL database with Prisma
- ✅ JWT authentication
- ✅ API routes structure
- ✅ Error handling
- ✅ Database schema matching your frontend types

## 🔗 Connecting Frontend to Backend

### Step 1: Add Environment Variable

Add to your frontend `.env` or `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### Step 2: Update Vite Config (Optional)

The API service layer (`services/apiService.ts`) is already created and will automatically use this environment variable.

### Step 3: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🔄 Migration Strategy

You have two options for migrating from mock data to API calls:

### Option A: Gradual Migration (Recommended)

1. Start with Authentication
2. Migrate one module at a time
3. Test each module before moving to the next

### Option B: Complete Migration

1. Implement all backend controllers first
2. Then update frontend to use API service

## 📝 Step-by-Step Migration

### 1. Authentication Migration

**Current (App.tsx):**
```typescript
const handleLogin = (providedPin?: string) => {
  const targetPin = providedPin || pin;
  const user = employees.find(e => e.pin === targetPin);
  // ...
};
```

**New (using API):**
```typescript
import { authApi } from './services/apiService';

const handleLogin = async (providedPin?: string) => {
  try {
    const targetPin = providedPin || pin;
    const response = await authApi.login(targetPin);
    setCurrentUser(response.employee);
    // Token is automatically stored
    navigate('/dashboard');
  } catch (error) {
    showToast(error.message, 'error');
  }
};
```

### 2. Products Migration

**Current (App.tsx):**
```typescript
const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
```

**New (using API):**
```typescript
import { productsApi } from './services/apiService';

// In useEffect
React.useEffect(() => {
  const fetchProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      showToast('Failed to load products', 'error');
    }
  };
  fetchProducts();
}, []);
```

### 3. Transactions Migration

Similar pattern - replace state updates with API calls:

```typescript
import { transactionsApi } from './services/apiService';

const addTransaction = async (transaction: Transaction) => {
  try {
    const newTransaction = await transactionsApi.create(transaction);
    setTransactions(prev => [...prev, newTransaction]);
    // Update other state...
  } catch (error) {
    showToast('Failed to create transaction', 'error');
  }
};
```

## 🛠️ Next Steps: Implement Backend Controllers

The routes are set up, but you need to implement the controllers. Here's the order:

### Priority 1: Core Functionality
1. ✅ **Authentication** - Already implemented
2. ⏭️ **Products** - CRUD operations
3. ⏭️ **Transactions** - Create, read, update
4. ⏭️ **Customers** - CRUD operations

### Priority 2: Supporting Features
5. ⏭️ **Employees** - Read operations
6. ⏭️ **Tables** - Read and update
7. ⏭️ **Cash Drawers** - Open, close, read

### Priority 3: Advanced Features
8. ⏭️ **Analytics** - Reports and statistics
9. ⏭️ **Time Records** - Employee time tracking
10. ⏭️ **Reservations** - Table reservations

## 📚 Example Controller Implementation

Here's an example for Products controller:

```typescript
// backend/src/controllers/product.controller.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        modifierGroups: {
          include: {
            modifiers: true,
          },
        },
      },
    });

    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        modifierGroups: {
          include: {
            modifiers: true,
          },
        },
      },
    });

    if (!product) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

// ... more methods
```

Then update the route:
```typescript
// backend/src/routes/product.routes.ts
import { authenticate } from '../middleware/auth.middleware';
import * as productController from '../controllers/product.controller';

router.get('/', authenticate, productController.getAllProducts);
router.get('/:id', authenticate, productController.getProductById);
// ...
```

## 🧪 Testing Your Integration

1. **Test Authentication:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"pin":"0000"}'
   ```

2. **Test Products (with token):**
   ```bash
   curl http://localhost:3001/api/products \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Use Postman or Insomnia:**
   - Import the API endpoints
   - Test each endpoint
   - Verify responses match frontend expectations

## 🔐 Authentication Flow

1. User enters PIN
2. Frontend calls `authApi.login(pin)`
3. Backend validates PIN and returns JWT token
4. Frontend stores token in localStorage
5. All subsequent requests include token in Authorization header
6. Backend middleware validates token

## ⚠️ Important Notes

1. **Date Handling:**
   - Backend returns dates as ISO strings
   - Frontend converts them to Date objects
   - Make sure to handle date conversion in API service

2. **Error Handling:**
   - All API errors are caught and displayed as toasts
   - Check browser console for detailed error messages

3. **Loading States:**
   - Add loading states while fetching data
   - Show spinners or skeletons during API calls

4. **Optimistic Updates:**
   - Consider optimistic updates for better UX
   - Rollback on error

## 📖 API Service Documentation

The API service layer (`services/apiService.ts`) provides:

- `authApi` - Authentication endpoints
- `productsApi` - Product management
- `transactionsApi` - Transaction management
- `customersApi` - Customer management
- `employeesApi` - Employee data
- `tablesApi` - Table management
- `cashDrawersApi` - Cash drawer operations

Each API module has methods matching REST conventions:
- `getAll()` - GET collection
- `getById(id)` - GET single item
- `create(data)` - POST create
- `update(id, data)` - PUT update
- `delete(id)` - DELETE item

## 🆘 Troubleshooting

**CORS Errors:**
- Make sure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Default: `http://localhost:3000`

**401 Unauthorized:**
- Check if token is being sent
- Verify token is valid (not expired)
- Check if authenticate middleware is applied

**404 Not Found:**
- Verify backend is running
- Check API endpoint URLs
- Ensure route handlers are implemented

**500 Server Error:**
- Check backend console for errors
- Verify database connection
- Check Prisma schema matches database

## ✅ Checklist

- [ ] Backend server running
- [ ] Database connected
- [ ] Environment variables configured
- [ ] Authentication working
- [ ] Frontend can call backend API
- [ ] Token stored and sent with requests
- [ ] Error handling in place
- [ ] Loading states added

## 🎯 Next Steps

1. Implement backend controllers (start with Products)
2. Update frontend to use API service
3. Test each feature end-to-end
4. Add error handling and loading states
5. Deploy to production

---

**Need help?** Check the backend `README.md` or `SETUP_GUIDE.md` for more details!

