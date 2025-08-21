"use server";

import Page5Client from "./Page5Client";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type Page5Result = { page5?: IApplicationFormPage5 };

export default async function ApplicationFormPage5({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/application-form/page-5`;

  const { data, error } = await fetchServerPageData<Page5Result>(url);

  if (error) return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  const pageData = data?.page5;
  if (!pageData) return <div className="p-6 text-center text-red-600 font-semibold">Failed to load competency test data.</div>;

  return <Page5Client data={pageData} trackerId={trackerId} />;
}
