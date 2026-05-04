import { redirect } from 'next/navigation';
import { requireUserAndCompany } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { decryptToken } from '@/lib/crypto/token';
import { fetchOfficesWithAccessToken } from '@/lib/mf/oauth';
import { OfficeSelectForm } from '@/components/common/OfficeSelectForm';

export default async function SelectOfficePage() {
  const context = await requireUserAndCompany();
  const connection = await prisma.mfConnection.findUnique({
    where: { companyId: context.companyId },
  });
  if (!connection) redirect('/settings');

  const offices = await fetchOfficesWithAccessToken(decryptToken(Buffer.from(connection.accessTokenEnc)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MF officeを選択</h1>
        <p className="text-sm text-slate-500">
          同期対象にする事業者を選択してください。
        </p>
      </div>
      <OfficeSelectForm offices={offices} selectedOfficeId={connection.mfOfficeId} />
    </div>
  );
}
