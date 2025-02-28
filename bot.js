const { Telegraf } = require('telegraf');

// Use environment variable for bot token
const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new Telegraf(token);

// Webhook URL for Vercel deployment
const webhookUrl = process.env.WEBHOOK_URL || 'https://enkibot.vercel.app/api/webhook';

// Set webhook
bot.telegram.setWebhook(`${webhookUrl}`).then(() => {
  console.log(`Webhook set to ${webhookUrl}`);
}).catch(err => {
  console.error('Error setting webhook:', err);
});

// Bot handlers
bot.start((ctx) => {
  try {
    ctx.replyWithGame('enki');
    console.log(`Sent game to chat ${ctx.chat.id}`);
  } catch (error) {
    console.error('Error handling /start:', error);
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
  try {
    // Handle Telegram webhook updates
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).send('Error');
  }
};
