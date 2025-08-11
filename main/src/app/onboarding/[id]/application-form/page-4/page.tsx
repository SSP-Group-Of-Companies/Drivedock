import { notFound } from "next/navigation";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import Page4Client from "./Page4Client";

interface Page4Props {
  params: Promise<{ id: string }>;
}

export default async function Page4({ params }: Page4Props) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  // Fetch Page 4 data
  const data = await fetchPage4Data(id);
  
  return (
    <Page4Client 
      trackerId={id}
      initialData={data?.page4}
      trackerContext={data?.trackerContext}
    />
  );
}

async function fetchPage4Data(trackerId: string) {
  const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(
      `${base}/api/v1/onboarding/${trackerId}/application-form/page-4`,
      { cache: "no-store" }
    );
    if (res.status === 403) {
      redirect(`/onboarding/${trackerId}/application-form/page-3`);
    }
    if (!res.ok) {
      console.warn("Page 4 fetch failed:", res.status);
      return null;
    }
    const json = await res.json();
    return {
      page4: json?.data?.page4 ?? null,
      trackerContext: json?.data?.onboardingContext ?? null,
    };
  } catch (error) {
    console.error("Error fetching Page 4 data:", error);
    return null;
  }
}
