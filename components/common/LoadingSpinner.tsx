import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'black' | 'white' | 'gray';
  fullScreen?: boolean;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'black',
  fullScreen = false,
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  };

  const colorClasses = {
    black: 'border-black border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
      />
      {text && (
        <p className={`font-black uppercase tracking-widest ${textSizeClasses[size]} ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;

