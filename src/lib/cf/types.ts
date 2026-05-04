export type CfDirection = 'income' | 'expense' | 'none';

export type CfRuleMatchType = 'account' | 'sub_account' | 'description_regex';

export type CfRuleLike = {
  id?: string | null;
  priority: number;
  matchType: CfRuleMatchType | string;
  matchValue: string;
  cfCategory: string;
  cfGroup: string;
  isPersonal: boolean;
};

export type CfClassification = {
  cfCategory: string;
  cfGroup: string;
  isPersonal: boolean;
  needsReview: boolean;
  appliedRuleId: string | null;
  reason: string;
  direction: CfDirection;
};

export type ClassificationRunResult = {
  classified: number;
  skipped: number;
  needsReview: number;
};
