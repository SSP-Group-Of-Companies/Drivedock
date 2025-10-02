import PrequalificationClient from "./PrequalificationClient";

export default async function PrequalificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PrequalificationClient trackerId={id} />;
}
