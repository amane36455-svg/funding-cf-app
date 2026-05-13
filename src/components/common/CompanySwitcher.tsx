'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { AppRole } from '@/lib/auth/company-scope';

type CompanyItem = {
  id: string;
  name: string;
  role: AppRole;
  isFavorite: boolean;
  lastAccessedAt: string | null;
};

export function CompanySwitcher({ currentCompanyId }: { currentCompanyId: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/companies')
      .then((response) => response.json())
      .then((body) => {
        if (body.ok) setCompanies(body.data.companies);
      });
  }, []);

  async function switchCompany(companyId: string) {
    if (companyId === currentCompanyId) return;
    setLoading(true);
    const response = await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    const body = await response.json();
    if (body.ok) {
      await update({ currentCompanyId: companyId });
      router.replace('/dashboard');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <select
      value={currentCompanyId}
      onChange={(event) => switchCompany(event.target.value)}
      disabled={loading || companies.length <= 1}
      className="rounded border px-2 py-1 text-sm"
      aria-label="会社を切り替え"
    >
      {companies.length === 0 ? (
        <option value={currentCompanyId}>会社</option>
      ) : (
        companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.isFavorite ? '★ ' : ''}
            {company.name}
          </option>
        ))
      )}
    </select>
  );
}
