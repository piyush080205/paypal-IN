import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/paypal-logo.png"
      alt="PayPal"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
