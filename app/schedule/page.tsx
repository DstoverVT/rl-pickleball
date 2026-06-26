import { prisma } from "@/lib/db";
import { assignByeOpponent, setCurrentWeek } from "./actions";
import TeamRenameInput from "@/components/TeamRenameInput";
import { isAdmin } from "@/lib/auth";
import Link from "next/link";
import ScoreForm from "@/components/ScoreForm";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  if (!season) {
    return (
      <div className="text-center py-24">
        <div className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: "var(--accent)" }}>
          No Active Season
        </div>
        <p style={{ color: "var(--muted)" }} className="text-sm">
          <Link href="/admin/login" style={{ color: "var(--text)" }} className="underline">
            Admin login →
          </Link>
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const admin = await isAdmin();
  const [allMatches, allTeams] = await Promise.all([
    prisma.match.findMany({
      where: { seasonId: season.id },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ week: "asc" }, { id: "asc" }],
    }),
    prisma.team.findMany({
      where: { seasonId: season.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const weeks = [...new Set(allMatches.map((m) => m.week))].sort((a, b) => a - b);
  const currentWeek = params.week ? Number(params.week) : (weeks[0] ?? 1);
  const weekMatches = allMatches.filter((m) => m.week === currentWeek);

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="text-xs tracking-[0.3em] uppercase font-bold" style={{ color: "var(--accent)" }}>
          Schedule
        </h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {season.name}
        </span>
      </div>

      {/* Rename teams */}
      {allTeams.length > 0 && (
        <details className="mb-6 group">
          <summary
            className="text-xs tracking-wider uppercase cursor-pointer select-none mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded font-bold"
            style={{
              color: "var(--text)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              listStyle: "none",
            }}
          >
            Rename Your Team
            <svg
              className="w-3 h-3 transition-transform duration-150 group-open:rotate-180"
              style={{ color: "var(--muted)" }}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2,4 6,8 10,4" />
            </svg>
          </summary>
          <div className="flex flex-wrap gap-2 mt-3">
            {allTeams.map((team) => (
              <TeamRenameInput key={team.id} id={team.id} name={team.name} />
            ))}
          </div>
        </details>
      )}

      {weeks.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No schedule generated yet.
        </p>
      ) : (
        <>
          {/* Week selector */}
          <div className="flex gap-1 flex-wrap mb-2">
            {weeks.map((w) => {
              const weekDone = allMatches.filter((m) => m.week === w).every((m) => m.status === "COMPLETE");
              const isCurrent = w === season.currentWeek;
              return (
                <Link
                  key={w}
                  href={`/schedule?week=${w}`}
                  className="px-3 py-1.5 text-xs tracking-wider uppercase rounded font-mono transition-colors"
                  style={{
                    background: w === currentWeek ? "var(--accent)" : weekDone ? "var(--surface2)" : "var(--surface)",
                    color: w === currentWeek ? "#fff" : weekDone ? "var(--muted)" : "var(--text)",
                    border: `1px solid ${isCurrent ? "var(--accent)" : w === currentWeek ? "var(--accent)" : "var(--border)"}`,
                    outline: isCurrent && w !== currentWeek ? "1px solid var(--accent)" : undefined,
                  }}
                >
                  W{w}{isCurrent ? " ★" : ""}
                </Link>
              );
            })}
          </div>

          {/* Current week controls */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {season.currentWeek
                ? `Current week: W${season.currentWeek} — only W${season.currentWeek} is open for score entry`
                : "No current week set — all weeks locked for non-admins"}
            </span>
            {admin && (
              <form action={setCurrentWeek} className="ml-auto">
                <input type="hidden" name="seasonId" value={season.id} />
                <input type="hidden" name="week" value={currentWeek} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded font-bold tracking-wider uppercase"
                  style={{
                    background: season.currentWeek === currentWeek ? "var(--accent)" : "var(--surface2)",
                    color: season.currentWeek === currentWeek ? "#fff" : "var(--text)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {season.currentWeek === currentWeek ? "★ Current Week" : `Set W${currentWeek} as Current`}
                </button>
              </form>
            )}
          </div>

          {/* Match cards */}
          <div className="space-y-3">
            {weekMatches.map((match) => {
              const isComplete = match.status === "COMPLETE";
              const homeWon = isComplete && (match.homeScore ?? 0) > (match.awayScore ?? 0);
              const awayWon = isComplete && (match.awayScore ?? 0) > (match.homeScore ?? 0);
              const isBye = !match.awayTeamId;
              const hasVolunteer = match.isByeSlot && !!match.awayTeamId;
              const editable = season.status !== "PLAYOFFS" && (admin || !season.currentWeek || match.week === season.currentWeek);

              return (
                <div
                  key={match.id}
                  className="rounded p-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {isBye ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                      {/* BYE team name — same slot as home team in regular matches */}
                      <div className="w-full sm:flex-1 flex items-center justify-center sm:justify-end gap-2 min-w-0">
                        <span className="font-medium truncate">{match.homeTeam?.name}</span>
                        <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>BYE</span>
                      </div>
                      {/* Spacer matching score inputs width */}
                      <div className="hidden sm:block sm:w-36 sm:shrink-0" />
                      {/* Volunteer select — same flex-1 slot as away team name */}
                      {!editable ? (
                        <div className="hidden sm:block sm:flex-1" />
                      ) : (
                        <form
                          id={`bye-form-${match.id}`}
                          action={assignByeOpponent}
                          className="w-full sm:flex-1 flex items-center"
                        >
                          <input type="hidden" name="matchId" value={match.id} />
                          <select
                            name="teamId"
                            className="w-full sm:w-auto rounded px-2 py-1.5 text-sm"
                            style={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                              cursor: "pointer",
                            }}
                          >
                            <option value="">Volunteer opponent…</option>
                            {allTeams
                              .filter((t) => t.id !== match.homeTeamId)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </form>
                      )}
                      {/* Assign button — same shrink-0 slot as Save/Update button */}
                      <div className="flex items-center justify-center gap-3 shrink-0">
                        {!editable ? (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>Locked</span>
                        ) : (
                          <button
                            form={`bye-form-${match.id}`}
                            type="submit"
                            className="px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase"
                            style={{ background: "var(--accent)", color: "#fff" }}
                          >
                            Assign
                          </button>
                        )}</div>
                    </div>
                  ) : (
                    <>
                      <ScoreForm
                        matchId={match.id}
                        homeTeamName={match.homeTeam?.name ?? "TBD"}
                        awayTeamName={match.awayTeam?.name ?? "TBD"}
                        homeScore={match.homeScore}
                        awayScore={match.awayScore}
                        isComplete={isComplete}
                        homeWon={homeWon}
                        awayWon={awayWon}
                        isVolunteer={hasVolunteer}
                        editable={editable}
                      />
                      {hasVolunteer && (
                        <form action={assignByeOpponent} className="mt-2 flex justify-end">
                          <input type="hidden" name="matchId" value={match.id} />
                          <input type="hidden" name="teamId" value="" />
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 rounded"
                            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
                          >
                            Clear volunteer → BYE
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
