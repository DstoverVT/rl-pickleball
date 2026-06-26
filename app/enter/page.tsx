"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function EnterForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      const next = searchParams.get("next") ?? "/";
      window.location.href = next;
    } else {
      setError("Wrong password");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div
        className="w-full max-w-sm rounded p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs tracking-wider uppercase mb-2"
              style={{ color: "var(--muted)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "var(--accent)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-bold tracking-wider uppercase disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EnterPage() {
  return (
    <Suspense>
      <EnterForm />
    </Suspense>
  );
}
