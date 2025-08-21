"use server";

import Page5Client from "./Page5Client";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlConstructor";

// Types
type Page5DataResponse = {
  data?: { page5?: IApplicationFormPage5 };
  error?: string;
};

// 🌐 Fetch Function
async function fetchPage5Data(trackerId: string): Promise<Page5DataResponse> {
  try {
    const base = await resolveInternalBaseUrl();
    console.log("base:", base);
    console.log("url: ", `${base}/api/v1/onboarding/${trackerId}/application-form/page-5`);
    const response = await fetch(`${base}/api/v1/onboarding/${trackerId}/application-form/page-5`, { cache: "no-store" });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData?.message || "Failed to fetch Page 5 data." };
    }

    const json = await response.json();
    return { data: json.data };
  } catch (error) {
    console.log(error);
    return { error: "Unexpected server error. Please try again later." };
  }
}

// Page Component
export default async function ApplicationFormPage5({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;
  const { data, error } = await fetchPage5Data(trackerId);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page5;

  if (!pageData) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load competency test data.</div>;
  }

  return <Page5Client data={pageData} trackerId={trackerId} />;
}
