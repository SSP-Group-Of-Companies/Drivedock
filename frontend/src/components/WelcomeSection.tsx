import CTAButtons from "./CTAButtons";

export default function WelcomeSection() {
  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-2xl mx-auto">
      <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 leading-tight">
        Join the Road with SSP
      </h1>

      <p className="mt-4 text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
        Your digital onboarding platform for joining SSP Truck Line.
        Complete your hiring documents quickly and securely.
      </p>

      <div className="mt-6 sm:mt-10">
        <CTAButtons />
      </div>
    </section>
  );
}
