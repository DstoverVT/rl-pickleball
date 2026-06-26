"use client";

import { useTransition, useState } from "react";
import { submitPlayoffScore } from "@/app/playoffs/actions";

interface Props {
  matchId: number;
  score1: number | null;
  score2: number | null;
  isComplete: boolean;
  editable: boolean;
}

export default function PlayoffScoreForm({ matchId, score1, score2, isComplete, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const s1 = Number(formData.get("score1"));
    const s2 = Number(formData.get("score2"));
    const isReset = s1 === 0 && s2 === 0;
    startTransition(async () => {
      await submitPlayoffScore(formData);
      setToast(isReset ? "Score cleared!" : isComplete ? "Score updated!" : "Score saved!");
      setTimeout(() => setToast(""), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 flex items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="number"
        name="score1"
        min="0"
        max="99"
        placeholder="0"
        defaultValue={score1 ?? ""}
        className="w-10 text-center rounded px-1 py-1 font-mono text-xs"
        style={{
          background: "var(--bg)",
          border: `1px solid ${isComplete ? "var(--accent-dim)" : "var(--border)"}`,
          color: "var(--text)",
        }}
      />
      <span style={{ color: "var(--muted)" }} className="text-xs">–</span>
      <input
        type="number"
        name="score2"
        min="0"
        max="99"
        placeholder="0"
        defaultValue={score2 ?? ""}
        className="w-10 text-center rounded px-1 py-1 font-mono text-xs"
        style={{
          background: "var(--bg)",
          border: `1px solid ${isComplete ? "var(--accent-dim)" : "var(--border)"}`,
          color: "var(--text)",
        }}
      />
      {!editable ? (
        <span className="text-xs flex-1" style={{ color: "var(--muted)" }}>Locked</span>
      ) : toast ? (
        <span className="text-xs font-medium flex-1" style={{ color: "var(--accent)" }}>
          {toast}
        </span>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-1 rounded text-xs font-bold tracking-wider uppercase disabled:opacity-50"
          style={{
            background: isComplete ? "transparent" : "var(--accent)",
            color: isComplete ? "var(--accent)" : "#fff",
            border: `1px solid ${isComplete ? "var(--accent)" : "transparent"}`,
          }}
        >
          {isPending ? "..." : isComplete ? "Update" : "Save"}
        </button>
      )}

    </form>
  );
}
