const { Bot } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
  const kb = {
    inline_keyboard: [
      [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
    ],
  };

  await ctx.reply(
    "👋 Добро пожаловать!\n\n" +
    "Нажмите кнопку ниже для работы:",
    { reply_markup: kb }
  );
});

bot.command("app", async (ctx) => {
  const kb = {
    inline_keyboard: [
      [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
    ],
  };

  await ctx.reply("🚀 Открывайте приложение:", { reply_markup: kb });
});

bot.on("message", async (ctx) => {
  if (ctx.message.web_app_data) {
    await ctx.reply("✅ Данные из приложения получены!");
    return;
  }
  const kb = {
    inline_keyboard: [
      [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
      [{ text: "📊 Быстрый статус", callback_data: "stats" }],
      [{ text: "❓ Помощь", callback_data: "help" }],
    ],
  };
  await ctx.reply(
    "Используйте кнопки ниже:",
    { reply_markup: kb }
  );
});

bot.callbackQuery("stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📊 Статистика доступна в приложении.\nНажмите «Открыть приложение»");
});

bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "❓ Помощь\n\n" +
    "🚀 Открыть приложение — управление заказами\n" +
    "📊 Быстрый статус — статистика за день\n" +
    "📞 Поддержка: @ZP_help"
  );
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

console.log("Bot starting...");
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot started: @${botInfo.username}`);
  },
});
