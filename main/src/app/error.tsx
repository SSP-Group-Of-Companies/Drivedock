"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, Mail, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorId] = useState(() => Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    // Log error for monitoring/debugging
    console.error("Root Error Boundary caught:", error);
    
    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }, [error]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Add a small delay to prevent rapid retry loops
      await new Promise(resolve => setTimeout(resolve, 1000));
      reset();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`DriveDock Error Report - ${errorId}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `URL: ${window.location.href}\n\n` +
      `Please describe what you were doing when this error occurred:\n\n`
    );
    window.open(`mailto:safety@sspgroup.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header with SSP Branding */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <div className="flex items-center justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/assets/logos/SSP-Truck-LineFullLogo.png" 
                alt="SSP Group" 
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 mr-3" />
                <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
              </div>
              <p className="text-blue-100">We encountered an unexpected error</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Don&apos;t worry, we&apos;re here to help
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                An unexpected error occurred while processing your request. This has been automatically 
                logged and our technical team has been notified. You can try the options below to continue.
              </p>
              
              {/* Error ID for support reference */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Error Reference ID:</p>
                <p className="font-mono text-sm text-gray-700 bg-white px-3 py-1 rounded border">
                  {errorId}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Primary Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Homepage
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGoBack}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Go Back
                </button>
                
                <button
                  onClick={handleContactSupport}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Support
                </button>
              </div>
            </div>

            {/* Additional Help Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <h3 className="font-medium text-gray-900 mb-3">Need immediate assistance?</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Email:</span>{' '}
                    <a 
                      href="mailto:safety@sspgroup.com" 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      safety@sspgroup.com
                    </a>
                  </p>
                  <p className="text-xs text-gray-500">
                    Please include the Error Reference ID above when contacting support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 SSP Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
