/**
 * ClientOnly Component — DriveDock
 *
 * Description:
 * A utility wrapper that ensures its children are only rendered on the client side,
 * preventing hydration mismatches when using browser-only APIs or client-specific hooks.
 *
 * Props:
 * - `children` (React.ReactNode): The content to render only after client mount.
 * - `fallback` (React.ReactNode, optional): Content to render before mounting (defaults to `null`).
 *
 * Functionality:
 * - Uses a `hasMounted` state to track whether the component has mounted on the client.
 * - Runs a `useEffect` to set `hasMounted` to true after the first render.
 * - Renders `fallback` until the client mount is complete, then renders `children`.
 *
 * Use Cases:
 * - Wrapping components that use `window`, `document`, or other browser APIs.
 * - Preventing hydration errors in Next.js by delaying render of client-dependent UI.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useEffect, useState } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ClientOnly({
  children,
  fallback = null,
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  // Mark as mounted after first client render
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // If not yet mounted, render fallback content
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // Render children only after mount
  return <>{children}</>;
}
