// /components/shared/GlobalLayoutWrapper.tsx
"use client";
import { ReactNode } from "react";
import GlobalLoader from "./GlobalLoader";
import { useNavigationLoadingSmart } from "@/hooks/useNavigationLoadingSmart";

export default function GlobalLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  useNavigationLoadingSmart(); // smart nav loader
  return (
    <>
      <GlobalLoader />
      {children}
    </>
  );
}
