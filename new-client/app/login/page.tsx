"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful:", data);
        // Redirect to lobby or store user data in context/state
        const userid = data.userid;
        console.log(userid);
        router.push(`/lobby?userid=${userid}`);
      } else {
        const error = await response.json();
        alert(`Login failed: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error logging in:", err);
      alert("An error occurred while logging in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex flex-col items-center justify-center text-white">
      <h1 className="text-3xl font-bold mb-8">Login to Party Synker</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 mb-4 rounded text-black"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 mb-4 rounded text-black"
        />
        <button
          type="submit"
          className="w-full bg-white text-purple-600 px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition"
        >
          Login
        </button>
      </form>
      <p className="mt-4">
        Don't have an account?{" "}
        <Link href="/signup" className="text-white hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
