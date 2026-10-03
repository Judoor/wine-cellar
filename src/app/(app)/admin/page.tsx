import { asc } from "drizzle-orm";
import { Card, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getLocale, getT } from "@/i18n/server";
import { externalLookupsEnabled } from "@/lib/services/barcode";
import { ExternalLookupsToggle, RegistrationToggle, UserActions } from "./controls";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const t = await getT();
  const locale = await getLocale();
  const users = getDb().select().from(schema.users).orderBy(asc(schema.users.createdAt)).all();
  const envLocked = process.env.ALLOW_REGISTRATION === "false";

  return (
    <>
      <PageTitle>{t("admin.title")}</PageTitle>
      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 font-serif text-xl font-semibold">{t("admin.registration")}</h2>
          <RegistrationToggle initial={!envLocked && getSetting("registration_open") !== "false"} disabled={envLocked} />
        </Card>

        <Card>
          <h2 className="mb-1 font-serif text-xl font-semibold">{t("admin.services")}</h2>
          <p className="mb-3 text-sm text-muted">{t("admin.externalLookupsHint")}</p>
          <ExternalLookupsToggle initial={externalLookupsEnabled()} disabled={process.env.DISABLE_EXTERNAL_LOOKUPS === "true"} />
        </Card>

        <Card className="overflow-x-auto p-0">
          <h2 className="p-5 pb-3 font-serif text-xl font-semibold">{t("admin.users")}</h2>
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-surface-2 text-left text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">{t("auth.name")}</th>
                <th className="px-5 py-2 font-medium">{t("auth.email")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.role")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.createdAt")}</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {u.name} {u.id === admin.id && <span className="text-muted">({t("admin.you")})</span>}
                  </td>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-5 py-3">{u.role === "admin" ? t("admin.roleAdmin") : t("admin.roleUser")}</td>
                  <td className="px-5 py-3 text-muted">{u.createdAt.toLocaleDateString(locale)}</td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== admin.id && <UserActions userId={u.id} role={u.role} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
