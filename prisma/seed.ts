import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM_NAMES = [
  "The Dill Mongers",
  "Smash & Grab",
  "Net Gains",
  "Fault Lines",
  "The Drop Shots",
  "Pickleback",
  "Dink or Swim",
  "Ace Ventura",
  "Rally Cats",
  "Kitchen Confidential",
  "Spin Doctors",
  "The Lobsters",
];

async function main() {
  // Clear existing data
  await prisma.playoffMatch.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.season.deleteMany();

  const season = await prisma.season.create({
    data: {
      name: "Spring 2025",
      numWeeks: 6,
      scheduleType: "ROUND_ROBIN",
      playoffTeamCount: 8,
      status: "SETUP",
      isActive: true,
    },
  });

  for (const name of TEAM_NAMES) {
    await prisma.team.create({ data: { seasonId: season.id, name } });
  }

  console.log(`Seeded season "${season.name}" with ${TEAM_NAMES.length} teams.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
