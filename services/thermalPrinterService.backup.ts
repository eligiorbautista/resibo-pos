import {
  Transaction,
  Employee,
  Customer,
  Table,
  PaymentMethod,
} from "../types";
import { RESTAURANT_NAME, BIR_CONFIG, BRANDING } from "../constants";

// ESC/POS Commands
const ESC = "\x1B";
const GS = "\x1D";

export interface PrinterConfig {
  connectionType: 'usb' | 'serial' | 'network' | 'local-server' | 'file-drop' | 'windows-driver' | 'browser';
  networkUrl?: string; // For network printers: 'http://192.168.1.100:9100'
  localServerUrl?: string; // For local print server: 'http://localhost:3001/print'
  fileDropPath?: string; // For file drop: 'C:\\ThermalPrint\\' 
  usbVendorId?: number;
  usbProductId?: number;
  serialPort?: string;
  paperWidth?: number; // Default 48 chars for 80mm paper
}

export class ThermalPrinterService {
  private config: PrinterConfig;
  private encoder = new TextEncoder();

  constructor(config: PrinterConfig) {
    this.config = {
      paperWidth: 48,
      ...config,
    };
  }

  private createEscPosCommands(content: string): Uint8Array {
    const commands: number[] = [];

    // Initialize printer with comprehensive setup
    commands.push(...Array.from(this.encoder.encode(ESC + "@"))); // Initialize printer
    commands.push(...Array.from(this.encoder.encode(ESC + "t\x00"))); // Character code table
    commands.push(...Array.from(this.encoder.encode(ESC + "R\x00"))); // International character set
    
    // Reset text formatting
    commands.push(...Array.from(this.encoder.encode(ESC + "!\x00"))); // Reset text size/emphasis
    commands.push(...Array.from(this.encoder.encode(ESC + "a\x00"))); // Left align

    // Add content
    commands.push(...Array.from(this.encoder.encode(content)));

    // Add extra line feeds and cut paper
    commands.push(...Array.from(this.encoder.encode("\n\n\n")));
    commands.push(...Array.from(this.encoder.encode(GS + "V\x41\x03"))); // Full cut

    return new Uint8Array(commands);
  }

  private generateReceiptContent(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table,
  ): string {
    const width = this.config.paperWidth || 48;
    let content = "";

    // Helper functions
    const center = (text: string): string => {
      const spaces = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(spaces) + text + "\n";
    };

    const leftRight = (left: string, right: string): string => {
      const spaces = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(spaces) + right + "\n";
    };

    const line = (char: string = "-"): string => {
      return char.repeat(width) + "\n";
    };

    // Header
    content += ESC + "a\x01"; // Center align
    content += ESC + "!\x10"; // Double height
    content += center(BRANDING.SYSTEM_NAME);
    content += ESC + "!\x00"; // Normal size
    content += center(RESTAURANT_NAME);
    content += center(`TIN: ${BIR_CONFIG.TIN}`);
    if (BIR_CONFIG.BUSINESS_ADDRESS !== "[YOUR_BUSINESS_ADDRESS_HERE]") {
      content += center(BIR_CONFIG.BUSINESS_ADDRESS);
    }
    content += "\n";
    content += line();

    // Receipt info
    content += ESC + "a\x00"; // Left align
    const invoiceNum =
      (transaction as any).officialInvoiceNumber ||
      transaction.id.substring(0, 8);
    content += `Invoice #: ${invoiceNum}\n`;
    content += `Receipt #: ${transaction.id}\n`;
    content += `Date: ${new Date(transaction.timestamp).toLocaleString("en-PH")}\n`;

    if (employee) content += `Cashier: ${employee.name}\n`;
    if (customer) content += `Customer: ${customer.name}\n`;
    if (table) content += `Table: ${table.number}\n`;
    if (transaction.orderType) {
      content += `Order Type: ${transaction.orderType.replace("_", " ")}\n`;
    }

    content += line();

    // Items
    content += ESC + "!\x08"; // Emphasized
    content += "ITEMS:\n";
    content += ESC + "!\x00"; // Normal

    transaction.items.forEach((item) => {
      const unitPrice = item.price;
      const lineTotal = item.price * item.quantity;
      const nameParts = item.name.split(" - ");
      const baseName = nameParts[0];
      const variantName =
        nameParts.length > 1 ? nameParts.slice(1).join(" - ") : null;

      // Item name and total
      content += ESC + "!\x00"; // Normal text
      const itemName = baseName + (variantName ? ` - ${variantName}` : "");
      const itemTotal = `₱${Math.round(lineTotal).toLocaleString()}`;

      if (itemName.length + itemTotal.length + 1 <= width) {
        content += leftRight(itemName, itemTotal);
      } else {
        content += itemName + "\n";
        content += leftRight("", itemTotal);
      }

      // Quantity and unit price
      content += `  ${item.quantity} x ₱${Math.round(unitPrice).toLocaleString()}\n`;

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach((modifier) => {
          const modText = `  + ${modifier.modifierName}`;
          const modPrice =
            modifier.price > 0
              ? `₱${Math.round(modifier.price).toLocaleString()}`
              : "";
          if (modPrice) {
            content += leftRight(modText, modPrice);
          } else {
            content += modText + "\n";
          }
        });
      }

      // Special instructions
      if (item.specialInstructions) {
        content += `  Note: ${item.specialInstructions}\n`;
      }

      content += "\n";
    });

