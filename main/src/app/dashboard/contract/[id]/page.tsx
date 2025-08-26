import { redirect } from "next/navigation";

export default function ContractIndex({ params }: { params: { id: string } }) {
  redirect(`/dashboard/contract/${params.id}/safety-processing`);
}
