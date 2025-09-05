import ExtrasClient from "./ExtrasClient";

export default async function ExtrasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <ExtrasClient trackerId={id} />;
}
