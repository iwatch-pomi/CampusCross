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
 * 作られるもの：
 *   - Google フォーム「Campus-Cross 学内アンケート」（あなたのマイドライブに保存）
 *   - 回答が自動で集まる Google スプレッドシート
 *
 * 個人情報を集めない設定（メールアドレスを集めない、ログイン不要）にしてあります。
 * 質問の文言は docs/survey と Claude Docs の「学内アンケート（質問案）」に合わせています。
 * 同じスクリプトを2回実行すると、フォームが2つできます（不要な方はドライブから削除）。
 */
function createCampusCrossSurvey() {
  var form = FormApp.create('Campus-Cross 学内アンケート');

  form.setDescription(
    '広島大学の学生どうしで、自分の専門を15〜30分だけ教え合うサービス「Campus-Cross」を準備しています。' +
    '使いやすい形にするため、約5分のアンケートにご協力ください。\n\n' +
    'このアンケートは、サービスの設計のためのものです（研究のための調査ではありません）。' +
    '回答は無記名で、氏名やメールアドレスはお聞きしません。' +
    '結果はサービスの設計にだけ使い、学外に個別の回答を公開することはありません。'
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
    'サービスの開始は、学内の告知でお知らせします。\n' +
    'お問い合わせ：〇〇（担当者の大学メール）'
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

  Logger.log('編集用URL：' + form.getEditUrl());
  Logger.log('回答用URL（これを配る）：' + form.getPublishedUrl());
  Logger.log('回答シートURL：' + sheet.getUrl());
}
