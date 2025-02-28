const TelegramBot = require('node-telegram-bot-api');

// Use environment variable for bot token
const token = '8098735296:AAGLAKxEO1KMHAJ8-WQLvp9QDPS3MwA9iQI'; // Hardcode for now, move to env var in production
const gameUrl = 'https://kiraonsol.github.io/enki-game/';

const bot = new TelegramBot(token, { polling: true });

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

// Bot handlers
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    // Send a message with a button to launch the Mini App
    await bot.sendMessage(chatId, 'Click to play Enki:', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Play Enki', web_app: { url: gameUrl } }]]
      }
    });
    console.log(`Sent Mini App link to chat ${chatId}`);
  } catch (error) {
    console.error('Error handling /start:', error);
    bot.sendMessage(msg.chat.id, 'Error occurred. Please try again later.');
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

console.log('Bot running in polling mode...');
