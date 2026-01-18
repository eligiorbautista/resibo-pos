import {
  Transaction,
  Employee,
  Customer,
  Table,
  PaymentMethod,
} from "../types";
import { RESTAURANT_NAME, BIR_CONFIG, BRANDING } from "../constants";
import { loadLogoCommands } from "../utils/imageProcessing";

// ESC/POS Commands
const ESC = "\x1B";
const GS = "\x1D";

export interface PrinterConfig {
  connectionType: "bluetooth";
  bluetoothServiceUuid?: string;
  bluetoothCharacteristicUuid?: string;
  bluetoothDeviceName?: string;
  paperWidth?: number; // Default 32 chars for 58mm paper
}

// Common Bluetooth thermal printer configurations
export const BLUETOOTH_PRINTER_CONFIGS = {
  EPSON_TM_P20_BT: {
    bluetoothServiceUuid: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    bluetoothCharacteristicUuid: "49535343-1e4d-4bd9-ba61-23c647249616",
    bluetoothDeviceName: "TM-P20",
  },
  STAR_SM_L200_BT: {
    bluetoothServiceUuid: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    bluetoothCharacteristicUuid: "49535343-1e4d-4bd9-ba61-23c647249616",
    bluetoothDeviceName: "Star Micronics",
  },
  GENERIC_BT_PRINTER: {
    bluetoothServiceUuid: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    bluetoothCharacteristicUuid: "49535343-1e4d-4bd9-ba61-23c647249616",
  },
};

// For backward compatibility
export const COMMON_PRINTER_CONFIGS = BLUETOOTH_PRINTER_CONFIGS;

export class ThermalPrinterService {
  private config: PrinterConfig;
  private encoder = new TextEncoder();
  private logoCommands: Uint8Array | null = null;
  private logoLoadAttempted: boolean = false;
  private static readonly SAVED_DEVICE_KEY = 'thermal_printer_device_id';

  constructor(config: PrinterConfig) {
    this.config = {
      paperWidth: 32,
      ...config,
    };
  }

  /**
   * Save printer device ID to localStorage for automatic reconnection
   */
  private static savePrinterDevice(deviceId: string): void {
    try {
      localStorage.setItem(ThermalPrinterService.SAVED_DEVICE_KEY, deviceId);
      console.log('✅ Saved printer device ID:', deviceId);
    } catch (error) {
      console.warn('Failed to save printer device:', error);
    }
  }

  /**
   * Get saved printer device ID from localStorage
   */
  private static getSavedDeviceId(): string | null {
    try {
      return localStorage.getItem(ThermalPrinterService.SAVED_DEVICE_KEY);
    } catch (error) {
      console.warn('Failed to get saved printer device:', error);
      return null;
    }
  }

  /**
   * Clear saved printer device (force re-pairing)
   */
  static forgetPrinter(): void {
    try {
      localStorage.removeItem(ThermalPrinterService.SAVED_DEVICE_KEY);
      console.log('🗑️ Forgot saved printer device');
    } catch (error) {
      console.warn('Failed to forget printer device:', error);
    }
  }

  /**
   * Initialize logo for printing (async, only done once)
   */
  private async initializeLogo(): Promise<void> {
    if (this.logoLoadAttempted) return;
    
    this.logoLoadAttempted = true;
    
    try {
      console.log("📷 Loading logo for thermal printer...");
      // Add timestamp to bypass browser cache
      const cacheBuster = `?v=${Date.now()}`;
      this.logoCommands = await loadLogoCommands(`/logos/restaurant-logo.png${cacheBuster}`, 200);
      console.log("✅ Logo loaded successfully", this.logoCommands.length, "bytes");
    } catch (error) {
      console.warn("⚠️ Failed to load logo, will use text fallback:", error);
      this.logoCommands = null;
    }
  }

