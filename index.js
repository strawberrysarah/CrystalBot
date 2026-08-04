const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is awake!'));
app.listen(3000, () => console.log('Web server ready.'));
require('dotenv').config(); // This loads our secret passwords safely
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// 1. Create the Bot Client (Giving it a body and telling it what it can see)
const client = new Client({
    intents: [
            GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                            GatewayIntentBits.MessageContent,
                                ]
                                });

                                // 2. Connect to MongoDB (Giving it memory)
                                mongoose.connect(process.env.MONGODB_URI)
                                    .then(() => console.log('✅ Connected to MongoDB Memory!'))
                                        .catch((err) => console.error('❌ MongoDB Connection Error:', err));

                                        // 3. Wake Up Event (What happens when it turns on)
                                        client.once('ready', () => {
                                            console.log(`🤖 It's alive! Logged in as ${client.user.tag}`);
                                            });

                                            // 4. Log in to Discord (Using the secret Token)
                                            client.login(process.env.TOKEN);
                                            