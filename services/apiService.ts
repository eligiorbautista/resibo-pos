/**
 * API Service Layer for Frontend
 * 
 * This service handles all API calls to the backend.
 * Replace the mock data in App.tsx with calls to this service.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  message?: string;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiError extends Error {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

/**
 * Generic API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add authentication token if required
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'Request failed',
        data.error?.code || 'REQUEST_FAILED',
        response.status,
        data.error?.details
      );
    }

    if (!data.success) {
      throw new ApiError(
        data.error?.message || 'Request failed',
        data.error?.code || 'REQUEST_FAILED',
        response.status,
        data.error?.details
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(
        'Cannot connect to server. Please check if the backend is running.',
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }
}

// ==================== Authentication ====================

export interface LoginRequest {
  pin: string;
}

export interface LoginResponse {
  employee: {
    id: string;
    name: string;
    role: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (pin: string): Promise<LoginResponse> => {
    const data = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
      requiresAuth: false,
    });
    
    // Store token
    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }
    
    return data;
  },

  getCurrentUser: async (): Promise<{ employee: LoginResponse['employee'] }> => {
    const response = await apiRequest<{ employee: LoginResponse['employee'] }>('/auth/me');
    return response;
  },

  logout: async (): Promise<void> => {
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
    removeAuthToken();
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const data = await apiRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      requiresAuth: false,
    });
    
    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }
    
    return data;
  },
};

// ==================== Products ====================

// TODO: Define types based on your backend models
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  costPrice: number;
  imageUrl?: string;
  reorderPoint: number;
  totalStock: number;
  variants?: any[];
  modifierGroups?: any[];
}

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    return apiRequest<Product[]>('/products');
  },

  getById: async (id: string): Promise<Product> => {
    return apiRequest<Product>(`/products/${id}`);
  },

  create: async (product: Partial<Product>): Promise<Product> => {
    return apiRequest<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  update: async (id: string, product: Partial<Product>): Promise<Product> => {
    return apiRequest<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Modifiers ====================

export interface ModifierGroup {
  id: string;
  productId: string;
  name: string;
  required: boolean;
  maxSelections?: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  name: string;
  price: number;
  category: string;
}

export const modifiersApi = {
  getByProduct: async (productId: string): Promise<ModifierGroup[]> => {
    return apiRequest<ModifierGroup[]>(`/modifiers/product/${productId}`);
  },

  createGroup: async (group: {
    productId: string;
    name: string;
    required?: boolean;
    maxSelections?: number;
    modifiers?: Array<{ name: string; price: number; category?: string }>;
  }): Promise<ModifierGroup> => {
    return apiRequest<ModifierGroup>('/modifiers/group', {
      method: 'POST',
      body: JSON.stringify(group),
    });
  },

  updateGroup: async (id: string, group: {
    name?: string;
    required?: boolean;
    maxSelections?: number;
  }): Promise<ModifierGroup> => {
    return apiRequest<ModifierGroup>(`/modifiers/group/${id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    });
  },

  deleteGroup: async (id: string): Promise<void> => {
    return apiRequest<void>(`/modifiers/group/${id}`, {
      method: 'DELETE',
    });
  },

  createModifier: async (modifier: {
    modifierGroupId: string;
    name: string;
    price: number;
    category?: string;
  }): Promise<Modifier> => {
    return apiRequest<Modifier>('/modifiers', {
      method: 'POST',
      body: JSON.stringify(modifier),
    });
  },

  updateModifier: async (id: string, modifier: {
    name?: string;
    price?: number;
    category?: string;
  }): Promise<Modifier> => {
    return apiRequest<Modifier>(`/modifiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(modifier),
    });
  },

  deleteModifier: async (id: string): Promise<void> => {
    return apiRequest<void>(`/modifiers/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Variants ====================

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

export const variantsApi = {
  getByProduct: async (productId: string): Promise<ProductVariant[]> => {
    return apiRequest<ProductVariant[]>(`/variants/product/${productId}`);
  },

  create: async (variant: {
    productId: string;
    name: string;
    price: number;
    stock?: number;
    sku?: string;
  }): Promise<ProductVariant> => {
    return apiRequest<ProductVariant>('/variants', {
      method: 'POST',
      body: JSON.stringify(variant),
    });
  },

  update: async (id: string, variant: {
    name?: string;
    price?: number;
    stock?: number;
    sku?: string;
  }): Promise<ProductVariant> => {
    return apiRequest<ProductVariant>(`/variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(variant),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/variants/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Transactions ====================

// TODO: Define types based on your backend models
export interface Transaction {
  id: string;
  timestamp: Date;
  items: any[];
  totalAmount: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discountTotal: number;
  discountType?: string;
  tip: number;
  payments: any[];
  customerId?: string;
  employeeId: string;
  serverId?: string;
  tableId?: string;
  orderType: string;
  status: string;
  notes?: string;
}

export const transactionsApi = {
  getAll: async (params?: { startDate?: string; endDate?: string }): Promise<Transaction[]> => {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return apiRequest<Transaction[]>(`/transactions${queryString}`);
  },

  getById: async (id: string): Promise<Transaction> => {
    return apiRequest<Transaction>(`/transactions/${id}`);
  },

  create: async (transaction: Partial<Transaction>): Promise<Transaction> => {
    return apiRequest<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  update: async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    return apiRequest<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  },

  void: async (id: string, note?: string): Promise<Transaction> => {
    return apiRequest<Transaction>(`/transactions/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  refund: async (id: string, refundData: any): Promise<Transaction> => {
    return apiRequest<Transaction>(`/transactions/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData),
    });
  },
};

// ==================== Payments (PayMongo) ====================

export interface PaymongoRedirectIntent {
  intentId: string;
  provider: 'PAYMONGO';
  method: 'GCASH' | 'PAYMAYA';
  status: 'CREATED' | 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  redirectUrl?: string | null;
  paymongoPaymentIntentId?: string | null;
}

export const paymentsApi = {
  paymongoCreateRedirect: async (payload: {
    amount: number;
    method: 'GCASH' | 'PAYMAYA';
    description?: string;
  }): Promise<PaymongoRedirectIntent> => {
    return apiRequest<PaymongoRedirectIntent>('/payments/paymongo/redirect', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  paymongoGetRedirectStatus: async (intentId: string): Promise<PaymongoRedirectIntent> => {
    return apiRequest<PaymongoRedirectIntent>(`/payments/paymongo/redirect/${intentId}`);
  },

};

// ==================== Customers ====================

// TODO: Define types based on your backend models
export interface Customer {
  id: string;
  membershipCardNumber: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  joinedDate: Date;
  birthday?: Date;
  tags?: string[];
}

export const customersApi = {
  getAll: async (search?: string): Promise<Customer[]> => {
    const queryString = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<Customer[]>(`/customers${queryString}`);
  },

  getById: async (id: string): Promise<Customer> => {
    return apiRequest<Customer>(`/customers/${id}`);
  },

  create: async (customer: Partial<Customer>): Promise<Customer> => {
    return apiRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    return apiRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Employees ====================

// TODO: Define types based on your backend models
export interface Employee {
  id: string;
  name: string;
  role: string;
  status: string;
  lastClockIn?: string;
  totalSales: number;
  totalTips?: number;
  hourlyRate?: number;
  createdAt?: string;
  updatedAt?: string;
  timeRecords?: any[];
}

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => {
    return apiRequest<Employee[]>('/employees');
  },

  getById: async (id: string): Promise<Employee> => {
    return apiRequest<Employee>(`/employees/${id}`);
  },

  create: async (employee: { name: string; role: string; pin: string; hourlyRate?: number }): Promise<Employee> => {
    return apiRequest<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },

  update: async (id: string, employee: Partial<{ name: string; role: string; pin: string; hourlyRate?: number }>): Promise<Employee> => {
    return apiRequest<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/employees/${id}`, {
      method: 'DELETE',
    });
  },

  clockIn: async (id: string): Promise<{ employee: Employee; timeRecord: any }> => {
    return apiRequest<{ employee: Employee; timeRecord: any }>(`/employees/${id}/clock-in`, {
      method: 'POST',
    });
  },

  clockOut: async (id: string): Promise<{ employee: Employee; timeRecord: any }> => {
    return apiRequest<{ employee: Employee; timeRecord: any }>(`/employees/${id}/clock-out`, {
      method: 'POST',
    });
  },

  startBreak: async (id: string, type: 'BREAK' | 'LUNCH'): Promise<{ break: any }> => {
    return apiRequest<{ break: any }>(`/employees/${id}/breaks/start`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  endBreak: async (id: string): Promise<{ break: any }> => {
    return apiRequest<{ break: any }>(`/employees/${id}/breaks/end`, {
      method: 'POST',
    });
  },

  getTimeRecords: async (id: string, startDate?: string, endDate?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/employees/${id}/time-records${query}`);
  },

  markSalaryAsPaid: async (id: string, paymentData: {
    periodStart: string;
    periodEnd: string;
    amount: number;
    hoursWorked: number;
    regularPay: number;
    overtimePay: number;
    notes?: string;
  }): Promise<any> => {
    return apiRequest<any>(`/employees/${id}/payroll/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  getPayrollPayments: async (id: string): Promise<any[]> => {
    return apiRequest<any[]>(`/employees/${id}/payroll/payments`);
  },
};

// ==================== Tables ====================

// TODO: Define types based on your backend models
export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: string;
  location?: string;
  currentOrderId?: string;
}

export const tablesApi = {
  getAll: async (): Promise<Table[]> => {
    return apiRequest<Table[]>('/tables');
  },

  getById: async (id: string): Promise<Table> => {
    return apiRequest<Table>(`/tables/${id}`);
  },

  create: async (table: { number: string; capacity: number; location?: string; status?: string }): Promise<Table> => {
    return apiRequest<Table>('/tables', {
      method: 'POST',
      body: JSON.stringify(table),
    });
  },

  update: async (id: string, table: Partial<Table>): Promise<Table> => {
    return apiRequest<Table>(`/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(table),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/tables/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Shift Schedules ====================

export interface ShiftSchedule {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isRecurring: boolean;
  endDate?: string;
  employee?: {
    id: string;
    name: string;
    role: string;
  };
}

export const shiftSchedulesApi = {
  getAll: async (): Promise<ShiftSchedule[]> => {
    return apiRequest<ShiftSchedule[]>('/shift-schedules');
  },

  getByEmployee: async (employeeId: string): Promise<ShiftSchedule[]> => {
    return apiRequest<ShiftSchedule[]>(`/shift-schedules/employee/${employeeId}`);
  },

  create: async (schedule: {
    employeeId: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    isRecurring?: boolean;
    endDate?: string;
  }): Promise<ShiftSchedule[]> => {
    return apiRequest<ShiftSchedule[]>('/shift-schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  },

  update: async (id: string, schedule: Partial<{
    startTime: string;
    endTime: string;
    dayOfWeek: number;
    isRecurring: boolean;
    endDate?: string;
  }>): Promise<ShiftSchedule> => {
    return apiRequest<ShiftSchedule>(`/shift-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/shift-schedules/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Cash Drawers ====================

// TODO: Define types based on your backend models
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
}

export interface CashDrop {
  id: string;
  drawerId: string;
  amount: number;
  reason: string;
  droppedBy: string;
  droppedAt: Date;
  employee?: { id: string; name: string };
}

export interface CashPickup {
  id: string;
  drawerId: string;
  amount: number;
  reason: string;
  pickedUpBy: string;
  pickedUpAt: Date;
  employee?: { id: string; name: string };
}

export interface ShiftNote {
  id: string;
  drawerId: string;
  note: string;
  createdBy: string;
  createdAt: Date;
  employee?: { id: string; name: string };
}

export const cashDrawersApi = {
  getAll: async (): Promise<CashDrawer[]> => {
    const response = await apiRequest<CashDrawer[]>('/cash-drawers');
    return Array.isArray(response) ? response : [];
  },

  getActive: async (): Promise<CashDrawer | null> => {
    return apiRequest<CashDrawer | null>('/cash-drawers/active');
  },

  open: async (openingAmount: number): Promise<CashDrawer> => {
    return apiRequest<CashDrawer>('/cash-drawers/open', {
      method: 'POST',
      body: JSON.stringify({ openingAmount }),
    });
  },

  close: async (id: string, closingData: { closingAmount: number; expectedAmount?: number; denominationBreakdown?: any }): Promise<CashDrawer> => {
    return apiRequest<CashDrawer>(`/cash-drawers/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(closingData),
    });
  },

  addCashDrop: async (drawerId: string, amount: number, reason: string): Promise<CashDrop> => {
    return apiRequest<CashDrop>('/cash-drawers/cash-drop', {
      method: 'POST',
      body: JSON.stringify({ drawerId, amount, reason }),
    });
  },

  addCashPickup: async (drawerId: string, amount: number, reason: string): Promise<CashPickup> => {
    return apiRequest<CashPickup>('/cash-drawers/cash-pickup', {
      method: 'POST',
      body: JSON.stringify({ drawerId, amount, reason }),
    });
  },

  addShiftNote: async (drawerId: string, note: string): Promise<ShiftNote> => {
    return apiRequest<ShiftNote>('/cash-drawers/shift-note', {
      method: 'POST',
      body: JSON.stringify({ drawerId, note }),
    });
  },

  addTransaction: async (drawerId: string, transactionId: string): Promise<void> => {
    return apiRequest<void>('/cash-drawers/add-transaction', {
      method: 'POST',
      body: JSON.stringify({ drawerId, transactionId }),
    });
  },
};

// Audit Log API
export interface AuditLog {
  id: string;
  employeeId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  employee?: { id: string; name: string; role: string };
}

export const auditLogsApi = {
  getAll: async (params?: { startDate?: string; endDate?: string; action?: string; employeeId?: string; entityType?: string; page?: number; limit?: number }): Promise<{ logs: AuditLog[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiRequest<{ logs: AuditLog[]; pagination: any }>(`/audit-logs${query ? `?${query}` : ''}`);
  },

  getById: async (id: string): Promise<AuditLog> => {
    return apiRequest<AuditLog>(`/audit-logs/${id}`);
  },

  getByEntity: async (entityType: string, entityId: string): Promise<AuditLog[]> => {
    return apiRequest<AuditLog[]>(`/audit-logs/entity/${entityType}/${entityId}`);
  },
};

// Reports API
export interface ZReading {
  id: string;
  businessDate: Date;
  generatedAt: Date;
  generatedById: string;
  openingGrandTotal: number;
  closingGrandTotal: number;
  totalGrossSales: number;
  totalVatSales: number;
  totalVatExempt: number;
  totalDiscounts: number;
  totalServiceCharge: number;
  totalVoidAmount: number;
  totalTransactions: number;
  notes?: string;
  generatedBy?: { id: string; name: string; role: string };
}

export interface SystemGrandTotal {
  grandTotal: number;
  lastInvoiceNumber: number;
}

export const reportsApi = {
  getSystemGrandTotal: async (): Promise<SystemGrandTotal> => {
    return apiRequest<SystemGrandTotal>('/reports/grand-total');
  },

  getAllZReadings: async (params?: { startDate?: string; endDate?: string }): Promise<ZReading[]> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const query = queryParams.toString();
    return apiRequest<ZReading[]>(`/reports/z-reading${query ? `?${query}` : ''}`);
  },

  getZReadingByDate: async (date: string): Promise<ZReading> => {
    return apiRequest<ZReading>(`/reports/z-reading/${date}`);
  },

  generateZReading: async (date?: string): Promise<ZReading> => {
    const queryParams = date ? `?date=${date}` : '';
    return apiRequest<ZReading>(`/reports/z-reading/generate${queryParams}`, {
      method: 'POST',
    });
  },

  exportESales: async (month: string, format: 'csv' | 'txt' = 'csv'): Promise<void> => {
    const url = `/reports/esales-export?month=${month}&format=${format}`;
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to export eSales data');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `esales_${month}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};

// E-Invoice API
export interface EInvoicePayload {
  id: string;
  transactionId: string;
  payloadJson: any;
  status: 'PENDING' | 'SENT' | 'FAILED';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  transaction?: { id: string; officialInvoiceNumber?: number; timestamp: Date; totalAmount: number };
}

export const eInvoiceApi = {
  getPending: async (params?: { page?: number; limit?: number }): Promise<{ payloads: EInvoicePayload[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiRequest<{ payloads: EInvoicePayload[]; pagination: any }>(`/einvoice/pending${query ? `?${query}` : ''}`);
  },

  getStats: async (): Promise<{ pending: number; sent: number; failed: number; total: number }> => {
    return apiRequest('/einvoice/stats');
  },

  getByTransaction: async (transactionId: string): Promise<EInvoicePayload> => {
    return apiRequest<EInvoicePayload>(`/einvoice/transaction/${transactionId}`);
  },

  markAsSent: async (transactionId: string): Promise<EInvoicePayload> => {
    return apiRequest<EInvoicePayload>(`/einvoice/${transactionId}/sent`, {
      method: 'POST',
    });
  },

  markAsFailed: async (transactionId: string, error: string): Promise<EInvoicePayload> => {
    return apiRequest<EInvoicePayload>(`/einvoice/${transactionId}/failed`, {
      method: 'POST',
      body: JSON.stringify({ error }),
    });
  },
};

// Export default API service
export default {
  auth: authApi,
  products: productsApi,
  transactions: transactionsApi,
  payments: paymentsApi,
  customers: customersApi,
  employees: employeesApi,
  tables: tablesApi,
  cashDrawers: cashDrawersApi,
  auditLogs: auditLogsApi,
  reports: reportsApi,
  eInvoice: eInvoiceApi,
};

