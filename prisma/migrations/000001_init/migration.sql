-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("user_id","company_id")
);

-- CreateTable
CREATE TABLE "mf_connections" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "mf_office_id" TEXT,
    "access_token_enc" BYTEA NOT NULL,
    "refresh_token_enc" BYTEA NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mf_accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "mf_account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sub_category" TEXT,
    "excise" TEXT,
    "raw_json" JSONB NOT NULL,
    "updated_at_mf" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mf_journals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "mf_journal_id" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "slip_number" TEXT,
    "description" TEXT,
    "tag_names" TEXT[],
    "total_amount" BIGINT NOT NULL,
    "raw_json" JSONB NOT NULL,
    "updated_at_mf" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mf_journal_details" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "journal_id" UUID NOT NULL,
    "mf_detail_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "account_id" UUID,
    "sub_account_name" TEXT,
    "amount" BIGINT NOT NULL,
    "tax_amount" BIGINT,
    "description" TEXT,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_journal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cf_classification_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "match_type" TEXT NOT NULL,
    "match_value" TEXT NOT NULL,
    "cf_category" TEXT NOT NULL,
    "cf_group" TEXT NOT NULL,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cf_classification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cf_classification_results" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "journal_detail_id" UUID NOT NULL,
    "cf_category" TEXT NOT NULL,
    "cf_group" TEXT NOT NULL,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "applied_rule_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cf_classification_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inputs_json" JSONB NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "model" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mf_sync_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "target_range_from" DATE,
    "target_range_to" DATE,
    "journals_upserted" INTEGER NOT NULL DEFAULT 0,
    "details_upserted" INTEGER NOT NULL DEFAULT 0,
    "error_json" JSONB,

    CONSTRAINT "mf_sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_companies_company_id_idx" ON "user_companies"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "mf_connections_company_id_key" ON "mf_connections"("company_id");

-- CreateIndex
CREATE INDEX "mf_accounts_company_id_name_idx" ON "mf_accounts"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mf_accounts_company_id_mf_account_id_key" ON "mf_accounts"("company_id", "mf_account_id");

-- CreateIndex
CREATE INDEX "mf_journals_company_id_issue_date_idx" ON "mf_journals"("company_id", "issue_date");

-- CreateIndex
CREATE UNIQUE INDEX "mf_journals_company_id_mf_journal_id_key" ON "mf_journals"("company_id", "mf_journal_id");

-- CreateIndex
CREATE INDEX "mf_journal_details_company_id_journal_id_idx" ON "mf_journal_details"("company_id", "journal_id");

-- CreateIndex
CREATE INDEX "mf_journal_details_company_id_account_id_idx" ON "mf_journal_details"("company_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "mf_journal_details_company_id_mf_detail_id_key" ON "mf_journal_details"("company_id", "mf_detail_id");

-- CreateIndex
CREATE INDEX "cf_classification_rules_company_id_enabled_priority_idx" ON "cf_classification_rules"("company_id", "enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "cf_classification_results_journal_detail_id_key" ON "cf_classification_results"("journal_detail_id");

-- CreateIndex
CREATE INDEX "cf_classification_results_company_id_needs_review_idx" ON "cf_classification_results"("company_id", "needs_review");

-- CreateIndex
CREATE INDEX "cf_classification_results_company_id_cf_group_idx" ON "cf_classification_results"("company_id", "cf_group");

-- CreateIndex
CREATE INDEX "generated_documents_company_id_created_at_idx" ON "generated_documents"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "mf_sync_history_company_id_started_at_idx" ON "mf_sync_history"("company_id", "started_at");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_connections" ADD CONSTRAINT "mf_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_accounts" ADD CONSTRAINT "mf_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_journals" ADD CONSTRAINT "mf_journals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_journal_details" ADD CONSTRAINT "mf_journal_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_journal_details" ADD CONSTRAINT "mf_journal_details_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "mf_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_journal_details" ADD CONSTRAINT "mf_journal_details_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mf_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cf_classification_rules" ADD CONSTRAINT "cf_classification_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cf_classification_results" ADD CONSTRAINT "cf_classification_results_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cf_classification_results" ADD CONSTRAINT "cf_classification_results_journal_detail_id_fkey" FOREIGN KEY ("journal_detail_id") REFERENCES "mf_journal_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cf_classification_results" ADD CONSTRAINT "cf_classification_results_applied_rule_id_fkey" FOREIGN KEY ("applied_rule_id") REFERENCES "cf_classification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_sync_history" ADD CONSTRAINT "mf_sync_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

