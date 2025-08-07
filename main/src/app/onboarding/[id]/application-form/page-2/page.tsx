import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import Page2Client from "./Page2Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";

// 🧠 Utility: Normalize ISO date to YYYY-MM-DD
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

// 🔍 Fetch Page 2 Data
async function fetchPage2Data(trackerId: string) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/v1/onboarding/${trackerId}/application-form/page-2`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.page2 || null;
  } catch (error) {
    console.error("Error fetching page 2 data:", error);
    return null;
  }
}

// 🔁 Server Component Wrapper
export default async function ApplicationFormPage2({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;

  const pageData = await fetchPage2Data(trackerId);

  const defaultValues: ApplicationFormPage2Schema = pageData
    ? {
      employments: pageData.employments?.length
        ? pageData.employments.map((employment: any) => ({
          employerName: employment.employerName || "",
          supervisorName: employment.supervisorName || "",
          address: employment.address || "",
          postalCode: employment.postalCode || "",
          city: employment.city || "",
          stateOrProvince: employment.stateOrProvince || "",
          phone1: employment.phone1 || "",
          phone2: employment.phone2 || "",
          email: employment.email || "",
          positionHeld: employment.positionHeld || "",
          from: formatDate(employment.from),
          to: formatDate(employment.to),
          salary: employment.salary || "",
          reasonForLeaving: employment.reasonForLeaving || "",
          subjectToFMCSR: employment.subjectToFMCSR,
          safetySensitiveFunction: employment.safetySensitiveFunction,
          gapExplanationBefore: employment.gapExplanationBefore || "",
        }))
        : [
          {
            employerName: "",
            supervisorName: "",
            address: "",
            postalCode: "",
            city: "",
            stateOrProvince: "",
            phone1: "",
            phone2: "",
            email: "",
            positionHeld: "",
            from: "",
            to: "",
            salary: "",
            reasonForLeaving: "",
            subjectToFMCSR: undefined,
            safetySensitiveFunction: undefined,
            gapExplanationBefore: "",
          },
        ],
    }
    : {
      employments: [
        {
          employerName: "",
          supervisorName: "",
          address: "",
          postalCode: "",
          city: "",
          stateOrProvince: "",
          phone1: "",
          phone2: "",
          email: "",
          positionHeld: "",
          from: "",
          to: "",
          salary: "",
          reasonForLeaving: "",
          subjectToFMCSR: undefined,
          safetySensitiveFunction: undefined,
          gapExplanationBefore: "",
        },
      ],
    };

  return <Page2Client defaultValues={defaultValues} trackerId={trackerId} />;
}
