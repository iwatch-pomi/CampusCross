/**
 * Campus-Cross 学内アンケートを Google フォームで作るスクリプト（Google Apps Script）
 *
 * 使い方：
 *   1. https://script.google.com/ を開き「新しいプロジェクト」を作る
 *   2. 最初からある中身を全部消して、このファイルの中身を貼り付けて保存する
 *   3. 上の関数の選択欄で createCampusCrossSurvey を選び「実行」を押す
 *   4. 初回は Google の許可画面が出るので、自分のアカウントを選んで許可する
 *   5. 実行ログに「編集用URL」「回答用URL」「回答シートURL」が表示される
 *
 * 作られるもの（すべてあなたのマイドライブに保存）：
 *   - Google フォーム「Campus-Cross 学内アンケート」（無記名）と、その回答シート
 *   - Google フォーム「Campus-Cross 開発・運営メンバー募集」（連絡先を集める）と、その回答シート
 *   アンケートの最後と回答後の画面に、募集フォームへのリンクが自動で入る。
 *   2つは別のフォームなので、アンケートの回答と応募者の名前は結びつかない。
 *
 * 実行する前に、下の「実施者の情報」の〇〇を書き換えること。
 *
 * 個人情報を集めない設定（メールアドレスを集めない、ログイン不要）にしてあります。
 * 質問の文言は docs/survey と Claude Docs の「学内アンケート（質問案）」に合わせています。
 * 同じスクリプトを2回実行すると、フォームが2つできます（不要な方はドライブから削除）。
 */
// ---- 実施者の情報（実行する前に〇〇を書き換える） ----
var ORGANIZER = {
  name: '岩瀬 〇〇',
  affiliation: '広島大学 〇〇学部 〇年',
  email: '〇〇@hiroshima-u.ac.jp',
  // なぜこのサービスを作ろうと思ったかを1〜2文で
  why: '〇〇（例：同じキャンパスにいても、他学部の人が何を学んでいるかを知る機会がほとんどないと感じたことがきっかけです）',
  // 協力者への条件（謝礼の有無、関わり方など）。決まっていなければ「お話の中でお伝えします」のままでよい
  terms: '関わり方や条件は、お話の中でお伝えします。',
};