  /**
   * Create ESC/POS command sequence for thermal printer
   */
  private createEscPosCommands(content: string): Uint8Array {
    const commands: number[] = [];

    // Initialize printer
    commands.push(...Array.from(this.encoder.encode(ESC + "@"))); // Reset printer
    commands.push(...Array.from(this.encoder.encode(ESC + "t\x00"))); // Character code table
    commands.push(...Array.from(this.encoder.encode(ESC + "R\x00"))); // International chars
    commands.push(...Array.from(this.encoder.encode(ESC + "!\x00"))); // Reset text formatting
    commands.push(...Array.from(this.encoder.encode(ESC + "a\x00"))); // Left align

    // Add logo if available
    if (this.logoCommands) {
      // Center align for logo
      commands.push(...Array.from(this.encoder.encode(ESC + "a\x01")));
      
      // Add logo bitmap
      commands.push(...Array.from(this.logoCommands));
      
      // Add spacing after logo
      commands.push(...Array.from(this.encoder.encode("\n")));
      
      // Reset to left align
      commands.push(...Array.from(this.encoder.encode(ESC + "a\x00")));
    }

    // Add the receipt content
    commands.push(...Array.from(this.encoder.encode(content)));

    // Cut paper and eject
    commands.push(...Array.from(this.encoder.encode("\n\n\n"))); // Feed paper
    commands.push(...Array.from(this.encoder.encode(GS + "V\x00"))); // Cut paper

    return new Uint8Array(commands);
  }

  /**
   * Format text for thermal printer with proper line breaks
   */
  private formatText(
    text: string,
    alignment: "left" | "center" | "right" = "left",
  ): string {
    const lines = text.split("\n");
    const paperWidth = this.config.paperWidth || 32;

    return lines
      .map((line) => {
        if (line.length <= paperWidth) {
          switch (alignment) {
            case "center":
              return line
                .padStart((paperWidth + line.length) / 2)
                .padEnd(paperWidth);
            case "right":
              return line.padStart(paperWidth);
            default:
              return line;
          }
        }
        // Word wrap for long lines
        const words = line.split(" ");
        const wrappedLines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          if ((currentLine + word).length <= paperWidth) {
            currentLine += (currentLine ? " " : "") + word;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) wrappedLines.push(currentLine);
        return wrappedLines.join("\n");
      })
      .join("\n");
  }

