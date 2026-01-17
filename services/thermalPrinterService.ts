import {
  Transaction,
  Employee,
  Customer,
  Table,
  PaymentMethod,
} from "../types";
import { RESTAURANT_NAME, BIR_CONFIG, BRANDING } from "../constants";

// Web Bluetooth API Type Declarations
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(
      service: BluetoothServiceUUID,
    ): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID,
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
  }

  type BluetoothServiceUUID = number | string;
  type BluetoothCharacteristicUUID = number | string;
}

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

  constructor(config: PrinterConfig) {
    this.config = {
      paperWidth: 32,
      ...config,
    };
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
    const separator = "-".repeat(this.config.paperWidth || 32);
    const date = new Date(transaction.timestamp).toLocaleString();
    const receiptNumber = `OR# ${transaction.orNumber || transaction.id}`;

    let receipt = "";

    // Header
    receipt += this.formatText(RESTAURANT_NAME, "center") + "\n";
    receipt += this.formatText(BIR_CONFIG.address, "center") + "\n";
    receipt += this.formatText(`TIN: ${BIR_CONFIG.tin}`, "center") + "\n";
    receipt +=
      this.formatText(`AccredNo: ${BIR_CONFIG.accredNo}`, "center") + "\n";
    receipt += separator + "\n";

    // Transaction details
    receipt += this.formatText(`Date: ${date}`) + "\n";
    receipt += this.formatText(receiptNumber) + "\n";
    if (employee) {
      receipt += this.formatText(`Cashier: ${employee.name}`) + "\n";
    }
    if (table) {
      receipt += this.formatText(`Table: ${table.number}`) + "\n";
    }
    if (customer) {
      receipt += this.formatText(`Customer: ${customer.name}`) + "\n";
    }
    receipt += separator + "\n";

    // Items
    for (const item of transaction.items) {
      const itemLine = `${item.name} x${item.quantity}`;
      const price = `₱${item.price.toFixed(2)}`;
      const total = `₱${(Number(item.price) * item.quantity).toFixed(2)}`;

      receipt += this.formatText(itemLine) + "\n";
      receipt +=
        this.formatText(`${price} each${" ".repeat(20)}${total}`, "right") +
        "\n";

      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          receipt += this.formatText(`  + ${modifier.name}`) + "\n";
        }
      }
    }

    receipt += separator + "\n";

    // Totals
    receipt +=
      this.formatText(
        `Subtotal: ₱${transaction.subtotal.toFixed(2)}`,
        "right",
      ) + "\n";

    if (transaction.discountTotal && Number(transaction.discountTotal) > 0) {
      receipt +=
        this.formatText(
          `Discount: -₱${Number(transaction.discountTotal).toFixed(2)}`,
          "right",
        ) + "\n";
    }

    if (transaction.serviceCharge && Number(transaction.serviceCharge) > 0) {
      receipt +=
        this.formatText(
          `Service: ₱${Number(transaction.serviceCharge).toFixed(2)}`,
          "right",
        ) + "\n";
    }

    if (transaction.tax && Number(transaction.tax) > 0) {
      receipt +=
        this.formatText(
          `VAT (12%): ₱${Number(transaction.tax).toFixed(2)}`,
          "right",
        ) + "\n";
    }

    receipt +=
      this.formatText(`TOTAL: ₱${transaction.total.toFixed(2)}`, "right") +
      "\n";
    receipt += separator + "\n";

    // Payment
    if (transaction.payments && transaction.payments.length > 0) {
      for (const payment of transaction.payments) {
        const paymentMethod = this.formatPaymentMethod(payment.method);
        receipt +=
          this.formatText(
            `${paymentMethod}: ₱${Number(payment.amount).toFixed(2)}`,
            "right",
          ) + "\n";
      }

      const totalPaid = transaction.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const change = totalPaid - transaction.total;
      if (change > 0) {
        receipt +=
          this.formatText(`Change: ₱${change.toFixed(2)}`, "right") + "\n";
      }
    }

    receipt += separator + "\n";

    // Footer
    receipt += this.formatText(BRANDING.tagline, "center") + "\n";
    receipt += this.formatText("Thank you for your business!", "center") + "\n";
    receipt += this.formatText("Please come again!", "center") + "\n";

    return receipt;
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return "Cash";
      case PaymentMethod.CARD:
        return "Card";
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
   * Bluetooth printing - Improved for tablet compatibility
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

      console.log("Requesting Bluetooth device...");
      device = await navigator.bluetooth.requestDevice(requestOptions);
      console.log("Device selected:", device.name || device.id);

      if (!device.gatt) {
        throw new Error("GATT server not available on selected device");
      }

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();
      console.log("Connected to GATT server");

      // Try to find the correct service
      let service: BluetoothRemoteGATTService | null = null;
      const servicesToTry = this.config.bluetoothServiceUuid
        ? [this.config.bluetoothServiceUuid, ...commonServiceUuids]
        : commonServiceUuids;

      for (const uuid of servicesToTry) {
        try {
          console.log(`Trying service UUID: ${uuid}`);
          service = await server.getPrimaryService(uuid);
          console.log(`Found service: ${uuid}`);
          break;
        } catch (serviceError) {
          console.log(`Service ${uuid} not found, trying next...`);
        }
      }

      if (!service) {
        throw new Error(
          "Could not find compatible service on the printer. Make sure the printer supports SPP (Serial Port Profile).",
        );
      }

      // Try to find the correct characteristic
      const commonCharacteristicUuids = [
        "49535343-1e4d-4bd9-ba61-23c647249616", // HiTi/Generic
        "0000ffe1-0000-1000-8000-00805f9b34fb", // Generic UART TX
        "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART TX
      ];

      const characteristicsToTry = this.config.bluetoothCharacteristicUuid
        ? [
            this.config.bluetoothCharacteristicUuid,
            ...commonCharacteristicUuids,
          ]
        : commonCharacteristicUuids;

      for (const uuid of characteristicsToTry) {
        try {
          console.log(`Trying characteristic UUID: ${uuid}`);
          characteristic = await service.getCharacteristic(uuid);
          console.log(`Found characteristic: ${uuid}`);
          break;
        } catch (charError) {
          console.log(`Characteristic ${uuid} not found, trying next...`);
        }
      }

      if (!characteristic) {
        throw new Error(
          "Could not find compatible characteristic on the printer.",
        );
      }

      console.log("Sending print data...");

      // Send data in chunks optimized for tablets
      const chunkSize = 512; // Larger chunks for better performance
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        console.log(
          `Sent chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(data.length / chunkSize)}`,
        );

        // Minimal delay for better performance
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log("Print data sent successfully");

      // Wait for printer to process
      await new Promise((resolve) => setTimeout(resolve, 500));
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
   * Test print function
   */
  async testPrint(): Promise<void> {
    const testTransaction: Transaction = {
      id: "TEST-001",
      timestamp: new Date(),
      items: [
        {
          id: "1",
          name: "Test Item",
          price: 10.0,
          quantity: 1,
          categoryId: "test",
        },
      ],
      subtotal: 10.0,
      total: 10.0,
      status: "COMPLETED" as any,
    };

    await this.print(testTransaction);
  }
}

// Export default configuration for easy setup
export const createBluetoothPrinter = (config: Partial<PrinterConfig> = {}) => {
  return new ThermalPrinterService({
    connectionType: "bluetooth",
    paperWidth: 32,
    ...config,
  });
};
