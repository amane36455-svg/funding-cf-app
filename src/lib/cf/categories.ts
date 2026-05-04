export const CF_CATEGORY_OPTIONS = [
  { cfCategory: '売上入金', cfGroup: '変動費', isPersonal: false },
  { cfCategory: '雑収入', cfGroup: '変動費', isPersonal: false },
  { cfCategory: '借入入金', cfGroup: '財務支出', isPersonal: false },
  { cfCategory: '役員借入/個人資金投入', cfGroup: '財務支出', isPersonal: false },
  { cfCategory: 'その他入金', cfGroup: '要確認', isPersonal: false },
  { cfCategory: '人件費', cfGroup: '人件費', isPersonal: false },
  { cfCategory: '地代家賃', cfGroup: '固定費', isPersonal: false },
  { cfCategory: '外注費', cfGroup: '変動費', isPersonal: false },
  { cfCategory: '水道光熱費', cfGroup: '固定費', isPersonal: false },
  { cfCategory: '通信費', cfGroup: '固定費', isPersonal: false },
  { cfCategory: '広告宣伝費', cfGroup: '変動費', isPersonal: false },
  { cfCategory: '消耗品費', cfGroup: '変動費', isPersonal: false },
  { cfCategory: '借入返済', cfGroup: '財務支出', isPersonal: false },
  { cfCategory: '税金支払', cfGroup: '税金', isPersonal: false },
  { cfCategory: '個人支出', cfGroup: '個人関連', isPersonal: true },
  { cfCategory: 'その他支出', cfGroup: '要確認', isPersonal: false },
] as const;

export function findCategoryOption(cfCategory: string) {
  return CF_CATEGORY_OPTIONS.find((option) => option.cfCategory === cfCategory) ?? null;
}
