import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, type Inquiry } from "@/lib/inquiry";
import { formatDateTime } from "@/lib/format";
import { Logo } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactForm } from "@/components/contact-form";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "お問い合わせ" };

const STATUS_TONE = { open: "warn", answered: "success", closed: "muted" } as const;

/** お問い合わせ（未ログインでも送れる。ログインしている人は、これまでの問い合わせと返信も読める） */
export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  const { data: history } = user
    ? await supabase
        .from("inquiries")
        .select("id, category, body, status, reply, replied_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: null };

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-2">
          <Logo href={loggedIn ? "/" : "/login"} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <div>
          <h1 className="flex items-center gap-2 text-3xl">
            <MessageCircleQuestion className="size-8 text-primary" aria-hidden />
            お問い合わせ
          </h1>
          <p className="mt-2 text-sm text-text-sub">
            使い方・不具合・安全のこと・要望など、運営に直接届きます。学生が運営しているため、返信に数日かかることがあります。
          </p>
          <p className="mt-2 text-sm text-text-sub">送った内容と返信は、あなたと運営だけが見られます。ほかの利用者には公開されません。</p>
          {!loggedIn && (
            <p className="mt-2 text-sm text-text-sub">
              ログインしている場合は、送った内容と返信をこのページで確認できます。
              <Link href="/login" className="ml-1 font-bold text-primary underline">ログインする</Link>
            </p>
          )}
        </div>

        <Card className="p-5 sm:p-6">
          <ContactForm loggedIn={loggedIn} defaultCategory={typeof sp.category === "string" ? sp.category : undefined} />
        </Card>

        {loggedIn && (
          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="mb-3 text-lg">これまでの問い合わせ</h2>
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-text-sub">まだありません。</p>
            ) : (
              <ul className="space-y-3">
                {(history as Pick<Inquiry, "id" | "category" | "body" | "status" | "reply" | "replied_at" | "created_at">[]).map((q) => (
                  <li key={q.id}>
                    <Card className="space-y-3 p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={STATUS_TONE[q.status]}>{INQUIRY_STATUS_LABEL[q.status]}</Badge>
                        <Badge tone="muted">{INQUIRY_CATEGORY_LABEL[q.category] ?? q.category}</Badge>
                        <span className="text-xs text-text-sub">{formatDateTime(q.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{q.body}</p>
                      {q.reply && (
                        <div className="rounded-md bg-primary-soft p-3">
                          <p className="text-xs font-bold text-primary">
                            運営からの返信{q.replied_at && `（${formatDateTime(q.replied_at)}）`}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{q.reply}</p>
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <SiteFooter loggedIn={loggedIn} />
    </>
  );
}
