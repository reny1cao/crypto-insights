import React from 'react';

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    {...props} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.5 9.62V12c0 3.31-2.69 6-6 6h-1c-3.31 0-6-2.69-6-6V9.62" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.91 7.42c.5 1.59-.28 3.38-1.87 3.88l-1.46.46c-.47.15-.96.15-1.43 0l-1.46-.46c-1.59-.5-2.37-2.29-1.87-3.88l.46-1.46c.15-.47.44-.89.83-1.18l1.04-.78c1.59-.5 3.38.28 3.88 1.87l.46 1.45Z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);