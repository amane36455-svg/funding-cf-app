import type { DocumentSnapshot } from '@/lib/documents/types';

export function appendNumberGuardWarning(
  markdown: string,
  snapshot: DocumentSnapshot,
  extraAllowedAmounts: string[] = [],
): string {
  const suspicious = findSuspiciousYenAmounts(markdown, snapshot, extraAllowedAmounts);
  if (suspicious.length === 0) return markdown;

  return `${markdown}

## 生成後チェック

以下の金額は、同期済みCFスナップショットに直接含まれていない可能性があります。提出前に確認してください。

${suspicious.map((amount) => `- ${amount}`).join('\n')}
`;
}

export function findSuspiciousYenAmounts(
  markdown: string,
  snapshot: DocumentSnapshot,
  extraAllowedAmounts: string[] = [],
): string[] {
  const allowed = new Set<string>();
  const numbers = [
    snapshot.monthlyCf.incomeTotal,
    snapshot.monthlyCf.expenseTotal,
    snapshot.monthlyCf.netTotal,
    ...snapshot.monthlyCf.groups.map((group) => group.amount),
  ];

  for (const n of numbers) {
    allowed.add(normalizeNumber(String(Math.abs(n))));
    allowed.add(normalizeNumber(Math.abs(n).toLocaleString('ja-JP')));
  }
  for (const value of extraAllowedAmounts) {
    const normalized = normalizeNumber(value);
    if (normalized) allowed.add(normalized);
  }

  const matches = markdown.match(/(?:¥|￥)?\s*-?\d[\d,]*(?:円)?/g) ?? [];
  const suspicious = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeNumber(match);
    if (!normalized) continue;
    if (!allowed.has(normalized)) suspicious.add(match.trim());
  }

  return [...suspicious];
}

function normalizeNumber(value: string): string {
  return value.replace(/[^\d-]/g, '').replace(/^-/, '');
}
