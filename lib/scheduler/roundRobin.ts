import type { ScheduleStrategy, TeamInput, WeekPlan, Matchup } from "./index";

export class RoundRobinStrategy implements ScheduleStrategy {
  generate(teams: TeamInput[], weeks: number): WeekPlan[] {
    if (teams.length === 0) return [];

    // Fisher-Yates shuffle so each generation produces a different schedule
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const hasBye = shuffled.length % 2 !== 0;
    const list = hasBye ? [...shuffled, null] : [...shuffled];
    const n = list.length; // always even
    const totalRounds = n - 1;

    // Build all rounds using the circle method (pin index 0, rotate rest)
    const allRounds: Matchup[][] = [];
    const rotation = list.slice(1);

    for (let r = 0; r < totalRounds; r++) {
      const round: Matchup[] = [];
      const current = [list[0], ...rotation];
      for (let i = 0; i < n / 2; i++) {
        const home = current[i];
        const away = current[n - 1 - i];
        if (home !== null && away !== null) {
          round.push({ home, away });
        } else if (home !== null) {
          round.push({ home, away: null });
        } else if (away !== null) {
          round.push({ home: away, away: null });
        }
      }
      allRounds.push(round);
      // rotate: move last element to front of rotation
      rotation.unshift(rotation.pop()!);
    }

    // Map weeks to rounds, cycling if weeks > totalRounds
    // Always copy the matchup array so forced-pair swaps don't corrupt allRounds
    const plans: WeekPlan[] = [];
    for (let w = 0; w < weeks; w++) {
      const roundIdx = w % totalRounds;
      const cycle = Math.floor(w / totalRounds);
      const baseMatchups = allRounds[roundIdx];
      const matchups: Matchup[] =
        cycle % 2 === 0
          ? [...baseMatchups]
          : baseMatchups.map((m) => m.away ? { home: m.away, away: m.home } : m);
      plans.push({ week: w + 1, matchups });
    }

    return plans;
  }
}
