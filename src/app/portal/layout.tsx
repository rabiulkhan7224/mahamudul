
import React from 'react';

// This layout is intentionally simple.
// It prevents the main layout's authentication and other wrappers from running on public portal routes.
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
