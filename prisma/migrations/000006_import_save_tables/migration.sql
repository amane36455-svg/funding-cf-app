CREATE TABLE "imported_files" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_kind" "ImportFileKind" NOT NULL,
    "encoding" TEXT,
    "sheet_name" TEXT,
    "file_size_bytes" INTEGER NOT NULL,
    "storage_ref" TEXT,
    "preview_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "imported_file_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "ready_row_count" INTEGER NOT NULL DEFAULT 0,
    "needs_review_row_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_row_count" INTEGER NOT NULL DEFAULT 0,
    "mapping_snapshot" JSONB NOT NULL,
    "validation_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "source_row_number" INTEGER NOT NULL,
    "trade_date" DATE NOT NULL,
    "description" TEXT,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "raw_row_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_entry_lines" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "side" "JournalEntryLineSide" NOT NULL,
    "account_name" TEXT NOT NULL,
    "sub_account_name" TEXT,
    "department_name" TEXT,
    "tax_category" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "imported_files_company_id_created_at_idx" ON "imported_files"("company_id", "created_at");
CREATE INDEX "imported_files_company_id_uploaded_by_user_id_idx" ON "imported_files"("company_id", "uploaded_by_user_id");

CREATE INDEX "import_batches_company_id_status_idx" ON "import_batches"("company_id", "status");
CREATE INDEX "import_batches_company_id_imported_file_id_idx" ON "import_batches"("company_id", "imported_file_id");
CREATE INDEX "import_batches_company_id_created_by_user_id_idx" ON "import_batches"("company_id", "created_by_user_id");
CREATE INDEX "import_batches_company_id_created_at_idx" ON "import_batches"("company_id", "created_at");

CREATE UNIQUE INDEX "journal_entries_company_id_import_batch_id_source_row_number_key" ON "journal_entries"("company_id", "import_batch_id", "source_row_number");
CREATE INDEX "journal_entries_company_id_import_batch_id_idx" ON "journal_entries"("company_id", "import_batch_id");
CREATE INDEX "journal_entries_company_id_trade_date_idx" ON "journal_entries"("company_id", "trade_date");
CREATE INDEX "journal_entries_company_id_status_idx" ON "journal_entries"("company_id", "status");

CREATE INDEX "journal_entry_lines_company_id_journal_entry_id_idx" ON "journal_entry_lines"("company_id", "journal_entry_id");
CREATE INDEX "journal_entry_lines_company_id_side_idx" ON "journal_entry_lines"("company_id", "side");

ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imported_files" ADD CONSTRAINT "imported_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_file_id_fkey" FOREIGN KEY ("imported_file_id") REFERENCES "imported_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
