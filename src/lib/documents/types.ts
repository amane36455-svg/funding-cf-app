export type DocumentKind = 'bank' | 'jfc' | 'internal';

export type DocumentInputs = {
  kind: DocumentKind;
  companyOverview: string;
  loanPurpose: string;
  requestedAmount: string;
  repaymentPeriod: string;
  useOfFunds: string;
  notes?: string;
};

export type DocumentSnapshot = {
  generatedAt: string;
  monthlyCf: {
    incomeTotal: number;
    expenseTotal: number;
    netTotal: number;
    reviewCount: number;
    groups: Array<{
      cfGroup: string;
      cfCategory: string;
      amount: number;
      count: number;
    }>;
  };
  ideas: string[];
};
