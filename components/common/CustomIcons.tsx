
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const TallCoffeeMug: React.FC<IconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Mug body - same height as letters */}
      <path d="M5 6h10c1.5 0 2.5 0.5 2.5 2v10c0 1.5-1 2-2.5 2H5c-1.5 0-2.5-0.5-2.5-2V8c0-1.5 1-2 2.5-2z" />
      {/* Handle */}
      <path d="M15 9c1 0 1.5 0.5 1.5 1.5v3c0 1-0.5 1.5-1.5 1.5" />
      {/* Coffee surface */}
      <path d="M5 8h10" strokeWidth="1.5" />
    </svg>
  );
};

export const PizzaWithSlice: React.FC<IconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Pizza crust - outer ring */}
      <circle cx="12" cy="12" r="10" strokeWidth="2.5" />
      
      {/* Inner pizza base */}
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      
      {/* Toppings - smaller dots scattered across the pizza */}
      <circle cx="9" cy="8" r="0.8" fill="currentColor" />
      <circle cx="15" cy="9" r="0.8" fill="currentColor" />
      <circle cx="8" cy="12" r="0.8" fill="currentColor" />
      <circle cx="16" cy="12" r="0.8" fill="currentColor" />
      <circle cx="10" cy="15" r="0.8" fill="currentColor" />
      <circle cx="14" cy="16" r="0.8" fill="currentColor" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" />
      <circle cx="11" cy="13" r="0.8" fill="currentColor" />
      <circle cx="13" cy="8" r="0.8" fill="currentColor" />
      <circle cx="9" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
};

