"use server";
import "server-only";
import CarriersEdgeTrainingClient, { CarriersEdgeTrainingClientProps } from "./CarriersEdgeTrainingClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";
import { checkCompletionAndReturnRedirect } from "@/lib/utils/completionCheck";
import { redirect } from "next/navigation";

export default async function OnboardingCarriersEdgeTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Check if onboarding is completed and redirect if needed
  const redirectPath = await checkCompletionAndReturnRedirect(trackerId);
  if (redirectPath) {
    redirect(redirectPath);
  }

  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/carriers-edge-training`;
  const { data, error } = await fetchServerPageData<CarriersEdgeTrainingClientProps>(url);

  if (error) {
    console.error("Failed to fetch carriers edge training data:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
          <p className="text-gray-600">Unable to load the Carrier&apos;s Edge training page. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!data?.carriersEdgeTraining || !data?.onboardingContext) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Data Not Found</h1>
          <p className="text-gray-600">Required data not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  return <CarriersEdgeTrainingClient carriersEdgeTraining={data.carriersEdgeTraining} onboardingContext={data.onboardingContext} />;
}
