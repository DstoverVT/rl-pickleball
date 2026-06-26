"use client";

import { useTransition, useState, useRef } from "react";
import { renameTeam } from "@/app/schedule/actions";

export default function TeamRenameInput({ id, name }: { id: number; name: string }) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const originalRef = useRef(name);

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.currentTarget.value.trim();
    if (!value || value === originalRef.current) return;
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("name", value);
    startTransition(async () => {
      await renameTeam(formData);
      originalRef.current = value;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        defaultValue={name}
        onBlur={handleBlur}
        disabled={isPending}
        className="rounded px-3 py-1.5 text-sm disabled:opacity-50"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {saved && <span className="text-xs" style={{ color: "var(--accent)" }}>Saved!</span>}
    </div>
  );
}
