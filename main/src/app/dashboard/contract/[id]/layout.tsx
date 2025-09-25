import type { ReactNode } from "react";
import ContractLayoutClient from "./ContractLayoutClient";

export default async function ContractLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <ContractLayoutClient trackerId={id}>{children}</ContractLayoutClient>;
}
