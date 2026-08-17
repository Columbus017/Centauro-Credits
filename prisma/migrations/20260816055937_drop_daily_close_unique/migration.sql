-- DropIndex
DROP INDEX "daily_closes_collector_id_close_date_key";

-- CreateIndex
CREATE INDEX "daily_closes_collector_id_close_date_idx" ON "daily_closes"("collector_id", "close_date");
