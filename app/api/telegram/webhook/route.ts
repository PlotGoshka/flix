import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const response = await fetch(\`https://api.telegram.org/bot\${token}/sendMessage\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(\`Telegram sendMessage failed with status \${response.status}\`);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secret || !suppliedSecret || suppliedSecret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const chatId = update.message?.chat?.id;
  const message = update.message?.text?.trim();

  if (!chatId || !message || !message.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }

  const command = message.split(/\s+/, 1)[0].split("@")[0].toLowerCase();
  let reply: string;

  if (command === "/start") {
    reply =
      "Welcome to FLIX 👋\n\n" +
      "I’ll help you keep recurring payments under control.\n" +
      "The bot is connected, but subscription sync is not enabled yet. " +
      "We’re preparing secure account linking.";
  } else if (command === "/help") {
    reply =
      "FLIX Bot commands\n\n" +
      "/start — start the bot\n" +
      "/help — show this help\n" +
      "/status — check the connection status";
  } else if (command === "/status") {
    reply =
      "The FLIX Telegram endpoint is online.\n" +
      "Your subscription list is not synced to the bot yet.";
  } else {
    reply = "I don’t know that command yet. Send /help to see available commands.";
  }

  await sendTelegramMessage(chatId, reply);
  return NextResponse.json({ ok: true });
}
