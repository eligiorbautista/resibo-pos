import { Request, Response } from 'express';
import { ServerPrinterService } from '../services/printerService';
import type { Transaction, Employee, Customer, Table } from '../../../types';

// Singleton printer instance
let printerService: ServerPrinterService | null = null;

/**
 * Initialize printer service with configured port
 */
export const initializePrinter = async (portPath: string): Promise<void> => {
  try {
    console.log(`🖨️ Initializing printer on port: ${portPath}`);
    printerService = new ServerPrinterService({ portPath });
    await printerService.connect();
    console.log('✅ Printer initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize printer:', error);
    console.warn('⚠️ Printer will be unavailable until configured correctly');
    printerService = null;
  }
};

/**
 * Print receipt
 */
export const printReceipt = async (req: Request, res: Response) => {
  try {
    const { transaction, employee, customer, table } = req.body as {
      transaction: Transaction;
      employee?: Employee;
      customer?: Customer;
      table?: Table;
    };

    if (!transaction) {
      return res.status(400).json({
        success: false,
        message: 'Transaction data is required',
      });
    }

    // Check if printer is initialized
    if (!printerService) {
      console.warn('⚠️ Printer not initialized, attempting to initialize...');
      const portPath = process.env.PRINTER_PORT_PATH;
      
      if (!portPath) {
        return res.status(503).json({
          success: false,
          message: 'Printer not configured. Please set PRINTER_PORT_PATH in .env file.',
        });
      }

      await initializePrinter(portPath);
      
      if (!printerService) {
        return res.status(503).json({
          success: false,
          message: 'Failed to initialize printer',
        });
      }
    }

    // Print the receipt
    await printerService.printReceipt(transaction, employee, customer, table);

    res.json({
      success: true,
      message: 'Receipt printed successfully',
    });
  } catch (error: any) {
    console.error('❌ Print error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to print receipt: ${error.message}`,
    });
  }
};

/**
 * Get printer status
 */
export const getPrinterStatus = (req: Request, res: Response) => {
  const isReady = printerService?.isReady() ?? false;
  
  res.json({
    success: true,
    isReady,
    portPath: process.env.PRINTER_PORT_PATH || 'Not configured',
  });
};

/**
 * Reconnect to printer
 */
export const reconnectPrinter = async (req: Request, res: Response) => {
  try {
    if (!printerService) {
      const portPath = process.env.PRINTER_PORT_PATH;
      if (!portPath) {
        return res.status(400).json({
          success: false,
          message: 'Printer not configured. Please set PRINTER_PORT_PATH in .env file.',
        });
      }
      await initializePrinter(portPath);
    } else {
      await printerService.connect();
    }

    res.json({
      success: true,
      message: 'Successfully reconnected to printer',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Failed to reconnect: ${error.message}`,
    });
  }
};

/**
 * List available serial ports
 */
export const listPorts = async (req: Request, res: Response) => {
  try {
    const { SerialPort } = await import('serialport');
    const ports = await SerialPort.list();
    
    res.json({
      success: true,
      ports: ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        productId: port.productId,
        vendorId: port.vendorId,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Failed to list ports: ${error.message}`,
    });
  }
};

// Export the printer service instance for use in server initialization
export { printerService };
