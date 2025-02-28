const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new TelegramBot(token, { webHook: { port: process.env.PORT || 3000 } });
const webhookUrl = 'https://enkibot.onrender.com'; // Replace with your Render URL
bot.setWebHook(`${webhookUrl}/bot${token}`);

const app = express();
app.use(bodyParser.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
