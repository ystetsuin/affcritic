-- CreateTable: blocked_posts
CREATE TABLE "blocked_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" UUID NOT NULL,
    "message_id" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tag_aliases
CREATE TABLE "tag_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tag_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_blocked_channel_msg" ON "blocked_posts"("channel_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_tag_aliases_tag" ON "tag_aliases"("tag_id");

-- AddForeignKey
ALTER TABLE "blocked_posts" ADD CONSTRAINT "blocked_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_aliases" ADD CONSTRAINT "tag_aliases_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
