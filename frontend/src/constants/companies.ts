export interface Company {
  id: string;
  name: string;
  logo: string;
  country: string;
  countryCode: string;
  countryBadgeColor: string;
  description: string;
  location: string;
  operations: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonGradient: string; // new
}

export const COMPANIES: Company[] = [
  {
    id: "ssp-ca",
    name: "SSP Truckline Inc",
    logo: "/assets/logos/SSP-Truck-LineFullLogo.png",
    country: "Canada",
    countryCode: "CA",
    countryBadgeColor: "bg-green-100 text-green-700",
    description: "Leading transportation solutions across Canada with specialized freight services",
    location: "Toronto, Ontario",
    operations: "Canada Operations",
    buttonColor: "", // not used
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400",
  },
  {
    id: "ssp-us",
    name: "SSP Trucklines Inc",
    logo: "/assets/logos/SSP-Truck-LineFullLogo.png",
    country: "USA",
    countryCode: "US",
    countryBadgeColor: "bg-blue-100 text-blue-700",
    description: "Premier freight solutions across the United States with cross-border coverage",
    location: "Cross-border Operations",
    operations: "United States Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400",
  },
  {
    id: "fellowstrans",
    name: "FellowsTrans Inc",
    logo: "/assets/logos/FellowLogo.png",
    country: "Canada",
    countryCode: "CA",
    countryBadgeColor: "bg-green-100 text-green-700",
    description: "Reliable freight solutions with a focus on customer satisfaction",
    location: "Canada Operations",
    operations: "Canada Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-red-600 via-red-500 to-pink-400",
  },
  {
    id: "webfreight",
    name: "Web Freight Inc",
    logo: "/assets/logos/WebLogog.png",
    country: "Canada",
    countryCode: "CA",
    countryBadgeColor: "bg-green-100 text-green-700",
    description: "Modern logistics solutions powered by technology and innovation",
    location: "Canada Operations",
    operations: "Canada Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-300",
  },
  {
    id: "nesh",
    name: "New England Steel Haulers Inc",
    logo: "/assets/logos/NewEnglandLogo.png",
    country: "Canada",
    countryCode: "CA",
    countryBadgeColor: "bg-green-100 text-green-700",
    description: "Specialized steel and heavy materials transportation across North America",
    location: "United States Operations",
    operations: "United States Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-purple-700 via-purple-500 to-pink-400",
  },
]; 