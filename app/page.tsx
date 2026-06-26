import { prisma } from "@/lib/db";
import { computeStandings } from "@/lib/standings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  if (!season) {
    return (
      <div className="text-center py-24">
        <div
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{ color: "var(--accent)" }}
        >
          No Active Season
        </div>
        <p style={{ color: "var(--muted)" }} className="text-sm">
          An admin needs to set up a season.{" "}
          <Link href="/admin/login" style={{ color: "var(--text)" }} className="underline">
            Admin login →
          </Link>
        </p>
      </div>
    );
  }

  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ where: { seasonId: season.id }, orderBy: { name: "asc" } }),
    prisma.match.findMany({ where: { seasonId: season.id } }),
  ]);

  const standings = computeStandings(teams, matches);

  const playoffCutline = season.playoffTeamCount;
  const showPlayoffMarkers = season.status === "REGULAR" || season.status === "PLAYOFFS";

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <h1
          className="text-xs tracking-[0.3em] uppercase font-bold"
          style={{ color: "var(--accent)" }}
        >
          Standings
        </h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {season.name} · {season.status}
        </span>
      </div>

      {standings.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No teams yet. Check back after an admin sets up the season.
        </p>
      ) : (
        <div
          className="rounded overflow-x-auto"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)" }}>
                <th className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium w-12" style={{ color: "var(--muted)" }}>
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  Team
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  W
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  L
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  Played
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  Pts For
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  Pts Against
                </th>
                <th className="text-right px-4 py-3 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: "var(--muted)" }}>
                  W/L Diff
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => {
                const isPlayoffLine = idx === playoffCutline - 1 && showPlayoffMarkers;
                const isPlayoff = s.seed <= playoffCutline;
                return (
                  <tr
                    key={s.team.id}
                    style={{
                      background: idx % 2 === 0 ? "var(--surface)" : "var(--bg)",
                      borderBottom: isPlayoffLine
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                      {s.seed}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {s.team.name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: s.wins > 0 ? "var(--text)" : "var(--muted)" }}>
                      {s.wins}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                      {s.losses}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                      {s.matchesPlayed}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                      {s.gamesFor}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                      {s.gamesAgainst}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: s.wins - s.losses > 0 ? "var(--win)" : s.wins - s.losses < 0 ? "var(--accent)" : "var(--text)" }}
                    >
                      {s.wins - s.losses > 0 ? `+${s.wins - s.losses}` : s.wins - s.losses}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPlayoffMarkers && (
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Top {playoffCutline} teams advance to playoffs · Red line marks cutoff
        </p>
      )}
      <div className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        <div className="mb-1">Standings order calculation:</div>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li>Win/Loss Diff</li>
          <li>Head-to-head</li>
          <li>Wins</li>
          <li>Pts diff</li>
        </ol>
      </div>
    </div>
  );
}
