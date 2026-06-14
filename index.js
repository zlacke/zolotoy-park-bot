const { Bot } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || "";
const YANDEX_PARK_ID = process.env.YANDEX_PARK_ID || "";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const userSessions = {};

async function verifyDriver(identifier) {
  const SERVER_URL = WEBAPP_URL || "https://zolotoybot.ru";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const url = `${SERVER_URL}/api/yandex-proxy`;
    console.log("Calling proxy:", url);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "x",
        api_key: "x",
        park_id: YANDEX_PARK_ID,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Proxy error:", resp.status, text.substring(0, 500));
      return { authorized: false, error: `API error ${resp.status}` };
    }

    const data = await resp.json();
    const drivers = data.driver_profiles || [];
    console.log(`Found ${drivers.length} drivers.`);

    const cleanId = identifier.replace(/[\s\-\(\)\+]/g, "");

    for (const driver of drivers) {
      const profile = driver.driver_profile || {};
      const phones = profile.phones || [];
      const licenseNum = (profile.driver_license || {}).number || "";
      const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      const driverId = profile.id || "";

      const cleanPhones = phones.map(p => p.replace(/[\s\-\(\)\+]/g, ""));
      const cleanLicense = licenseNum.replace(/[\s\-\(\)\+]/g, "");

      if (cleanPhones.includes(cleanId) || cleanId === cleanLicense) {
        return {
          authorized: true,
          driver: { id: driverId, name, phone: phones[0] || "", license: licenseNum },
        };
      }
    }

    return { authorized: false };
  } catch (e) {
    console.error("Verify error:", e.message);
    return { authorized: false, error: e.message };
  }
}

bot.command("start", async (ctx) => {
  userSessions[ctx.from.id] = { step: "ask_identifier" };

  const kb = {
    keyboard: [
      [{ text: "\u{1F4F1} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u043C\u0435\u0440", request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await ctx.reply(
    "\u{1F44B} \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u041F\u0430\u0440\u043A!\n\n" +
    "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0435:",
    { reply_markup: kb }
  );
});

bot.command("app", async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (session && session.authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435", web_app: { url: WEBAPP_URL } }],
      ],
    };
    await ctx.reply("\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435:", { reply_markup: kb });
  } else {
    await ctx.reply("\u274C \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 /start");
  }
});

bot.on("message", async (ctx) => {
  if (ctx.message.contact) {
    const contact = ctx.message.contact;
    const phone = contact.phone_number;
    const userId = ctx.from.id;

    await ctx.reply("\u{1F50D} \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u0431\u0430\u0437\u0435 \u043F\u0430\u0440\u043A\u0430...");

    const result = await verifyDriver(phone);

    if (result.authorized) {
      userSessions[userId] = { step: "done", authorized: true, driver: result.driver };

      const mainKb = {
        keyboard: [
          [{ text: "\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435", web_app: { url: WEBAPP_URL } }],
          [{ text: "\u{1F4CA} \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" }],
          [{ text: "\u2753 \u041F\u043E\u043C\u043E\u0449\u044C" }],
        ],
        resize_keyboard: true,
      };

      await ctx.reply(
        `\u2705 ${result.driver.name || "\u0412\u043E\u0434\u0438\u0442\u0435\u043B\u044C"}, \u0432\u044B \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u044B!\n\n\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u041F\u0430\u0440\u043A.`,
        { reply_markup: mainKb }
      );
    } else {
      userSessions[userId] = { step: "ask_identifier" };

      const retryKb = {
        keyboard: [
          [{ text: "\u{1F4F1} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u043C\u0435\u0440", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      };

      await ctx.reply(
        `\u274C \u041D\u043E\u043C\u0435\u0440 ${phone} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0431\u0430\u0437\u0435 \u043F\u0430\u0440\u043A\u0430.\n\n\u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0434\u0438\u0441\u043F\u0435\u0442\u0447\u0435\u0440\u0443.`,
        { reply_markup: retryKb }
      );
    }
    return;
  }

  if (ctx.message.web_app_data) {
    await ctx.reply("\u2705 \u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B!");
    return;
  }

  const session = userSessions[ctx.from.id];
  if (session && session.step === "ask_identifier" && ctx.message.text) {
    const identifier = ctx.message.text.trim();

    await ctx.reply("\u{1F50D} \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u0431\u0430\u0437\u0435 \u043F\u0430\u0440\u043A\u0430...");

    const result = await verifyDriver(identifier);

    if (result.authorized) {
      userSessions[ctx.from.id] = { step: "done", authorized: true, driver: result.driver };

      const mainKb = {
        keyboard: [
          [{ text: "\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435", web_app: { url: WEBAPP_URL } }],
          [{ text: "\u{1F4CA} \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" }],
          [{ text: "\u2753 \u041F\u043E\u043C\u043E\u0449\u044C" }],
        ],
        resize_keyboard: true,
      };

      await ctx.reply(
        `\u2705 ${result.driver.name || "\u0412\u043E\u0434\u0438\u0442\u0435\u043B\u044C"}, \u0432\u044B \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u044B!\n\n\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u041F\u0430\u0440\u043A.`,
        { reply_markup: mainKb }
      );
    } else {
      userSessions[ctx.from.id] = { step: "ask_identifier" };

      const retryKb = {
        keyboard: [
          [{ text: "\u{1F4F1} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u043C\u0435\u0440", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      };

      await ctx.reply(
        `\u274C \u041D\u043E\u043C\u0435\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.\n\n\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0434\u0438\u0441\u043F\u0435\u0442\u0447\u0435\u0440\u0443.`,
        { reply_markup: retryKb }
      );
    }
    return;
  }

  if (ctx.message.web_app_data) {
    await ctx.reply("\u2705 \u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B!");
    return;
  }
});

bot.callbackQuery("retry", async (ctx) => {
  await ctx.answerCallbackQuery();
  userSessions[ctx.from.id] = { step: "ask_identifier" };

  const kb = {
    keyboard: [
      [{ text: "\u{1F4F1} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u043C\u0435\u0440", request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await ctx.reply("\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0435 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440:", { reply_markup: kb });
});

bot.callbackQuery("stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438.\n\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u00BB"
  );
});

bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "\u2753 \u041F\u043E\u043C\u043E\u0449\u044C\n\n" +
    "\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u2014 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043A\u0430\u0437\u0430\u043C\u0438\n" +
    "\u{1F4CA} \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u2014 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0437\u0430 \u0434\u0435\u043D\u044C\n" +
    "\u{1F4DE} \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430: @ZP_help"
  );
});

bot.hears("\u{1F4CA} \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441", async (ctx) => {
  await ctx.reply(
    "\u{1F4CA} \u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438.\n\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u00BB"
  );
});

bot.hears("\u2753 \u041F\u043E\u043C\u043E\u0449\u044C", async (ctx) => {
  await ctx.reply(
    "\u2753 \u041F\u043E\u043C\u043E\u0449\u044C\n\n" +
    "\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u2014 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043A\u0430\u0437\u0430\u043C\u0438\n" +
    "\u{1F4CA} \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u2014 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0437\u0430 \u0434\u0435\u043D\u044C\n" +
    "\u{1F4DE} \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430: @ZP_help"
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
