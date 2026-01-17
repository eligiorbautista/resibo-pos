import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Wifi,
  Usb,
  Settings,
  TestTube,
  CheckCircle,
  AlertCircle,
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
    currentConfig || COMMON_PRINTER_CONFIGS.browser,
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
        setTestMessage("Printer test successful! Receipt should be printed.");
      } else {
        setTestResult("error");
        setTestMessage("Printer test failed. Check connection settings.");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Printer size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Thermal Printer Settings
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Configure your ESC/POS thermal printer
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Connection Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Connection Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    setConfig({ ...config, connectionType: "network" })
                  }
                  className={`p-4 rounded-xl border-2 transition-all ${
                    config.connectionType === "network"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Wifi
                    size={24}
                    className={`mx-auto mb-2 ${
                      config.connectionType === "network"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="text-sm font-bold">Network/WiFi</div>
                  <div className="text-xs text-gray-500">IP Address</div>
                </button>

                <button
                  onClick={() =>
                    setConfig({ ...config, connectionType: "usb" })
                  }
                  className={`p-4 rounded-xl border-2 transition-all ${
                    config.connectionType === "usb"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Usb
                    size={24}
                    className={`mx-auto mb-2 ${
                      config.connectionType === "usb"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="text-sm font-bold">USB</div>
                  <div className="text-xs text-gray-500">Direct USB</div>
                </button>

                <button
                  onClick={() =>
                    setConfig({ ...config, connectionType: "serial" })
                  }
                  className={`p-4 rounded-xl border-2 transition-all ${
                    config.connectionType === "serial"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Settings
                    size={24}
                    className={`mx-auto mb-2 ${
                      config.connectionType === "serial"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="text-sm font-bold">Serial</div>
                  <div className="text-xs text-gray-500">COM Port</div>
                </button>

                <button
                  onClick={() =>
                    setConfig({ ...config, connectionType: "browser" })
                  }
                  className={`p-4 rounded-xl border-2 transition-all ${
                    config.connectionType === "browser"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Printer
                    size={24}
                    className={`mx-auto mb-2 ${
                      config.connectionType === "browser"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="text-sm font-bold">Browser Print</div>
                  <div className="text-xs text-gray-500">Fallback</div>
                </button>
              </div>
            </div>

            {/* Network Settings */}
            {config.connectionType === "network" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Printer IP Address
                </label>
                <input
                  type="text"
                  value={
                    config.networkUrl
                      ?.replace("http://", "")
                      .replace(":9100", "") || ""
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      networkUrl: `http://${e.target.value}:9100`,
                    })
                  }
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the IP address of your thermal printer. Port 9100 is
                  used by default.
                </p>
              </div>
            )}

            {/* USB Settings */}
            {config.connectionType === "usb" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    USB Vendor ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.usbVendorId?.toString(16) || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        usbVendorId: e.target.value
                          ? parseInt(e.target.value, 16)
                          : undefined,
                      })
                    }
                    placeholder="04b8 (Epson)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    USB Product ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.usbProductId?.toString(16) || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        usbProductId: e.target.value
                          ? parseInt(e.target.value, 16)
                          : undefined,
                      })
                    }
                    placeholder="0202"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                  <p className="text-sm text-blue-700 font-medium">
                    <strong>USB Thermal Printer Setup:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                    <li>Leave Vendor/Product ID empty to see all USB devices</li>
                    <li>Make sure your printer is connected via USB and powered on</li>
                    <li>Close any other applications using the printer</li>
                    <li>Your browser will ask for permission to access the printer</li>
                    <li>Check the browser console (F12) for detailed error messages</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-800 font-medium">
                    <strong>"Access Denied" Error Fix:</strong>
                  </p>
                  <ol className="text-sm text-orange-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Press Windows + X → Device Manager</li>
                    <li>Find "Printers" or "Universal Serial Bus devices"</li>
                    <li>Right-click your thermal printer → "Uninstall device"</li>
                    <li>Restart your browser and try again</li>
                    <li><strong>Or try "Serial" connection instead (works with most USB printers)</strong></li>
                  </ol>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-800 font-medium">
                    <strong>"Access Denied" Error Fix:</strong>
                  </p>
                  <ol className="text-sm text-orange-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Press Windows + X → Device Manager</li>
                    <li>Find "Printers" or "Universal Serial Bus devices"</li>
                    <li>Right-click your thermal printer → "Uninstall device"</li>
                    <li>Restart your browser and try again</li>
                    <li>Or try "Serial" connection instead (works with most USB printers)</li>
                  </ol>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium">
                    <strong>Troubleshooting:</strong>
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    If the test fails, check the console logs (F12 → Console) for detailed error information. 
                    Most thermal printers work with the default settings.
                  </p>
                </div>
              </div>
            )}

            {/* Windows Driver Settings */}
            {config.connectionType === "windows-driver" && (
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <p className="text-sm text-green-800 font-medium mb-2">
                  <strong>✅ Windows Driver Method (Recommended for your GEZHI printer)</strong>
                </p>
                <p className="text-sm text-green-700">
                  This method uses your installed printer driver and works with Windows' standard printing system. 
                  No USB restrictions - just click "Test Print" and select your thermal printer when prompted!
                </p>
              </div>
            )}

            {/* Local Server Settings */}
            {config.connectionType === "local-server" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Local Print Server URL
                  </label>
                  <input
                    type="text"
                    value={config.localServerUrl || 'http://localhost:3001/print'}
                    onChange={(e) => setConfig({
                      ...config, 
                      localServerUrl: e.target.value
                    })}
                    placeholder="http://localhost:3001/print"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-800 font-medium mb-2">
                    <strong>Local Print Server Setup:</strong>
                  </p>
                  <ol className="text-sm text-purple-700 space-y-1 ml-4 list-decimal">
                    <li>Download our print server from GitHub</li>
                    <li>Run: <code className="bg-white px-1 rounded">npm install && npm start</code></li>
                    <li>Configure your thermal printer in the server</li>
                    <li>Server will handle all USB communication</li>
                  </ol>
                </div>
              </div>
            )}

            {/* File Drop Settings */}
            {config.connectionType === "file-drop" && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <p className="text-sm text-orange-800 font-medium mb-2">
                  <strong>File Drop Method:</strong>
                </p>
                <p className="text-sm text-orange-700">
                  This creates print files that you can manually copy to your printer or 
                  set up a file watcher service to automatically process them.
                </p>
              </div>
            )}

            {/* Serial Settings */}
            {config.connectionType === "serial" && (
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-blue-700 font-medium">
                  <strong>Serial Connection:</strong> Your browser will ask for
                  permission to access the serial port. Make sure your thermal
                  printer is connected via USB-to-Serial adapter or built-in
                  serial port.
                </p>
              </div>
            )}

            {/* Paper Width */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Paper Width (Characters)
              </label>
              <select
                value={config.paperWidth || 48}
                onChange={(e) =>
                  setConfig({ ...config, paperWidth: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value={32}>32 chars (58mm paper)</option>
                <option value={48}>48 chars (80mm paper)</option>
                <option value={64}>64 chars (112mm paper)</option>
              </select>
            </div>

            {/* Test Section */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">Test Printer</h3>
                  <p className="text-sm text-gray-600">
                    Send a test receipt to verify your printer setup
                  </p>
                </div>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <TestTube size={16} />
                  {isTesting ? "Testing..." : "Test Print"}
                </button>
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl ${
                    testResult === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {testResult === "success" ? (
                    <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        testResult === "success"
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {testResult === "success"
                        ? "Test Successful"
                        : "Test Failed"}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        testResult === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {testMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;
