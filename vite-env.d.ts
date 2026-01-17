/// <reference types="vite/client" />

// Web API types for thermal printing
interface Navigator {
  usb?: {
    requestDevice(options?: {
      filters?: Array<{ vendorId?: number; productId?: number }>;
    }): Promise<USBDevice>;
  };
  serial?: {
    requestPort(): Promise<SerialPort>;
  };
}

interface USBDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: BufferSource,
  ): Promise<USBOutTransferResult>;
  configuration?: USBConfiguration;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBInterface {
  alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  direction: "in" | "out";
  endpointNumber: number;
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: "ok" | "stall" | "babble";
}

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable?: WritableStream<Uint8Array>;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}
