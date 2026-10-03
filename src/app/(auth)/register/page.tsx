import { Alert, Card } from "@/components/ui";
import { countUsers, isRegistrationOpen } from "@/lib/settings";
import { getT } from "@/i18n/server";
import { AuthForm } from "../auth-form";
import Link from "next/link";

export default async function RegisterPage() {
  if (!isRegistrationOpen()) {
    const t = await getT();
    return (
      <Card className="space-y-4">
        <Alert>{t("auth.registrationClosed")}</Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          {t("auth.login")}
        </Link>
      </Card>
    );
  }
  return <AuthForm mode="register" firstUser={countUsers() === 0} />;
}
