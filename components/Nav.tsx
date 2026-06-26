import Link from "next/link";
import Image from "next/image";
import { isAdmin } from "@/lib/auth";

export default async function Nav() {
  const admin = await isAdmin();

  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image src="/logo.svg" alt="Rocket Lab Pickleball" width={36} height={36} />
          <div>
            <div
              className="text-xs font-bold tracking-[0.2em] uppercase leading-none"
              style={{ color: "var(--accent)" }}
            >
              ROCKET LAB
            </div>
            <div
              className="text-xs tracking-[0.15em] uppercase leading-none mt-0.5"
              style={{ color: "var(--muted)" }}
            >
              PICKLEBALL LEAGUE
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <NavLink href="/">Standings</NavLink>
          <NavLink href="/schedule">Schedule</NavLink>
          <NavLink href="/playoffs">Playoffs</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {admin ? (
            <>
              <NavLink href="/admin">Admin</NavLink>
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded font-medium tracking-wider uppercase transition-colors"
                  style={{ color: "var(--muted)" }}
                  formAction="/api/logout"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <NavLink href="/admin/login">Admin</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-xs px-3 py-1.5 rounded font-medium tracking-wider uppercase transition-colors"
      style={{ color: "var(--muted)" }}
    >
      {children}
    </Link>
  );
}
