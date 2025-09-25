import PersonalDetailsClient from "./PersonalDetailsClient";

export default async function PersonalDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <PersonalDetailsClient trackerId={id} />;
}
