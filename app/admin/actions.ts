"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { RoundRobinStrategy } from "@/lib/scheduler/roundRobin";
import { computeStandings } from "@/lib/standings";
import { buildBracket } from "@/lib/playoffs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// --- Season ---

export async function createSeason(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const numWeeks = Number(formData.get("numWeeks"));
  const playoffTeamCount = Number(formData.get("playoffTeamCount"));
  if (!name || !numWeeks) return;

  // Deactivate any active season
  await prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } });

  await prisma.season.create({
    data: { name, numWeeks, playoffTeamCount: playoffTeamCount || 8, isActive: true },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateSeason(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const numWeeks = Number(formData.get("numWeeks"));
  const playoffTeamCount = Number(formData.get("playoffTeamCount"));
  const status = String(formData.get("status") ?? "");

  await prisma.season.update({
    where: { id },
    data: { name, numWeeks, playoffTeamCount, status },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteSeason(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await prisma.playoffMatch.deleteMany({ where: { seasonId: id } });
  await prisma.match.deleteMany({ where: { seasonId: id } });
  await prisma.team.deleteMany({ where: { seasonId: id } });
  await prisma.season.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export async function setActiveSeason(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await prisma.season.updateMany({ data: { isActive: false } });
  await prisma.season.update({ where: { id }, data: { isActive: true } });
  revalidatePath("/admin");
  revalidatePath("/");
}

// --- Teams ---

export async function addTeam(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !seasonId) return;

  await prisma.team.create({ data: { seasonId, name } });
  revalidatePath("/admin");
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin");
}

export async function renameTeam(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.team.update({ where: { id }, data: { name } });
  revalidatePath("/admin");
}

// --- Schedule ---

export async function generateSchedule(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return;

  const teams = await prisma.team.findMany({ where: { seasonId } });
  if (teams.length < 2) return;

  const strategy = new RoundRobinStrategy();
  const plan = strategy.generate(
    teams.map((t) => ({ id: t.id, name: t.name })),
    season.numWeeks
  );

  // Clear existing schedule and playoff bracket, reset season to REGULAR
  await prisma.playoffMatch.deleteMany({ where: { seasonId } });
  await prisma.match.deleteMany({ where: { seasonId } });

  // Create new matches
  for (const week of plan) {
    for (const matchup of week.matchups) {
      await prisma.match.create({
        data: {
          seasonId,
          week: week.week,
          homeTeamId: matchup.home.id,
          awayTeamId: matchup.away?.id ?? null,
          isByeSlot: matchup.away === null,
          status: "SCHEDULED",
        },
      });
    }
  }

  await prisma.season.update({
    where: { id: seasonId },
    data: { status: "REGULAR", currentWeek: null },
  });

  revalidatePath("/admin");
  revalidatePath("/schedule");
  revalidatePath("/playoffs");
}

// --- Score override ---

export async function overrideScore(formData: FormData) {
  await requireAdmin();
  const matchId = Number(formData.get("matchId"));
  const homeScore = formData.get("homeScore");
  const awayScore = formData.get("awayScore");

  if (homeScore === "" || homeScore === null || awayScore === "" || awayScore === null) {
    // Clear score
    await prisma.match.update({
      where: { id: matchId },
      data: { homeScore: null, awayScore: null, status: "SCHEDULED" },
    });
  } else {
    await prisma.match.update({
      where: { id: matchId },
      data: { homeScore: Number(homeScore), awayScore: Number(awayScore), status: "COMPLETE" },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/schedule");
  revalidatePath("/");
}

// --- Playoffs ---

export async function generatePlayoffs(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return;

  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ where: { seasonId } }),
    prisma.match.findMany({ where: { seasonId } }),
  ]);

  const standings = computeStandings(teams, matches);
  const count = Math.min(season.playoffTeamCount, standings.length);
  if (count < 2) return;

  const slots = buildBracket(standings, count);

  // Clear existing playoff bracket
  await prisma.playoffMatch.deleteMany({ where: { seasonId } });

  // Create playoff matches and get their IDs
  const created = await Promise.all(
    slots.map((_, i) =>
      prisma.playoffMatch.create({
        data: {
          seasonId,
          round: slots[i].round,
          slot: slots[i].slot,
          team1Id: slots[i].team1Id,
          team2Id: slots[i].team2Id,
          status: "SCHEDULED",
        },
      })
    )
  );

  // Wire up nextMatchId references
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.nextMatchIdx !== null) {
      await prisma.playoffMatch.update({
        where: { id: created[i].id },
        data: {
          nextMatchId: created[slot.nextMatchIdx].id,
          nextSlot: slot.nextSlot,
        },
      });
    }
  }

  // Mark byed slots as complete so they don't show as active
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const hasBye = (s.team1Id !== null) !== (s.team2Id !== null);
    if (hasBye) {
      await prisma.playoffMatch.update({
        where: { id: created[i].id },
        data: { status: "COMPLETE", score1: 0, score2: 0 },
      });
    }
  }

  await prisma.season.update({ where: { id: seasonId }, data: { status: "PLAYOFFS" } });

  revalidatePath("/admin");
  revalidatePath("/playoffs");
}

export async function resetToRegularSeason(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));

  await prisma.playoffMatch.deleteMany({ where: { seasonId } });
  await prisma.season.update({ where: { id: seasonId }, data: { status: "REGULAR" } });

  revalidatePath("/admin");
  revalidatePath("/playoffs");
  revalidatePath("/");
}
