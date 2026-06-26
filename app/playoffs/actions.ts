"use server";

import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Recursively clears a team from a match and any further matches they advanced to
async function clearDownstream(matchId: number, teamId: number) {
  const match = await prisma.playoffMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (match.team1Id !== teamId && match.team2Id !== teamId) return;

  // If this match is complete and this team won, cascade further before clearing
  if (match.status === "COMPLETE" && match.nextMatchId) {
    const winner = (match.score1 ?? 0) > (match.score2 ?? 0) ? match.team1Id : match.team2Id;
    if (winner === teamId) {
      await clearDownstream(match.nextMatchId, teamId);
    }
  }

  const field = match.team1Id === teamId ? "team1Id" : "team2Id";
  await prisma.playoffMatch.update({
    where: { id: matchId },
    data: { [field]: null, score1: null, score2: null, status: "SCHEDULED" },
  });
}

export async function submitPlayoffScore(formData: FormData) {
  const matchId = Number(formData.get("matchId"));
  const score1 = Number(formData.get("score1"));
  const score2 = Number(formData.get("score2"));

  if (!matchId || isNaN(score1) || isNaN(score2)) return;

  const match = await prisma.playoffMatch.findUnique({ where: { id: matchId } });
  if (!match) return;

  // Non-admins can only score in the active round (lowest round with scoreable incomplete matches)
  const admin = await isAdmin();
  if (!admin) {
    const activeRound = await prisma.playoffMatch.findFirst({
      where: { seasonId: match.seasonId, status: "SCHEDULED", team1Id: { not: null }, team2Id: { not: null } },
      orderBy: { round: "asc" },
    });
    if (activeRound && match.round !== activeRound.round) return;
  }

  const isReset = score1 === 0 && score2 === 0;

  const oldWinner =
    match.status === "COMPLETE"
      ? (match.score1 ?? 0) > (match.score2 ?? 0)
        ? match.team1Id
        : match.team2Id
      : null;

  // Clear downstream if resetting or if winner changed
  if (oldWinner && match.nextMatchId) {
    const newWinner = !isReset ? (score1 > score2 ? match.team1Id : match.team2Id) : null;
    if (isReset || oldWinner !== newWinner) {
      await clearDownstream(match.nextMatchId, oldWinner);
    }
  }

  if (isReset) {
    await prisma.playoffMatch.update({
      where: { id: matchId },
      data: { score1: null, score2: null, status: "SCHEDULED" },
    });
  } else {
    const newWinner = score1 > score2 ? match.team1Id : match.team2Id;
    await prisma.playoffMatch.update({
      where: { id: matchId },
      data: { score1, score2, status: "COMPLETE" },
    });
    if (match.nextMatchId && newWinner) {
      await prisma.playoffMatch.update({
        where: { id: match.nextMatchId },
        data: match.nextSlot === 1 ? { team1Id: newWinner } : { team2Id: newWinner },
      });
    }
  }

  revalidatePath("/playoffs");
}
