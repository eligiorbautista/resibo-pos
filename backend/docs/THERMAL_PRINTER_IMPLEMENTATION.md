# Thermal Receipt Printer Implementation Guide

## Overview

This guide explains how to integrate thermal receipt printers with the POS system. The current implementation uses `window.print()` which works for regular printers but needs to be updated for thermal receipt printers that require ESC/POS commands.

## Current Implementation

**Location:** `components/features/POSTerminal.tsx` - `printReceipt()` function

**Current Method:** Uses `window.print()` which opens browser print dialog

**Limitations:**
- Doesn't support ESC/POS commands (cut, bold, alignment)
- Requires manual printer selection
- May not format correctly for 80mm thermal paper
- No direct communication with thermal printers

## Recommended Solution: Backend Printing Service

### Why Backend Printing?

✅ **More Reliable:** No browser permission issues  
✅ **Better Control:** Direct ESC/POS command support  
✅ **Multiple Printer Types:** USB, Network (TCP/IP), Serial  
✅ **Better Error Handling:** Server-side logging and retry  
✅ **Production Ready:** Works in all environments  

## Implementation Steps

### Step 1: Install Backend Dependencies

cd backend
npm install node-thermal-printer
npm install --save-dev @types/node-thermal-printer### Step 2: Create Printer Service

**File:** `backend/src/services/printer.service.ts`

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { Transaction } from '@prisma/client';

export interface PrinterConfig {
  type: PrinterTypes;
  interface: string; // 'tcp://192.168.1.100:9100' or '/dev/usb/lp0' or 'COM3'
  characterSet?: CharacterSet;
  removeSpecialCharacters?: boolean;
  lineCharacter?: string;
  breakLine?: BreakLine;
}

export class PrinterService {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  async printReceipt(transaction: Transaction, employeeName: string, customerName?: string, tableNumber?: string): Promise<void> {
    const printer = new ThermalPrinter({
      type: this.config.type,
      interface: this.config.interface,
      characterSet: this.config.characterSet || CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: this.config.removeSpecialCharacters ?? false,
      lineCharacter: this.config.lineCharacter || '-',
      breakLine: this.config.breakLine || BreakLine.LINE,
    });

    try {
      // Check if printer is connected
      const isConnected = await printer.isPrinterConnected();
      if (!isConnected) {
        throw new Error('Printer is not connected');
      }

      // Start printing
      printer.alignCenter();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.println('RESTAURANT NAME');
      printer.bold(false);
      printer.newLine();
      printer.println('Lucena City');
      printer.newLine();
      printer.drawLine();
      printer.newLine();

      // Receipt info
      printer.alignLeft();
      printer.println(`Receipt #: ${transaction.id.slice(0, 8).toUpperCase()}`);
      printer.println(`Date: ${new Date(transaction.createdAt).toLocaleString('en-PH')}`);
      printer.println(`Cashier: ${employeeName}`);
      
      if (customerName) {
        printer.println(`Customer: ${customerName}`);
      }
      
      if (tableNumber) {
        printer.println(`Table: ${tableNumber}`);
      }
      
      printer.drawLine();
      printer.newLine();

      // Items
      printer.println('ITEMS:');
      printer.newLine();
      
      // Note: You'll need to fetch items from database
      // For now, assuming items are in transaction
      const items = (transaction as any).items || [];
      
      items.forEach((item: any) => {
        printer.alignLeft();
        printer.println(`${item.quantity}x ${item.name}`);
        
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach((mod: any) => {
            printer.println(`  + ${mod.name}`);
          });
        }
        
        printer.alignRight();
        printer.println(`₱${(item.price * item.quantity).toFixed(2)}`);
        printer.newLine();
      });

      printer.drawLine();
      printer.newLine();

      // Totals
      printer.alignLeft();
      printer.println('SUBTOTAL:');
      printer.alignRight();
      printer.println(`₱${transaction.subtotal.toFixed(2)}`);
      printer.newLine();

