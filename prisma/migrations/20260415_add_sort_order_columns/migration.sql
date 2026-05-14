-- Add missing sort_order column to channel_categories
ALTER TABLE "channel_categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
