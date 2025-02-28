const TelegramBot = require('node-telegram-bot-api');

// Use environment variable for bot token
const token = process.env.BOT_TOKEN || '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI';
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new TelegramBot(token);

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
  const { getDatabase, ref, push } = require('firebase/database');
  initializeApp(firebaseConfig);
  db = getDatabase();
  console.log('Firebase initialized successfully in bot.js');
} catch (error) {
  console.error('Failed to initialize Firebase in bot.js:', error);
  db = null;
}

// Function to set webhook with retries
async function setWebhookWithRetry(maxRetries = 10, delay = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.setWebHook(webhookUrl);
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

// Set webhook on startup safely
(async () => {
  try {
    const success = await setWebhookWithRetry();
    if (!success) {
      console.error('Webhook setup failed after all retries, but continuing to run bot.');
    }
  } catch (error) {
    console.error('Unhandled error during webhook setup:', error);
  }
})();

// Bot handlers
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    // Send a Telegram Game object with a "Play Enki" button
    await bot.sendGame(chatId, 'enki');
    console.log(`Sent game to chat ${chatId}`);
  } catch (error) {
    console.error('Error handling /start:', error);
    bot.sendMessage(msg.chat.id, 'Error occurred. Please try again later.');
  }
});

bot.on('callback_query', async (query) => {
  try {
    console.log('Received callback query:', JSON.stringify(query, null, 2));
    if (query.game_short_name === 'enki') {
      // Launch the Mini App
      await bot.answerCallbackQuery(query.id, { url: gameUrl });
      console.log(`Successfully answered callback query ${query.id} for user ${query.from.id} with URL: ${gameUrl}`);
      console.log(`User ${query.from.id} opened the game with URL: ${gameUrl}`);
    } else {
      console.log('Callback query does not match game_short_name "enki":', query.game_short_name);
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await bot.answerCallbackQuery(query.id, { show_alert: true, text: 'Error opening game. Try again.' });
  }
});

// Handle Mini App data (score submission)
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    // Check if the message contains data from the Mini App
    if (msg.web_app_data && msg.web_app_data.data) {
      const data = JSON.parse(msg.web_app_data.data);
      console.log('Received Mini App data:', data);

      if (data.action === "submit_score" && data.score !== undefined) {
        const score = parseInt(data.score);
        // Prompt user for their name
        await bot.sendMessage(chatId, `Please reply with your name (max 10 characters) to save your score: ${score}`);
        // Set a session-like state to track the score submission
        bot.onText(/.*/, async (nameMsg, match) => {
          // Check if this is a reply to the score submission prompt
          if (nameMsg.chat.id === chatId && nameMsg.from.id === msg.from.id) {
            let name = nameMsg.text.trim();
            if (name.length > 10) {
              name = name.substring(0, 10);
              await bot.sendMessage(chatId, 'Name truncated to 10 characters.');
            }
            if (db) {
              try {
                await db.ref('leaderboard').push({ name, score });
                console.log('Score saved via bot:', { name, score });
                await bot.sendMessage(chatId, `Score saved for ${name}: ${score}`);
                await bot.sendMessage(chatId, 'Your score has been added to the leaderboard!');
              } catch (error) {
                console.error('Error saving score via bot:', error);
                await bot.sendMessage(chatId, 'Error saving your score. Please try again.');
              }
            } else {
              await bot.sendMessage(chatId, 'Error: Database not available. Score not saved.');
            }
            // Clear the temporary listener to avoid capturing unrelated messages
            bot.removeTextListener(/.*/);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error handling Mini App data:', error);
    bot.sendMessage(msg.chat.id, 'Error processing your score. Please try again.');
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
    bot.processUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in webhook handler:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).send('Error');
  }
};
