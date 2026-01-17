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
    isPrimary: boolean;
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID,
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
    readValue(): Promise<DataView>;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
  }

  type BluetoothServiceUUID = number | string;
  type BluetoothCharacteristicUUID = number | string;
}

// ESC/POS Commands - Core thermal printer protocol
const ESC = "\x1B";
const GS = "\x1D";

export interface PrinterConfig {
  connectionType: "usb" | "serial" | "network" | "browser" | "bluetooth";
  networkUrl?: string; // For network printers: 'http://192.168.1.100:9100'
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceUuid?: string; // For Bluetooth printers: service UUID
  bluetoothCharacteristicUuid?: string; // For Bluetooth printers: characteristic UUID
  bluetoothDeviceName?: string; // Optional device name filter for Bluetooth
  paperWidth?: number; // Default 48 chars for 80mm paper
}

// Common thermal printer configurations for quick setup
export const COMMON_PRINTER_CONFIGS = {
  EPSON_TM_T20: { usbVendorId: 0x04b8, usbProductId: 0x0202 },
  EPSON_TM_T82: { usbVendorId: 0x04b8, usbProductId: 0x0202 },
  STAR_TSP143: { usbVendorId: 0x0519, usbProductId: 0x0001 },
  CITIZEN_CT_S310A: { usbVendorId: 0x1cb0, usbProductId: 0x0003 },
  GENERIC_80MM: { usbVendorId: 0x0416, usbProductId: 0x5011 },
  GEZHI_MICRO: { usbVendorId: 0x0483, usbProductId: 0x5740 }, // Common for micro thermal printers

  // Bluetooth thermal printer configurations
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
    bluetoothServiceUuid: "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Common SPP UUID
    bluetoothCharacteristicUuid: "49535343-1e4d-4bd9-ba61-23c647249616",
  },
};

export class ThermalPrinterService {
  private config: PrinterConfig;
  private encoder = new TextEncoder();

  constructor(config: PrinterConfig) {
    this.config = {
      paperWidth: 48,
      ...config,
    };
  }

  /**
   * Create ESC/POS command sequence for thermal printer
   * This generates the binary data that thermal printers understand
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
    commands.push(...Array.from(this.encoder.encode("\n"))); // Final feed

    return new Uint8Array(commands);
  }

  /**
   * Generate formatted receipt content with ESC/POS formatting commands
   */
  private formatReceipt(
    transaction: Transaction,
    employee?: Employee,
    customer?: Customer,
    table?: Table,
  ): string {
    const width = this.config.paperWidth || 48;

    // Helper functions for consistent formatting
    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(padding) + text + "\n";
    };

    const leftRight = (left: string, right: string) => {
      const spaces = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(spaces) + right + "\n";
    };

    const line = (char: string = "-") => char.repeat(width) + "\n";

    let content = "";

    // Header with business info
    content += ESC + "!\x18"; // Double width & height
    content += center(RESTAURANT_NAME);
    content += ESC + "!\x00"; // Normal text

    if (
      BIR_CONFIG.BUSINESS_ADDRESS &&
      BIR_CONFIG.BUSINESS_ADDRESS !== "[YOUR_BUSINESS_ADDRESS_HERE]"
    ) {
      content += center(BIR_CONFIG.BUSINESS_ADDRESS);
    }

    if (BIR_CONFIG.TIN) {
      content += center(`TIN: ${BIR_CONFIG.TIN}`);
    }

    content += "\n";
    content += line("=");

    // Invoice/Receipt numbers
    const invoiceNum =
      (transaction as any).officialInvoiceNumber ||
      transaction.id.substring(0, 8).toUpperCase();
    content += leftRight("Invoice #:", invoiceNum);
    content += leftRight("Receipt #:", transaction.id.substring(0, 12));
    content += leftRight(
      "Date:",
      new Date(transaction.timestamp).toLocaleString("en-PH"),
    );

    if (employee) content += leftRight("Cashier:", employee.name);
    if (customer) content += leftRight("Customer:", customer.name);
    if (table) content += leftRight("Table:", `#${table.number}`);
    if (transaction.orderType) {
      content += leftRight("Type:", transaction.orderType.replace("_", " "));
    }

    content += line();

    // Items section
    content += ESC + "!\x08"; // Emphasized
    content += "ITEMS:\n";
    content += ESC + "!\x00"; // Normal

    transaction.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      const itemName =
        item.name.length > 32 ? item.name.substring(0, 29) + "..." : item.name;

      content += leftRight(
        itemName,
        `₱${Math.round(itemTotal).toLocaleString()}`,
      );
      content += `  ${item.quantity} x ₱${Math.round(item.price).toLocaleString()}\n`;

