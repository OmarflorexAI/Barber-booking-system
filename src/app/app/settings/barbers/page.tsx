import { redirect } from "next/navigation";

/** The Barber list lives on the Shop tab now; old links and bookmarks land there. */
export default function BarbersPage() {
  redirect("/app/shop");
}
