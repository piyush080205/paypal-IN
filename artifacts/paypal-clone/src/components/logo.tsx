import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/0.svg"
      className={className}
    >
      <circle cx="12" cy="16" r="10" fill="#009cde" opacity="0.9" />
      <circle cx="20" cy="16" r="10" fill="#003087" opacity="0.9" />
    </svg>
  );
}
