import { describe, it, expect } from "vitest";
import { RoundRobinStrategy } from "@/lib/scheduler/roundRobin";

function makeTeams(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Team ${i + 1}` }));
}

describe("RoundRobinStrategy", () => {
  it("produces correct week count", () => {
    const s = new RoundRobinStrategy();
    const plan = s.generate(makeTeams(12), 6);
    expect(plan).toHaveLength(6);
  });

  it("each team plays exactly once per week (even teams)", () => {
    const s = new RoundRobinStrategy();
    const teams = makeTeams(12);
    const plan = s.generate(teams, 6);
    for (const week of plan) {
      const seen = new Set<number>();
      for (const m of week.matchups) {
        expect(seen.has(m.home.id)).toBe(false);
        seen.add(m.home.id);
        if (m.away) {
          expect(seen.has(m.away.id)).toBe(false);
          seen.add(m.away.id);
        }
      }
      expect(seen.size).toBe(teams.length);
    }
  });

  it("each team plays exactly once per week (odd teams — one bye)", () => {
    const s = new RoundRobinStrategy();
    const teams = makeTeams(7);
    const plan = s.generate(teams, 6);
    for (const week of plan) {
      const seen = new Set<number>();
      let byes = 0;
      for (const m of week.matchups) {
        seen.add(m.home.id);
        if (m.away) seen.add(m.away.id);
        else byes++;
      }
      expect(byes).toBe(1);
      expect(seen.size).toBe(teams.length);
    }
  });

  it("correct match count per week (12 teams → 6 matches/week)", () => {
    const s = new RoundRobinStrategy();
    const plan = s.generate(makeTeams(12), 6);
    for (const week of plan) {
      expect(week.matchups.length).toBe(6);
    }
  });

  it("cycles when weeks > N-1 rounds", () => {
    const s = new RoundRobinStrategy();
    const teams = makeTeams(4); // 3 unique rounds
    const plan = s.generate(teams, 6); // should cycle
    expect(plan).toHaveLength(6);
    // Each week should still have exactly 2 matches and no team duplicated
    for (const week of plan) {
      const ids = week.matchups.flatMap((m) => [m.home.id, m.away?.id].filter(Boolean));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("handles fewer weeks than rounds", () => {
    const s = new RoundRobinStrategy();
    const plan = s.generate(makeTeams(12), 3); // 11 rounds, only want 3
    expect(plan).toHaveLength(3);
  });

  it("week numbers are sequential starting at 1", () => {
    const s = new RoundRobinStrategy();
    const plan = s.generate(makeTeams(6), 4);
    expect(plan.map((w) => w.week)).toEqual([1, 2, 3, 4]);
  });
});
