import IdentificationsClient from "./IdentificationsClient";

export default async function IdentificationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <IdentificationsClient trackerId={id} />;
}
