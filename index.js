const { Bot } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_URL = process.env.WEBAPP_URL || "https://zolotoybot.ru";
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || "";
const YANDEX_PARK_ID = process.env.YANDEX_PARK_ID || "";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const userSessions = {};

async function verifyDriver(identifier) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const url = `${SERVER_URL}/api/yandex-proxy`;
    console.log("Calling proxy:", url, "id:", identifier);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        park_id: YANDEX_PARK_ID,
        identifier: identifier,
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
    console.log("Proxy result:", data.found ? "FOUND" : "not found");

    if (data.found) {
      return {
        authorized: true,
        driver: { id: data.id, name: data.name, phone: data.phone, license: data.license },
      };
    }

    return { authorized: false };
  } catch (e) {
    console.error("Verify error:", e.message);
    return { authorized: false, error: e.message };
  }
}

bot.command("start", async (ctx) => {
  userSessions[ctx.from.id] = { step: "ask_identifier" };

  await ctx.reply(
    "\u{1F44B} \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u041F\u0430\u0440\u043A!\n\n" +
    "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438\u043B\u0438 \u0412\u0423:\n\n" +
    "\u{1F4F1} \u0422\u0435\u043B\u0435\u0444\u043E\u043D: +79801234322\n" +
    "\u{1F4DD} \u0412\u0423: 1234567890 (\u0441\u043B\u0438\u0442\u043D\u043E, \u0431\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432 \u0438 \u0442\u0438\u0440\u0435\u043E\u0432)"
  );
});

bot.command("app", async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (session && session.authorized) {
    const kb = {
      inline_keyboard: [
        [{ text: "\u{1F4CA} \u041C\u041E\u041D\u0418\u0422\u041E\u0420\u0418\u041D\u0413", web_app: { url: SERVER_URL } }],
      ],
    };
    await ctx.reply("\u{1F680} \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435:", { reply_markup: kb });
  } else {
    await ctx.reply("\u274C \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 /start");
  }
});

bot.on("message", async (ctx) => {
  if (ctx.message.web_app_data) {
    await ctx.reply("\u2705 \u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B!");
    return;
  }

  const session = userSessions[ctx.from.id];
  if (session && session.step !== "ask_identifier" && ctx.message.text && ctx.message.text.includes("\u041F\u0435\u0440\u0435\u0439\u0442\u0438")) {
    userSessions[ctx.from.id] = { step: "ask_identifier" };
    await ctx.reply("\u{1F44B} \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438\u043B\u0438 \u0412\u0423:");
    return;
  }

  if (session && session.step === "ask_identifier" && ctx.message.text) {
    const identifier = ctx.message.text.trim();

    await ctx.reply("\u{1F50D} \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u0431\u0430\u0437\u0435 \u043F\u0430\u0440\u043A\u0430...");

    const result = await verifyDriver(identifier);

    if (result.authorized) {
      userSessions[ctx.from.id] = { step: "done", authorized: true, driver: result.driver };

      fetch(`${SERVER_URL}/api/driver/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: ctx.from.id,
          phone: result.driver.phone || "",
          name: result.driver.name || "",
          yandex_driver_id: result.driver.id || "",
        }),
      }).catch(() => {});

      await ctx.reply(
        `\u2705 ${result.driver.name || "\u0412\u043E\u0434\u0438\u0442\u0435\u043B\u044C"}, \u0432\u044B \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u044B!\n\n\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u041F\u0430\u0440\u043A.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "\u{1F4CA} \u041C\u041E\u041D\u0418\u0422\u041E\u0420\u0418\u041D\u0413", web_app: { url: `${SERVER_URL}?user_id=${ctx.from.id}` } }],
            ],
          },
        }
      );

      const kb = {
        keyboard: [
          [{ text: "\u{1F504} \u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043F\u043E\u0434 \u0434\u0440\u0443\u0433\u043E\u0439 \u043D\u043E\u043C\u0435\u0440/\u0412\u0423" }],
        ],
        resize_keyboard: true,
      };
      await ctx.reply("\u041C\u043E\u0436\u0435\u0442\u0435 \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043F\u043E\u0434 \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442:", { reply_markup: kb });
    } else {
      userSessions[ctx.from.id].step = "ask_identifier";

      await ctx.reply(
        `\u274C \u041D\u043E\u043C\u0435\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.\n\n\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442:\n\u{1F4F1} \u0422\u0435\u043B\u0435\u0444\u043E\u043D: +79801234322\n\u{1F4DD} \u0412\u0423: 1234567890 (\u0441\u043B\u0438\u0442\u043D\u043E)`
      );
    }
    return;
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
