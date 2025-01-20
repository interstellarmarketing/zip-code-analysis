import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-20">
        <h1 className="text-5xl font-bold text-gray-900">
          Manage ZIP Codes with Ease
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload, analyze, and compare ZIP code lists effortlessly. Get instant access to location data, demographics, and more.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-xl font-semibold mb-3">ZIP Code Validation</h3>
          <p className="text-gray-600">
            Automatically validate and clean your ZIP code lists with our powerful tools.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-xl font-semibold mb-3">Location Data</h3>
          <p className="text-gray-600">
            Get detailed information about each ZIP code, including city, state, and demographics.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-xl font-semibold mb-3">List Comparison</h3>
          <p className="text-gray-600">
            Compare multiple ZIP code lists to identify changes and analyze differences.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="text-center space-y-8">
        <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <h3 className="font-semibold">Upload Your List</h3>
            <p className="text-gray-600">Upload or paste your ZIP codes</p>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-blue-600">2</div>
            <h3 className="font-semibold">Validate Data</h3>
            <p className="text-gray-600">We'll clean and validate your data</p>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-blue-600">3</div>
            <h3 className="font-semibold">Get Insights</h3>
            <p className="text-gray-600">View detailed information and analytics</p>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-blue-600">4</div>
            <h3 className="font-semibold">Compare Lists</h3>
            <p className="text-gray-600">Analyze changes between lists</p>
          </div>
        </div>
      </section>
    </div>
  );
}
