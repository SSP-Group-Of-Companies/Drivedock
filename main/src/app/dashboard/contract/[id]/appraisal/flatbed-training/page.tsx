import FlatbedTrainingClient from "./FlatbedTrainingClient";

export default async function FlatbedTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return <FlatbedTrainingClient trackerId={id} />;
}
