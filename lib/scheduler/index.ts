export interface TeamInput {
  id: number;
  name: string;
}

export interface Matchup {
  home: TeamInput;
  away: TeamInput | null; // null = bye
}

export interface WeekPlan {
  week: number;
  matchups: Matchup[];
}

export interface ScheduleStrategy {
  generate(teams: TeamInput[], weeks: number): WeekPlan[];
}
