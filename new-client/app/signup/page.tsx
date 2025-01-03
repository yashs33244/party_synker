"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    // Here, you would typically call your custom auth API to register the user
    console.log("Signing up with:", { name, username, email, password });

    try {
      const response = await fetch("http://localhost:8000/api/signup", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Signup successful:", data);
        // Redirect to lobby or show success message
        router.push("/lobby");
      } else {
        const error = await response.json();
        alert(`Signup failed: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error signing up:", error);
    } // For now, we'll just redirect to the lobby
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-3xl font-bold mb-8">Sign Up for Party Synker</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded text-black"
          required
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 rounded text-black"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded text-black"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded text-black"
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 rounded text-black"
          required
        />
        <button
          type="submit"
          className="w-full bg-white text-purple-600 px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition"
        >
          Sign Up
        </button>
      </form>
      <p className="mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
