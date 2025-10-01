// src/app/dashboard/invitations/[id]/page.tsx
import InvitationClient from "./InvitationClient";

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvitationClient trackerId={id} />;
}
