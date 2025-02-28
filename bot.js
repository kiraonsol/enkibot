const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';
const webhookUrl = 'https://enkibot.onrender.com'; // Your Render URL

// Use the Render-provided PORT environment variable
const PORT = process.env.PORT || 3000;

// Initialize Telegram Bot with webhook
const bot = new TelegramBot(token, { webHook: { port: PORT } });

// Set webhook
const setWebhook = async () => {
  try {
    const webhook = `${webhookUrl}/bot${token}`;
    await bot.setWebHook(webhook);
    console.log(`Webhook set to ${webhook}`);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
};

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Webhook route
app.post(`/bot${token}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing update:', error);
    res.sendStatus(500);
  }
});

// Health check route for Render to detect the app is running
app.get('/', (req, res) => {
  res.send('Enkibot is running!');
});

// Bot handlers
bot.onText(/\/start/, (msg) => {
  try {
    const chatId = msg.chat.id;
    bot.sendGame(chatId, 'enki');
    console.log(`Sent game to chat ${chatId}`);
  } catch (error) {
    console.error('Error handling /start:', error);
  }
});

bot.on('callback_query', (query) => {
  try {
    if (query.game_short_name === 'enki') {
      bot.answerCallbackQuery(query.id, { url: gameUrl });
      console.log(`User ${query.from.id} opened the game`);
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    bot.answerCallbackQuery(query.id, { show_alert: true, text: "Error opening game. Try again." });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Bot server running on port ${PORT}`);
  await setWebhook();
});
