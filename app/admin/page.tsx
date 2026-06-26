import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createSeason,
  updateSeason,
  setActiveSeason,
  addTeam,
  deleteTeam,
  generateSchedule,
  generatePlayoffs,
  resetToRegularSeason,
} from "./actions";

import DeleteSeasonButton from "@/components/DeleteSeasonButton";
import ConfirmButton from "@/components/ConfirmButton";
import TeamRenameInput from "@/components/TeamRenameInput";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const seasons = await prisma.season.findMany({ orderBy: { id: "desc" } });
  const activeSeason = seasons.find((s) => s.isActive);

  const teams = activeSeason
    ? await prisma.team.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { name: "asc" },
      })
    : [];

  const matches = activeSeason
    ? await prisma.match.findMany({
        where: { seasonId: activeSeason.id },
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ week: "asc" }, { id: "asc" }],
      })
    : [];

  const weeks = [...new Set(matches.map((m) => m.week))].sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      <div className="flex items-baseline gap-4">
        <h1 className="text-xs tracking-[0.3em] uppercase font-bold" style={{ color: "var(--accent)" }}>
          Admin Dashboard
        </h1>
      </div>

      {/* Season Config */}
      <Section title="Season">
        {/* Create new season */}
        <div className="mb-6">
          <div className="text-xs tracking-wider uppercase mb-3" style={{ color: "var(--muted)" }}>
            Create New Season
          </div>
          <form action={createSeason} className="flex gap-3 flex-wrap items-end">
            <Field label="Name">
              <Input name="name" placeholder="Spring 2025" />
            </Field>
            <Field label="Weeks">
              <Input name="numWeeks" type="number" min="1" defaultValue="6" />
            </Field>
            <Field label="Playoff Teams">
              <Input name="playoffTeamCount" type="number" min="2" defaultValue="8" />
            </Field>
            <ConfirmButton message="Create and activate this season?">Create & Activate</ConfirmButton>
          </form>
        </div>

        {/* Edit active season */}
        {activeSeason && (
          <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-xs tracking-wider uppercase mb-3" style={{ color: "var(--muted)" }}>
              Edit Active Season
            </div>
            <form action={updateSeason} className="space-y-4">
              <input type="hidden" name="id" value={activeSeason.id} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Season Name">
                  <Input name="name" defaultValue={activeSeason.name} />
                </Field>
                <Field label="Weeks">
                  <Input name="numWeeks" type="number" min="1" defaultValue={activeSeason.numWeeks} />
                </Field>
                <Field label="Playoff Teams">
                  <Input
                    name="playoffTeamCount"
                    type="number"
                    min="2"
                    max={teams.length || 16}
                    defaultValue={activeSeason.playoffTeamCount}
                  />
                </Field>
                <Field label="Status">
                  <select
                    name="status"
                    defaultValue={activeSeason.status}
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    <option value="SETUP">SETUP</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="PLAYOFFS">PLAYOFFS</option>
                    <option value="COMPLETE">COMPLETE</option>
                  </select>
                </Field>
              </div>
              <ConfirmButton message="Save changes to this season?">Save Changes</ConfirmButton>
            </form>
          </div>
        )}

        {/* All seasons list */}
        {seasons.length > 0 && (
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-xs tracking-wider uppercase mb-3" style={{ color: "var(--muted)" }}>
              All Seasons
            </div>
            <div className="space-y-2">
              {seasons.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className={s.isActive ? "font-bold" : ""} style={{ color: s.isActive ? "var(--accent)" : "var(--text)" }}>
                    {s.name}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{s.status}</span>
                  <div className="flex gap-2 ml-auto">
                    {!s.isActive && (
                      <form action={setActiveSeason}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-xs underline" style={{ color: "var(--muted)" }}>
                          Activate
                        </button>
                      </form>
                    )}
                    <DeleteSeasonButton id={s.id} name={s.name} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Teams */}
      {activeSeason && (
        <Section title="Teams">
          <form action={addTeam} className="flex gap-3 items-end mb-6">
            <input type="hidden" name="seasonId" value={activeSeason.id} />
            <Field label="Team Name">
              <Input name="name" placeholder="The Dill Mongers" />
            </Field>
            <Btn>Add Team</Btn>
          </form>

          {teams.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No teams yet.
            </p>
          ) : (
            <div
              className="rounded overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              {teams.map((team, idx) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    background: idx % 2 === 0 ? "var(--surface)" : "var(--bg)",
                    borderBottom: idx < teams.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex-1">
                    <TeamRenameInput id={team.id} name={team.name} />
                  </div>
                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={team.id} />
                    <ConfirmButton
                      message={`Remove "${team.name}"?`}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
                    >
                      Remove
                    </ConfirmButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Schedule */}
      {activeSeason && teams.length >= 2 && (
        <Section title="Schedule">
          <form action={generateSchedule} className="mb-6">
            <input type="hidden" name="seasonId" value={activeSeason.id} />
            <div className="flex items-center gap-3 flex-wrap">
              <ConfirmButton
                variant="danger"
                message={matches.length > 0 ? "Regenerate schedule? This will clear all existing scores." : "Generate schedule?"}
              >
                {matches.length > 0 ? "Regenerate Schedule" : "Generate Schedule"}
              </ConfirmButton>
              {matches.length > 0 && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  Warning: this will clear all existing scores
                </span>
              )}
            </div>
          </form>

          {matches.length > 0 && (
            <div className="space-y-6">
              {weeks.map((week) => {
                const wMatches = matches.filter((m) => m.week === week);
                return (
                  <div key={week}>
                    <div className="text-xs tracking-wider uppercase mb-2" style={{ color: "var(--muted)" }}>
                      Week {week}
                    </div>
                    <div className="space-y-1">
                      {wMatches.map((match) => (
                        <div key={match.id} className="flex items-center gap-3 text-sm">
                          <span className="w-40 truncate">{match.homeTeam?.name ?? "BYE"}</span>
                          <span className="font-mono text-xs w-16 text-center" style={{ color: "var(--muted)" }}>
                            {match.status === "COMPLETE" ? `${match.homeScore} – ${match.awayScore}` : "–"}
                          </span>
                          <span className="w-40 truncate">{match.awayTeam?.name ?? "BYE"}</span>
                          <span className="text-xs ml-auto" style={{ color: match.status === "COMPLETE" ? "var(--accent)" : "var(--muted)" }}>
                            {match.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Playoffs */}
      {activeSeason && matches.length > 0 && (
        <Section title="Playoffs">
          <div className="flex items-center gap-4 mb-2">
            <form action={generatePlayoffs}>
              <input type="hidden" name="seasonId" value={activeSeason.id} />
              <ConfirmButton variant="danger" message="Generate playoff bracket? This will clear any existing bracket.">Generate Playoff Bracket</ConfirmButton>
            </form>
            {activeSeason.status === "PLAYOFFS" && (
              <form action={resetToRegularSeason}>
                <input type="hidden" name="seasonId" value={activeSeason.id} />
                <ConfirmButton message="Return to regular season? This will clear the playoff bracket.">Return to Regular Season</ConfirmButton>
              </form>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Top {activeSeason.playoffTeamCount} teams by current standings will be seeded.
            This will clear any existing bracket.
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        className="text-xs tracking-[0.2em] uppercase font-bold mb-4 pb-2"
        style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs tracking-wider uppercase mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded px-3 py-2 text-sm w-full ${className ?? ""}`}
      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
    />
  );
}

function Btn({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "danger";
}) {
  return (
    <button
      type="submit"
      className="px-4 py-2 rounded text-xs font-bold tracking-wider uppercase"
      style={{
        background: variant === "danger" ? "var(--accent-dim)" : "var(--accent)",
        color: "#fff",
      }}
    >
      {children}
    </button>
  );
}