    content += line();

    // Totals
    content += leftRight(
      "Subtotal:",
      `₱${Math.round(transaction.subtotal).toLocaleString()}`,
    );

    if (transaction.discountTotal > 0) {
      const discountLabel =
        transaction.discountType === "PWD"
          ? "PWD Discount (20%):"
          : transaction.discountType === "SENIOR_CITIZEN"
            ? "Senior Discount (20%):"
            : "Discount:";
      content += leftRight(
        discountLabel,
        `-₱${Math.round(transaction.discountTotal).toLocaleString()}`,
      );
    }

    if (transaction.tax > 0) {
      content += leftRight(
        "VAT (12%):",
        `₱${Math.round(transaction.tax).toLocaleString()}`,
      );
    }

    if (transaction.serviceCharge > 0) {
      content += leftRight(
        "Service Charge (10%):",
        `₱${Math.round(transaction.serviceCharge).toLocaleString()}`,
      );
    }

    if (transaction.tip > 0) {
      content += leftRight(
        "Tip:",
        `₱${Math.round(transaction.tip).toLocaleString()}`,
      );
    }

    content += line();
    content += ESC + "!\x18"; // Double width and height
    content += leftRight(
      "TOTAL:",
      `₱${Math.round(transaction.totalAmount).toLocaleString()}`,
    );
    content += ESC + "!\x00"; // Normal
    content += line();

    // Payments
    content += ESC + "!\x08"; // Emphasized
    content += "PAYMENT:\n";
    content += ESC + "!\x00"; // Normal

    transaction.payments.forEach((payment) => {
      const method = this.formatPaymentMethod(payment.method);
      content += leftRight(
        `${method}:`,
        `₱${Math.round(payment.amount).toLocaleString()}`,
      );
    });

    // Calculate change
    const totalPaid = transaction.payments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const change = totalPaid - transaction.totalAmount;
    if (change > 0) {
      content += line("-");
      content += leftRight(
        "Change:",
        `₱${Math.round(change).toLocaleString()}`,
      );
    }

    content += "\n";
    content += line();

    // Footer
    content += ESC + "a\x01"; // Center align
    content += ESC + "!\x08"; // Emphasized
    content += center("Thank you for your business!");
    content += ESC + "!\x00"; // Normal
    content += center("Visit us again soon!");
    content += "\n";

    // BIR compliance notice
    if (!BIR_CONFIG.HAS_PTU) {
      content += center("⚠️ THIS IS NOT AN OFFICIAL RECEIPT");
      content += center("Official Receipt will be issued");
      content += center("upon BIR PTU approval");
    } else if (BIR_CONFIG.PTU_NUMBER) {
      content += center("✓ Official Receipt");
      content += center(`PTU No: ${BIR_CONFIG.PTU_NUMBER}`);
    }