  /**
   * Format receipt content
   */
  private formatReceipt(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table,
  ): string {
    const separator = "=".repeat(this.config.paperWidth || 32);
    const lightSeparator = "-".repeat(this.config.paperWidth || 32);
    const date = new Date(transaction.timestamp).toLocaleString();
    const receiptNumber = `${transaction.id}`;

    let receipt = "";

    // ==== HEADER ====
    receipt += "\n";
    
    // Logo will be added as bitmap during ESC/POS command generation
    // If no logo, use text fallback
    if (!this.logoCommands) {
      receipt += this.formatText(RESTAURANT_NAME, "center") + "\n";
    }
    
    receipt += this.formatText(BIR_CONFIG.BUSINESS_ADDRESS, "center") + "\n";
    receipt += this.formatText(`TIN: ${BIR_CONFIG.TIN}`, "center") + "\n";
    receipt += separator + "\n";
    receipt += "\n";

    // ==== RECEIPT INFO ====
    receipt += this.formatText(`Receipt: ${receiptNumber}`) + "\n";
    receipt += this.formatText(`Date: ${date}`) + "\n";
    if (employee) {
      receipt += this.formatText(`Cashier: ${employee.name}`) + "\n";
    }
    if (table) {
      receipt += this.formatText(`Table: ${table.number}`) + "\n";
    }
    if (customer) {
      receipt += this.formatText(`Customer: ${customer.name}`) + "\n";
    }
    receipt += lightSeparator + "\n";
    receipt += "\n";

    // ==== ITEMS ====
    for (const item of transaction.items) {
      const itemName = `${item.name}`;
      const qtyPrice = `${item.quantity} x P${item.price.toFixed(2)}`;
      const total = `P${(Number(item.price) * item.quantity).toFixed(2)}`;
      
      // Item name
      receipt += this.formatText(itemName) + "\n";
      
      // Quantity x Price ... Total (right aligned)
      const spacing = (this.config.paperWidth || 32) - qtyPrice.length - total.length;
      receipt += this.formatText(`${qtyPrice}${" ".repeat(Math.max(1, spacing))}${total}`) + "\n";

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          receipt += this.formatText(`  + ${modifier.modifierName}`) + "\n";
        }
      }
      receipt += "\n";
    }

    receipt += lightSeparator + "\n";

    // ==== TOTALS ====
    const formatTotal = (label: string, amount: number) => {
      const amountStr = `P${amount.toFixed(2)}`;
      const spacing = (this.config.paperWidth || 32) - label.length - amountStr.length;
      return this.formatText(`${label}${" ".repeat(Math.max(1, spacing))}${amountStr}`) + "\n";
    };

    receipt += formatTotal("Subtotal:", transaction.subtotal);

    if (transaction.discountTotal && Number(transaction.discountTotal) > 0) {
      receipt += formatTotal("Discount:", -Number(transaction.discountTotal));
    }

    if (transaction.serviceCharge && Number(transaction.serviceCharge) > 0) {
      receipt += formatTotal("Service Charge:", Number(transaction.serviceCharge));
    }

    if (transaction.tax && Number(transaction.tax) > 0) {
      receipt += formatTotal("VAT (12%):", Number(transaction.tax));
    }

    receipt += separator + "\n";
    
    // GRAND TOTAL - emphasized
    receipt += formatTotal("TOTAL:", transaction.totalAmount);
    receipt += separator + "\n";
    receipt += "\n";

    // ==== PAYMENT ====
    if (transaction.payments && transaction.payments.length > 0) {
      // Check if this is a pending payment (before confirmation)
      const isPending = 
        transaction.notes?.includes("PENDING") || 
        transaction.status === "PENDING" ||
        transaction.id.startsWith("PENDING-");

      if (isPending) {
        receipt += this.formatText("*** PAYMENT PENDING ***", "center") + "\n";
        receipt += this.formatText("Customer has not paid yet", "center") + "\n";
        receipt += lightSeparator + "\n";
      }

      for (const payment of transaction.payments) {
        const paymentMethod = this.formatPaymentMethod(payment.method);
        receipt += formatTotal(paymentMethod + ":", Number(payment.amount));
      }

      const totalPaid = transaction.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const change = totalPaid - transaction.totalAmount;
      if (change > 0) {
        receipt += "\n";
        receipt += formatTotal("CHANGE:", change);
      }
      receipt += "\n";
    }

    receipt += lightSeparator + "\n";

    // ==== FOOTER ====
    receipt += "\n";
    receipt += this.formatText("Thank you for your business!", "center") + "\n";
    receipt += this.formatText("Please come again!", "center") + "\n";
    receipt += "\n";
    receipt += this.formatText(RESTAURANT_NAME, "center") + "\n";
    receipt += "\n\n\n";

    return receipt;
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return "Cash";
      // case PaymentMethod.CARD:
      //   return "Card";
      case PaymentMethod.GCASH:
        return "GCash";
      case PaymentMethod.PAYMAYA:
        return "PayMaya";
      default:
        return String(method).replace(/_/g, " ");
    }
  }

  /**
   * Main print method - Bluetooth only
   */
  async print(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table,
  ): Promise<void> {
    // Initialize logo if not yet attempted
    await this.initializeLogo();
    
    const content = this.formatReceipt(transaction, employee, customer, table);
    const escPosData = this.createEscPosCommands(content);

    try {
      await this.printViaBluetooth(escPosData);
    } catch (error) {
      throw new Error(
        `Failed to print receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Bluetooth printing - Enhanced with better debugging and compatibility
   */
  private async printViaBluetooth(data: Uint8Array): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is not supported. Please use Chrome, Edge, or another Chromium-based browser with Bluetooth support.",
      );
    }

    let device: BluetoothDevice | null = null;
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    try {
      console.log("🖨️ Starting Bluetooth print process...");
      console.log(`📄 Data size: ${data.length} bytes`);

      // Common service UUIDs for thermal printers
      const commonServiceUuids = [
        "49535343-fe7d-4ae5-8fa9-9fafd205e455", // HiTi/Generic SPP
        "0000ffe0-0000-1000-8000-00805f9b34fb", // Generic UART
        "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
        "0000180f-0000-1000-8000-00805f9b34fb", // Battery Service
      ];

      // Try to reconnect to saved device first
      const savedDeviceId = ThermalPrinterService.getSavedDeviceId();
      if (savedDeviceId) {
        console.log("🔄 Attempting to reconnect to saved printer...", savedDeviceId);
        try {
          // Get previously paired devices (newer Web Bluetooth API)
          const bluetooth = navigator.bluetooth as any;
          if (bluetooth.getDevices) {
            const devices = await bluetooth.getDevices();
            device = devices.find((d: BluetoothDevice) => d.id === savedDeviceId) || null;
            
            if (device) {
              console.log(`✅ Found saved device: ${device.name || device.id}`);
            } else {
              console.log("⚠️ Saved device not found in paired devices");
            }
          } else {
            console.log("⚠️ getDevices() API not available, will request device");
          }
        } catch (error) {
          console.log("⚠️ Could not access paired devices:", error);
        }
      }

      // If no saved device or reconnection failed, request new device
      if (!device) {
        const requestOptions: RequestDeviceOptions = {
          acceptAllDevices: true,
          optionalServices: [
            ...commonServiceUuids,
            ...(this.config.bluetoothServiceUuid
              ? [this.config.bluetoothServiceUuid]
              : []),
          ],
        };

        console.log("📱 Requesting Bluetooth device...");
        device = await navigator.bluetooth.requestDevice(requestOptions);
        
        // Save the newly selected device
        ThermalPrinterService.savePrinterDevice(device.id);
      }
      console.log(`✅ Device selected: ${device.name || device.id}`);

      if (!device.gatt) {
        throw new Error("GATT server not available on selected device");
      }

      console.log("🔌 Connecting to GATT server...");
      const server = await device.gatt.connect();
      console.log("✅ Connected to GATT server");

      // Try to find the correct service
      let service: BluetoothRemoteGATTService | null = null;
      const servicesToTry = this.config.bluetoothServiceUuid
        ? [this.config.bluetoothServiceUuid, ...commonServiceUuids]
        : commonServiceUuids;

      console.log(`🔍 Searching for printer service from ${servicesToTry.length} possible UUIDs...`);
      for (const uuid of servicesToTry) {
        try {
          console.log(`  Trying service UUID: ${uuid}`);
          service = await server.getPrimaryService(uuid);
          console.log(`  ✅ Found service: ${uuid}`);
          break;
        } catch (serviceError) {
          console.log(`  ❌ Service ${uuid} not found`);
        }
      }

      if (!service) {
        console.error("❌ No compatible service found on printer");
        throw new Error(
          "Could not find compatible service on the printer. Make sure the printer supports SPP (Serial Port Profile).",
        );
      }

      // Try to find the WRITABLE characteristic
      // Many printers have multiple characteristics - we need the one with write permission
      const commonCharacteristicUuids = [
        "49535343-8841-43f4-a8d4-ecbe34729bb3", // HiTi/Generic WRITE characteristic
        "49535343-1e4d-4bd9-ba61-23c647249616", // HiTi/Generic (might be read)
        "0000ffe1-0000-1000-8000-00805f9b34fb", // Generic UART TX
        "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART TX
      ];

      const characteristicsToTry = this.config.bluetoothCharacteristicUuid
        ? [
            this.config.bluetoothCharacteristicUuid,
            ...commonCharacteristicUuids,
          ]
        : commonCharacteristicUuids;

      console.log(`🔍 Searching for WRITABLE characteristic from ${characteristicsToTry.length} possible UUIDs...`);
      
      // First, try to get ALL characteristics and find a writable one
      try {
        const allCharacteristics = await (service as any).getCharacteristics();
        console.log(`📋 Found ${allCharacteristics.length} total characteristics on service`);
        
        for (const char of allCharacteristics) {
          const props = (char as any).properties;
          const hasWrite = props.write || props.writeWithoutResponse;
          console.log(`  Characteristic ${char.uuid}:`);
          console.log(`    - write: ${props.write}`);
          console.log(`    - writeWithoutResponse: ${props.writeWithoutResponse}`);
          console.log(`    - read: ${props.read}`);
          console.log(`    - notify: ${props.notify}`);
          
          if (hasWrite) {
            characteristic = char;
            console.log(`  ✅ Found WRITABLE characteristic: ${char.uuid}`);
            break;
          }
        }
      } catch (error) {
        console.log("⚠️ Could not enumerate all characteristics, trying individual UUIDs...");
        
        // Fallback: Try specific UUIDs
        for (const uuid of characteristicsToTry) {
          try {
            console.log(`  Trying characteristic UUID: ${uuid}`);
            const char = await service.getCharacteristic(uuid);
            
            // Check if this characteristic has write permission
            const props = (char as any).properties;
            const hasWrite = props.write || props.writeWithoutResponse;
            console.log(`    Properties - write: ${props.write}, writeWithoutResponse: ${props.writeWithoutResponse}`);
            
            if (hasWrite) {
              characteristic = char;
              console.log(`  ✅ Found WRITABLE characteristic: ${uuid}`);
              break;
            } else {
              console.log(`  ⚠️ Characteristic ${uuid} found but NOT writable (likely a read/notify characteristic)`);
            }
          } catch (charError) {
            console.log(`  ❌ Characteristic ${uuid} not found`);
          }
        }
      }

      if (!characteristic) {
        console.error("❌ No WRITABLE characteristic found on printer");
        console.error("💡 The printer may use different UUIDs. Try checking your printer's documentation.");
        throw new Error(
          "Could not find writable characteristic on the printer. The service was found but no characteristic with write permission was available.",
        );
      }

      console.log("📤 Sending print data to printer...");

      // Use smaller chunk size for better BLE compatibility
      // Most BLE devices have MTU of 20-23 bytes, so we'll use 20 to be safe
      const chunkSize = 20;
      const totalChunks = Math.ceil(data.length / chunkSize);
      console.log(`📦 Splitting data into ${totalChunks} chunks of ${chunkSize} bytes each`);

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const chunkNum = Math.floor(i / chunkSize) + 1;
        
        try {
          // Use writeValueWithResponse for confirmation (slower but more reliable)
          await characteristic.writeValue(chunk);
          console.log(`  ✓ Sent chunk ${chunkNum}/${totalChunks} (${chunk.length} bytes)`);
        } catch (writeError) {
          console.error(`  ❌ Failed to send chunk ${chunkNum}:`, writeError);
          throw new Error(`Failed to send data chunk ${chunkNum}: ${writeError}`);
        }

        // Increased delay between chunks to allow printer buffer to process
        // This is crucial for thermal printers which may have small buffers
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      console.log("✅ All data sent successfully");

      // Wait for printer to process and print
      console.log("⏳ Waiting for printer to process...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("User cancelled") ||
          error.name === "NotFoundError"
        ) {
          throw new Error("No printer selected or printer not found");
        } else if (error.name === "NotSupportedError") {
          throw new Error("Bluetooth printing is not supported on this device");
        } else if (error.name === "NetworkError") {
          throw new Error(
            "Failed to connect to printer. Make sure the printer is turned on and paired with your device.",
          );
        } else {
          console.error("Bluetooth printing error:", error);
          throw new Error(`Bluetooth printing failed: ${error.message}`);
        }
      }
      throw error;
    } finally {
      // Clean up connection
      if (device?.gatt?.connected) {
        try {
          device.gatt.disconnect();
          console.log("Disconnected from printer");
        } catch (disconnectError) {
          console.warn("Error disconnecting from printer:", disconnectError);
        }
      }
    }
  }

  /**
   * Test connection to printer without printing
   */
  async testConnection(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is not supported. Please use Chrome, Edge, or another Chromium-based browser with Bluetooth support.",
      );
    }

    let device: BluetoothDevice | null = null;

    try {
      // Common service UUIDs for thermal printers
      const commonServiceUuids = [
        "49535343-fe7d-4ae5-8fa9-9fafd205e455", // HiTi/Generic SPP
        "0000ffe0-0000-1000-8000-00805f9b34fb", // Generic UART
        "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART
        "0000180f-0000-1000-8000-00805f9b34fb", // Battery Service
      ];

      // Set up request options - accept all devices
      const requestOptions: RequestDeviceOptions = {
        acceptAllDevices: true,
        optionalServices: [
          ...commonServiceUuids,
          ...(this.config.bluetoothServiceUuid
            ? [this.config.bluetoothServiceUuid]
            : []),
        ],
      };

      console.log("Testing Bluetooth connection...");
      device = await navigator.bluetooth.requestDevice(requestOptions);
      console.log("Device selected:", device.name || device.id);

      if (!device.gatt) {
        throw new Error("GATT server not available on selected device");
      }

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();
      console.log("Connected to GATT server successfully");

      // Test if we can find a compatible service
      let serviceFound = false;
      const servicesToTry = this.config.bluetoothServiceUuid
        ? [this.config.bluetoothServiceUuid, ...commonServiceUuids]
        : commonServiceUuids;

      for (const uuid of servicesToTry) {
        try {
          console.log(`Testing service UUID: ${uuid}`);
          await server.getPrimaryService(uuid);
          console.log(`Service ${uuid} found - printer is compatible`);
          serviceFound = true;
          break;
        } catch (serviceError) {
          console.log(`Service ${uuid} not found, trying next...`);
        }
      }

      if (!serviceFound) {
        throw new Error(
          "Could not find compatible service on the printer. Make sure the printer supports SPP (Serial Port Profile).",
        );
      }

      console.log("✅ Connection test successful! Printer is ready to use.");
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("User cancelled") ||
          error.name === "NotFoundError"
        ) {
          throw new Error("No printer selected or printer not found");
        } else if (error.name === "NotSupportedError") {
          throw new Error("Bluetooth printing is not supported on this device");
        } else if (error.name === "NetworkError") {
          throw new Error(
            "Failed to connect to printer. Make sure the printer is turned on and paired with your device.",
          );
        } else {
          console.error("Bluetooth connection test error:", error);
          throw new Error(`Connection test failed: ${error.message}`);
        }
      }
      throw error;
    } finally {
      // Clean up connection
      if (device?.gatt?.connected) {
        try {
          device.gatt.disconnect();
          console.log("Disconnected from printer");
        } catch (disconnectError) {
          console.warn("Error disconnecting from printer:", disconnectError);
        }
      }
    }
  }

  /**
   * Simple test print with minimal ESC/POS commands
   * This helps diagnose if the printer can receive and process basic commands
   */
  async simpleTestPrint(): Promise<void> {
    console.log("🧪 Starting SIMPLE test print with minimal commands...");
    
    // Create very simple test data - just basic text and paper feed
    const testText = "TEST PRINT\nHello World!\n\n\n";
    
    // Minimal ESC/POS commands
    const commands: number[] = [];
    
    // Initialize printer (ESC @)
    commands.push(0x1B, 0x40);
    
    // Add test text
    commands.push(...Array.from(this.encoder.encode(testText)));
    
    // Feed and cut paper (GS V)
    commands.push(0x1D, 0x56, 0x00);
    
    const data = new Uint8Array(commands);
    console.log(`📄 Sending ${data.length} bytes of simple test data`);
    console.log("📝 Commands:", Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    try {
      await this.printViaBluetooth(data);
      console.log("✅ Simple test print completed - check if printer printed");
    } catch (error) {
      console.error("❌ Simple test print failed:", error);
      throw error;
    }
  }

  /**
   * Test print function
   */
  async testPrint(): Promise<void> {
    const testTransaction: Transaction = {
      id: "TEST-001",
      timestamp: new Date(),
      items: [
        {
          productId: "1",
          name: "Test Item",
          price: 10.0,
          quantity: 1,
          discount: 0,
        },
      ],
      subtotal: 10.0,
      totalAmount: 10.0,
      tax: 0,
      serviceCharge: 0,
      discountTotal: 0,
      tip: 0,
      payments: [],
      employeeId: "test-employee",
      orderType: "DINE_IN" as any,
      status: "COMPLETED" as any,
    };

    await this.print(testTransaction);
  }
}

// Export default configuration for easy setup
export const createBluetoothPrinter = (config: Partial<PrinterConfig> = {}) => {
  return new ThermalPrinterService({
    connectionType: "bluetooth",
    paperWidth: 32, // 58mm paper typically uses 32 characters
    ...config,
  });
};
