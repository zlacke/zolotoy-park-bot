const { Bot } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";
const API_URL = process.env.API_URL || "https://zolotoybot.ru";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const userSessions = {};

bot.command("start", async (ctx) => {
  userSessions[ctx.from.id] = { step: "ask_identifier" };
  await ctx.reply(
    "\U0001F44B Добро пожаловать в Золотой Парк!\n\n" +
    "Для входа введите ваш номер телефона или номер водительского удостоверения:",
    {
      reply_markup: {
        force_reply: true,
        selective: true,
      },
    }
  );
});

bot.command("app", async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (session && session.authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "\U0001F680 Открыть приложение", web_app: { url: WEBAPP_URL } }],
      ],
    };
    await ctx.reply("\U0001F680 Открывайте приложение:", { reply_markup: kb });
  } else {
    await ctx.reply("\u274C Сначала авторизуйтесь. Нажмите /start");
  }
});

bot.on("message:text", async (ctx) => {
  const session = userSessions[ctx.from.id];

  if (session && session.step === "ask_identifier") {
    const identifier = ctx.message.text.trim();

    await ctx.reply("\U0001F50D Проверяю данные...");

    try {
      const resp = await fetch(
        `${API_URL}/api/driver/verify?identifier=${encodeURIComponent(identifier)}`
      );
      const data = await resp.json();

      if (data.authorized) {
        userSessions[ctx.from.id] = {
          step: "done",
          authorized: true,
          driver: data.driver,
        };

        const mainKb = {
          keyboard: [
            [{ text: "\U0001F680 Открыть приложение", web_app: { url: WEBAPP_URL } }],
            [{ text: "\U0001F4CA Быстрый статус" }],
            [{ text: "\u2753 Помощь" }],
          ],
          resize_keyboard: true,
        };

        await ctx.reply(
          `\u2705 ${data.driver.name || "Водитель"}, вы авторизованы!\n\n` +
          `\U0001F197 Добро пожаловать в Золотой Парк.\n` +
          `Нажмите \u00ABОткрыть приложение\u00BB для работы.`,
          { reply_markup: mainKb }
        );
      } else {
        userSessions[ctx.from.id] = { step: "ask_identifier" };
        await ctx.reply(
          `\u274C Данные не найдены: «${identifier}»\n\n` +
          `Проверьте номер телефона или водительское удостоверение и попробуйте снова.\n` +
          `Или нажмите /start для начала.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "\U0001F504 Попробовать снова", callback_data: "retry" }],
                [{ text: "\u2753 Помощь", callback_data: "help" }],
              ],
            },
          }
        );
      }
    } catch (e) {
      console.error("Verify error:", e);
      await ctx.reply(
        "\u26A0\uFE0F Ошибка проверки. Попробуйте позже или обратитесь к диспетчеру."
      );
    }
    return;
  }

  if (ctx.message.web_app_data) {
    await ctx.reply("\u2705 Данные из приложения получены!");
    return;
  }
});

bot.callbackQuery("retry", async (ctx) => {
  await ctx.answerCallbackQuery();
  userSessions[ctx.from.id] = { step: "ask_identifier" };
  await ctx.reply("Введите номер телефона или водительское удостоверение:");
});

bot.callbackQuery("stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "\U0001F4CA Статистика доступна в приложении.\nНажмите \u00ABОткрыть приложение\u00BB"
  );
});

bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "\u2753 Помощь\n\n" +
    "\U0001F680 Открыть приложение \u2014 управление заказами\n" +
    "\U0001F4CA Быстрый статус \u2014 статистика за день\n" +
    "\U0001F4DE Поддержка: @ZP_help\n\n" +
    "Если вы не можете войти, обратитесь к диспетчеру."
  );
});

bot.hears("\U0001F4CA Быстрый статус", async (ctx) => {
  await ctx.reply(
    "\U0001F4CA Статистика доступна в приложении.\nНажмите \u00ABОткрыть приложение\u00BB"
  );
});

bot.hears("\u2753 Помощь", async (ctx) => {
  await ctx.reply(
    "\u2753 Помощь\n\n" +
    "\U0001F680 Открыть приложение \u2014 управление заказами\n" +
    "\U0001F4CA Быстрый статус \u2014 статистика за день\n" +
    "\U0001F4DE Поддержка: @ZP_help"
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