function createCampusCrossSurvey() {
  // 先に協力者募集フォームを作り、そのリンクをアンケートに入れる
  var recruit = createCollaboratorForm_();
  var recruitUrl = recruit.form.getPublishedUrl();

  var form = FormApp.create('Campus-Cross 学内アンケート');

  form.setDescription(
    '広島大学の学生どうしで、自分の専門を15〜30分だけ教え合うサービス「Campus-Cross」を準備しています。' +
    '使いやすい形にするため、約5分のアンケートにご協力ください。\n\n' +
    'このアンケートは、サービスの設計のためのものです（研究のための調査ではありません）。' +
    '回答は無記名で、氏名やメールアドレスはお聞きしません。' +
    '結果はサービスの設計にだけ使い、学外に個別の回答を公開することはありません。\n\n' +
    '実施者：' + ORGANIZER.affiliation + ' ' + ORGANIZER.name + '（' + ORGANIZER.email + '）\n' +
    ORGANIZER.why
  );

  // ---- 設定：個人情報を集めない ----
  form.setCollectEmail(false);
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT); } catch (e) {}
  try { form.setRequireLogin(false); } catch (e) {}   // 大学などの組織アカウントで作る場合だけ有効
  form.setLimitOneResponsePerUser(false);              // オンにすると Google へのログインが必要になる
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'ご協力ありがとうございました。いただいた回答は、Campus-Cross を使いやすい形にするためにだけ使います。' +
    'サービスの開始は、学内の告知でお知らせします。\n\n' +
    '一緒にサービスをつくってくれる人も募集しています（このアンケートとは別のフォームです）：\n' + recruitUrl + '\n\n' +
    'お問い合わせ：' + ORGANIZER.email
  );

  // ---- セクション1 あなたについて ----
  form.addSectionHeaderItem().setTitle('あなたについて');

  form.addListItem()
    .setTitle('所属している学部（大学院生は、学部時代に近いもの）を教えてください。')
    .setChoiceValues([
      '総合科学部', '文学部', '教育学部', '法学部', '経済学部', '理学部',
      '医学部', '歯学部', '薬学部', '工学部', '生物生産学部', '情報科学部', '答えたくない'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('学年を教えてください。')
    .setChoiceValues(['学部1年', '学部2年', '学部3年', '学部4年', '学部5・6年', '修士課程', '博士課程'])
    .setRequired(true);

  // ---- セクション2 いまの様子 ----
  form.addPageBreakItem().setTitle('いまの様子');

  form.addMultipleChoiceItem()
    .setTitle('他学部の学生と、学問や研究の話をする機会はどのくらいありますか。')
    .setChoiceValues(['よくある', 'ときどきある', 'ほとんどない', 'まったくない'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('他学部でどんな研究や学びがされているか、知りたいと思うことはありますか。')
    .setChoiceValues(['よくある', 'ときどきある', 'あまりない', 'まったくない'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('就活や進路で使える「ガクチカ」や自己PRのネタについて、いまの気持ちに近いものを選んでください。')
    .setChoiceValues(['話せることは十分ある', '少しはある', 'あまりない気がしている', 'まだ考えていない／当てはまらない'])
    .setRequired(true);

  // ---- セクション3 サービスへの関心 ----
  form.addPageBreakItem()
    .setTitle('サービスへの関心')
    .setHelpText(
      'Campus-Cross は、広島大学の学生どうしで、研究や授業・ゼミで学んでいることを、他学部の人に15〜30分だけ教え合うサービスです。' +
      '大学のメールで登録し、学食・図書館・学内のカフェ・Zoom のどれかで話します。' +
      'お金はかからず、「教えると1枚もらえて、教わると1枚使う」チケットで回します。'
    );

  form.addMultipleChoiceItem()
    .setTitle('このようなサービスがあったら、使ってみたいと思いますか。')
    .setChoiceValues(['ぜひ使ってみたい', 'まあ使ってみたい', 'どちらともいえない', 'あまり使いたくない', '使いたくない'])
    .setRequired(true);

  // 立場によって次のセクションが変わる（選択肢は分岐先のセクションを作った後で設定する）
  var roleItem = form.addMultipleChoiceItem()
    .setTitle('どの立場で使ってみたいですか。')
    .setRequired(true);

  // 教える人向け（「教える側」「両方」を選んだ人）
  var teachPage = form.addPageBreakItem().setTitle('教えることについて');

  form.addCheckboxItem()
    .setTitle('教えられそうなことを選んでください。')
    .setChoiceValues([
      '自分の研究の内容',
      '授業やゼミで学んでいること',
      '自分の学部のしくみ（ゼミ・研究室の決まり方、卒論など）',
      'プログラミングやツールの使い方'
    ])
    .showOtherOption(true);

  form.addCheckboxItem()
    .setTitle('教えてみたい理由に近いものを選んでください。')
    .setChoiceValues([
      '誰かの役に立ちたい',
      '自分の専門を説明する練習になる',
      '就活で話せる経験（ガクチカ）にしたい',
      '他分野の人の意見を聞いてみたい',
      'チケットをためて、自分も教わりたい'
    ])
    .showOtherOption(true);

  // 教わりたい分野（「教わる側」は直接ここへ。「教える側」「両方」は教える質問の後にここへ。任意）
  var learnPage = form.addPageBreakItem().setTitle('教わってみたいこと');

  form.addCheckboxItem()
    .setTitle('教わってみたい分野を選んでください（任意）。')
    .setChoiceValues([
      '理学', '工学', '情報', '生命・農学', '医療・薬学', '人文',
      '社会科学（法・経済・経営）', '教育', '芸術・デザイン', '学際・文理融合',
      '他学部のしくみ（ゼミ・研究室の決まり方、卒論など）'
    ]);

  // ---- 全員に戻る：チケット制・使い方 ----
  var restPage = form.addPageBreakItem().setTitle('使い方');

  form.addMultipleChoiceItem()
    .setTitle('「教えると1枚もらえて、教わると1枚使う」お金のかからないチケットの仕組みについて、どう感じますか。')
    .setChoiceValues(['分かりやすく、使ってみたい', '分かるが、少し面倒そう', 'よく分からない', 'チケットはなくてもよい'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('1回の長さはどのくらいがちょうどよいですか。')
    .setChoiceValues(['15分', '30分', 'どちらでもよい', 'もっと長い方がよい'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('参加しやすい時間帯を選んでください。')
    .setChoiceValues(['平日の昼休み', '平日の空きコマ', '平日の授業後（17時以降）', '土日', 'オンラインなら夜でもよい'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('話す形式はどれがよいですか。')
    .setChoiceValues(['対面（学食・図書館・学内のカフェ）', 'オンライン（Zoom）', 'どちらでもよい'])
    .setRequired(true);

  // ---- セクション5 安心して使うために ----
  form.addPageBreakItem().setTitle('安心して使うために');

  form.addCheckboxItem()
    .setTitle('初めて会う学生と話すとき、不安に感じることを選んでください。')
    .setChoiceValues([
      '相手がどんな人か分からない',
      '勧誘や、学び以外の目的の人が来ないか',
      '異性と2人で話すこと',
      '会う場所',
      '時間が長引いてしまうこと',
      '専門の話についていけるか',
      '特にない'
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('あると安心できるものを選んでください。')
    .setChoiceValues([
      '大学のメールでの本人確認（広大生だけが使える）',
      '同性の相手とだけマッチできる設定',
      '会う場所が人の多い学内に限られていること',
      '本名や連絡先を相手に知られないこと',
      '通報・ブロックできること',
      '問題を起こした人が利用停止になること'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('このサービスに期待することや、あったらうれしい機能を自由に書いてください（任意）。');

  form.addSectionHeaderItem()
    .setTitle('一緒につくってくれる人を募集しています')
    .setHelpText(
      '教える人として最初にカードを出してくれる人、試しに使ってくれる人、開発・デザイン・広報・運営を手伝ってくれる人を探しています。' +
      '興味があれば、送信した後に表示されるリンクから応募してください。' +
      'このアンケートとは別のフォームなので、ここでの回答とは結びつきません。'
    );

  // ---- 分岐の設定 ----
  roleItem.setChoices([
    roleItem.createChoice('教える側', teachPage),
    roleItem.createChoice('教わる側', learnPage),
    roleItem.createChoice('両方', teachPage),
    roleItem.createChoice('どちらも使わない', restPage)
  ]);
  // 教える質問の後は、そのまま「教わってみたいこと」へ進む（両方の人のため。教える側だけの人は任意なので飛ばせる）
  // 「教わってみたいこと」の後は、そのまま「使い方」へ進む

  // ---- 回答を集めるスプレッドシート ----
  var sheet = SpreadsheetApp.create('Campus-Cross 学内アンケート（回答）');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('【アンケート】編集用URL：' + form.getEditUrl());
  Logger.log('【アンケート】回答用URL（これを配る）：' + form.getPublishedUrl());
  Logger.log('【アンケート】回答シートURL：' + sheet.getUrl());
  Logger.log('【協力者募集】編集用URL：' + recruit.form.getEditUrl());
  Logger.log('【協力者募集】回答用URL：' + recruitUrl);
  Logger.log('【協力者募集】回答シートURL（個人情報を含むので共有しない）：' + recruit.sheet.getUrl());
}

/** 開発・運営メンバー募集フォーム（連絡先を集めるので、アンケートとは分ける） */
function createCollaboratorForm_() {
  var form = FormApp.create('Campus-Cross 開発・運営メンバー募集');

  form.setDescription(
    'はじめまして。' + ORGANIZER.affiliation + 'の' + ORGANIZER.name + 'です。\n' +
    ORGANIZER.why + '\n\n' +
    '広島大学の学生どうしで、自分の専門を15〜30分だけ教え合うサービス「Campus-Cross」を開発しています。' +
    '主な機能と安全対策（大学メールでの本人確認、同性限定の設定、会う場所を学内の公共スペースに限る、など）はすでにできていて、' +
    'これから学内で小さく試していく段階です。\n\n' +
    '一緒につくってくれる人を探しています。少しでも興味があれば、気軽に応募してください。話を聞くだけでも大歓迎です。\n' +
    ORGANIZER.terms + '\n\n' +
    'いただいた情報は、こちらからのご連絡にだけ使い、募集が終わったら削除します。\n' +
    'お問い合わせ：' + ORGANIZER.email
  );

  form.setCollectEmail(false);   // 連絡先は下の質問で聞く（Google アカウントのメールは集めない）
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT); } catch (e) {}
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('応募ありがとうございます！ 1週間以内を目安に、大学のメールにご連絡します。');

  form.addTextItem().setTitle('お名前（ニックネームでも大丈夫です）').setRequired(true);

  form.addTextItem()
    .setTitle('連絡先（大学のメールアドレス）')
    .setValidation(
      FormApp.createTextValidation()
        .setHelpText('@hiroshima-u.ac.jp のアドレスを入力してください')
        .requireTextMatchesPattern('^[^@\\s]+@([a-zA-Z0-9-]+\\.)*hiroshima-u\\.ac\\.jp$')
        .build()
    )
    .setRequired(true);

  form.addListItem()
    .setTitle('学部')
    .setChoiceValues([
      '総合科学部', '文学部', '教育学部', '法学部', '経済学部', '理学部',
      '医学部', '歯学部', '薬学部', '工学部', '生物生産学部', '情報科学部'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('学年')
    .setChoiceValues(['学部1年', '学部2年', '学部3年', '学部4年', '学部5・6年', '修士課程', '博士課程'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('協力してみたいこと（いくつでも）')
    .setChoiceValues([
      '教える人として、最初のカードを出す',
      '試しに使ってみて、感想を伝える',
      '開発（プログラミング）',
      'デザイン（画面・イラスト）',
      '広報・SNS',
      '運営（安全対策・問い合わせ対応）',
      'まずは話を聞いてみたい'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('関われる時間の目安')
    .setChoiceValues(['週1〜2時間', '週3〜5時間', 'それ以上', '単発・スポットなら'])
    .setRequired(true);

  form.addParagraphTextItem().setTitle('できること・経験（あれば。例：使える言語やツール、サークルでの広報など）');
  form.addParagraphTextItem().setTitle('ひとこと（任意）');

  var sheet = SpreadsheetApp.create('Campus-Cross 開発・運営メンバー募集（回答）');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  return { form: form, sheet: sheet };
}
