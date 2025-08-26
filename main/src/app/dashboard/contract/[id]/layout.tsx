import type { ReactNode } from "react";

export default function ContractLayout({ children }: { children: ReactNode }) {
  // Optional place to add contract-specific context providers later.
  // NO header/sidebar here—parent /dashboard/layout.tsx already renders them.
  return <>{children}</>;
}
