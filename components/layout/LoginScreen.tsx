import React, { useEffect } from "react";
import { BRANDING } from "../../constants";

interface LoginScreenProps {
  pin: string;
  setPin: (pin: string) => void;
  onLogin: (providedPin?: string) => void;
  branchName: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  pin,
  setPin,
  onLogin,
  branchName,
}) => {
  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === "Backspace" || key === "Delete") {
        setPin("");
        return;
      }

      if (key === "Enter" && pin.length === 4) {
        onLogin();
        return;
      }

      if (/^[0-9]$/.test(key) && pin.length < 4) {
        setPin(pin + key);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [pin, setPin, onLogin]);

  const handleKeypadClick = (key: string | number) => {
    if (key === "C") {
      setPin("");
    } else if (key === "OK") {
      if (pin.length === 4) {
        onLogin();
      }
    } else if (typeof key === "number" && pin.length < 4) {
      setPin(pin + key);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl w-full max-w-md text-center border border-gray-200/50 backdrop-blur-sm">
        {/* Logo and Branch Section */}
        <div className="mb-10">
          <div className="flex justify-center mb-4">
            <img
              src={BRANDING.LOGO_BLACK}
              alt={BRANDING.LOGO_ALT_TEXT}
              className="h-10 object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">
              {branchName}
            </p>
          </div>
        </div>

        {/* PIN Indicator */}
        <div className="flex justify-center gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                pin.length > i
                  ? "bg-black scale-125 shadow-md"
                  : "bg-gray-200 scale-100"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map((key) => {
            const isNumber = typeof key === "number";
            const isClear = key === "C";
            const isOK = key === "OK";
            const isOKEnabled = isOK && pin.length === 4;

            return (
              <button
                key={key}
                onClick={() => handleKeypadClick(key)}
                disabled={isOK && !isOKEnabled}
                className={`
                  h-14 rounded-2xl flex items-center justify-center text-xl font-black
                  transition-all duration-150 active:scale-95
                  ${
                    isOK
                      ? isOKEnabled
                        ? "bg-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isClear
                      ? "bg-gray-100 text-black hover:bg-gray-200 hover:shadow-md border border-gray-200"
                      : "bg-gray-50 text-black border-2 border-gray-200 hover:border-black hover:bg-white hover:shadow-md"
                  }
                `}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-400 mb-6 font-medium">
          Enter your 4-digit PIN
        </p>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-100">
          <p className="text-[9px] text-gray-400 text-center font-medium">
            © 2026 <span className="font-bold text-gray-700">Eli Bautista</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
