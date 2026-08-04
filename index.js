const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose'); // <-- Brought MongoDB back!
const http = require('http');

// 1. Keeps the bot awake on Render
http.createServer((req, res) => {
  res.write('Bot is awake!');
    res.end();
    }).listen(3000);

    // 2. The Bot's Brain
    const client = new Client({
      intents: [
          GatewayIntentBits.Guilds,
              GatewayIntentBits.GuildMessages,
                  GatewayIntentBits.MessageContent 
                    ]
                    });

                    // 3. Connect to Database when the bot turns on
                    client.once('ready', () => {
                      console.log(`🤖 It's alive! Logged in as ${client.user.tag}`);
                        
                          // This is where it uses your secret database link!
                            mongoose.connect(process.env.MONGODB_URI)
                                .then(() => console.log('✅ Connected to MongoDB Memory!'))
                                    .catch((error) => console.log('❌ MongoDB Error:', error));
                                    });

                                    // 4. The Commands Section
                                    client.on('messageCreate', message => {
                                      
                                        // Ignore bots
                                          if (message.author.bot) return;

                                            // 💎 COMMAND: cry!bal
                                              if (message.content === '!bal') {
                                                  message.reply(`💎 **Crystal Wallet**\n\n👤 User: <@${message.author.id}>\n\n💰 Wallet: 12,450 Crystals\n🏦 Bank: 57,890 Crystals\n\n✨ Total Wealth: 70,340 Crystals`);
                                                    }

                                                      // 🤝 COMMAND: cry!hug @user
                                                        if (message.content.startsWith('!hug')) {
                                                            const targetUser = message.mentions.users.first();
                                                                
                                                                    if (targetUser) {
                                                                          // Anime GIF added at the end of the text
                                                                                message.reply(`🤗 <@${message.author.id}> hugged <@${targetUser.id}>! How wholesome! 💜\nhttps://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif`);
                                                                                    } else {
                                                                                          message.reply("You need to tag someone to hug them! Example: `!hug @Anshika`");
                                                                                              }
                                                                                                }

                                                                                                });

                                                                                                // 5. Turn the bot on using your secret token!
                                                                                                client.login(process.env.TOKEN);
                                                                                                
                                            