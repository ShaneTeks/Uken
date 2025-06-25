
import React from 'react';

interface IconProps {
  className?: string;
}

export const DiamondIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M12.0001 1.60657L22.3935 12L12.0001 22.3934L1.60669 12L12.0001 1.60657Z" />
  </svg>
);
