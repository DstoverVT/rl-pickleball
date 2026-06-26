import type { TeamStanding } from "./standings";

export interface BracketSlot {
  round: number;
  slot: number;
  team1Id: number | null;
  team2Id: number | null;
  nextMatchIdx: number | null; // 0-based index into the returned array
  nextSlot: number | null; // 1 or 2 (feeds into team1 or team2 of next match)
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Returns the ordered list of seeds for a bracket of size n.
// Consecutive pairs are round-1 matchups that keep top seeds on opposite halves.
// e.g. n=8 → [1, 8, 4, 5, 2, 7, 3, 6] → pairs (1v8), (4v5), (2v7), (3v6)
function seedOrder(n: number): number[] {
  if (n <= 2) return [1, 2];
  const prev = seedOrder(n / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s, n + 1 - s);
  }
  return result;
}

// Build a single-elimination bracket.
// Returns slots ordered by (round asc, slot asc).
// The caller is responsible for persisting them as PlayoffMatch rows.
export function buildBracket(
  standings: TeamStanding[],
  count: number
): BracketSlot[] {
  const seeded = standings.slice(0, count);
  const bracketSize = nextPow2(count);
  const totalRounds = Math.log2(bracketSize);

  // Build all slots, round 1 first
  const slots: BracketSlot[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const matchesThisRound = bracketSize / Math.pow(2, round);
    for (let slot = 1; slot <= matchesThisRound; slot++) {
      slots.push({
        round,
        slot,
        team1Id: null,
        team2Id: null,
        nextMatchIdx: null,
        nextSlot: null,
      });
    }
  }

  // Link each slot to the next match its winner feeds into
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.round < totalRounds) {
      // Find the match in the next round that this feeds into
      // slot n (1-based) feeds into ceil(n/2) in the next round
      const nextRoundSlot = Math.ceil(s.slot / 2);
      const nextIdx = slots.findIndex(
        (x) => x.round === s.round + 1 && x.slot === nextRoundSlot
      );
      s.nextMatchIdx = nextIdx >= 0 ? nextIdx : null;
      // Odd slot → team1 position, even slot → team2 position
      s.nextSlot = s.slot % 2 === 1 ? 1 : 2;
    }
  }

  // Assign teams to round-1 slots using proper bracket seeding so top seeds
  // are on opposite halves and can only meet in the final.
  const order = seedOrder(bracketSize);
  const round1 = slots.filter((s) => s.round === 1);
  for (let i = 0; i < round1.length; i++) {
    const topSeed = order[i * 2];
    const bottomSeed = order[i * 2 + 1];
    round1[i].team1Id = topSeed <= count ? (seeded[topSeed - 1]?.team.id ?? null) : null;
    round1[i].team2Id = bottomSeed <= count ? (seeded[bottomSeed - 1]?.team.id ?? null) : null;
  }

  // For byed teams (where one side is null): pre-place the non-null team
  // into the next round so the bracket auto-advances them.
  // We do this by finding round1 slots with exactly one team, then pre-populating
  // their target in round 2.
  for (const slot of round1) {
    const hasBye =
      (slot.team1Id !== null) !== (slot.team2Id !== null);
    if (hasBye && slot.nextMatchIdx !== null) {
      const advancer = slot.team1Id ?? slot.team2Id;
      const next = slots[slot.nextMatchIdx];
      if (slot.nextSlot === 1) next.team1Id = advancer;
      else next.team2Id = advancer;
      // Mark the bye slot as complete
      slot.team1Id = slot.team1Id ?? null;
      slot.team2Id = slot.team2Id ?? null;
    }
  }

  return slots;
}
