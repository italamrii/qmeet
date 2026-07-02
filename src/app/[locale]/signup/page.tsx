import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SignupForm } from "@/components/site/SignupForm";
import { Link } from "@/i18n/navigation";

export default async function SignupPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations("signup");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-header">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-glow underline underline-offset-4">
            {t("loginLink")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
