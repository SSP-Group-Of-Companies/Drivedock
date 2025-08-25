import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
          
          <Link
            href="/dashboard/home"
            className="inline-block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
