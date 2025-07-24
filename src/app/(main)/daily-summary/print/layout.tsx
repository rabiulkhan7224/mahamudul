
import React from 'react';

// This layout is intentionally simple.
// It prevents the main layout's authentication check from running on print routes.
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
