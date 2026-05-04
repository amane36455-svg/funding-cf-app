import { documentIdeas } from '@/lib/documents/ideas';
import { getMonthlyCfSummary } from '@/lib/cf/aggregator';
import type { DocumentInputs, DocumentSnapshot } from '@/lib/documents/types';

export async function createDocumentSnapshot(args: {
  companyId: string;
  inputs: DocumentInputs;
  now?: Date;
}): Promise<DocumentSnapshot> {
  const now = args.now ?? new Date();
  const monthlyCf = await getMonthlyCfSummary({
    companyId: args.companyId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    scope: 'all',
  });

  return {
    generatedAt: now.toISOString(),
    monthlyCf,
    ideas: documentIdeas(args.inputs.kind),
  };
}
