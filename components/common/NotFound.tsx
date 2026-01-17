
import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

interface NotFoundProps {
  onNavigateHome?: () => void;
}

const NotFound: React.FC<NotFoundProps> = ({ onNavigateHome }) => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50/50 p-6">
      <div className="bg-white rounded-3xl p-12 max-w-md w-full shadow-xl border border-gray-100 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-gray-400" />
        </div>
        <h1 className="text-6xl font-black tracking-tighter mb-3">404</h1>
        <h2 className="text-2xl font-black tracking-tighter mb-3 uppercase">Page Not Found</h2>
        <p className="text-sm text-gray-600 font-bold mb-4 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-xs text-gray-400 font-bold mb-8">
          URL: {window.location.pathname}
        </p>
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            <Home size={16} />
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default NotFound;

