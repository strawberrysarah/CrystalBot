const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose'); // <-- Brought MongoDB back!
const http = require('http');
const gamblingCooldown = new Set();

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
                                              if (message.content === 'cry!bal') {
                                                  message.reply(`💎 **Crystal Wallet**\n\n👤 User: <@${message.author.id}>\n\n💰 Wallet: 12,450 Crystals\n🏦 Bank: 57,890 Crystals\n\n✨ Total Wealth: 70,340 Crystals`);
                                                    }

                                                      // 🤝 COMMAND: cry!hug @user
                                                        if (message.content.startsWith('cry!hug')) {
                                                            const targetUser = message.mentions.users.first();
                                                                
                                                                    if (targetUser) {
                                                                          // Anime GIF added at the end of the text
                                                                                message.reply(`🤗 <@${message.author.id}> hugged <@${targetUser.id}>! How wholesome! 💜\nhttps://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif`);
                                                                                    } else {
                                                                                          message.reply("You need to tag someone to hug them! Example: `cry!hug @user`");
                                                                                              }
                                                                                                }

                                                                                                });

                                                                                                // 5. Turn the bot on using your secret token!
                                                                                                client.login(process.env.TOKEN);
                                                                                                  // ☕ COMMAND: cry!tea
  if (message.content.toLowerCase() === 'cry!tea') {
    const teaSpills = [
      "Someone secretly has a crush on someone... 👀",
      "I heard someone spent all night watching Demon Slayer instead of sleeping... ⚔️",
      "Someone's been stressing way too much about genetics and human physiology lately... take a break! 🧬",
      "Someone was caught blasting Bollywood dance songs on repeat... 💃"
    ];
    const randomTea = teaSpills[Math.floor(Math.random() * teaSpills.length)];
    message.reply(`☕ **Crystal Tea**\n\n${randomTea}`);
  }

  // 🔮 COMMAND: cry!crystalfortune
  if (message.content.toLowerCase() === 'cry!crystalfortune') {
    const fortunes = [
      "The stars whisper... Today is your lucky day. ✨",
      "The cosmos align perfectly today. A trip to a dark sky reserve might be in your future! 🌌",
      "I'm sensing a strong gravitational pull... towards great wealth! 🪐",
      "Beware! The crystal mines are dangerous today. ⚠️"
    ];
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    message.reply(`🔮 **Crystal Fortune**\n\n"${randomFortune}"`);
  }

  // 🎰 COMMAND: cry!slots
  if (message.content.toLowerCase() === 'cry!slots') {
    if (gamblingCooldown.has(message.author.id)) {
      return message.reply("⏳ Whoa, slow down! You need to wait 30 seconds before gambling again.");
    }

    message.reply("🎰 **Crystal Slots**\n\n🍇 🍇 🍇\n\nJACKPOT!\n\n+10,000 Crystals");

    // Puts them in timeout for 30 seconds (30000 ms)
    gamblingCooldown.add(message.author.id);
    setTimeout(() => {
      gamblingCooldown.delete(message.author.id);
    }, 30000);
  }

                                            