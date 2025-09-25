import EmploymentHistoryClient from "./EmploymentHistoryClient";

export default async function EmploymentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <EmploymentHistoryClient trackerId={id} />;
}
