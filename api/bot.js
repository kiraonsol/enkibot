const { Telegraf } = require('telegraf');

// Use environment variable for bot token
const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new Telegraf(token);

// Webhook URL for Vercel deployment
const webhookUrl = process.env.WEBHOOK_URL || 'https://enkibot.vercel.app/api/bot';

// Function to set webhook with retries
async function setWebhookWithRetry(maxRetries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`Webhook successfully set to ${webhookUrl} on attempt ${attempt}`);
      return true;
    } catch (err) {
      console.error(`Failed to set webhook on attempt ${attempt}:`, err);
      console.error('Webhook URL attempted:', webhookUrl);
      console.error('Error details:', JSON.stringify(err, null, 2));
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('All attempts to set webhook failed.');
  return false;
}

// Set webhook on startup
setWebhookWithRetry();

// Bot handlers
bot.start((ctx) => {
  try {
    const startPayload = ctx.startPayload;
    if (startPayload && startPayload.startsWith('submit_name_')) {
      // Temporarily disable name submission via bot chat
      ctx.reply('Name submission via bot chat is not yet enabled. Please try again in-game.');
    } else {
      ctx.replyWithGame('enki');
      console.log(`Sent game to chat ${ctx.chat.id}`);
    }
  } catch (error) {
    console.error('Error handling /start:', error);
    ctx.reply('Error occurred. Please try again later.');
  }
});

bot.on('callback_query', (ctx) => {
  try {
    if (ctx.callbackQuery.game_short_name === 'enki') {
      ctx.answerCallbackQuery({ url: gameUrl });
      console.log(`User ${ctx.callbackQuery.from.id} opened the game`);
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    ctx.answerCallbackQuery({ show_alert: true, text: "Error opening game. Try again." });
  }
});

// Export handler for Vercel serverless function
module.exports = async (req, res) => {
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/api/health') {
    res.status(200).send('Bot is running');
    return;
  }

  try {
    console.log('Received webhook request:', JSON.stringify(req.body, null, 2));
    // Handle Telegram webhook updates
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in webhook handler:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).send('Error');
  }
};
