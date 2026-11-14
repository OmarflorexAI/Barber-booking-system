import { redirect } from "next/navigation";

/** The retired Me tab (PLAN.md M6): old links and bookmarks land on Settings. */
export default function MePage() {
  redirect("/app/settings");
}
