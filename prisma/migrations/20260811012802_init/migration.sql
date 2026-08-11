-- CreateEnum
CREATE TYPE "ledger_entry_kind" AS ENUM ('origination', 'payment');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'collector');

-- CreateTable
CREATE TABLE "commerce" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "commerce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectors" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "dpi" VARCHAR(20),
    "mobile" VARCHAR(20),
    "address" TEXT,
    "birth_date" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "details" TEXT,
    "collector_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "dpi" VARCHAR(20),
    "address" TEXT,
    "mobile" VARCHAR(20),
    "mobile2" VARCHAR(20),
    "commerce_id" INTEGER,
    "route_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "collector_id" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "start_date" DATE NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "interest_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "cancelled_at" DATE,
    "bad_record" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" SERIAL NOT NULL,
    "credit_id" INTEGER NOT NULL,
    "kind" "ledger_entry_kind" NOT NULL,
    "entry_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "running_balance" DECIMAL(12,2) NOT NULL,
    "voided_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_closes" (
    "id" SERIAL NOT NULL,
    "collector_id" INTEGER NOT NULL,
    "close_date" DATE NOT NULL,
    "collected" DECIMAL(12,2) NOT NULL,
    "base" DECIMAL(12,2) NOT NULL,
    "surplus" DECIMAL(12,2) NOT NULL,
    "disbursed" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "username" VARCHAR(60) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "collector_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collectors_active_idx" ON "collectors"("active");

-- CreateIndex
CREATE INDEX "routes_collector_id_idx" ON "routes"("collector_id");

-- CreateIndex
CREATE INDEX "routes_active_idx" ON "routes"("active");

-- CreateIndex
CREATE INDEX "customers_route_id_idx" ON "customers"("route_id");

-- CreateIndex
CREATE INDEX "customers_commerce_id_idx" ON "customers"("commerce_id");

-- CreateIndex
CREATE INDEX "customers_active_idx" ON "customers"("active");

-- CreateIndex
CREATE INDEX "credits_customer_id_idx" ON "credits"("customer_id");

-- CreateIndex
CREATE INDEX "credits_collector_id_idx" ON "credits"("collector_id");

-- CreateIndex
CREATE INDEX "credits_code_idx" ON "credits"("code");

-- CreateIndex
CREATE INDEX "credits_cancelled_at_idx" ON "credits"("cancelled_at");

-- CreateIndex
CREATE INDEX "ledger_entries_credit_id_id_idx" ON "ledger_entries"("credit_id", "id");

-- CreateIndex
CREATE INDEX "ledger_entries_entry_date_idx" ON "ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "daily_closes_close_date_idx" ON "daily_closes"("close_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closes_collector_id_close_date_key" ON "daily_closes"("collector_id", "close_date");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_collector_id_idx" ON "users"("collector_id");

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_commerce_id_fkey" FOREIGN KEY ("commerce_id") REFERENCES "commerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
