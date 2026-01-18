import { SerialPort } from 'serialport';
import type { Transaction, Employee, Customer, Table, PaymentMethod } from '../../../types';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

interface PrinterConfig {
  portPath: string; // COM port path (e.g., 'COM3' on Windows, '/dev/ttyUSB0' on Linux)
  baudRate?: number;
  paperWidth?: number;
}

export class ServerPrinterService {
  private port: SerialPort | null = null;
  private config: PrinterConfig;
  private encoder = new TextEncoder();
  private isConnected = false;

  constructor(config: PrinterConfig) {
    this.config = {
      baudRate: 9600,
      paperWidth: 32,
      ...config,
    };
  }

  /**
   * Connect to the printer
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.port) {
      console.log('✅ Printer already connected');
      return;
    }

    try {
      console.log(`🖨️ Connecting to printer on ${this.config.portPath}...`);
      
      this.port = new SerialPort({
        path: this.config.portPath,
        baudRate: this.config.baudRate || 9600,
        autoOpen: false,
      });

      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(new Error(`Failed to open port: ${err.message}`));
          } else {
            this.isConnected = true;
            console.log(`✅ Connected to printer on ${this.config.portPath}`);
            resolve();
          }
        });
      });

      // Handle port errors
      this.port.on('error', (err) => {
        console.error('❌ Printer port error:', err);
        this.isConnected = false;
      });

      this.port.on('close', () => {
        console.log('⚠️ Printer connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      this.isConnected = false;
      throw new Error(
        `Failed to connect to printer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    if (this.port && this.port.isOpen) {
      await new Promise<void>((resolve) => {
        this.port!.close(() => {
          console.log('✅ Disconnected from printer');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Check if printer is connected
   */
  isReady(): boolean {
    return this.isConnected && this.port !== null && this.port.isOpen;
  }

