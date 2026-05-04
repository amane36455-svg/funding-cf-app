# Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| MF accounts/journals API shape differs from assumptions | Sync fails | Keep paths/types isolated in `src/lib/mf`; update after real response check |
| Vercel function timeout during large sync | Partial or failed sync | MVP sync only previous/current month; record failed history; later move to worker |
| Token refresh fails | Sync unavailable | Return `MF_AUTH_EXPIRED`; show reconnect flow |
| Generated document invents numbers | Financial document risk | Prompt restriction + number guard + human review |
| PDF rendering fails on Vercel | Cannot export | Verify Chromium strategy before production |
| company_id missing in query | Data leakage | Use `requireUserAndCompany` / `getUserAndCompanyForApi`; add tests in hardening phase |
| Classification is inaccurate | Misleading CF | Mark uncertain rows as `要確認`; allow manual override |
| Supabase connection exhaustion | App instability | Use Supavisor transaction pooler for runtime |
| Cron unauthorized | Daily sync does not run | Use Vercel `CRON_SECRET` Authorization header |

## MVP Decision

The MVP prioritizes traceable, editable drafts over fully automated financial judgment.

Every generated document must be reviewed by a human before it is submitted externally.
