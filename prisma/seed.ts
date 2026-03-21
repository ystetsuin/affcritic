import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── Channels ────────────────────────────────────────
  const channels = [
    { username: "affiliatesinc", displayName: "Affiliates Inc" },
    { username: "igaboratory", displayName: "iGaming Laboratory" },
    { username: "affpanda_channel", displayName: "AffPanda" },
    { username: "affiliate_valley", displayName: "Affiliate Valley" },
    { username: "gambling_pro", displayName: "Gambling PRO" },
    { username: "partnerkin", displayName: "Partnerkin" },
    { username: "seo_alliance", displayName: "SEO Alliance" },
    { username: "igaming_news_feed", displayName: "iGaming News Feed" },
  ];

  const channelRecords = await Promise.all(
    channels.map((ch) =>
      prisma.channel.upsert({
        where: { username: ch.username },
        update: { displayName: ch.displayName },
        create: ch,
      })
    )
  );

  // ─── Channel Categories ─────────────────────────────
  const channelCategories = [
    { name: "SEO", slug: "seo" },
    { name: "Affiliate Programs", slug: "affiliate-programs" },
    { name: "Media", slug: "media" },
  ];

  const categoryRecords2 = await Promise.all(
    channelCategories.map((c) =>
      prisma.channelCategory.upsert({
        where: { slug: c.slug },
        update: { name: c.name },
        create: c,
      })
    )
  );

  // ─── Channel ↔ Category links ─────────────────────────
  const categoryChannelLinks: { categorySlug: string; channelUsername: string }[] = [
    { categorySlug: "seo", channelUsername: "seo_alliance" },
    { categorySlug: "seo", channelUsername: "partnerkin" },
    { categorySlug: "affiliate-programs", channelUsername: "affiliatesinc" },
    { categorySlug: "affiliate-programs", channelUsername: "affpanda_channel" },
    { categorySlug: "affiliate-programs", channelUsername: "affiliate_valley" },
    { categorySlug: "affiliate-programs", channelUsername: "partnerkin" }, // partnerkin в 2 категоріях
    { categorySlug: "media", channelUsername: "igaboratory" },
    { categorySlug: "media", channelUsername: "gambling_pro" },
    { categorySlug: "media", channelUsername: "igaming_news_feed" },
    { categorySlug: "media", channelUsername: "affiliate_valley" }, // affiliate_valley в 2 категоріях
  ];

  for (const link of categoryChannelLinks) {
    const category = categoryRecords2.find((c) => c.slug === link.categorySlug)!;
    const channel = channelRecords.find((c) => c.username === link.channelUsername)!;
    await prisma.channelCategoryMap.upsert({
      where: {
        categoryId_channelId: { categoryId: category.id, channelId: channel.id },
      },
      update: {},
      create: { categoryId: category.id, channelId: channel.id },
    });
  }

  // ─── Tag Categories ─────────────────────────────────
  const categories = [
    { name: "GEO", slug: "geo", sortOrder: 1 },
    { name: "Компанія", slug: "companies", sortOrder: 2 },
    { name: "Персона", slug: "persons", sortOrder: 3 },
  ];

  const categoryRecords = await Promise.all(
    categories.map((c) =>
      prisma.tagCategory.upsert({
        where: { slug: c.slug },
        update: { name: c.name, sortOrder: c.sortOrder },
        create: c,
      })
    )
  );

  const geo = categoryRecords.find((c) => c.slug === "geo")!;
  const companies = categoryRecords.find((c) => c.slug === "companies")!;
  const persons = categoryRecords.find((c) => c.slug === "persons")!;

  // ─── Tags (active) ──────────────────────────────────
  const activeTags = [
    { categoryId: geo.id, name: "Ukraine", slug: "ukraine" },
    { categoryId: geo.id, name: "Nigeria", slug: "nigeria" },
    { categoryId: geo.id, name: "Brazil", slug: "brazil" },
    { categoryId: geo.id, name: "India", slug: "india" },
    { categoryId: geo.id, name: "Philippines", slug: "philippines" },
    { categoryId: companies.id, name: "Betsson", slug: "betsson" },
    { categoryId: companies.id, name: "Pin-Up", slug: "pin-up" },
    { categoryId: companies.id, name: "1win", slug: "1win" },
    { categoryId: companies.id, name: "Parimatch", slug: "parimatch" },
    { categoryId: companies.id, name: "FanDuel", slug: "fanduel" },
    { categoryId: persons.id, name: "Maksym Krippa", slug: "maksym-krippa" },
    { categoryId: persons.id, name: "Denise Coates", slug: "denise-coates" },
  ];

  for (const tag of activeTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, categoryId: tag.categoryId, status: "active" },
      create: { ...tag, status: "active" },
    });
  }

  // ─── Tags (pending) ─────────────────────────────────
  const pendingTags = [
    { categoryId: geo.id, name: "Kenya", slug: "kenya" },
    { categoryId: companies.id, name: "Stake.com", slug: "stake-com" },
    { categoryId: persons.id, name: "Ed Craven", slug: "ed-craven" },
  ];

  for (const tag of pendingTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, categoryId: tag.categoryId, status: "pending" },
      create: { ...tag, status: "pending" },
    });
  }

  // ─── Admin Settings ─────────────────────────────────
  await prisma.adminSetting.upsert({
    where: { key: "cron_interval" },
    update: { value: "8" },
    create: { key: "cron_interval", value: "8" },
  });

  // ─── Raw Posts (test data) ──────────────────────────
  const ch = (username: string) => channelRecords.find((c) => c.username === username)!;

  const existingRawPosts = await prisma.rawPost.count();
  if (existingRawPosts === 0) {
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

    const rawPosts: {
      channelId: string;
      messageId: number;
      text: string;
      postedAt: Date;
    }[] = [
      // ── Cluster 1: Betsson отримує ліцензію в Бразилії (4 канали) ──
      {
        channelId: ch("affiliatesinc").id,
        messageId: 4501,
        text: "🇧🇷 Betsson Group получил полноценную лицензию от бразильского регулятора SPA. Компания станет одним из первых международных операторов, легально работающих на рынке Бразилии с 1 января 2025. Ожидается запуск под брендом Betsson.br",
        postedAt: hoursAgo(2),
      },
      {
        channelId: ch("igaboratory").id,
        messageId: 3312,
        text: "Betsson получил лицензию в Бразилии. Регулятор SPA одобрил заявку шведского оператора. Запуск планируется в Q1 2025 под локальным доменом. Betsson уже работает в Латинской Америке через бренды Betsafe и Betsson в Колумбии и Аргентине.",
        postedAt: hoursAgo(1.5),
      },
      {
        channelId: ch("affiliate_valley").id,
        messageId: 7890,
        text: "Betsson идет в Бразилию 🇧🇷\n\nШведский гемблинг-гигант Betsson Group подтвердил получение бразильской лицензии. Это открывает доступ к рынку с потенциалом $2.1B в год. Аффилиаты, готовьте офферы — программа запускается в феврале.",
        postedAt: hoursAgo(1),
      },
      {
        channelId: ch("gambling_pro").id,
        messageId: 2210,
        text: "Betsson лицензировался в Бразилии через SPA. Рынок оценивается в $2+ млрд. Компания планирует агрессивный маркетинг и партнёрскую программу с RevShare до 40%. Подробности на сайте Betsson Partners.",
        postedAt: hoursAgo(0.5),
      },

      // ── Cluster 2: Pin-Up блокировки в Украине (3 канали) ──
      {
        channelId: ch("partnerkin").id,
        messageId: 15420,
        text: "КРАІЛ начал блокировку нелицензированных операторов. Pin-Up, работающий по лицензии Кюрасао, попал в список. Провайдеры получили предписание ограничить доступ к сайту с территории Украины. Pin-Up пока не комментирует ситуацию.",
        postedAt: hoursAgo(6),
      },
      {
        channelId: ch("igaming_news_feed").id,
        messageId: 980,
        text: "Pin-Up под угрозой блокировки в Украине 🇺🇦\n\nКРАИЛ выдал предписание ISP о блокировке Pin-Up Casino. Причина — отсутствие украинской лицензии. Ранее Pin-Up подавал заявку на лицензию, но она до сих пор на рассмотрении.",
        postedAt: hoursAgo(5),
      },
      {
        channelId: ch("gambling_pro").id,
        messageId: 2205,
        text: "Украинский регулятор КРАИЛ блокирует Pin-Up. Оператор работал без локальной лицензии. Блокировка затронет трафик из UA — аффилиатам стоит перенаправить на офферы с лицензией.",
        postedAt: hoursAgo(4.5),
      },

      // ── Cluster 3: Google-апдейт проти гемблінг-сайтів (3 канали) ──
      {
        channelId: ch("seo_alliance").id,
        messageId: 890,
        text: "🔴 Google March 2025 Core Update: сильный удар по gambling-сайтам. Наблюдаем падение трафика на 30-60% у аффилиатных сайтов с обзорами казино. Особенно пострадали сайты с тонким контентом и агрессивной линкбилдинг-стратегией.",
        postedAt: hoursAgo(12),
      },
      {
        channelId: ch("partnerkin").id,
        messageId: 15415,
        text: "Google Core Update March 2025 — массовое падение гемблинг-сайтов в выдаче. По данным Ahrefs, средний affiliate-сайт в нише casino reviews потерял 40% органического трафика. Google усилил борьбу с parasite SEO и PBN-ссылками.",
        postedAt: hoursAgo(11),
      },
      {
        channelId: ch("affiliate_valley").id,
        messageId: 7880,
        text: "Мартовский апдейт Google выкосил гемблинг-аффилиатов 📉\n\nКто пострадал: сайты-обзорники казино, doorway pages, PBN-сетки. Кто выиграл: крупные медиа с gambling-разделами и сайты с реальным UGC. Время пересматривать SEO-стратегию.",
        postedAt: hoursAgo(10),
      },

      // ── Cluster 4: 1win та скандал з виплатами (3 канали) ──
      {
        channelId: ch("igaboratory").id,
        messageId: 3305,
        text: "Скандал вокруг 1win: игроки жалуются на задержки выплат от 2 недель. На форумах AskGamblers появились десятки жалоб. Представители 1win ссылаются на 'усиленную верификацию' и обещают решить проблему.",
        postedAt: hoursAgo(20),
      },
      {
        channelId: ch("affpanda_channel").id,
        messageId: 5670,
        text: "1win задерживает выплаты игрокам — проблема длится уже 2+ недели. Партнёрам тоже начали задерживать платежи по CPA. Если работаете с 1win — будьте осторожны, рекомендуем диверсифицировать офферы.",
        postedAt: hoursAgo(18),
      },
      {
        channelId: ch("gambling_pro").id,
        messageId: 2200,
        text: "⚠️ 1win — задержки выплат\n\nПоступают жалобы от игроков и партнёров. Выплаты задерживаются на 14+ дней. 1win объясняет это техническими проблемами с платёжным процессингом. Следим за развитием ситуации.",
        postedAt: hoursAgo(17),
      },

      // ── Cluster 5: Нігерія регуляція (2 канали) ──
      {
        channelId: ch("igaming_news_feed").id,
        messageId: 975,
        text: "Нигерия ужесточает регулирование онлайн-гемблинга. NLRC (National Lottery Regulatory Commission) вводит обязательную верификацию через NIN и повышает лицензионный сбор на 300%. Мелкие операторы могут не выжить.",
        postedAt: hoursAgo(30),
      },
      {
        channelId: ch("affiliatesinc").id,
        messageId: 4490,
        text: "🇳🇬 Nigeria: NLRC повышает требования к онлайн-гемблинг операторам. Обязательная KYC через NIN, увеличение лицензионного сбора x3. Крупные игроки (Bet9ja, 1xBet) справятся, но для мелких букмекеров это может стать концом.",
        postedAt: hoursAgo(28),
      },

      // ── Cluster 6: Parimatch ребрендинг (2 канали) ──
      {
        channelId: ch("partnerkin").id,
        messageId: 15410,
        text: "Parimatch объявил о ребрендинге — теперь PM. Новый логотип, айдентика и позиционирование. Компания делает ставку на киберспорт и молодую аудиторию. Партнёрская программа сохраняется, но меняется домен.",
        postedAt: hoursAgo(36),
      },
      {
        channelId: ch("affiliate_valley").id,
        messageId: 7870,
        text: "Parimatch → PM. Украинский букмекер завершает ребрендинг. Причина — международная экспансия и отстройка от российского рынка. Новый сайт, новый бренд, ставка на esports. Аффилиатам обещают сохранить все условия.",
        postedAt: hoursAgo(34),
      },

      // ── Standalone: FanDuel рекорд ──
      {
        channelId: ch("igaming_news_feed").id,
        messageId: 970,
        text: "FanDuel показал рекордную выручку $1.2B за Q4 2024. Рост на 28% год к году. Компания доминирует на рынке US sports betting с долей 47%. Flutter Entertainment (материнская компания) планирует IPO FanDuel отдельно в 2025.",
        postedAt: hoursAgo(40),
      },

      // ── Standalone: Максим Кріппа та eSports ──
      {
        channelId: ch("gambling_pro").id,
        messageId: 2195,
        text: "Максим Криппа инвестировал в киберспортивную арену в Киеве. Объект на 2000 мест планируют открыть в Q3 2025. Криппа также владеет долей в NAVI и ранее был связан с онлайн-казино Vulkan.",
        postedAt: hoursAgo(44),
      },

      // ── Standalone: Denise Coates зарплата ──
      {
        channelId: ch("igaboratory").id,
        messageId: 3298,
        text: "Denise Coates, CEO Bet365, получила £263M в виде зарплаты и дивидендов за 2024 год. Это делает её самым высокооплачиваемым CEO в Великобритании 8 год подряд. Bet365 показал revenue £3.9B.",
        postedAt: hoursAgo(48),
      },

      // ── Standalone: Stake.com крипто ──
      {
        channelId: ch("affpanda_channel").id,
        messageId: 5660,
        text: "Stake.com запустил новую партнёрку с выплатами в USDT и BTC. RevShare до 45%, минимальный вывод $100. Фокус на крипто-аудиторию. GEO: Latam, Asia, Africa. Без KYC для игроков до $1000 депозита.",
        postedAt: hoursAgo(50),
      },

      // ── Standalone: конференція SiGMA ──
      {
        channelId: ch("affiliatesinc").id,
        messageId: 4485,
        text: "SiGMA Americas 2025 пройдёт 7-9 апреля в Сан-Паулу 🇧🇷. Ожидается 10,000+ участников. В фокусе: регулирование Бразилии, крипто-гемблинг, AI в iGaming. Early bird билеты до 15 марта.",
        postedAt: hoursAgo(52),
      },

      // ── Standalone: Індія ставки на крикет ──
      {
        channelId: ch("igaming_news_feed").id,
        messageId: 965,
        text: "Индия рассматривает легализацию онлайн-ставок на крикет. Законопроект внесён в Lok Sabha. По оценкам KPMG, рынок может составить $5B в год. Основные бенефициары — Dream11 и местные операторы.",
        postedAt: hoursAgo(55),
      },

      // ── Standalone: SEO-тулзи ──
      {
        channelId: ch("seo_alliance").id,
        messageId: 885,
        text: "Ahrefs добавил новый фильтр для gambling-ниши. Теперь можно отслеживать позиции по ключам типа 'best online casino', 'sports betting sites' с разбивкой по GEO. Полезно для отслеживания позиций после апдейтов.",
        postedAt: hoursAgo(58),
      },

      // ── Standalone: Філіппіни POGO ──
      {
        channelId: ch("igaboratory").id,
        messageId: 3290,
        text: "Филиппины закрыли 170 POGO-операторов (Philippine Offshore Gaming Operators). Президент Маркос подписал указ о полном запрете. Тысячи работников из Китая подлежат депортации. Операторы переезжают в Камбоджу и Мьянму.",
        postedAt: hoursAgo(60),
      },
    ];

    await Promise.all(
      rawPosts.map((rp) =>
        prisma.rawPost.create({ data: rp })
      )
    );
  }

  // ─── Pipeline Logs (test data) ─────────────────────
  const existingLogs = await prisma.pipelineLog.count();
  if (existingLogs === 0) {
    await prisma.pipelineLog.createMany({
      data: [
        {
          type: "scraper",
          payload: { channels_checked: 8, new_posts: 12, duration_ms: 4500 },
        },
        {
          type: "embedding",
          payload: { posts_embedded: 12, model: "text-embedding-3-small", duration_ms: 2100 },
        },
        {
          type: "grouping",
          payload: { new_groups: 8, merged: 4, skipped_manual: 0, threshold: 0.83 },
        },
        {
          type: "gpt",
          payload: { groups_summarized: 8, tags_created: 3, tags_reused: 15, model: "gpt-4o-mini" },
        },
        {
          type: "quality",
          payload: { checked: 8, ok: 6, suspicious: 1, bad: 1 },
        },
      ],
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
