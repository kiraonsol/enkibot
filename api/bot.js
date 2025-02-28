const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Use environment variable for bot token
const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new Telegraf(token);

// Webhook URL for Vercel deployment
const webhookUrl = process.env.WEBHOOK_URL || 'https://enkibot.vercel.app/api/bot';

// Firebase configuration (same as in index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBlTVNMSh1hCjzLLu5SV4XJZRfyOZgLMVc",
  databaseURL: "https://enki-game-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase Admin SDK for server-side access
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, get } = require('firebase/database');
initializeApp(firebaseConfig);
const db = getDatabase();

// Set webhook
bot.telegram.setWebhook(webhookUrl).then(() => {
  console.log(`Webhook set to ${webhookUrl}`);
}).catch(err => {
  console.error('Error setting webhook:', err);
});

// Bot handlers
bot.start((ctx) => {
  try {
    const startPayload = ctx.startPayload;
    if (startPayload && startPayload.startsWith('submit_name_')) {
      const score = startPayload.split('_')[2];
      ctx.reply('Please reply with your name (max 10 characters) to save your score: ' + score);
      ctx.session = { awaitingName: true, score: parseInt(score) };
    } else {
      ctx.replyWithGame('enki');
      console.log(`Sent game to chat ${ctx.chat.id}`);
    }
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

// Handle text messages for name submission
bot.on('text', async (ctx) => {
  if (ctx.session && ctx.session.awaitingName) {
    try {
      let name = ctx.message.text.trim();
      if (name.length > 10) {
        name = name.substring(0, 10);
        ctx.reply('Name truncated to 10 characters.');
      }
      const score = ctx.session.score;
      // Save to Firebase
      const leaderboardRef = ref(db, 'leaderboard');
      await push(leaderboardRef, { name, score });
      ctx.reply(`Score saved for ${name}: ${score}`);
      // Reset session
      ctx.session.awaitingName = false;
      ctx.session.score = null;
      // Notify user
      ctx.reply('Your score has been added to the leaderboard!');
    } catch (error) {
      console.error('Error saving score via bot:', error);
      ctx.reply('Error saving your score. Please try again.');
    }
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
