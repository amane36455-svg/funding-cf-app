import { getUserAndCompanyForApi } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/apiResponse';
import {
  MFApiError,
  MFAuthError,
  MFRateLimitError,
  MFServerError,
  serializeError,
} from '@/lib/mf/errors';
import { runManualSync } from '@/lib/mf/sync/runner';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  const context = await getUserAndCompanyForApi();
  if (!context) {
    return fail('UNAUTHORIZED', 'ログインと会社選択が必要です', 401);
  }

  try {
    const result = await runManualSync(context.companyId);
    return ok({
      historyId: result.historyId,
      accountsFetched: result.accounts.fetched,
      accountsUpserted: result.accounts.upserted,
      accountsSkipped: result.accounts.skipped,
      journalsFetched: result.journals.fetched,
      journalsUpserted: result.journals.journalsUpserted,
      detailsUpserted: result.journals.detailsUpserted,
      detailsSkipped: result.journals.detailsSkipped,
      classified: result.classification.classified,
      classificationSkipped: result.classification.skipped,
      needsReview: result.classification.needsReview,
      pages: result.journals.pages,
      rangeFrom: result.rangeFrom,
      rangeTo: result.rangeTo,
    });
  } catch (error) {
    if (error instanceof MFAuthError) {
      return fail(
        'MF_AUTH_EXPIRED',
        'MF連携の有効期限が切れました。設定画面から再連携してください。',
        401,
        serializeError(error),
      );
    }

    if (error instanceof MFRateLimitError) {
      return fail(
        'MF_RATE_LIMIT',
        'MF APIの利用制限により同期を中断しました。数分後に再度お試しください。',
        429,
        serializeError(error),
      );
    }

    if (error instanceof MFServerError) {
      return fail(
        'MF_SERVER_ERROR',
        'MF側で一時的なエラーが発生しました。しばらく待って再度お試しください。',
        502,
        serializeError(error),
      );
    }

    if (error instanceof MFApiError) {
      return fail('MF_API_ERROR', '同期に失敗しました。MF APIの設定を確認してください。', 500, serializeError(error));
    }

    return fail('SYNC_ERROR', '同期に失敗しました。', 500, serializeError(error));
  }
}
