import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { computeStandings } from "@/lib/standings";
import Link from "next/link";
import PlayoffScoreForm from "@/components/PlayoffScoreForm";

export const dynamic = "force-dynamic";

export default async function PlayoffsPage() {
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

  const [playoffMatches, teams, regularMatches] = await Promise.all([
    prisma.playoffMatch.findMany({
      where: { seasonId: season.id },
      include: { team1: true, team2: true },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    }),
    prisma.team.findMany({ where: { seasonId: season.id } }),
    prisma.match.findMany({ where: { seasonId: season.id } }),
  ]);

  const standings = computeStandings(teams, regularMatches);
  const seedMap = new Map(standings.map((s) => [s.team.id, s.seed]));

  if (playoffMatches.length === 0) {
    return (
      <div>
        <div className="flex items-baseline gap-4 mb-6">
          <h1 className="text-xs tracking-[0.3em] uppercase font-bold" style={{ color: "var(--accent)" }}>
            Playoffs
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No playoff bracket generated yet. An admin needs to generate it from the admin panel.
        </p>
      </div>
    );
  }

  const admin = await isAdmin();

  // Active round = lowest round that still has incomplete scoreable matches
  const activeRound = playoffMatches
    .filter((m) => m.status === "SCHEDULED" && m.team1Id && m.team2Id)
    .reduce((min, m) => (m.round < min ? m.round : min), Infinity);

  const rounds = [...new Set(playoffMatches.map((m) => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds[rounds.length - 1];

  function roundName(round: number) {
    const remaining = totalRounds - round + 1;
    if (remaining === 1) return "Final";
    if (remaining === 2) return "Semifinal";
    if (remaining === 3) return "Quarterfinal";
    return `Round ${round}`;
  }

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-xs tracking-[0.3em] uppercase font-bold" style={{ color: "var(--accent)" }}>
          Playoffs
        </h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {season.name}
        </span>
      </div>

      {/* Horizontal bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((round) => {
            const roundMatches = playoffMatches
              .filter((m) => m.round === round)
              .sort((a, b) => a.slot - b.slot);

            return (
              <div key={round} className="flex flex-col">
                <div
                  className="text-xs tracking-[0.2em] uppercase font-bold mb-4 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  {roundName(round)}
                </div>
                <div
                  className="flex flex-col gap-4"
                  style={{ justifyContent: "space-around", flex: 1 }}
                >
                  {roundMatches.map((match) => {
                    const isComplete = match.status === "COMPLETE";
                    const team1Won = isComplete && (match.score1 ?? 0) > (match.score2 ?? 0);
                    const team2Won = isComplete && (match.score2 ?? 0) > (match.score1 ?? 0);
                    const isBye =
                      !match.team1Id ||
                      !match.team2Id;
                    const hasBothTeams = match.team1Id && match.team2Id;

                    return (
                      <div
                        key={match.id}
                        className="rounded w-56"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          minHeight: "100px",
                        }}
                      >
                        {/* Team 1 row */}
                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <span
                            className="text-sm font-medium truncate flex-1"
                            style={{ color: isComplete && !team1Won ? "var(--accent)" : match.team1Id ? "var(--text)" : "var(--muted)" }}
                          >
                            {match.team1Id && (
                              <span className="font-mono text-xs mr-1" style={{ color: "var(--muted)" }}>
                                #{seedMap.get(match.team1Id) ?? "?"}
                              </span>
                            )}
                            {match.team1?.name ?? (isBye && match.team2Id ? "BYE" : "TBD")}
                          </span>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {isComplete && (
                              <span className="font-mono text-sm tabular-nums" style={{ color: team1Won ? "var(--win)" : "var(--muted)" }}>
                                {match.score1}
                              </span>
                            )}
                            {team1Won && (
                              <span className="text-xs font-bold tracking-wider px-1 rounded" style={{ background: "var(--win)", color: "var(--win-text)" }}>
                                WIN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Team 2 row */}
                        <div
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span
                            className="text-sm font-medium truncate flex-1"
                            style={{ color: isComplete && !team2Won ? "var(--accent)" : match.team2Id ? "var(--text)" : "var(--muted)" }}
                          >
                            {match.team2Id && (
                              <span className="font-mono text-xs mr-1" style={{ color: "var(--muted)" }}>
                                #{seedMap.get(match.team2Id) ?? "?"}
                              </span>
                            )}
                            {match.team2?.name ?? "TBD"}
                          </span>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {isComplete && (
                              <span className="font-mono text-sm tabular-nums" style={{ color: team2Won ? "var(--win)" : "var(--muted)" }}>
                                {match.score2}
                              </span>
                            )}
                            {team2Won && (
                              <span className="text-xs font-bold tracking-wider px-1 rounded" style={{ background: "var(--win)", color: "var(--win-text)" }}>
                                WIN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score entry */}
                        {hasBothTeams ? (
                          <PlayoffScoreForm
                            matchId={match.id}
                            score1={match.score1}
                            score2={match.score2}
                            isComplete={isComplete}
                            editable={admin || match.round === activeRound}
                          />
                        ) : (
                          <div className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
                            Waiting for teams
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
