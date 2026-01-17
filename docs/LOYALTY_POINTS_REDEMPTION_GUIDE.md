# Loyalty Points Redemption Guide

## How to Use Customer Points to Pay for Food (Current Implementation)

### Current Process in the POS Terminal:

1. **Add items to cart** - Select products and add them to the shopping cart

2. **Select a customer** - Click on the customer selection/search field and choose a customer with available loyalty points

3. **View available points** - When a customer with points is selected, you'll see:
   - A blue box showing "Available Points: [number]"
   - An input field to enter points to redeem
   - An "Apply" button

4. **Enter points to redeem**:
   - Type the number of points you want to redeem in the input field
   - **Conversion rate**: 1 point = ₱0.10
   - Example: 100 points = ₱10.00 discount

5. **Apply the redemption**:
   - Click the "Apply" button
   - The points value is deducted from the cart total
   - The remaining balance will be paid using Mobile Wallet payment method
   - If points cover the entire amount, the payment will be ₱0

6. **Complete the sale** - The transaction is processed and:
   - Points are deducted from the customer's account (attempts to calculate based on payment difference)
   - New loyalty points are earned based on final amount paid

---

## Current Issues with the Implementation

### Problem 1: Points Deduction Logic is Flawed

**Location**: `App.tsx` lines 148-150

The current code tries to detect if points were redeemed by checking if the Mobile Wallet payment amount is less than the total amount:

```typescript
const pointsRedeemed = transaction.payments.some(p => p.method === 'MOBILE_WALLET' && p.amount < transaction.totalAmount) 
  ? Math.floor((transaction.totalAmount - transaction.payments.reduce((sum, p) => sum + p.amount, 0)) / 0.1)
  : 0;
```

**Issues**:
- This heuristic can fail if customer pays with a different payment method
- Doesn't accurately track how many points were actually redeemed
- Could incorrectly deduct points if there's any payment discrepancy

### Problem 2: No Explicit Points Tracking

**Location**: `components/features/POSTerminal.tsx` line 219-274

The `finalizeSale` function doesn't track:
- How many points were redeemed
- The redemption rate used
- Points redemption as a separate payment method

---

## Recommended Fix

To properly track loyalty points redemption, you should:

### Option 1: Track Points Redeemed in Transaction

Add a field to track points redeemed:

```typescript
// In types.ts - Transaction interface
export interface Transaction {
  // ... existing fields ...
  loyaltyPointsRedeemed?: number; // Number of points redeemed
  loyaltyPointsValue?: number; // Cash value of points redeemed (₱)
}
```

### Option 2: Add Points as Payment Method

Treat loyalty points as a payment method:

```typescript
// In PaymentMethod enum (types.ts)
export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_WALLET = 'MOBILE_WALLET',
  LOYALTY_POINTS = 'LOYALTY_POINTS' // Add this
}
```

Then track it in payments array:
```typescript
payments: [
  { method: PaymentMethod.LOYALTY_POINTS, amount: pointsValue },
  { method: PaymentMethod.MOBILE_WALLET, amount: remainingAmount }
]
```

### Option 3: Use Discount Approach

Track points redemption as a discount:

```typescript
// Already have discountTotal, but add:
loyaltyPointsRedeemed?: number;
loyaltyPointsDiscount?: number;
```

---

## Step-by-Step: How to Use It Now (Current System)

1. **Open POS Terminal** (`/pos` route)

2. **Add items to cart**:
   - Browse products or search
   - Click items to add to cart
   - Adjust quantities if needed

3. **Select customer**:
   - Click the customer search/select field (usually in the checkout area)
   - Search by name, email, or phone
   - Select customer with available points

4. **Click "Checkout"** button

5. **In checkout modal**:
   - If customer has points, you'll see a blue box with "Available Points"
   - Enter number of points to redeem (e.g., "100" for ₱10 discount)
   - Click "Apply" button

6. **Complete payment**:
   - The remaining balance after points will be shown
   - Select payment method for remaining balance (if any)
   - Click the payment button to complete

7. **Points are processed**:
   - System attempts to deduct redeemed points
   - Customer earns new points on the amount they actually paid

---

## Example Scenario

**Cart Total**: ₱500.00
**Customer Points**: 1,000 points (worth ₱100.00)
**Points to Redeem**: 500 points = ₱50.00 discount

**Result**:
- 500 points deducted from customer
- Remaining balance: ₱450.00
- Customer pays ₱450.00 (cash/card/mobile wallet)
- Customer earns new points on ₱450.00 = 45 points

**Final**:
- Customer had: 1,000 points
- Points used: -500 points
- Points earned: +45 points
- New balance: 545 points

---

## Testing the Feature

To test loyalty points redemption:

1. **Create/Select a customer** with high loyalty points (e.g., 1000+ points)

2. **Add items to cart** (e.g., ₱200 worth)

3. **Select the customer** and go to checkout

4. **Enter points to redeem** (e.g., 100 points = ₱10 discount)

5. **Click "Apply"** - should show remaining balance of ₱190

6. **Complete payment** with remaining amount

7. **Check customer profile** in CRM to verify:
   - Points were deducted
   - New points were earned on amount paid

---

## Future Improvements Needed

1. **Add explicit points tracking** in transaction
2. **Show points redemption on receipt**
3. **Better UI feedback** when points are applied
4. **Validate points balance** before allowing redemption
5. **Show points value clearly** in checkout (e.g., "100 pts = ₱10.00")
6. **Allow partial redemption** more clearly (e.g., slider or percentage)
7. **Add confirmation dialog** before deducting points

---

## Quick Reference

- **Conversion**: 1 point = ₱0.10
- **Earning**: 1 point per ₱10 spent
- **Minimum redemption**: 1 point
- **Maximum redemption**: All available points

---

*Last updated: January 2025*
*Note: This feature currently has implementation issues that need to be fixed for accurate points tracking.*

