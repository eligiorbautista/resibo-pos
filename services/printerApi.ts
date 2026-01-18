// ==================== Printer (Server-Side) ====================

import type { Transaction, Employee, Customer, Table } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const printerApi = {
  /**
   * Print a receipt via backend server (automatic, no browser picker)
   */
  printReceipt: async (data: {
    transaction: Transaction;
    employee?: Employee;
    customer?: Customer;
    table?: Table;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/printer/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    return result;
  },

  /**
   * Get printer status
   */
  getStatus: async (): Promise<{ success: boolean; isReady: boolean; portPath: string }> => {
    const response = await fetch(`${API_BASE_URL}/printer/status`);
    return response.json();
  },

  /**
   * Reconnect to printer
   */
  reconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/printer/reconnect`, {
      method: 'POST',
    });
    return response.json();
  },

  /**
   * List available serial ports (for finding printer)
   */
  listPorts: async (): Promise<{ success: boolean; ports: Array<{ path: string; manufacturer?: string }> }> => {
    const response = await fetch(`${API_BASE_URL}/printer/ports`);
    return response.json();
  },
};
