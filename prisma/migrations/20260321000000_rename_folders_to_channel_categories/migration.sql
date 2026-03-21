-- DropTable
DROP TABLE IF EXISTS "folder_channels";
DROP TABLE IF EXISTS "folders";

-- CreateTable
CREATE TABLE "channel_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_category_map" (
    "category_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,

    CONSTRAINT "channel_category_map_pkey" PRIMARY KEY ("category_id","channel_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_categories_slug_key" ON "channel_categories"("slug");

-- AddForeignKey
ALTER TABLE "channel_category_map" ADD CONSTRAINT "channel_category_map_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "channel_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_category_map" ADD CONSTRAINT "channel_category_map_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
