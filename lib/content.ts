/**
 * サイトの文言・可変パラメータ（1か所で差し替えられるようにまとめている）
 * 実データ（カード・ユーザー）は Supabase から読む。ここにあるのは紹介ページの文言と、
 * 「たとえばこんな交換」の例（実在の利用者ではないことを画面に明記している）だけ。
 */

export const SITE = {
  name: "Campus-Cross",
  catchcopy: ["15分で、", "となりの学部へ。"],
  description: "学内の学生どうしで、専門を15〜30分だけ教え合う。お金のかからない異分野ナレッジ交換。",
  /** 取引形態: チケット制（無料・換金不可） */
  currency: "チケット",
  /** 対象範囲: 特定の大学のみ */
  scope: "広島大学の学生限定",
  /** <meta name="theme-color">。CSS 変数を参照できないので --color-primary と同じ値を置く */
  themeColor: "#0e7a6d",
} as const;

export const HERO = {
  eyebrow: SITE.scope,
  sub: "研究室の外にいる“となりの学部の人”と、15分だけ専門を交換。教えると1枚、教わると1枚。お金はかかりません。",
  primaryCta: "大学メールではじめる",
  secondaryCta: "どんなサービス？",
  /** ヒーロー右側のコラージュ（イラストのタイル）。画像に差し替える場合は image を指定する */
  collage: [
    { title: "CRISPRって結局なにがすごい？", field: "life_science", seed: "hero-a" },
    { title: "法学部のゼミってどう決まる？", field: "social_science", seed: "hero-b" },
    { title: "15分でわかる機械学習", field: "informatics", seed: "hero-c" },
    { title: "古文書はどう読む？", field: "humanities", seed: "hero-d" },
  ] as { title: string; field: string; seed: string; image?: string }[],
};

export const ABOUT = {
  title: `${SITE.name}とは？`,
  body: [
    "同じキャンパスにいても、となりの学部で何が研究されているかは意外と見えません。",
    `${SITE.name} は、学内メールで本人確認をした学生どうしが、自分の専門を15〜30分だけ“専門外の人向け”に話し、相手の分野の視点を持ち帰る場所です。`,
  ],
};

export const FEATURES = [
  {
    label: "POINT 1",
    title: "異分野が交わる",
    body: "自分と違う学部・分野のカードが先に並びます。話す側も「あなたの分野から聞きたいこと」を書くので、一方通行ではなく交換に。",
    icon: "cross",
  },
  {
    label: "POINT 2",
    title: "15分・学内で対面",
    body: "話す人が空き枠を出しておき、あなたはワンクリックで予約するだけ。日程のやり取りはいりません。場所は人目のある学内で。",
    icon: "clock",
  },
  {
    label: "POINT 3",
    title: "お金を使わないチケット制",
    body: "教えると1枚もらえて、教わると1枚使います。純粋な好奇心だけで動ける、学生どうしのギブ＆テイクです。",
    icon: "ticket",
  },
] as const;

export const TICKET_FACTS = [
  { number: "3", unit: "枚", label: "登録するともらえる" },
  { number: "+1", unit: "枚", label: "教えるたびに" },
  { number: "1", unit: "枚/月", label: "毎月みんなに配布" },
] as const;

export const STEPS = [
  { title: "大学メールで登録", body: "学内のメールアドレスに届く6桁のコードを入れるだけ。" },
  { title: "気になるカードを探す", body: "分野・学部・キーワードで探せます。異分野のカードが上に。" },
  { title: "空き枠をえらんで予約", body: "チケット1枚で即確定。当日は学内の約束の場所で。" },
] as const;

/** 「たとえばこんな交換」。PRD のユースケースを例として見せる（実在の口コミではない） */
export const USE_CASES = [
  {
    quote: "培養データの扱いに悩んでいたら、情報科学部の人が15分で解析の考え方を教えてくれた。代わりに代謝の話をしたら面白がってもらえた。",
    who: "生物生産学部 3年 × 情報科学部 M1",
    seed: "case-1",
  },
  {
    quote: "理学部の「なぜそうなるか」と、工学部の「どう社会で使うか」。同じテーマでも見ている場所が違うのが新鮮だった。",
    who: "理学部 2年 × 工学部 4年",
    seed: "case-2",
  },
  {
    quote: "文系のゼミがどう決まるのか全然知らなかった。法学部の先輩に聞いたら、選考の仕組みから卒論までまるごと分かった。",
    who: "工学部 2年 × 法学部 3年",
    seed: "case-3",
  },
] as const;

export const SAFETY = [
  "学内メールで本人確認した学生だけが使えます",
  "カードもプロフィールも学外には公開されません",
  "通報・ブロックの機能があり、運営が確認します",
  "はじめての相手とは、人目のある学内の場所で",
] as const;

export const SIGNUP_CTA = {
  micro: "＼ 大学メールで30秒 ／",
  title: "となりの学部を、のぞいてみよう",
  note: "登録するとチケットを3枚お渡しします",
};

/**
 * 紹介ページ（未ログイン）で見せる分野。分野マスタは DB にあるが、
 * 学外には DB を公開しない方針なので、紹介用に同じ内容をここに置く。
 */
export const LANDING_FIELDS = [
  { code: "science", label: "理学", sub: "原理を追いかける" },
  { code: "engineering", label: "工学", sub: "社会で使う形に" },
  { code: "informatics", label: "情報", sub: "AI・データ・プログラミング" },
  { code: "life_science", label: "生命・農学", sub: "生き物と食の科学" },
  { code: "medical", label: "医療・薬学", sub: "からだと薬の話" },
  { code: "humanities", label: "人文", sub: "ことば・歴史・思想" },
  { code: "social_science", label: "社会科学", sub: "法・経済・経営" },
  { code: "education", label: "教育", sub: "学びと教え方" },
  { code: "interdisciplinary", label: "学際・文理融合", sub: "分野をまたぐ" },
  { code: "arts", label: "芸術・デザイン", sub: "つくる・表現する" },
  { code: "other", label: "その他", sub: "趣味・スキルも" },
] as const;
