import { documentIdeas, documentTitle } from '@/lib/documents/ideas';
import type { DocumentInputs, DocumentSnapshot } from '@/lib/documents/types';
import { env } from '@/lib/env';

export async function generateDraftMarkdown(args: {
  inputs: DocumentInputs;
  snapshot: DocumentSnapshot;
}): Promise<string> {
  if (env.ANTHROPIC_API_KEY) {
    try {
      return await generateWithClaude(args);
    } catch {
      return generateLocalDraftMarkdown(args);
    }
  }
  return generateLocalDraftMarkdown(args);
}

function generateLocalDraftMarkdown(args: {
  inputs: DocumentInputs;
  snapshot: DocumentSnapshot;
}): string {
  const { inputs, snapshot } = args;
  const title = documentTitle(inputs.kind);
  const ideas = documentIdeas(inputs.kind);
  const cf = snapshot.monthlyCf;

  return `# ${title}

> この文書は下書きです。提出前に、金額・期間・資金使途・返済条件を必ず確認してください。

## 1. 借入目的

${inputs.loanPurpose || '（要確認）借入目的を記載してください。'}

## 2. 現在の事業状況

${inputs.companyOverview || '（要確認）会社概要・事業内容・主な取引先・直近の状況を追記してください。'}

## 3. 直近の収支・CF状況

対象月の収入合計は ${formatYen(cf.incomeTotal)}、支出合計は ${formatYen(cf.expenseTotal)}、純収支は ${formatYen(cf.netTotal)} です。
要確認に分類された明細は ${cf.reviewCount} 件あります。提出前に内容を確認してください。

### 主な内訳

${cf.groups.length > 0 ? cf.groups.map((g) => `- ${g.cfGroup} / ${g.cfCategory}: ${formatYen(g.amount)}（${g.count}件）`).join('\n') : '- （要確認）同期済みCFデータが不足しています。'}

## 4. 希望借入条件

- 希望借入金額: ${inputs.requestedAmount || '（要確認）'}
- 希望返済期間: ${inputs.repaymentPeriod || '（要確認）'}
- 資金使途: ${inputs.useOfFunds || '（要確認）'}

## 5. 返済原資

返済原資は、既存事業から生じる月次キャッシュフローを前提に検討します。
現時点の純収支は ${formatYen(cf.netTotal)} ですが、単月データのみでは返済能力を断定できません。
直近複数月の推移、既存借入返済、税金支払、役員借入等を確認したうえで、返済可能額を整理する必要があります。

## 6. 今後の見込み

${inputs.notes || '（要確認）売上見込み、受注状況、費用削減策、資金繰り改善策などを追記してください。'}

## 7. リスクと対応策

- 売上入金の遅延: 入金予定表を作成し、主要取引先の回収条件を確認する
- 固定費負担: 地代家賃・人件費・通信費などの固定費を月次で確認する
- 要確認仕訳: 分類未確定の支出を確認し、金融機関提出前に説明可能な状態にする

## 8. 追加で準備すべき資料・アイデア

${ideas.map((idea) => `- ${idea}`).join('\n')}

## 9. 結論

本件借入は、上記の資金使途および返済原資を整理したうえで、${inputs.kind === 'internal' ? '社内承認の可否を判断する' : '金融機関へ相談・申込を進める'}ための下書きです。
不足情報は提出前に補完し、過度な断定を避けた説明資料として整備します。
`;
}

async function generateWithClaude(args: {
  inputs: DocumentInputs;
  snapshot: DocumentSnapshot;
}): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    system:
      'あなたは中小企業の財務担当者です。与えられた数値だけを使い、借入資料・稟議書の下書きをMarkdownで作成してください。数字を創作せず、不足情報は（要確認）と明記してください。',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(
          {
            inputs: args.inputs,
            snapshot: args.snapshot,
            requiredSections: [
              '借入目的',
              '現在の事業状況',
              '直近の収支・CF状況',
              '資金使途',
              '返済原資',
              '今後の見込み',
              'リスクと対応策',
              '結論',
            ],
          },
          null,
          2,
        ),
      },
    ],
  });

  const first = response.content[0];
  if (first?.type !== 'text') {
    throw new Error('Claude response did not contain text');
  }
  return first.text;
}

function formatYen(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}
