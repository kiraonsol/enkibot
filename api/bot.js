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

// Initialize Firebase Admin SDK with error handling
let db;
try {
  const { initializeApp } = require('firebase/app');
  const { getDatabase, ref, push, set, get } = require('firebase/database');
  initializeApp(firebaseConfig);
  db = getDatabase();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  db = null; // Fallback to avoid runtime errors
}

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
    // Initialize session if undefined
    ctx.session = ctx.session || {};
    const startPayload = ctx.startPayload;
    if (startPayload && startPayload.startsWith('submit_name_')) {
      const score = startPayload.split('_')[2];
      ctx.reply('Please reply with your name (max 10 characters) to save your score: ' + score);
      ctx.session.awaitingName = true;
      ctx.session.score = parseInt(score);
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

// Handle text messages for name submission
bot.on('text', async (ctx) => {
  try {
    // Initialize session if undefined
    ctx.session = ctx.session || {};
    if (ctx.session.awaitingName) {
      let name = ctx.message.text.trim();
      if (name.length > 10) {
        name = name.substring(0, 10);
        ctx.reply('Name truncated to 10 characters.');
      }
      const score = ctx.session.score;
      if (!db) {
        ctx.reply('Error: Database not available. Please try again later.');
        return;
      }
      // Save to Firebase
      const leaderboardRef = ref(db, 'leaderboard');
      await push(leaderboardRef, { name, score });
      ctx.reply(`Score saved for ${name}: ${score}`);
      // Reset session
      ctx.session.awaitingName = false;
      ctx.session.score = null;
      // Notify user
      ctx.reply('Your score has been added to the leaderboard!');
    }
  } catch (error) {
    console.error('Error saving score via bot:', error);
    ctx.reply('Error saving your score. Please try again.');
  }
});

// Export handler for Vercel serverless function
module.exports = async (req, res) => {
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
