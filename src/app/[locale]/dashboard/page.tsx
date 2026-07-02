import { setRequestLocale } from "next-intl/server";
import { DashboardContent } from "@/components/site/DashboardContent";

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <DashboardContent />;
}
