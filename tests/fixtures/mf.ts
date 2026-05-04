export const mfOfficeResponse = {
  data: [{ id: 101, name: 'テスト事業者' }],
};

export const mfAccountsResponse = {
  data: [
    { id: 1, name: '普通預金', category: '資産' },
    { id: 2, name: '売上高', category: '収益' },
    { id: 3, name: '給料手当', category: '費用' },
  ],
};

export const mfJournalsResponse = {
  data: [
    {
      id: 10,
      issue_date: '2026-04-30',
      description: '売上入金',
      details: [
        { id: 1001, side: 'debit', account_id: 1, amount: 110000 },
        { id: 1002, side: 'credit', account_id: 2, amount: 110000 },
      ],
    },
  ],
};
