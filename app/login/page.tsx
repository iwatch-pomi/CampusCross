import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";
import { allowedEmailDomains } from "@/lib/constants";
import { ABOUT, FEATURES, HERO, LANDING_FIELDS, SAFETY_SYSTEM, SIGNUP_CTA, SITE, STEPS, TICKET_FACTS, USE_CASES } from "@/lib/content";
import Link from "next/link";
import { buttonClass, SectionHeading } from "@/components/ui";
import { Logo } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { StickySignupBar } from "@/components/layout/sticky-signup-bar";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturePoints } from "@/components/marketing/feature-points";
import { StatNumbers } from "@/components/marketing/stat-numbers";
import { Steps } from "@/components/marketing/steps";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { GakuchikaSection } from "@/components/marketing/gakuchika-section";
import { CategoryCardGrid } from "@/components/category/category-card";
import { WaveDivider } from "@/components/decor/wave-divider";
import { DoodleDecorations } from "@/components/decor/doodles";
import { DecorationCircles } from "@/components/decor/decoration-circles";

export const metadata: Metadata = { title: `${SITE.name} | ${SITE.catchcopy.join("")}` };

export default function LoginPage() {
  const domain = allowedEmailDomains()[0] ?? "ac.jp";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
          <Logo href="/login" />
          <nav aria-label="アカウント" className="flex gap-2">
            <a href="#signup" className={buttonClass("outline")}>ログイン</a>
            <a href="#signup" className={buttonClass("accent", "md", "hidden sm:inline-flex")}>新規登録</a>
          </nav>
        </div>
      </header>

      <main>
        <HeroSection
          eyebrow={HERO.eyebrow}
          title={SITE.catchcopy}
          sub={HERO.sub}
          trust={["学内メールで本人確認", "学外には非公開", "お金はかかりません"]}
          collage={HERO.collage}
          actions={
            <>
              <a href="#signup" className={buttonClass("accent", "lg")}>{HERO.primaryCta}</a>
              <a href="#about" className={buttonClass("pill", "lg")}>{HERO.secondaryCta}</a>
            </>
          }
        />

        {/* とは？ */}
        <section id="about" className="relative scroll-mt-16 bg-surface py-section-sm md:py-section">
          <DoodleDecorations />
          <div className="relative mx-auto max-w-2xl px-4 text-center">
            <SectionHeading label="ABOUT" title={ABOUT.title} align="center" />
            {ABOUT.body.map((p) => (
              <p key={p} className="mt-3 text-text-sub">{p}</p>
            ))}
          </div>
        </section>

        {/* ガクチカ（寄り添う打ち出し） */}
        <section id="gakuchika" className="bg-surface pb-section-sm md:pb-section">
          <div className="mx-auto max-w-5xl px-4">
            <GakuchikaSection />
          </div>
        </section>

        <WaveDivider fillClass="fill-bg-section" className="bg-surface" />
        <section className="bg-bg-section pb-section-sm md:pb-section">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading label="FEATURES" title="3つの特徴" align="center" />
            <FeaturePoints items={FEATURES} />

            <div className="mx-auto mt-14 max-w-3xl">
              <h3 className="mb-4 text-center text-lg">チケットのしくみ</h3>
              <StatNumbers items={TICKET_FACTS} />
              <p className="mt-3 text-center text-xs text-text-sub">
                チケットは換金・譲渡できません。毎月の配布は残高が5枚未満の人だけです。
              </p>
            </div>
          </div>
        </section>
        <WaveDivider fillClass="fill-bg-section" flip className="bg-bg" />

        <section className="py-section-sm md:py-section">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading label="CATEGORY" title="こんな分野の人がいます" sub="専門テーマのほかに、ゼミや研究室の決まり方など「他学部のしくみ」も聞けます。" align="center" />
            <CategoryCardGrid items={LANDING_FIELDS.map((f) => ({ ...f }))} />
          </div>
        </section>

        <section className="bg-surface py-section-sm md:py-section">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading label="HOW TO" title="はじめかた" align="center" />
            <Steps items={STEPS} />
          </div>
        </section>

        <section className="py-section-sm md:py-section">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading label="EXAMPLES" title="たとえば、こんな交換" sub="※ 利用イメージです（実際の利用者の声ではありません）" align="center" />
            <ul className="grid gap-5 md:grid-cols-3">
              {USE_CASES.map((u) => (
                <li key={u.seed}>
                  <TestimonialCard quote={u.quote} attribute={u.who} seed={u.seed} />
                </li>
              ))}
            </ul>

          </div>
        </section>

        <section id="safety" className="bg-surface py-section-sm md:py-section">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading label="SAFETY" title="安全・防犯のしくみ" sub="学内だからこそ、悪用はさせない。3段階で守ります。" align="center" />
            <ol className="grid gap-5 md:grid-cols-3">
              {SAFETY_SYSTEM.map((c, i) => (
                <li key={c.key} className="rounded-lg border border-primary/25 bg-primary-soft p-5">
                  <p className="text-xs font-bold tracking-wider text-point">STEP {i + 1}・{c.label}</p>
                  <h3 className="mt-1 text-base">{c.title}</h3>
                  <ul className="mt-3 space-y-3">
                    {c.items.map((item) => (
                      <li key={item.title} className="flex gap-2 text-sm">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>
                          <span className="font-bold">{item.title}</span>
                          <span className="block text-text-sub">{item.body}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-center text-sm">
              <Link href="/guidelines" className="font-bold text-primary underline">利用規約・安全ガイドラインを読む</Link>
            </p>
          </div>
        </section>

        <section id="signup" className="relative isolate scroll-mt-16 overflow-hidden bg-gradient-cta py-section-sm md:py-section">
          <DecorationCircles />
          <div className="relative mx-auto max-w-md px-4">
            <p className="text-center text-sm font-bold text-accent">{SIGNUP_CTA.micro}</p>
            <h2 className="mt-1 text-center text-2xl">{SIGNUP_CTA.title}</h2>
            <p className="mt-2 text-center text-sm">{SIGNUP_CTA.sub}</p>
            <p className="mb-6 mt-1 text-center text-xs text-text-sub">{SIGNUP_CTA.note}</p>
            <div className="rounded-lg border border-border bg-surface p-6 shadow-card-hover">
              <LoginForm domainHint={domain} />
            </div>
            <p className="mt-4 text-center text-xs text-text-sub">登録とログインは同じ手順です。</p>
          </div>
        </section>
      </main>

      <SiteFooter loggedIn={false} stickyBar />
      <StickySignupBar />
    </>
  );
}
