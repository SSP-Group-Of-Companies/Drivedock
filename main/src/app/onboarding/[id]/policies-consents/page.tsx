import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import PoliciesConsentsClient, { PoliciesConsentsClientProps } from "./PoliciesConsentsClient";

type PageDataResponse = {
    data?: PoliciesConsentsClientProps;
    error?: string;
};

// Server-side data fetching function
async function fetchPageData(trackerId: string): Promise<PageDataResponse> {
    try {
        const response = await fetch(
            `${NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            }/api/v1/onboarding/${trackerId}/policies-consents`,
            {
                cache: "no-store",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return { error: errorData?.message || "Failed to fetch data." };
        }

        const json = await response.json();
        return { data: json.data };
    } catch (error) {
        console.error("Error fetching policies-consents:", error);
        return { error: "Unexpected server error. Please try again later." };
    }
}

export default async function ApplicationFormPagePoliciesConsents({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: trackerId } = await params;

    const { data, error } = await fetchPageData(trackerId);

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 font-semibold">{error}</div>
        );
    }

    if (!data?.policiesConsents || !data?.onboardingContext) {
        return (
            <div className="p-6 text-center text-red-600 font-semibold">
                Failed to load data. Please try again later.
            </div>
        );
    }

    return (
        <PoliciesConsentsClient
            policiesConsents={data.policiesConsents}
            onboardingContext={data.onboardingContext}
        />
    );
}