      // Add modifiers if any
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach((mod) => {
          const modText = `  + ${mod.modifierName}`;
          const modPrice =
            mod.price > 0 ? `₱${Math.round(mod.price).toLocaleString()}` : "";
          if (modPrice) {
            content += leftRight(modText, modPrice);
          } else {
            content += modText + "\n";
          }
        });
      }
    });

    content += line();

    // Totals section
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
    } else if (
      transaction.discountType === "PWD" ||
      transaction.discountType === "SENIOR_CITIZEN"
    ) {
      content += leftRight("VAT:", "VAT-Exempt");
    }

    if (transaction.serviceCharge > 0) {
      content += leftRight(
        "Service Charge:",
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
    content += ESC + "!\x18"; // Double size
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

    // Change calculation
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
    content += ESC + "a\x00"; // Left align

    if (BIR_CONFIG.HAS_PTU && BIR_CONFIG.PTU_NUMBER) {
      content += center("*** OFFICIAL RECEIPT ***");
      content += center(`PTU No: ${BIR_CONFIG.PTU_NUMBER}`);
    } else {
      content += center("*** NOT AN OFFICIAL RECEIPT ***");
      content += center("Official receipt upon PTU approval");
    }

    content += center("This is a computer-generated receipt");
    content += center(new Date().toLocaleDateString("en-PH"));

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

  /**
   * Main print method - routes to appropriate connection type
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
      switch (this.config.connectionType) {
        case "usb":
          await this.printViaWebUSB(escPosData);
          break;
        case "serial":
          await this.printViaWebSerial(escPosData);
          break;
        case "network":
          await this.printViaNetwork(escPosData);
          break;
        case "bluetooth":
          await this.printViaBluetooth(escPosData);
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

  /**
   * WebUSB printing - Direct connection to USB thermal printer
   */
  private async printViaWebUSB(data: Uint8Array): Promise<void> {
    if (!navigator.usb) {
      throw new Error(
        "WebUSB is not supported. Please use Chrome, Edge, or another Chromium-based browser.",
      );
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
            : [],
      });

      // Open and configure device
      await device.open();
      if (!device.configuration) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      // Find output endpoint
      const interface0 = device.configuration?.interfaces[0];
      if (!interface0) throw new Error("No USB interface found");

      const alternate = interface0.alternates[0];
      if (!alternate) throw new Error("No USB alternate interface found");

      const endpoint = alternate.endpoints.find((e) => e.direction === "out");
      if (!endpoint) {
        throw new Error(
          "No output endpoint found. This device may not support printing.",
        );
      }

      // Send data in chunks for better compatibility
      const chunkSize = 64; // Standard USB packet size
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await device.transferOut(endpoint.endpointNumber, chunk);

        if (result.status !== "ok") {
          throw new Error(`USB transfer failed: ${result.status}`);
        }

        // Small delay to prevent overwhelming the printer
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("No device selected")) {
          throw new Error(
            "No printer was selected. Please connect your thermal printer and try again.",
          );
        } else if (
          error.message.includes("Access denied") ||
          error.name === "SecurityError"
        ) {
          throw new Error(
            "USB access denied. Your printer may be controlled by Windows drivers.\n\n" +
              "Try these solutions:\n" +
              "1. Go to Device Manager → Printers → Right-click your printer → Uninstall device\n" +
              "2. Use Serial connection instead\n" +
              "3. Restart your browser after uninstalling the driver",
          );
        } else if (error.message.includes("Device unavailable")) {
          throw new Error(
            "USB printer unavailable. Check if it's connected and powered on.",
          );
        } else if (
          error.message.includes("NetworkError") ||
          error.message.includes("NotFoundError")
        ) {
          throw new Error(
            "Device communication failed. This often happens when Windows has claimed the device.\n\n" +
              "Try using Serial connection instead - it works with most USB thermal printers.",
          );
        }
      }

      throw new Error(
        `USB printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (device) {
        try {
          await device.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Web Serial printing - Works with USB printers that present as serial devices
   */
  private async printViaWebSerial(data: Uint8Array): Promise<void> {
    if (!navigator.serial) {
      throw new Error(
        "Web Serial API is not supported. Please use Chrome, Edge, or another Chromium-based browser.",
      );
    }

    let port: SerialPort | null = null;

    try {
      // Request serial port access
      port = await navigator.serial.requestPort();

      // Open with common thermal printer settings
      await port.open({
        baudRate: 9600,
      });

      const writer = port.writable?.getWriter();
      if (!writer) {
        throw new Error("Cannot get serial port writer");
      }

      await writer.write(data);
      writer.releaseLock();
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("No port selected") ||
          error.name === "NotFoundError"
        ) {
          throw new Error(
            "No serial device found. This usually means:\n\n" +
              "• Your USB thermal printer doesn't support serial communication\n" +
              "• You need a USB-to-Serial driver/adapter\n" +
              "• Try installing your printer manufacturer's driver\n" +
              '• Check if your printer has a "USB Virtual Serial" mode',
          );
        } else if (error.message.includes("Access denied")) {
          throw new Error(
            "Access denied to serial port. Please close other applications using this port.",
          );
        } else if (error.message.includes("Device busy")) {
          throw new Error(
            "Serial port is busy. Please close other applications and try again.",
          );
        }
      }

      throw new Error(
        `Serial printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (port) {
        try {
          await port.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Network printing - For WiFi/Ethernet thermal printers
   */
  private async printViaNetwork(data: Uint8Array): Promise<void> {
    const url = this.config.networkUrl;
    if (!url) {
      throw new Error(
        "Network URL not configured. Please set the printer's IP address (e.g., http://192.168.1.100:9100)",
      );
    }

    try {
      const arrayData = Array.from(data);
      const blob = new Blob([new Uint8Array(arrayData)], {
        type: "application/octet-stream",
      });
      const response = await fetch(url, {
        method: "POST",
        body: blob,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": data.length.toString(),
        },
        // Network printing timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(
          `Network printer responded with ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          `Cannot connect to network printer at ${url}.\n\n` +
            "Check that:\n" +
            "• The printer IP address is correct\n" +
            "• The printer is connected to your network\n" +
            "• The printer supports network printing (port 9100)\n" +
            "• Your firewall allows connections to the printer",
        );
      }
      throw new Error(
        `Network printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Bluetooth printing - For Bluetooth thermal printers using Web Bluetooth API
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
      // Set up request options
      const requestOptions: RequestDeviceOptions = {
        acceptAllDevices: false,
        filters: [],
        optionalServices: [],
      };

      // Add device name filter if specified
      if (this.config.bluetoothDeviceName) {
        requestOptions.filters.push({
          name: this.config.bluetoothDeviceName,
        });
      }

      // Add service UUID filter if specified
      if (this.config.bluetoothServiceUuid) {
        requestOptions.filters.push({
          services: [this.config.bluetoothServiceUuid],
        });
        requestOptions.optionalServices.push(this.config.bluetoothServiceUuid);
      }

      // If no specific filters, accept all devices but require serial port service
      if (requestOptions.filters.length === 0) {
        requestOptions.acceptAllDevices = true;
        requestOptions.optionalServices.push(
          "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Common Serial Port Profile UUID
        );
      }

      // Request device access
      device = await navigator.bluetooth.requestDevice(requestOptions);

      if (!device.gatt) {
        throw new Error("GATT server not available on selected device");
      }

      // Connect to device
      const server = await device.gatt.connect();

      // Get service
      const serviceUuid =
        this.config.bluetoothServiceUuid ||
        "49535343-fe7d-4ae5-8fa9-9fafd205e455";
      const service = await server.getPrimaryService(serviceUuid);

      // Get characteristic
      const characteristicUuid =
        this.config.bluetoothCharacteristicUuid ||
        "49535343-1e4d-4bd9-ba61-23c647249616";
      characteristic = await service.getCharacteristic(characteristicUuid);

      // Send data in chunks for better compatibility
      const chunkSize = 20; // Standard BLE packet size
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);

        // Small delay to prevent overwhelming the printer
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait a bit for the printer to process
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("User cancelled") ||
          error.name === "NotFoundError"
        ) {
          throw new Error(
            "No Bluetooth printer was selected. Please pair your thermal printer and try again.",
          );
        } else if (
          error.message.includes("Permission denied") ||
          error.name === "SecurityError"
        ) {
          throw new Error(
            "Bluetooth access denied. Please ensure Bluetooth is enabled and grant permission.",
          );
        } else if (
          error.message.includes("Device unreachable") ||
          error.name === "NetworkError"
        ) {
          throw new Error(
            "Cannot connect to Bluetooth printer. Ensure it's powered on and in pairing mode.",
          );
        } else if (error.message.includes("Service not found")) {
          throw new Error(
            "This Bluetooth device doesn't support printing. Please select a thermal printer.",
          );
        } else if (error.message.includes("Characteristic not found")) {
          throw new Error(
            "Bluetooth printer doesn't support the required communication protocol. Try different UUID settings.",
          );
        }
      }

      throw new Error(
        `Bluetooth printing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // Disconnect from device
      if (device?.gatt?.connected) {
        try {
          device.gatt.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }

  /**
   * Browser printing fallback - Uses regular browser printing
   */
  private async printViaBrowser(content: string): Promise<void> {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      throw new Error("Please allow popups to print receipts");
    }

    // Create a formatted HTML receipt for browser printing
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              padding: 8mm;
              font-size: 10px;
              line-height: 1.3;
              color: #000;
            }
            pre {
              font-family: inherit;
              white-space: pre-wrap;
              word-wrap: break-word;
              margin: 0;
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

    // Auto-print for better UX
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  /**
   * Test printer connection with a simple test receipt
   */
  async testConnection(): Promise<boolean> {
    try {
      const testContent =
        "\n*** PRINTER TEST ***\n" +
        "Connection: " +
        this.config.connectionType.toUpperCase() +
        "\n" +
        "Time: " +
        new Date().toLocaleString() +
        "\n" +
        "Status: OK\n" +
        "\n" +
        "If you see this receipt,\n" +
        "your thermal printer is\n" +
        "working correctly!\n" +
        "\n" +
        "*** END TEST ***\n\n";

      const escPosData = this.createEscPosCommands(testContent);

      switch (this.config.connectionType) {
        case "usb":
          await this.printViaWebUSB(escPosData);
          break;
        case "serial":
          await this.printViaWebSerial(escPosData);
          break;
        case "network":
          await this.printViaNetwork(escPosData);
          break;
        case "bluetooth":
          await this.printViaBluetooth(escPosData);
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
