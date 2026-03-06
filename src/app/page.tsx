import { cookies } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { LogSubmitForm } from "@/components/LogSubmitForm";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const isAuthenticated = verifySessionToken(token);

  return <main className="page">{isAuthenticated ? <LogSubmitForm /> : <LoginForm />}</main>;
}
