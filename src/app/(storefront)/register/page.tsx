import { redirect } from "next/navigation";

// Sign-in with an email code also creates the account, so there is no
// separate registration page any more. Old links land on /login.
export default function RegisterPage() {
  redirect("/login");
}
