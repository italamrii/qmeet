import { setRequestLocale } from "next-intl/server";
import { SecurityPageContent } from "@/components/site/SecurityPageContent";

export default function SecurityPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <SecurityPageContent />;
}
