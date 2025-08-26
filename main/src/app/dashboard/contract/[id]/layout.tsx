import type { ReactNode } from "react";
import ContractSummaryBar from "./components/ContractSummaryBar";

export default function ContractLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <div className="max-w-[1400px] space-y-3 sm:space-y-4 flex h-full min-h-0 flex-col ">
      <ContractSummaryBar trackerId={params.id} />
      {children}
    </div>
  );
}
