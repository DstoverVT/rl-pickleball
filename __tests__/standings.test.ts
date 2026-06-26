import { describe, it, expect } from "vitest";
import { computeStandings } from "@/lib/standings";
import type { Team, Match } from "@prisma/client";

function team(id: number, name = `Team ${id}`): Team {
  return { id, seasonId: 1, name, color: null, createdAt: new Date() };
}

function match(
  id: number,
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number | null,
  awayScore: number | null
): Match {
  return {
    id,
    seasonId: 1,
    week: 1,
    isByeSlot: false,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: homeScore != null ? "COMPLETE" : "SCHEDULED",
  };
}

describe("computeStandings", () => {
  it("returns all teams even with no matches", () => {
    const teams = [team(1), team(2), team(3)];
    const standings = computeStandings(teams, []);
    expect(standings).toHaveLength(3);
    expect(standings.every((s) => s.wins === 0 && s.losses === 0)).toBe(true);
  });

  it("correctly counts wins and losses", () => {
    const teams = [team(1), team(2)];
    const matches = [match(1, 1, 2, 2, 1)]; // team 1 wins 2-1
    const standings = computeStandings(teams, matches);
    const t1 = standings.find((s) => s.team.id === 1)!;
    const t2 = standings.find((s) => s.team.id === 2)!;
    expect(t1.wins).toBe(1);
    expect(t1.losses).toBe(0);
    expect(t2.wins).toBe(0);
    expect(t2.losses).toBe(1);
  });

  it("sorts by wins descending", () => {
    const teams = [team(1), team(2), team(3)];
    const matches = [
      match(1, 1, 2, 2, 0), // t1 wins
      match(2, 1, 3, 2, 0), // t1 wins
      match(3, 2, 3, 2, 0), // t2 wins
    ];
    const standings = computeStandings(teams, matches);
    expect(standings[0].team.id).toBe(1); // 2 wins
    expect(standings[1].team.id).toBe(2); // 1 win
    expect(standings[2].team.id).toBe(3); // 0 wins
  });

  it("tiebreaker: head-to-head beats alphabetical", () => {
    const teams = [team(1, "Aardvarks"), team(2, "Zebras")];
    // Both 1 win; Zebras beat Aardvarks head-to-head, so Zebras rank higher despite name
    const matches = [
      match(1, 2, 1, 2, 0), // Zebras beat Aardvarks
    ];
    const standings = computeStandings(teams, matches);
    expect(standings[0].team.id).toBe(2); // Zebras ahead despite coming last alphabetically
    expect(standings[1].team.id).toBe(1);
  });

  it("seeds are assigned correctly", () => {
    const teams = [team(1), team(2), team(3)];
    const standings = computeStandings(teams, []);
    expect(standings.map((s) => s.seed)).toEqual([1, 2, 3]);
  });

  it("ignores scheduled (incomplete) matches", () => {
    const teams = [team(1), team(2)];
    const matches = [match(1, 1, 2, null, null)]; // not complete
    const standings = computeStandings(teams, matches);
    expect(standings.every((s) => s.wins === 0)).toBe(true);
  });

  it("bye slot: only bye team (home) gets credit, volunteer (away) unaffected", () => {
    const teams = [team(1), team(2)];
    const byeMatch: Match = {
      id: 1,
      seasonId: 1,
      week: 1,
      isByeSlot: true,
      homeTeamId: 1, // bye team
      awayTeamId: 2, // volunteer
      homeScore: 2,
      awayScore: 1,
      status: "COMPLETE",
    };
    const standings = computeStandings(teams, [byeMatch]);
    const t1 = standings.find((s) => s.team.id === 1)!;
    const t2 = standings.find((s) => s.team.id === 2)!;
    expect(t1.wins).toBe(1);
    expect(t1.gamesFor).toBe(2);
    expect(t2.wins).toBe(0);
    expect(t2.losses).toBe(0);
    expect(t2.gamesFor).toBe(0);
  });

  it("bye slot: bye team gets a loss if volunteer wins", () => {
    const teams = [team(1), team(2)];
    const byeMatch: Match = {
      id: 1,
      seasonId: 1,
      week: 1,
      isByeSlot: true,
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 2,
      status: "COMPLETE",
    };
    const standings = computeStandings(teams, [byeMatch]);
    const t1 = standings.find((s) => s.team.id === 1)!;
    const t2 = standings.find((s) => s.team.id === 2)!;
    expect(t1.losses).toBe(1);
    expect(t2.wins).toBe(0);
    expect(t2.losses).toBe(0);
  });
});
