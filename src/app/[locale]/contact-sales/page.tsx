import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ContactSalesForm } from "@/components/site/ContactSalesForm";

export default async function ContactSalesPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations("contactSales");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-header">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        <div className="card-sheen mt-8 rounded-xl border p-6">
          <ContactSalesForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
