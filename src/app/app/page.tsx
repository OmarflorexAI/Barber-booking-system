import { redirect } from "next/navigation";

/** /app has no screen of its own: the Owner starts on Today. */
export default function AppIndex() {
  redirect("/app/day");
}
