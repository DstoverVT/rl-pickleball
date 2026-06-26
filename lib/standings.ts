import type { Match, Team } from "@prisma/client";

export interface TeamStanding {
  team: Team;
  seed: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gamesDiff: number;
}

export function computeStandings(
  teams: Team[],
  matches: Match[]
): TeamStanding[] {
  const completed = matches.filter((m) => m.status === "COMPLETE");

  const stats = new Map<
    number,
    {
      wins: number;
      losses: number;
      gamesFor: number;
      gamesAgainst: number;
      opponents: number[];
    }
  >();

  for (const t of teams) {
    stats.set(t.id, {
      wins: 0,
      losses: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      opponents: [],
    });
  }

  for (const m of completed) {
    if (m.homeTeamId && m.awayTeamId && m.homeScore != null && m.awayScore != null) {
      const home = stats.get(m.homeTeamId);
      const away = stats.get(m.awayTeamId);

      if (m.isByeSlot) {
        // Only the bye team (home) gets their record updated; volunteer (away) is unaffected
        if (home) {
          home.gamesFor += m.homeScore;
          home.gamesAgainst += m.awayScore;
          if (m.homeScore > m.awayScore) home.wins++;
          else home.losses++;
        }
      } else {
        // Normal match — update both teams
        if (home && away) {
          home.gamesFor += m.homeScore;
          home.gamesAgainst += m.awayScore;
          away.gamesFor += m.awayScore;
          away.gamesAgainst += m.homeScore;
          home.opponents.push(m.awayTeamId);
          away.opponents.push(m.homeTeamId);
          if (m.homeScore > m.awayScore) {
            home.wins++;
            away.losses++;
          } else {
            away.wins++;
            home.losses++;
          }
        }
      }
    }
  }

  // Head-to-head tiebreaker — only from non-bye matches
  const h2hWins = new Map<string, number>();
  for (const m of completed) {
    if (m.isByeSlot) continue;
    if (m.homeTeamId && m.awayTeamId && m.homeScore != null && m.awayScore != null) {
      const winner = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
      const loser = winner === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      const key = `${winner}-${loser}`;
      h2hWins.set(key, (h2hWins.get(key) ?? 0) + 1);
    }
  }

  const rows = teams.map((t) => {
    const s = stats.get(t.id) ?? {
      wins: 0,
      losses: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      opponents: [],
    };
    return {
      team: t,
      seed: 0,
      matchesPlayed: s.wins + s.losses,
      wins: s.wins,
      losses: s.losses,
      gamesFor: s.gamesFor,
      gamesAgainst: s.gamesAgainst,
      gamesDiff: s.gamesFor - s.gamesAgainst,
    };
  });

  // Sort: 1) W/L diff desc, 2) head-to-head, 3) pts diff, 4) pts for, 5) name
  rows.sort((a, b) => {
    const aDiff = a.wins - a.losses;
    const bDiff = b.wins - b.losses;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aBeatB = h2hWins.get(`${a.team.id}-${b.team.id}`) ?? 0;
    const bBeatA = h2hWins.get(`${b.team.id}-${a.team.id}`) ?? 0;
    if (aBeatB !== bBeatA) return bBeatA - aBeatB;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
    return a.team.name.localeCompare(b.team.name);
  });

  return rows.map((r, i) => ({ ...r, seed: i + 1 }));
}
