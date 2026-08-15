import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  const admin = await db.query.admins.findFirst({
    where:   eq(admins.id, session.adminId),
    columns: { esSuperAdmin: true },
  });

  if (!admin?.esSuperAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Komand Superadmin
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Panel interno</p>
          </div>
        </div>
        <a href="/dashboard" className="btn btn-ghost btn-sm">
          ← Volver al panel
        </a>
      </header>
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}