import React from 'react';

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 6L6 9L9 12L12 9L9 6Z" />
    <path d="M15 12L12 15L15 18L18 15L15 12Z" />
    <path d="M12 9L9 12L12 15L15 12L12 9Z" />
  </svg>
);
