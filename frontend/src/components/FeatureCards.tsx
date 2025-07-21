import {
  FileText,
  Languages,
  ShieldCheck,
} from "lucide-react";

export default function FeatureCards() {
  const features = [
    {
      icon: <FileText className="w-6 h-6 text-blue-700" />,
      title: "6-Step Process",
      description: "Complete all required hiring documents through our guided 6-stage form wizard",
    },
    {
      icon: <Languages className="w-6 h-6 text-blue-700" />,
      title: "Multi-language",
      description: "Available in English, Punjabi, and French to serve all drivers comfortably",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-700" />,
      title: "Secure & Safe",
      description: "Your information is protected with enterprise-grade security and encryption",
    },
  ];

  return (
    <section className="w-full py-12 sm:py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`rounded-xl bg-white shadow-md hover:shadow-lg transition p-6 flex flex-col items-center text-center
                ${
                  index === 2
                    ? "sm:col-span-2 sm:mx-auto sm:w-2/3 lg:col-span-1 lg:mx-0 lg:w-full"
                    : ""
                }`}
            >
              <div className="mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-lg text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
