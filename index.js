const { Bot, Keyboard } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";
const API_URL = process.env.API_URL || "https://zolotoybot.ru";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

async function checkAuth(telegramId) {
  try {
    const resp = await fetch(`${API_URL}/api/driver/check?telegram_id=${telegramId}`);
    const data = await resp.json();
    return data.authorized;
  } catch {
    return false;
  }
}

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;
  const authorized = await checkAuth(userId);

  if (authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
      ],
    };
    await ctx.reply("✅ Добро пожаловать!\n\nНажмите кнопку для работы:", { reply_markup: kb });
  } else {
    await ctx.reply(
      "🚫 Вы не авторизованы в парке.\n\n" +
      "Для доступа обратитесь к диспетчеру или нажмите кнопку ниже для регистрации.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Запросить доступ", callback_data: "request_access" }],
            [{ text: "❓ Помощь", callback_data: "help" }],
          ],
        },
      }
    );
  }
});

bot.command("app", async (ctx) => {
  const authorized = await checkAuth(ctx.from.id);
  if (authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
      ],
    };
    await ctx.reply("🚀 Открывайте приложение:", { reply_markup: kb });
  } else {
    await ctx.reply("🚫 Нет доступа. Обратитесь к диспетчеру.");
  }
});

bot.callbackQuery("request_access", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "📝 Запрос на доступ отправлен.\n\n" +
    "Для регистрации в парке пришлите:\n" +
    "1. ФИО\n" +
    "2. Номер телефона\n" +
    "3. Госномер автомобиля\n\n" +
    "Диспетчер свяжется с вами."
  );
});

bot.callbackQuery("stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const authorized = await checkAuth(ctx.from.id);
  if (authorized) {
    await ctx.reply("📊 Статистика доступна в приложении.\nНажмите «Открыть приложение»");
  } else {
    await ctx.reply("🚫 Нет доступа.");
  }
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

bot.on("message", async (ctx) => {
  if (ctx.message.web_app_data) {
    await ctx.reply("✅ Данные из приложения получены!");
    return;
  }
  const authorized = await checkAuth(ctx.from.id);
  if (authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Открыть приложение", web_app: { url: WEBAPP_URL } }],
        [{ text: "📊 Быстрый статус", callback_data: "stats" }],
        [{ text: "❓ Помощь", callback_data: "help" }],
      ],
    };
    await ctx.reply("Используйте кнопки:", { reply_markup: kb });
  } else {
    await ctx.reply("🚫 Вы не авторизованы. Нажмите /start");
  }
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
