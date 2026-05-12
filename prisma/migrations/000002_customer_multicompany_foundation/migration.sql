-- Extend role values without removing legacy MEMBER data.
ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'STAFF';
ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'REVIEWER';
ALTER TYPE "CompanyRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- New memberships should use STAFF unless a stronger role is explicitly assigned.
ALTER TABLE "user_companies" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- Company metadata for customer management and filtering.
ALTER TABLE "companies"
  ADD COLUMN "company_type" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "fiscal_month" INTEGER,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "memo" TEXT;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_fiscal_month_check" CHECK ("fiscal_month" IS NULL OR ("fiscal_month" >= 1 AND "fiscal_month" <= 12));

-- Per-user customer list state.
ALTER TABLE "user_companies"
  ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_accessed_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Persist the user's current company outside of JWT/session state.
CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "current_company_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX "companies_status_idx" ON "companies"("status");
CREATE INDEX "companies_industry_idx" ON "companies"("industry");
CREATE INDEX "user_companies_user_id_is_favorite_idx" ON "user_companies"("user_id", "is_favorite");
CREATE INDEX "user_companies_user_id_last_accessed_at_idx" ON "user_companies"("user_id", "last_accessed_at");
CREATE INDEX "user_preferences_current_company_id_idx" ON "user_preferences"("current_company_id");

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_current_company_id_fkey" FOREIGN KEY ("current_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
