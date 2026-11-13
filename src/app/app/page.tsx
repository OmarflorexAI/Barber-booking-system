import { redirect } from "next/navigation";

/** /app has no screen of its own: everyone starts on Day (Barber) / Today (Owner). */
export default function AppIndex() {
  redirect("/app/day");
}
