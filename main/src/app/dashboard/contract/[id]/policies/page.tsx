import PoliciesClient from "./PoliciesClient";

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PoliciesClient trackerId={id} />;
}
