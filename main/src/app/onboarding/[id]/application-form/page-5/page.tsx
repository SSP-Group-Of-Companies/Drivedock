"use server";

import Page5Client from "./Page5Client";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { isProd } from "@/config/env";
import { resolveInternalBaseUrl } from "@/lib/utils/urlConstructor";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type Page5Result = { page5?: IApplicationFormPage5 };

async function buildUrl(trackerId: string) {
  return isProd
    ? `/api/v1/onboarding/${trackerId}/application-form/page-5` // same-origin in prod/preview
    : `${await resolveInternalBaseUrl()}/api/v1/onboarding/${trackerId}/application-form/page-5`; // dev
}

export default async function ApplicationFormPage5({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;
  const url = await buildUrl(trackerId);

  const { data, error } = await fetchServerPageData<Page5Result>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page5;
  if (!pageData) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load competency test data.</div>;
  }

  return <Page5Client data={pageData} trackerId={trackerId} />;
}
