"use server";

import { prisma } from "@/lib/db";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setCurrentWeek(formData: FormData) {
  await requireAdmin();
  const seasonId = Number(formData.get("seasonId"));
  const week = Number(formData.get("week"));
  await prisma.season.update({ where: { id: seasonId }, data: { currentWeek: week } });
  revalidatePath("/schedule");
}

export async function assignByeOpponent(formData: FormData) {
  const matchId = Number(formData.get("matchId"));
  const teamId = formData.get("teamId");

  await prisma.match.update({
    where: { id: matchId },
    data: {
      awayTeam: teamId
        ? { connect: { id: Number(teamId) } }
        : { disconnect: true },
      isByeSlot: true,
      homeScore: null,
      awayScore: null,
      status: "SCHEDULED",
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function renameTeam(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await prisma.team.update({ where: { id }, data: { name } });
  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath("/playoffs");
}

export async function submitScore(formData: FormData) {
  const matchId = Number(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!matchId || isNaN(homeScore) || isNaN(awayScore)) return;

  // Enforce current-week lock for non-admins
  const admin = await isAdmin();
  if (!admin) {
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { season: true } });
    if (match?.season.currentWeek && match.week !== match.season.currentWeek) return;
  }

  const isReset = homeScore === 0 && awayScore === 0;

  await prisma.match.update({
    where: { id: matchId },
    data: isReset
      ? { homeScore: null, awayScore: null, status: "SCHEDULED" }
      : { homeScore, awayScore, status: "COMPLETE" },
  });

  revalidatePath("/schedule");
  revalidatePath("/");
}
