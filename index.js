const { Bot } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";
const API_URL = process.env.API_URL || "https://zolotoybot.ru";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const userPhones = {};

async function checkPhone(phone) {
  try {
    const resp = await fetch(`${API_URL}/api/driver/check_phone?phone=${encodeURIComponent(phone)}`);
    const data = await resp.json();
    return data;
  } catch (e) {
    console.error("Check phone error:", e);
    return { authorized: false };
  }
}

async function registerDriver(telegramId, phone, name) {
  try {
    const resp = await fetch(`${API_URL}/api/driver/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: telegramId, phone, name }),
    });
    return await resp.json();
  } catch (e) {
    console.error("Register error:", e);
    return { ok: false };
  }
}

bot.command("start", async (ctx) => {
  const kb = {
    keyboard: [
      [{ text: "\U0001F4F1 Отправить номер", request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await ctx.reply(
    "\U0001F44B Добро пожаловать!\n\n" +
    "Для входа отправьте свой номер телефона, нажав кнопку ниже.",
    { reply_markup: kb }
  );
});

bot.on("contact", async (ctx) => {
  const contact = ctx.message.contact;
  const phone = contact.phone_number;
  const userId = ctx.from.id;

  const result = await checkPhone(phone);

  if (result.authorized) {
    await registerDriver(userId, phone, result.driver_name || contact.first_name);
    userPhones[userId] = { phone, name: result.driver_name || contact.first_name };

    const mainKb = {
      keyboard: [
        [{ text: "\U0001F680 Открыть приложение", web_app: { url: WEBAPP_URL } }],
        [{ text: "\U0001F4CA Быстрый статус" }],
        [{ text: "\u2753 Помощь" }],
      ],
      resize_keyboard: true,
    };

    await ctx.reply(
      `\u2705 Авторизация прошла успешно!\n\n` +
      `\U0001F464 ${result.driver_name || contact.first_name}\n` +
      `\U0001F4F1 ${phone}\n\n` +
      `Нажмите \u00ABОткрыть приложение\u00BB для работы.`,
      { reply_markup: mainKb }
    );
  } else {
    const retryKb = {
      keyboard: [
        [{ text: "\U0001F4F1 Отправить номер", request_contact: true }],
        [{ text: "\u2753 Помощь" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    await ctx.reply(
      `\u274C Номер ${phone} не найден в базе парка.\n\n` +
      `Обратитесь к диспетчеру для регистрации.`,
      { reply_markup: retryKb }
    );
  }
});

bot.command("app", async (ctx) => {
  const userId = ctx.from.id;
  if (userPhones[userId]) {
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

bot.hears("\U0001F4CA Быстрый статус", async (ctx) => {
  await ctx.reply("\U0001F4CA Статистика доступна в приложении.\nНажмите \u00ABОткрыть приложение\u00BB");
});

bot.hears("\u2753 Помощь", async (ctx) => {
  await ctx.reply(
    "\u2753 Помощь\n\n" +
    "\U0001F680 Открыть приложение \u2014 управление заказами\n" +
    "\U0001F4CA Быстрый статус \u2014 статистика за день\n" +
    "\U0001F4DE Поддержка: @ZP_help"
  );
});

bot.on("message", async (ctx) => {
  if (ctx.message.web_app_data) {
    await ctx.reply("\u2705 Данные из приложения получены!");
    return;
  }
  const userId = ctx.from.id;
  if (userPhones[userId]) {
    const kb = {
      inline_keyboard: [
        [{ text: "\U0001F680 Открыть приложение", web_app: { url: WEBAPP_URL } }],
        [{ text: "\U0001F4CA Быстрый статус", callback_data: "stats" }],
        [{ text: "\u2753 Помощь", callback_data: "help" }],
      ],
    };
    await ctx.reply("Используйте кнопки:", { reply_markup: kb });
  } else {
    await ctx.reply("\u274C Сначала авторизуйтесь. Нажмите /start");
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
