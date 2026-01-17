import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Wifi,
  Usb,
  Monitor,
  Settings,
  TestTube,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Bluetooth,
} from "lucide-react";
import {
  ThermalPrinterService,
  PrinterConfig,
  COMMON_PRINTER_CONFIGS,
} from "../../services/thermalPrinterService";

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PrinterConfig) => void;
  currentConfig?: PrinterConfig;
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  currentConfig,
}) => {
  const [config, setConfig] = useState<PrinterConfig>(
    currentConfig || { connectionType: "bluetooth" },
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const printer = new ThermalPrinterService(config);
      const success = await printer.testConnection();

      if (success) {
        setTestResult("success");
        setTestMessage("Test receipt sent successfully!");
      } else {
        setTestResult("error");
        setTestMessage("Test failed - check your printer connection");
      }
    } catch (error) {
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const connectionTypes = [
    {
      id: "bluetooth" as const,
      name: "Bluetooth",
      description: "Wireless Bluetooth thermal printer",
      icon: <Bluetooth size={20} />,
      recommended: true,
      requirements:
        "Chrome/Edge browser with Bluetooth, paired thermal printer",
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Printer className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Thermal Printer Settings
              </h2>
              <p className="text-sm text-gray-600">
                Configure your thermal receipt printer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Connection Type Selection */}
            <div>
              <h3 className="text-lg font-bold mb-4">Connection Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      config.connectionType === type.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      setConfig({ ...config, connectionType: type.id })
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          config.connectionType === type.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold">{type.name}</h4>
                          {type.recommended && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {type.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {type.requirements}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* USB Configuration */}
            {config.connectionType === "usb" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Usb size={16} />
                  USB Printer Configuration
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Quick Setup (Recommended)
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                      value={
                        Object.entries(COMMON_PRINTER_CONFIGS).find(
                          ([_, cfg]) =>
                            "usbVendorId" in cfg &&
                            "usbProductId" in cfg &&
                            cfg.usbVendorId === config.usbVendorId &&
                            cfg.usbProductId === config.usbProductId,
                        )?.[0] || "custom"
                      }
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setConfig({
                            ...config,
                            usbVendorId: undefined,
                            usbProductId: undefined,
                          });
                        } else {
                          const preset =
                            COMMON_PRINTER_CONFIGS[
                              e.target
                                .value as keyof typeof COMMON_PRINTER_CONFIGS
                            ];
                          setConfig({ ...config, ...preset });
                        }
                      }}
                    >
                      <option value="custom">Auto-detect (recommended)</option>
                      {Object.entries(COMMON_PRINTER_CONFIGS)
                        .filter(
                          ([_, cfg]) =>
                            "usbVendorId" in cfg && "usbProductId" in cfg,
                        )
                        .map(([name, cfg]) => (
                          <option key={name} value={name}>
                            {name.replace(/_/g, " ")}
                          </option>
                        ))}
                    </select>
                  </div>

                  {config.usbVendorId && config.usbProductId && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Vendor ID
                        </label>
                        <input
                          type="text"
                          value={`0x${config.usbVendorId.toString(16).padStart(4, "0")}`}
                          onChange={(e) => {
                            const hex = e.target.value.replace("0x", "");
                            const decimal = parseInt(hex, 16);
                            if (!isNaN(decimal)) {
                              setConfig({ ...config, usbVendorId: decimal });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="0x04b8"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Product ID
                        </label>
                        <input
                          type="text"
                          value={`0x${config.usbProductId.toString(16).padStart(4, "0")}`}
                          onChange={(e) => {
                            const hex = e.target.value.replace("0x", "");
                            const decimal = parseInt(hex, 16);
                            if (!isNaN(decimal)) {
                              setConfig({ ...config, usbProductId: decimal });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="0x0202"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle
                        className="text-yellow-600 mt-0.5"
                        size={16}
                      />
                      <div className="text-sm text-yellow-800">
                        <p className="font-bold mb-1">USB Troubleshooting:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Use "Auto-detect" first - it works with most
                            printers
                          </li>
                          <li>
                            If blocked by Windows, uninstall printer driver from
                            Device Manager
                          </li>
                          <li>Try Serial connection if USB fails</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bluetooth Configuration */}
            {config.connectionType === "bluetooth" && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <Bluetooth size={16} />
                  Bluetooth Printer Configuration
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Printer Model (Recommended)
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                      value={
                        Object.entries(COMMON_PRINTER_CONFIGS).find(
                          ([_, cfg]) =>
                            "bluetoothServiceUuid" in cfg &&
                            "bluetoothCharacteristicUuid" in cfg &&
                            cfg.bluetoothServiceUuid ===
                              config.bluetoothServiceUuid &&
                            cfg.bluetoothCharacteristicUuid ===
                              config.bluetoothCharacteristicUuid,
                        )?.[0] || "custom"
                      }
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setConfig({
                            ...config,
                            bluetoothServiceUuid: undefined,
                            bluetoothCharacteristicUuid: undefined,
                            bluetoothDeviceName: undefined,
                          });
                        } else {
                          const preset =
                            COMMON_PRINTER_CONFIGS[
                              e.target
                                .value as keyof typeof COMMON_PRINTER_CONFIGS
                            ];
                          setConfig({ ...config, ...preset });
                        }
                      }}
                    >
                      <option value="custom">Auto-detect (recommended)</option>
                      {Object.entries(COMMON_PRINTER_CONFIGS)
                        .filter(([_, cfg]) => "bluetoothServiceUuid" in cfg)
                        .map(([name, cfg]) => (
                          <option key={name} value={name}>
                            {name.replace(/_/g, " ")}
                          </option>
                        ))}
                    </select>
                  </div>

                  {(config.bluetoothServiceUuid ||
                    config.bluetoothCharacteristicUuid) && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Service UUID
                        </label>
                        <input
                          type="text"
                          value={config.bluetoothServiceUuid || ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bluetoothServiceUuid: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                          placeholder="49535343-fe7d-4ae5-8fa9-9fafd205e455"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Characteristic UUID
                        </label>
                        <input
                          type="text"
                          value={config.bluetoothCharacteristicUuid || ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bluetoothCharacteristicUuid: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                          placeholder="49535343-1e4d-4bd9-ba61-23c647249616"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Device Name Filter (Optional)
                        </label>
                        <input
                          type="text"
                          value={config.bluetoothDeviceName || ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bluetoothDeviceName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                          placeholder="e.g., TM-P20, Star Micronics"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <HelpCircle
                        className="text-purple-600 mt-0.5"
                        size={16}
                      />
                      <div className="text-sm text-purple-800">
                        <p className="font-bold mb-1">Bluetooth Setup:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Ensure your printer is in pairing mode</li>
                          <li>
                            Use "Auto-detect" for most Bluetooth thermal
                            printers
                          </li>
                          <li>Your browser will ask for device selection</li>
                          <li>Requires HTTPS connection for security</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Network Configuration */}
            {config.connectionType === "network" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <Wifi size={16} />
                  Network Printer Configuration
                </h4>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={config.networkUrl || ""}
                    onChange={(e) =>
                      setConfig({ ...config, networkUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    placeholder="http://192.168.1.100:9100"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Enter your printer's IP address with port 9100 (standard for
                    thermal printers)
                  </p>
                </div>
              </div>
            )}

            {/* Paper Width */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Paper Width (characters)
              </label>
              <select
                value={config.paperWidth || 48}
                onChange={(e) =>
                  setConfig({ ...config, paperWidth: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value={32}>32 chars (58mm paper)</option>
                <option value={48}>48 chars (80mm paper) - Most common</option>
                <option value={64}>64 chars (110mm paper)</option>
              </select>
            </div>

            {/* Test Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <TestTube size={16} />
                  Test Connection
                </h4>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube size={16} />
                      Test Print
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    testResult === "success"
                      ? "bg-green-100 border border-green-200"
                      : "bg-red-100 border border-red-200"
                  }`}
                >
                  {testResult === "success" ? (
                    <CheckCircle className="text-green-600 mt-0.5" size={16} />
                  ) : (
                    <AlertCircle className="text-red-600 mt-0.5" size={16} />
                  )}
                  <div className="text-sm">
                    <p
                      className={`font-bold ${testResult === "success" ? "text-green-800" : "text-red-800"}`}
                    >
                      {testResult === "success"
                        ? "Test Successful!"
                        : "Test Failed"}
                    </p>
                    <p
                      className={
                        testResult === "success"
                          ? "text-green-700"
                          : "text-red-700"
                      }
                    >
                      {testMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;
