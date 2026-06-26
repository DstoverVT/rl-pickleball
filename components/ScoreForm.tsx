"use client";

import { useTransition, useState } from "react";
import { submitScore } from "@/app/schedule/actions";

interface Props {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
  homeWon: boolean;
  awayWon: boolean;
  isVolunteer: boolean;
  editable: boolean;
}

export default function ScoreForm({
  matchId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  isComplete,
  homeWon,
  awayWon,
  isVolunteer,
  editable,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const home = Number(formData.get("homeScore"));
    const away = Number(formData.get("awayScore"));
    const isReset = home === 0 && away === 0;
    startTransition(async () => {
      await submitScore(formData);
      setToast(isReset ? "Score cleared!" : isComplete ? "Score updated!" : "Score saved!");
      setTimeout(() => setToast(""), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
        {/* Home team */}
        <div className="w-full sm:flex-1 flex items-center justify-center sm:justify-end gap-2 min-w-0">
          <span className="font-medium truncate" style={{ color: isComplete && !homeWon ? "var(--accent)" : "var(--text)" }}>
            {homeTeamName}
          </span>
          {homeWon && <span className="text-xs font-bold tracking-wider px-1 rounded shrink-0" style={{ background: "var(--win)", color: "var(--win-text)" }}>WIN</span>}
        </div>

        {/* Score inputs */}
        <div className="flex items-center justify-center gap-2 shrink-0 sm:w-36">
          <input
            type="number"
            name="homeScore"
            min="0"
            max="99"
            placeholder="0"
            defaultValue={homeScore ?? ""}
            className="w-14 text-center rounded px-2 py-1.5 font-mono text-sm"
            style={{
              background: "var(--bg)",
              border: `1px solid ${isComplete ? "var(--accent-dim)" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input
            type="number"
            name="awayScore"
            min="0"
            max="99"
            placeholder="0"
            defaultValue={awayScore ?? ""}
            className="w-14 text-center rounded px-2 py-1.5 font-mono text-sm"
            style={{
              background: "var(--bg)",
              border: `1px solid ${isComplete ? "var(--accent-dim)" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
        </div>

        {/* Away team */}
        <div className="w-full sm:flex-1 flex items-center justify-center sm:justify-start gap-2 min-w-0">
          {awayWon && <span className="text-xs font-bold tracking-wider px-1 rounded shrink-0" style={{ background: "var(--win)", color: "var(--win-text)" }}>WIN</span>}
          <span className="font-medium truncate" style={{ color: isComplete && !awayWon ? "var(--accent)" : "var(--text)" }}>
            {awayTeamName}
          </span>
        </div>

        {/* Button + toast */}
        <div className="flex items-center justify-center gap-3 shrink-0">
          {!editable ? (
            <span className="text-xs" style={{ color: "var(--muted)" }}>Locked</span>
          ) : toast ? (
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              {toast}
            </span>
          ) : (
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
              style={{
                background: isComplete ? "transparent" : "var(--accent)",
                color: isComplete ? "var(--accent)" : "#fff",
                border: `1px solid ${isComplete ? "var(--accent)" : "transparent"}`,
              }}
            >
              {isPending ? "..." : isComplete ? "Update" : "Save"}
            </button>
          )}
        </div>
      </div>
      {editable && isComplete && (
        <div className="mt-1 text-right">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Save 0–0 to reset
          </span>
        </div>
      )}
    </form>
  );
}
