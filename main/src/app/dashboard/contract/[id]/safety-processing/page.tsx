/**
 * Safety Processing — starter page
 * This is the first view when opening a contract.
 * We'll flesh out actions/sections incrementally next.
 */

import SafetyProcessingClient from "./SafetyProcessingClient";

export const metadata = {
  title: "DriveDock Admin — Safety Processing",
};

export default async function SafetyProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Server component wrapper; keeps URL routing minimal.
  return <SafetyProcessingClient trackerId={id} />;
}