  /**
   * Print a receipt
   */
  async printReceipt(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table
  ): Promise<void> {
    if (!this.isReady()) {
      // Try to reconnect
      await this.connect();
    }

    const content = this.formatReceipt(transaction, employee, customer, table);
    const escPosData = this.createEscPosCommands(content);

    try {
      await this.sendToPrinter(escPosData);
      console.log('✅ Receipt printed successfully');
    } catch (error) {
      throw new Error(
        `Failed to print receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send data to printer
   */
  private async sendToPrinter(data: Uint8Array): Promise<void> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Printer not connected');
    }

    return new Promise((resolve, reject) => {
      this.port!.write(data, (err) => {
        if (err) {
          reject(new Error(`Write error: ${err.message}`));
        } else {
          // Wait for data to be transmitted
          this.port!.drain(() => {
            resolve();
          });
        }
      });
    });
  }

  /**
   * Create ESC/POS command sequence
   */
  private createEscPosCommands(content: string): Uint8Array {
    const commands: number[] = [];

    // Initialize printer
    commands.push(...Array.from(this.encoder.encode(ESC + '@'))); // Reset printer
    commands.push(...Array.from(this.encoder.encode(ESC + 't\x00'))); // Character code table
    commands.push(...Array.from(this.encoder.encode(ESC + 'R\x00'))); // International chars
    commands.push(...Array.from(this.encoder.encode(ESC + '!\x00'))); // Reset text formatting
    commands.push(...Array.from(this.encoder.encode(ESC + 'a\x00'))); // Left align

    // Add the receipt content
    commands.push(...Array.from(this.encoder.encode(content)));

    // Cut paper and eject
    commands.push(...Array.from(this.encoder.encode('\n\n\n'))); // Feed paper
    commands.push(...Array.from(this.encoder.encode(GS + 'V\x00'))); // Cut paper

    return new Uint8Array(commands);
  }

  /**
   * Format text for thermal printer
   */
  private formatText(
    text: string,
    alignment: 'left' | 'center' | 'right' = 'left'
  ): string {
    const lines = text.split('\n');
    const paperWidth = this.config.paperWidth || 32;

    return lines
      .map((line) => {
        if (line.length <= paperWidth) {
          switch (alignment) {
            case 'center':
              return line.padStart((paperWidth + line.length) / 2).padEnd(paperWidth);
            case 'right':
              return line.padStart(paperWidth);
            default:
              return line;
          }
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Format receipt content
   */
  private formatReceipt(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table
  ): string {
    const separator = '='.repeat(this.config.paperWidth || 32);
    const lightSeparator = '-'.repeat(this.config.paperWidth || 32);
    const date = new Date(transaction.timestamp).toLocaleString();
    const receiptNumber = `${transaction.id}`;

    let receipt = '';

    // Header
    receipt += '\n';
    receipt += this.formatText('ISABEL\'S KITCHEN', 'center') + '\n';
    receipt += this.formatText('Lucena City, Quezon, Philippines', 'center') + '\n';
    receipt += this.formatText('TIN: 000-000-000-000', 'center') + '\n';
    receipt += separator + '\n\n';

    // Receipt info
    receipt += this.formatText(`Receipt: ${receiptNumber}`) + '\n';
    receipt += this.formatText(`Date: ${date}`) + '\n';
    if (employee) {
      receipt += this.formatText(`Cashier: ${employee.name}`) + '\n';
    }
    if (table) {
      receipt += this.formatText(`Table: ${table.number}`) + '\n';
    }
    if (customer) {
      receipt += this.formatText(`Customer: ${customer.name}`) + '\n';
    }
    receipt += lightSeparator + '\n\n';

    // Items
    for (const item of transaction.items) {
      const itemName = `${item.name}`;
      const qtyPrice = `${item.quantity} x P${item.price.toFixed(2)}`;
      const total = `P${(Number(item.price) * item.quantity).toFixed(2)}`;

      receipt += this.formatText(itemName) + '\n';
      const spacing = (this.config.paperWidth || 32) - qtyPrice.length - total.length;
      receipt += this.formatText(`${qtyPrice}${' '.repeat(Math.max(1, spacing))}${total}`) + '\n';

      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          receipt += this.formatText(`  + ${modifier.modifierName}`) + '\n';
        }
      }
      receipt += '\n';
    }

    receipt += lightSeparator + '\n';

    // Totals
    const formatTotal = (label: string, amount: number) => {
      const amountStr = `P${amount.toFixed(2)}`;
      const spacing = (this.config.paperWidth || 32) - label.length - amountStr.length;
      return this.formatText(`${label}${' '.repeat(Math.max(1, spacing))}${amountStr}`) + '\n';
    };

    receipt += formatTotal('Subtotal:', transaction.subtotal);

    if (transaction.discountTotal && Number(transaction.discountTotal) > 0) {
      receipt += formatTotal('Discount:', -Number(transaction.discountTotal));
    }

    if (transaction.serviceCharge && Number(transaction.serviceCharge) > 0) {
      receipt += formatTotal('Service Charge:', Number(transaction.serviceCharge));
    }

    if (transaction.tax && Number(transaction.tax) > 0) {
      receipt += formatTotal('VAT (12%):', Number(transaction.tax));
    }

    receipt += separator + '\n';
    receipt += formatTotal('TOTAL:', transaction.totalAmount);
    receipt += separator + '\n\n';

    // Payment
    if (transaction.payments && transaction.payments.length > 0) {
      // Check if pending
      const isPending =
        transaction.notes?.includes('PENDING') ||
        transaction.status === 'PENDING' ||
        transaction.id.startsWith('PENDING-');

      if (isPending) {
        receipt += this.formatText('*** PAYMENT PENDING ***', 'center') + '\n';
        receipt += this.formatText('Customer has not paid yet', 'center') + '\n';
        receipt += lightSeparator + '\n';
      }

      for (const payment of transaction.payments) {
        const paymentMethod = this.formatPaymentMethod(payment.method);
        receipt += formatTotal(paymentMethod + ':', Number(payment.amount));
      }

      const totalPaid = transaction.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const change = totalPaid - transaction.totalAmount;
      if (change > 0) {
        receipt += '\n';
        receipt += formatTotal('CHANGE:', change);
      }
      receipt += '\n';
    }

    receipt += lightSeparator + '\n';

    // Footer
    receipt += '\n';
    receipt += this.formatText('Thank you for your business!', 'center') + '\n';
    receipt += this.formatText('Please come again!', 'center') + '\n';
    receipt += '\n\n\n';

    return receipt;
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: PaymentMethod): string {
    const methodMap: Record<string, string> = {
      CASH: 'Cash',
      CREDIT_CARD: 'Credit Card',
      DEBIT_CARD: 'Debit Card',
      GCASH: 'GCash',
      PAYMAYA: 'PayMaya',
    };
    return methodMap[method] || String(method).replace(/_/g, ' ');
  }
}
