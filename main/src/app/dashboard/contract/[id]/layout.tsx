import type { ReactNode } from "react";
import ContractSummaryBar from "./components/ContractSummaryBar";

export default async function ContractLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="max-w-[1400px] space-y-3 sm:space-y-4 flex flex-col">
      <ContractSummaryBar trackerId={id} />
      {children}
    </div>
  );
}
