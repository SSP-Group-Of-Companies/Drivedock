"use client";

import Image from "next/image";
// import Link from "next/link";
// import { ShieldCheck } from "lucide-react"; 

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center">
          <Image
          src="/assets/logos/SSP-Truck-LineFullLogo.png"
          alt="SSP Logo"
          width={130}
          height={40}
          className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain"
          priority
        />
        </div>

        {/* Safety Dashboard Button */}
        {/* <Link
          href="https://ssp-portal.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition"
        >
          <ShieldCheck className="w-4 h-4" />
          Safety Dashboard
        </Link> */}
      </div>
    </header>
  );
}