    content += "\n";
    content += center(`${new Date().toLocaleDateString("en-PH")}`);
    content += "\n\n\n"; // Extra paper for tearing

    return content;
  }

  private formatPaymentMethod(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return "Cash";
      case PaymentMethod.CREDIT_CARD:
        return "Credit Card";
      case PaymentMethod.DEBIT_CARD:
        return "Debit Card";
      case PaymentMethod.GCASH:
        return "GCash";
      case PaymentMethod.PAYMAYA:
        return "PayMaya";
      default:
        return String(method).replace(/_/g, " ");
    }
  }

  async print(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table,
  ): Promise<void> {
    try {
      const content = this.generateReceiptContent(
        transaction,
        employee,
        customer,
        table,
      );
      const escPosData = this.createEscPosCommands(content);

      switch (this.config.connectionType) {
        case "usb":
          await this.printViaUSB(escPosData);
          break;
        case "serial":
          await this.printViaSerial(escPosData);
          break;
        case "network":
          await this.printViaNetwork(escPosData);
          break;
        case "local-server":
          await this.printViaLocalServer(escPosData);
          break;
        case "file-drop":
          await this.printViaFileDrop(escPosData, content);
          break;
        case "windows-driver":
          await this.printViaWindowsDriver(content);
          break;
        case "browser":
        default:
          await this.printViaBrowser(content);
          break;
      }
    } catch (error) {

      throw new Error(
        `Failed to print receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async printViaUSB(data: Uint8Array): Promise<void> {
    if (!navigator.usb) {
      throw new Error("WebUSB is not supported in this browser. Please use Chrome or Edge.");
    }

    let device: USBDevice | null = null;
    
    try {
      // Request device access
      device = await navigator.usb.requestDevice({
        filters:
          this.config.usbVendorId && this.config.usbProductId
            ? [
                {
                  vendorId: this.config.usbVendorId,
                  productId: this.config.usbProductId,
                },
              ]
            : [], // Empty filters show all USB devices
      });

      // Open device
      await device.open();

      // Get device configuration
      if (!device.configuration) {
        await device.selectConfiguration(1);
      }

      // Claim interface 0
      await device.claimInterface(0);

      // Find the OUT endpoint
      const interface0 = device.configuration?.interfaces[0];
      if (!interface0) {
        throw new Error('No USB interface found');
      }

      const alternate = interface0.alternates[0];
      if (!alternate) {
        throw new Error('No USB alternate interface found');
      }

      const endpoint = alternate.endpoints.find((e) => e.direction === "out");
      if (!endpoint) {
        throw new Error("No OUT endpoint found. This device may not support printing.");
      }

      // Split large data into chunks (some printers have transfer limits)
      const chunkSize = 64; // Common USB packet size
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await device.transferOut(endpoint.endpointNumber, chunk);
        
        if (result.status !== 'ok') {
          throw new Error(`USB transfer failed with status: ${result.status}`);
        }
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 10));
      }

    } catch (error) {
      
      if (error instanceof Error) {
        if (error.message.includes('No device selected')) {
          throw new Error('No printer was selected. Please select your thermal printer from the list.');
        } else if (error.message.includes('Access denied') || error.name === 'SecurityError') {
          // Specific guidance for access denied errors
          throw new Error(
            `USB Access Denied - Your printer is likely controlled by Windows drivers.\n\n` +
            `Solutions:\n` +
            `1. Go to Device Manager → Printers → Right-click your printer → Uninstall device\n` +
            `2. Try using Serial connection instead (works with most USB thermal printers)\n` +
            `3. Or use Network connection if your printer supports WiFi/Ethernet\n` +
            `4. Restart browser after uninstalling the Windows driver`
          );
        } else if (error.message.includes('Device unavailable')) {
          throw new Error('USB printer is unavailable. Please check if it\'s connected and powered on.');
        } else if (error.message.includes('The device was disconnected')) {
          throw new Error('USB printer was disconnected during printing. Please check the USB connection.');
        } else if (error.message.includes('NetworkError') || error.message.includes('NotFoundError')) {
          throw new Error(
            `Device communication failed. This often happens when:\n` +
            `1. Windows has claimed the device with its own driver\n` +
            `2. Another application is using the printer\n` +
            `3. The printer needs to be power-cycled\n\n` +
            `Try using Serial connection instead - it works with most USB thermal printers.`
          );
        }
      }
      
      throw new Error(
        `USB printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // Always try to close the device
      if (device) {
        try {
          await device.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
    }
  }

  private async printViaSerial(data: Uint8Array): Promise<void> {
    if (!navigator.serial) {
      throw new Error("Web Serial API is not supported in this browser. Please use Chrome or Edge.");
    }

    let port: SerialPort | null = null;

    try {
      port = await navigator.serial.requestPort();
      await port.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      const writer = port.writable?.getWriter();
      if (!writer) {
        throw new Error("Cannot get serial port writer");
      }

      await writer.write(data);
      writer.releaseLock();
      await port.close();
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('No port selected') || error.name === 'NotFoundError') {
          throw new Error(
            `No serial device found. This usually means:\n\n` +
            `1. Your USB thermal printer doesn't support serial communication\n` +
            `2. You need a USB-to-Serial driver/adapter\n` +
            `3. Try these solutions:\n\n` +
            `• Install the manufacturer's driver for your printer\n` +
            `• Use Network connection if your printer has WiFi\n` +
            `• Use Browser fallback printing\n` +
            `• Check if your printer has a "USB Virtual Serial" mode`
          );
        } else if (error.message.includes('Access denied')) {
          throw new Error('Access denied to serial port. Please close other applications using this port.');
        } else if (error.message.includes('Device busy') || error.message.includes('Resource busy')) {
          throw new Error('Serial port is busy. Please close other applications and try again.');
        }
      }
      
      throw new Error(
        `Serial printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (port) {
        try {
          await port.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
    }
  }

  private async printViaNetwork(data: Uint8Array): Promise<void> {
    if (!this.config.networkUrl) {
      throw new Error("Network URL not configured");
    }

    try {
      const response = await fetch(this.config.networkUrl, {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Network request failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Network printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async printViaBrowser(content: string): Promise<void> {
    // Fallback to browser printing with thermal printer styling
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Please allow popups to print receipt");
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              @page { 
                size: 80mm auto; 
                margin: 0; 
              }
              body { 
                margin: 0; 
                padding: 5mm; 
              }
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              width: 80mm;
              color: #000;
              background: #fff;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              margin: 0;
              font-family: inherit;
              font-size: inherit;
            }
          </style>
        </head>
        <body>
          <pre>${content.replace(/\x1B[^m]*m/g, "").replace(/\x1B./g, "")}</pre>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  // Local print server method - bypasses browser USB restrictions
  private async printViaLocalServer(data: Uint8Array): Promise<void> {
    const url = this.config.localServerUrl || 'http://localhost:3001/print';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Printer-Type': 'thermal'
        }
      });

      if (!response.ok) {
        throw new Error(`Local server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to local print server at ${url}.\n\n` +
          `Setup instructions:\n` +
          `1. Download our print server from GitHub\n` +
          `2. Run: npm install && npm start\n` +
          `3. Configure your printer in the server settings\n` +
          `4. Or change the URL to your custom print server`
        );
      }
      throw new Error(`Local server printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // File drop method - saves print jobs to a folder that a service monitors
  private async printViaFileDrop(data: Uint8Array, textContent: string): Promise<void> {
    try {
      const timestamp = new Date().getTime();
      const filename = `thermal-receipt-${timestamp}.pos`;
      
      const printData = {
        escpos: Array.from(data),
        text: textContent,
        timestamp: new Date().toISOString(),
        printer: 'thermal'
      };
      
      const blob = new Blob([JSON.stringify(printData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      throw new Error(
        `Print file saved as ${filename}.\n\n` +
        `Setup a file watcher service to monitor your Downloads folder and automatically print .pos files to your thermal printer.\n\n` +
        `Or manually copy the file to your printer's monitoring folder.`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Print file saved')) {
        throw error;
      }
      throw new Error(`File drop printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Windows driver method - uses regular browser printing with thermal formatting
  private async printViaWindowsDriver(content: string): Promise<void> {
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        throw new Error('Please allow popups for Windows driver printing');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Thermal Receipt</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 2mm;
                  font-family: 'Courier New', monospace;
                  font-size: 10px;
                  line-height: 1.2;
                }
                .no-print { display: none !important; }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 10px;
                line-height: 1.2;
                width: 80mm;
                margin: 0;
                padding: 10px;
                background: white;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
                font-family: inherit;
                font-size: inherit;
              }
              .instructions {
                background: #f0f8ff;
                border: 1px solid #0066cc;
                padding: 10px;
                margin-bottom: 20px;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="instructions no-print">
              <h3>Windows Driver Printing</h3>
              <p><strong>Instructions:</strong></p>
              <ol>
                <li>Click Print below</li>
                <li>Select your thermal printer (should appear as installed printer)</li>
                <li>Make sure paper size is set to 80mm or custom size</li>
                <li>Print!</li>
              </ol>
              <button onclick="window.print();" style="padding: 10px 20px; font-size: 14px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Receipt</button>
              <button onclick="window.close();" style="padding: 10px 20px; font-size: 14px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
            <pre>${content.replace(/\x1B[^m]*m/g, '').replace(/\x1B./g, '')}</pre>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Don't auto-print, let user choose when ready
      
    } catch (error) {
      throw new Error(`Windows driver printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test printer connection
  async testConnection(): Promise<boolean> {
    try {
      const testContent = 
        "\n*** PRINTER TEST ***\n" +
        "Connection: " + this.config.connectionType.toUpperCase() + "\n" +
        "Time: " + new Date().toLocaleString() + "\n" +
        "Status: OK\n" +
        "\n\nIf you see this, your thermal\n" +
        "printer is working correctly!\n\n" +
        "*** END TEST ***\n\n\n";

      const escPosData = this.createEscPosCommands(testContent);

      switch (this.config.connectionType) {
        case "usb":
          await this.printViaUSB(escPosData);
          break;
        case "serial":
          await this.printViaSerial(escPosData);
          break;
        case "network":
          await this.printViaNetwork(escPosData);
          break;
        case "local-server":
          await this.printViaLocalServer(escPosData);
          break;
        case "file-drop":
          await this.printViaFileDrop(escPosData, testContent);
          break;
        case "windows-driver":
          await this.printViaWindowsDriver(testContent);
          break;
        case "browser":
        default:
          await this.printViaBrowser(testContent);
          break;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Default printer configurations for common thermal printers
export const COMMON_PRINTER_CONFIGS = {
  // Generic ESC/POS USB printer
  usb_generic: {
    connectionType: "usb" as const,
    paperWidth: 48,
  },

  // Generic ESC/POS Serial printer
  serial_generic: {
    connectionType: "serial" as const,
    paperWidth: 48,
  },

  // Network printer (most common for thermal printers)
  network_generic: {
    connectionType: "network" as const,
    networkUrl: "http://192.168.1.100:9100", // Change to your printer's IP
    paperWidth: 48,
  },

  // Local print server (bypasses browser restrictions)
  local_server: {
    connectionType: "local-server" as const,
    localServerUrl: "http://localhost:3001/print",
    paperWidth: 48,
  },

  // File drop method
  file_drop: {
    connectionType: "file-drop" as const,
    paperWidth: 48,
  },

  // Windows driver method (works with installed printer drivers)
  windows_driver: {
    connectionType: "windows-driver" as const,
    paperWidth: 48,
  },

  // Browser fallback
  browser: {
    connectionType: "browser" as const,
    paperWidth: 48,
  },
};
