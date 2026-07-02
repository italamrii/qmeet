-- AlterTable
ALTER TABLE "Room" ADD COLUMN "roomCode" TEXT;

-- Backfill existing rows with generated codes (best-effort unique suffix from id).
UPDATE "Room" SET "roomCode" = 'Q-' || LPAD((ABS(HASHTEXT("id")) % 10000)::TEXT, 4, '0') || '-' || LPAD((ABS(HASHTEXT("id" || 'x')) % 10000)::TEXT, 4, '0') WHERE "roomCode" IS NULL;

-- Ensure no nulls remain
UPDATE "Room" SET "roomCode" = 'Q-0000-' || SUBSTRING("id", 1, 4) WHERE "roomCode" IS NULL;

ALTER TABLE "Room" ALTER COLUMN "roomCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomCode_key" ON "Room"("roomCode");
