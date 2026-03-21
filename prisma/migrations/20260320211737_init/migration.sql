-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('active', 'pending');

-- CreateEnum
CREATE TYPE "PipelineLogType" AS ENUM ('scraper', 'embedding', 'grouping', 'gpt', 'quality', 'admin');

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_channels" (
    "folder_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,

    CONSTRAINT "folder_channels_pkey" PRIMARY KEY ("folder_id","channel_id")
);

-- CreateTable
CREATE TABLE "tag_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tag_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TagStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_posts" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "message_id" INTEGER NOT NULL,
    "text" TEXT,
    "media_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "embedding" BYTEA,
    "post_id" UUID,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "summary" TEXT,
    "summary_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_manually_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_manually_grouped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_sources" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "message_id" INTEGER NOT NULL,
    "original_text" TEXT,
    "tg_url" TEXT,

    CONSTRAINT "post_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "pipeline_logs" (
    "id" UUID NOT NULL,
    "type" "PipelineLogType" NOT NULL,
    "post_id" UUID,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_username_key" ON "channels"("username");

-- CreateIndex
CREATE UNIQUE INDEX "folders_slug_key" ON "folders"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tag_categories_slug_key" ON "tag_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "idx_tags_status" ON "tags"("status");

-- CreateIndex
CREATE INDEX "idx_tags_category" ON "tags"("category_id");

-- CreateIndex
CREATE INDEX "idx_raw_processed" ON "raw_posts"("processed");

-- CreateIndex
CREATE INDEX "idx_raw_posted_at" ON "raw_posts"("posted_at");

-- CreateIndex
CREATE UNIQUE INDEX "idx_raw_channel_msg" ON "raw_posts"("channel_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_posts_created" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "idx_posts_deleted" ON "posts"("is_deleted");

-- CreateIndex
CREATE INDEX "idx_post_sources_post" ON "post_sources"("post_id");

-- CreateIndex
CREATE INDEX "idx_post_tags_post" ON "post_tags"("post_id");

-- CreateIndex
CREATE INDEX "idx_post_tags_tag" ON "post_tags"("tag_id");

-- CreateIndex
CREATE INDEX "idx_pipeline_logs_type" ON "pipeline_logs"("type");

-- CreateIndex
CREATE INDEX "idx_pipeline_logs_post" ON "pipeline_logs"("post_id");

-- CreateIndex
CREATE INDEX "idx_pipeline_logs_created" ON "pipeline_logs"("created_at");

-- AddForeignKey
ALTER TABLE "folder_channels" ADD CONSTRAINT "folder_channels_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_channels" ADD CONSTRAINT "folder_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "tag_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_posts" ADD CONSTRAINT "raw_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_posts" ADD CONSTRAINT "raw_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_logs" ADD CONSTRAINT "pipeline_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
