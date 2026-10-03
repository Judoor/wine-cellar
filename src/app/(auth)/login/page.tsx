import { redirect } from "next/navigation";
import { countUsers } from "@/lib/settings";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  // Fresh install: send the visitor straight to admin account creation.
  if (countUsers() === 0) redirect("/register");
  return <AuthForm mode="login" />;
}
