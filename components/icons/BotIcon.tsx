import React from 'react';

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V5M9 5a2 2 0 00-2 2v3a2 2 0 11-4 0v-3a2 2 0 00-2-2h-1M15 5a2 2 0 012 2v3a2 2 0 104 0v-3a2 2 0 012-2h1M9 15v-3a2 2 0 114 0v3m-4 0a2 2 0 00-2 2h10a2 2 0 00-2-2M9 15a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);
