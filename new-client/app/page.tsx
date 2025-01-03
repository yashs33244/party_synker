import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex flex-col items-center justify-center text-white">
      <h1 className="text-5xl font-bold mb-8">Welcome to Party Synker</h1>
      <p className="text-xl mb-8">Sync your music and party with friends!</p>
      <div className="space-x-4">
        <Link
          href="/login"
          className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="bg-transparent border-2 border-white px-6 py-2 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
