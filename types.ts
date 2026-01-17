
export enum Role {
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  SERVER = 'SERVER',
  KITCHEN = 'KITCHEN'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  GCASH = 'GCASH',
  PAYMAYA = 'PAYMAYA'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY = 'DELIVERY'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  NEEDS_CLEANING = 'NEEDS_CLEANING'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED'
}

export enum DiscountType {
  NONE = 'NONE',
  PWD = 'PWD', // Person with Disability - 20% discount, VAT-exempt
  SENIOR_CITIZEN = 'SENIOR_CITIZEN' // Senior Citizen - 20% discount, VAT-exempt
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red / Large"
  price: number;
  stock: number;
  sku: string;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  category: string; // e.g., "Size", "Add-ons", "Customization"
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  maxSelections?: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  costPrice: number;
  imageUrl?: string;
  variants: ProductVariant[];
  modifierGroups?: ModifierGroup[];
  reorderPoint: number;
  totalStock: number;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  discount: number; // Flat amount discount for this item
  modifiers?: { modifierId: string; modifierName: string; price: number }[];
  specialInstructions?: string;
}

export interface Transaction {
  id: string;
  timestamp: Date;
  items: CartItem[];
  totalAmount: number; // Final amount after all discounts (what customer pays)
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discountTotal: number;
  discountType?: DiscountType; // PWD or Senior Citizen discount
  discountCardNumber?: string; // PWD ID or Senior Citizen ID number
  discountVerifiedBy?: string; // Employee ID who verified the discount card
  discountVerifiedAt?: Date; // Timestamp of verification
  tip: number;
  payments: { method: PaymentMethod; amount: number }[];
  customerId?: string;
  employeeId: string;
  serverId?: string;
  tableId?: string;
  orderType: OrderType;
  status: OrderStatus;
  notes?: string;
  kitchenNotes?: string;
  deliveryAddress?: string;
  deliveryCustomerName?: string; // Customer name for delivery orders
  deliveryCustomerPhone?: string; // Customer phone number for delivery orders
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  estimatedPrepTime?: number; // in minutes
  loyaltyPointsRedeemed?: number; // Number of loyalty points used in this transaction
  loyaltyPointsDiscount?: number; // Cash value of loyalty points redeemed (₱)
}

export interface Customer {
  id: string;
  membershipCardNumber: string; // Unique membership card number
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  purchaseHistory: string[]; // Transaction IDs
  joinedDate: Date; // Date when customer became a member
  birthday?: Date; // Optional birthday for special promotions
  tags?: string[]; // Optional tags for customer segmentation
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  createdBy: string; // Employee ID
  createdAt: Date;
}

export interface CustomerTag {
  id: string;
  name: string;
  color?: string; // Optional color for UI display
}

export interface VerifiedDiscountID {
  id: string;
  cardNumber: string;
  discountType: DiscountType;
  verifiedAt: Date;
  verifiedBy: string; // Employee ID
  customerName?: string;
  lastUsedAt?: Date;
  usageCount: number;
}

export interface TimeRecord {
  id: string;
  clockIn: Date;
  clockOut?: Date;
  breaks?: BreakRecord[];
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  pin: string;
  status: 'IN' | 'OUT';
  lastClockIn?: Date;
  timeRecords: TimeRecord[];
  totalSales: number;
  totalTips?: number;
  hourlyRate?: number; // Hourly wage for payroll calculation
}

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  location?: string; // e.g., "Indoor", "Outdoor", "Bar"
  reservationName?: string; // Name for reservation when status is RESERVED
}

export interface CashDrawer {
  id: string;
  employeeId: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  actualAmount?: number;
  difference?: number;
  openedAt: Date;
  closedAt?: Date;
  transactions: string[]; // Transaction IDs
  denominationBreakdown?: { [key: string]: number }; // e.g., { '1000': 5, '500': 10, ... }
  cashDrops?: CashDrop[];
  cashPickups?: CashPickup[];
  shiftNotes?: ShiftNote[];
}

export interface SuspendedCart {
  id: string;
  customerName?: string;
  items: CartItem[];
  timestamp: Date;
  orderType?: OrderType;
  tableId?: string;
  serverId?: string;
  customerId?: string;
  notes?: string;
}

export interface BreakRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  type: 'BREAK' | 'LUNCH';
}

export interface ShiftSchedule {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isRecurring: boolean;
  endDate?: Date;
}

export interface CashDrop {
  id: string;
  drawerId: string;
  amount: number;
  reason: string;
  droppedBy: string; // Employee ID
  droppedAt: Date;
}

export interface CashPickup {
  id: string;
  drawerId: string;
  amount: number;
  reason: string;
  pickedUpBy: string; // Employee ID
  pickedUpAt: Date;
}

export interface ShiftNote {
  id: string;
  drawerId: string;
  note: string;
  createdBy: string; // Employee ID
  createdAt: Date;
}

export interface WaitlistItem {
  id: string;
  customerName: string;
  partySize: number;
  phone?: string;
  timestamp: Date;
  status: 'WAITING' | 'SEATED' | 'CANCELLED';
  tableId?: string;
}

export interface TableReservation {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  reservationDate: Date;
  reservationTime: string; // Time string like "18:00"
  tableId?: string;
  status: 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
}
