const TelegramBot = require('node-telegram-bot-api');

// Bot token from BotFather
const token = '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';

// Game URL on GitHub Pages
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

// Initialize the bot with polling
const bot = new TelegramBot(token, { polling: true });

// Handle /start command to send the game link
bot.onText(/\/start/, (msg) => {
  try {
    const chatId = msg.chat.id;
    bot.sendGame(chatId, 'enki');
    console.log(`Sent game link to chat ${chatId}`);
  } catch (error) {
    console.error('Error handling /start:', error);
  }
});

// Handle callback query when the user clicks the game button
bot.on('callback_query', (query) => {
  try {
    if (query.game_short_name === 'enki') {
      bot.answerCallbackQuery(query.id, { url: gameUrl });
      console.log(`User ${query.from.id} opened the game`);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.answerCallbackQuery(query.id, { show_alert: true, text: "Error opening the game. Please try again." });
  }
});

// Log when the bot starts
console.log('ENKIBot started successfully');

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));