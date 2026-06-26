"use client";

import { deleteSeason } from "@/app/admin/actions";

export default function DeleteSeasonButton({ id, name }: { id: number; name: string }) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={deleteSeason} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs underline" style={{ color: "var(--accent)" }}>
        Delete
      </button>
    </form>
  );
}
