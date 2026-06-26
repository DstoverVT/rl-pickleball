import { describe, it, expect } from "vitest";
import { buildBracket } from "@/lib/playoffs";
import type { TeamStanding } from "@/lib/standings";
import type { Team } from "@prisma/client";

function makeStandings(n: number): TeamStanding[] {
  return Array.from({ length: n }, (_, i) => ({
    team: { id: i + 1, name: `Team ${i + 1}`, seasonId: 1, color: null, createdAt: new Date() } as Team,
    seed: i + 1,
    matchesPlayed: 0,
    wins: n - i,
    losses: i,
    gamesFor: 0,
    gamesAgainst: 0,
    gamesDiff: 0,
  }));
}

describe("buildBracket", () => {
  it("perfect bracket (4 teams) has 3 slots", () => {
    const slots = buildBracket(makeStandings(4), 4);
    expect(slots).toHaveLength(3); // 2 semis + 1 final
  });

  it("perfect bracket (8 teams) has 7 slots", () => {
    const slots = buildBracket(makeStandings(8), 8);
    expect(slots).toHaveLength(7);
  });

  it("6-team bracket has correct structure", () => {
    const slots = buildBracket(makeStandings(6), 6);
    // bracketSize=8: 4+2+1 = 7 slots
    expect(slots).toHaveLength(7);
    // Seeds 1 and 2 should have byes (one side null in round 1)
    const round1 = slots.filter((s) => s.round === 1);
    const byeSlots = round1.filter((s) => s.team1Id === null || s.team2Id === null);
    expect(byeSlots.length).toBe(2);
  });

  it("each round doubles the previous slot count (descending toward final)", () => {
    const slots = buildBracket(makeStandings(8), 8);
    const rounds = [...new Set(slots.map((s) => s.round))].sort((a, b) => a - b);
    let prev = slots.filter((s) => s.round === rounds[0]).length;
    for (let i = 1; i < rounds.length; i++) {
      const curr = slots.filter((s) => s.round === rounds[i]).length;
      expect(curr).toBe(prev / 2);
      prev = curr;
    }
  });

  it("seed 1 vs seed N in first round (no byes)", () => {
    const standings = makeStandings(4);
    const slots = buildBracket(standings, 4);
    const round1 = slots.filter((s) => s.round === 1);
    const match0 = round1[0];
    // slot 1: seed 1 vs seed 4
    expect(match0.team1Id).toBe(1);
    expect(match0.team2Id).toBe(4);
  });

  it("all teams makes a full bracket", () => {
    const slots = buildBracket(makeStandings(12), 12);
    // bracketSize=16: 8+4+2+1=15
    expect(slots).toHaveLength(15);
  });

  it("nextMatchIdx links are valid indices", () => {
    const slots = buildBracket(makeStandings(8), 8);
    for (const slot of slots) {
      if (slot.nextMatchIdx !== null) {
        expect(slot.nextMatchIdx).toBeGreaterThanOrEqual(0);
        expect(slot.nextMatchIdx).toBeLessThan(slots.length);
      }
    }
  });
});
