import { setRequestLocale } from "next-intl/server";
import { LandingPageContent } from "@/components/site/LandingPageContent";

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LandingPageContent />;
}
