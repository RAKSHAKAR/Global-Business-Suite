import { redirect } from "next/navigation";

export default function CronHealthAliasPage() {
  redirect("/platform-control?tab=AUTOMATION");
}
