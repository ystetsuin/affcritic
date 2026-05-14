CREATE TABLE "channel_stats_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" UUID NOT NULL,
    "subscribers" INTEGER NOT NULL,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_stats_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "channel_stats_history_channel_id_scraped_at_idx" ON "channel_stats_history"("channel_id", "scraped_at");

ALTER TABLE "channel_stats_history" ADD CONSTRAINT "channel_stats_history_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