      if (transaction.discountTotal > 0) {
        printer.alignLeft();
        printer.println('DISCOUNT:');
        printer.alignRight();
        printer.println(`-₱${transaction.discountTotal.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.tax > 0) {
        printer.alignLeft();
        printer.println('VAT (12%):');
        printer.alignRight();
        printer.println(`₱${transaction.tax.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.serviceCharge > 0) {
        printer.alignLeft();
        printer.println('SERVICE CHARGE (10%):');
        printer.alignRight();
        printer.println(`₱${transaction.serviceCharge.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.tip > 0) {
        printer.alignLeft();
        printer.println('TIP:');
        printer.alignRight();
        printer.println(`₱${transaction.tip.toFixed(2)}`);
        printer.newLine();
      }

      printer.drawLine();
      printer.newLine();
      
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.alignLeft();
      printer.println('TOTAL:');
      printer.alignRight();
      printer.println(`₱${transaction.totalAmount.toFixed(2)}`);
      printer.bold(false);
      printer.setTextSize(0, 0);
      printer.newLine();
      printer.newLine();

      // Payments
      const payments = (transaction as any).payments || [];
      if (payments.length > 0) {
        printer.drawLine();
        printer.println('PAYMENT:');
        payments.forEach((payment: any) => {
          printer.alignLeft();
          printer.println(`${payment.method}:`);
          printer.alignRight();
          printer.println(`₱${payment.amount.toFixed(2)}`);
        });
        printer.newLine();
      }

      // Footer
      printer.drawLine();
      printer.newLine();
      printer.alignCenter();
      printer.println('Thank you for dining with us!');
      printer.newLine();
      printer.println('Visit us again soon!');
      printer.newLine();
      printer.newLine();
      printer.newLine();

 
...

Let me reevaluate and take a different approach.


============================================================================
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { Transaction } from '@prisma/client';

export interface PrinterConfig {
  type: PrinterTypes;
  interface: string; // 'tcp://192.168.1.100:9100' or '/dev/usb/lp0' or 'COM3'
  characterSet?: CharacterSet;
  removeSpecialCharacters?: boolean;
  lineCharacter?: string;
  breakLine?: BreakLine;
}

export class PrinterService {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  async printReceipt(transaction: Transaction, employeeName: string, customerName?: string, tableNumber?: string): Promise<void> {
    const printer = new ThermalPrinter({
      type: this.config.type,
      interface: this.config.interface,
      characterSet: this.config.characterSet || CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: this.config.removeSpecialCharacters ?? false,
      lineCharacter: this.config.lineCharacter || '-',
      breakLine: this.config.breakLine || BreakLine.LINE,
    });

    try {
      // Check if printer is connected
      const isConnected = await printer.isPrinterConnected();
      if (!isConnected) {
        throw new Error('Printer is not connected');
      }

      // Start printing
      printer.alignCenter();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.println('RESTAURANT NAME');
      printer.bold(false);
      printer.newLine();
      printer.println('Lucena City');
      printer.newLine();
      printer.drawLine();
      printer.newLine();

      // Receipt info
      printer.alignLeft();
      printer.println(`Receipt #: ${transaction.id.slice(0, 8).toUpperCase()}`);
      printer.println(`Date: ${new Date(transaction.createdAt).toLocaleString('en-PH')}`);
      printer.println(`Cashier: ${employeeName}`);
      
      if (customerName) {
        printer.println(`Customer: ${customerName}`);
      }
      
      if (tableNumber) {
        printer.println(`Table: ${tableNumber}`);
      }
      
      printer.drawLine();
      printer.newLine();

      // Items
      printer.println('ITEMS:');
      printer.newLine();
      
      // Note: You'll need to fetch items from database
      // For now, assuming items are in transaction
      const items = (transaction as any).items || [];
      
      items.forEach((item: any) => {
        printer.alignLeft();
        printer.println(`${item.quantity}x ${item.name}`);
        
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach((mod: any) => {
            printer.println(`  + ${mod.name}`);
          });
        }
        
        printer.alignRight();
        printer.println(`₱${(item.price * item.quantity).toFixed(2)}`);
        printer.newLine();
      });

      printer.drawLine();
      printer.newLine();

      // Totals
      printer.alignLeft();
      printer.println('SUBTOTAL:');
      printer.alignRight();
      printer.println(`₱${transaction.subtotal.toFixed(2)}`);
      printer.newLine();

      if (transaction.discountTotal > 0) {
        printer.alignLeft();
        printer.println('DISCOUNT:');
        printer.alignRight();
        printer.println(`-₱${transaction.discountTotal.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.tax > 0) {
        printer.alignLeft();
        printer.println('VAT (12%):');
        printer.alignRight();
        printer.println(`₱${transaction.tax.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.serviceCharge > 0) {
        printer.alignLeft();
        printer.println('SERVICE CHARGE (10%):');
        printer.alignRight();
        printer.println(`₱${transaction.serviceCharge.toFixed(2)}`);
        printer.newLine();
      }

      if (transaction.tip > 0) {
        printer.alignLeft();
        printer.println('TIP:');
        printer.alignRight();
        printer.println(`₱${transaction.tip.toFixed(2)}`);
        printer.newLine();
      }

      printer.drawLine();
      printer.newLine();
      
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.alignLeft();
      printer.println('TOTAL:');
      printer.alignRight();
      printer.println(`₱${transaction.totalAmount.toFixed(2)}`);
      printer.bold(false);
      printer.setTextSize(0, 0);
      printer.newLine();
      printer.newLine();

      // Payments
      const payments = (transaction as any).payments || [];
      if (payments.length > 0) {
        printer.drawLine();
        printer.println('PAYMENT:');
        payments.forEach((payment: any) => {
          printer.alignLeft();
          printer.println(`${payment.method}:`);
          printer.alignRight();
          printer.println(`₱${payment.amount.toFixed(2)}`);
        });
        printer.newLine();
      }

      // Footer
      printer.drawLine();
      printer.newLine();
      printer.alignCenter();
      printer.println('Thank you for dining with us!');
      printer.newLine();
      printer.println('Visit us again soon!');
      printer.newLine();
      printer.newLine();
      printer.newLine();

 
...

Let me reevaluate and take a different approach.

