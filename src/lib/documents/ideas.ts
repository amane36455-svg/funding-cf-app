import type { DocumentKind } from '@/lib/documents/types';

export function documentTitle(kind: DocumentKind): string {
  if (kind === 'bank') return '銀行向け借入資料 下書き';
  if (kind === 'jfc') return '日本政策金融公庫向け借入申込資料 下書き';
  return '社内稟議書 下書き';
}

export function documentIdeas(kind: DocumentKind): string[] {
  const common = [
    '直近月次CFから、返済原資になり得る営業収支を明示する',
    '不足情報は「要確認」として残し、数字を創作しない',
    '要確認仕訳が多い場合は、提出前に分類を見直す',
  ];

  if (kind === 'bank') {
    return [
      ...common,
      '銀行向けには、既存借入・返済状況・保全状況を別紙で補足する',
      '資金使途は運転資金/設備資金に分け、金額内訳を明細化する',
    ];
  }

  if (kind === 'jfc') {
    return [
      ...common,
      '公庫向けには、事業の公共性・雇用維持・地域性があれば補足する',
      '創業/新規投資の場合は、自己資金と事業経験を追記する',
    ];
  }

  return [
    ...common,
    '社内稟議では、借入しない場合のリスクと代替案を併記する',
    '決裁者が判断しやすいよう、希望条件・返済影響・実行期限を冒頭に置く',
  ];
}
