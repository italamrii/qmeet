import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { JoinByCodeForm } from "@/components/site/JoinByCodeForm";

export default function JoinLandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="card-sheen rounded-xl border p-6">
          <JoinByCodeForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
