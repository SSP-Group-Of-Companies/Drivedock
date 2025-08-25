// /components/shared/GlobalLayoutWrapper.tsx
"use client";
import { ReactNode, useEffect, useState } from "react";
import GlobalLoader from "./GlobalLoader";
import { useNavigationLoadingSmart } from "@/hooks/useNavigationLoadingSmart";

export default function GlobalLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // Call the hook unconditionally (it will be safe during SSR)
  useNavigationLoadingSmart(); // smart nav loader

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/static generation, render without client-side functionality
  if (!mounted) {
    return <>{children}</>;
  }

  // Client-side rendering with full functionality
  return (
    <>
      <GlobalLoader />
      {children}
    </>
  );
}
