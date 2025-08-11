import { notFound } from "next/navigation";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import Page5Client from "./Page5Client";

interface Page5Props {
  params: Promise<{ id: string }>;
}

export default async function Page5({ params }: Page5Props) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  // Fetch Page 5 data
  const data = await fetchPage5Data(id);
  
  return (
    <Page5Client 
      trackerId={id}
      initialData={data?.page5}
      trackerContext={data?.trackerContext}
    />
  );
}

async function fetchPage5Data(trackerId: string) {
  const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(
      `${base}/api/v1/onboarding/${trackerId}/application-form/page-5`,
      { cache: "no-store" }
    );
    if (res.status === 403) {
      redirect(`/onboarding/${trackerId}/application-form/page-4`);
    }
    if (!res.ok) {
      console.warn("Page 5 fetch failed:", res.status);
      return null;
    }
    const json = await res.json();
    return {
      page5: json?.data?.page5 ?? null,
      trackerContext: json?.data?.onboardingContext ?? null,
    };
  } catch (error) {
    console.error("Error fetching Page 5 data:", error);
    return null;
  }
}
