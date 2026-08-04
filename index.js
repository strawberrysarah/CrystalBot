const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');

// 1. Keeps the bot awake on Render
http.createServer((req, res) => {
  res.write('Bot is awake!');
  res.end();
}).listen(3000);

// 2. Cooldown Memory Systems
const commandCooldowns = new Map();
const dailyCooldowns = new Set();

// 3. The Bot's Brain
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent 
  ]
});

// 4. Connect to Database
client.once('ready', () => {
  console.log(`🤖 It's alive! Logged in as ${client.user.tag}`);
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Memory!'))
    .catch((error) => console.log('❌ MongoDB Error:', error));
});

// 5. The Commands Section
client.on('messageCreate', message => {
  if (message.author.bot) return;

  // Make the command lowercase so it ignores capitalization mistakes!
  const msg = message.content.toLowerCase();
  
  // Ignore any message that doesn't start with cry!
  if (!msg.startsWith('cry!')) return;

  // Split the message to separate the command from tags (like @user)
  const args = msg.split(' ');
  const command = args[0]; 
  const targetUser = message.mentions.users.first();
  const userId = message.author.id;

  // ==========================================
  // 🎁 24-HOUR COOLDOWN COMMAND
  // ==========================================
  if (command === 'cry!daily') {
    if (dailyCooldowns.has(userId)) {
      return message.reply("⏳ You already claimed your daily reward! Come back in 24 hours.");
    }
    
    // Add to 24 hr cooldown (86,400,000 ms)
    dailyCooldowns.add(userId);
    setTimeout(() => dailyCooldowns.delete(userId), 86400000); 

    return message.reply(`🎁 **Daily Reward Claimed!**\n\nYou received:\n💎 +1,500 Crystals\n\nCome back tomorrow for another reward!`);
  }

  // ==========================================
  // ⏳ 3-MINUTE COOLDOWN SYSTEM
  // ==========================================
  // Creates a unique lock for this user and this specific command
  const cdKey = `${userId}-${command}`;
  
  if (commandCooldowns.has(cdKey)) {
    return message.reply(`⏳ Please wait 3 minutes before using the **${command}** command again!`);
  }
  
  // Lock the command for 3 minutes (180,000 ms)
  commandCooldowns.set(cdKey, true);
  setTimeout(() => commandCooldowns.delete(cdKey), 180000);


  // ==========================================
  // 💎 ECONOMY COMMANDS
  // ==========================================
  if (command === 'cry!bal') {
    return message.reply(`💎 **Crystal Wallet**\n\n👤 User: <@${userId}>\n\n💰 Wallet: 12,450 Crystals\n🏦 Bank: 57,890 Crystals\n\n✨ Total Wealth: 70,340 Crystals`);
  }
  
  else if (command === 'cry!work') {
    const jobs = ["Wizard Assistant", "Dragon Trainer", "Crystal Miner", "Royal Guard", "Potion Brewer"];
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    const randomPay = Math.floor(Math.random() * 1000) + 200;
    return message.reply(`⚒️ **${randomJob}**\n\nYou worked hard and earned:\n💎 +${randomPay} Crystals`);
  }

  else if (command === 'cry!pay') {
    if (!targetUser) return message.reply("Who are you paying? Example: `cry!pay @user`");
    return message.reply(`💸 **Payment Successful**\n\nYou sent 💎 5,000 Crystals to <@${targetUser.id}>.`);
  }

  else if (command === 'cry!leaderboard') {
    return message.reply(`🏆 **Crystal Leaderboard**\n\n🥇 Alice — 980,000 💎\n🥈 Bob — 760,000 💎\n🥉 Charlie — 530,000 💎\n4️⃣ David — 412,000 💎\n5️⃣ You — 310,000 💎`);
  }

  // ==========================================
  // 🎲 GAMBLING COMMANDS
  // ==========================================
  else if (command === 'cry!coinflip') {
    const result = Math.random() < 0.5 ? "HEADS" : "TAILS";
    return message.reply(`🪙 **Coin Flip**\n\nResult: **${result}**\n\n${result === "HEADS" ? "🎉 You won! +500 Crystals" : "😢 You lost! -500 Crystals"}`);
  }

  else if (command === 'cry!slots') {
    const win = Math.random() < 0.3; // 30% chance to win
    if (win) {
      return message.reply("🎰 **Crystal Slots**\n\n🍇 🍇 🍇\n\nJACKPOT!\n\n💎 +10,000 Crystals");
    } else {
      return message.reply("🎰 **Crystal Slots**\n\n🍋 🍒 🍇\n\nYou Lost!\n\n💎 -1000 Crystals");
    }
  }

  // ==========================================
  // 🦹 CRIME COMMANDS
  // ==========================================
  else if (command === 'cry!beg') {
    const begAmount = Math.floor(Math.random() * 150) + 10;
    return message.reply(`🥺 You begged around town.\n\nA kind traveler gave you\n💎 +${begAmount} Crystals`);
  }

  // ==========================================
  // ❤️ MARRIAGE COMMANDS
  // ==========================================
  else if (command === 'cry!marry') {
    if (!targetUser) return message.reply("You need to tag someone to propose! Example: `cry!marry @user`");
    return message.reply(`💍 **Marriage Proposal**\n\n<@${targetUser.id}>\n\nDo you accept? (Reply with \`cry!accept\` or \`cry!decline\`)`);
  }
  else if (command === 'cry!accept') {
    return message.reply(`🎉 **Congratulations!**\n\nYou are now happily married! ❤️`);
  }
  else if (command === 'cry!decline') {
    return message.reply(`💔 **Proposal Declined**\n\nBetter luck next time...`);
  }
  else if (command === 'cry!partner') {
    return message.reply(`❤️ **Partner**\n\nYou are happily married!`);
  }
  else if (command === 'cry!divorce') {
    return message.reply(`💔 **Divorce Complete**\n\nYou are now single again.`);
  }

  // ==========================================
  // 🎉 FUN COMMANDS
  // ==========================================
  else if (command === 'cry!crystalfortune') {
    const fortunes = [
      "The stars whisper... Today is your lucky day. ✨",
      "Beware! The crystal mines are dangerous today. ⚠️",
      "I sense great wealth in your future! 💰"
    ];
    return message.reply(`🔮 **Crystal Fortune**\n\n"${fortunes[Math.floor(Math.random() * fortunes.length)]}"`);
  }

  else if (command === 'cry!tea') {
    const teaSpills = [
      "Someone secretly has a crush on someone... 👀",
      "I heard someone is going bankrupt from playing slots... 🎰",
      "Wait, didn't someone just get robbed yesterday? 🚔"
    ];
    return message.reply(`☕ **Crystal Tea**\n\n${teaSpills[Math.floor(Math.random() * teaSpills.length)]}`);
  }

  else if (command === 'cry!gay') {
    if (!targetUser) return message.reply("Tag someone to check their meter! Example: `cry!gay @user`");
    const percent = Math.floor(Math.random() * 101);
    return message.reply(`🌈 **Gay Meter**\n\n<@${targetUser.id}> is ${percent}% Gay!`);
  }

  // ==========================================
  // 🤝 SOCIAL COMMANDS
  // ==========================================
  else if (command === 'cry!hug') {
    if (!targetUser) return message.reply("Tag someone to hug! Example: `cry!hug @user`");
    return message.reply(`🤗 <@${userId}> hugged <@${targetUser.id}>! How wholesome! 💜\nhttps://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif`);
  }
  else if (command === 'cry!slap') {
    if (!targetUser) return message.reply("Tag someone to slap! Example: `cry!slap @user`");
    return message.reply(`👋 Ouch! <@${userId}> slapped <@${targetUser.id}>!\nhttps://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif`);
  }
  else if (command === 'cry!blush') {
    return message.reply(`😊 <@${userId}> is blushing...\nhttps://media.giphy.com/media/13cptIwW9bgzk6UVyx/giphy.gif`);
  }

  // ==========================================
  // 🛡 ADMIN COMMANDS
  // ==========================================
  else if (command === 'cry!addmoney') {
    if (!targetUser) return message.reply("Tag someone to add money to! Example: `cry!addmoney @user`");
    return message.reply(`✅ **Success**\n\nAdded 50,000 Crystals to <@${targetUser.id}>.`);
  }
  else if (command === 'cry!removemoney') {
    if (!targetUser) return message.reply("Tag someone to remove money from! Example: `cry!removemoney @user`");
    return message.reply(`✅ **Success**\n\nRemoved 10,000 Crystals from <@${targetUser.id}>.`);
  }

  // ==========================================
  // 📚 UTILITY COMMAND
  // ==========================================
  else if (command === 'cry!help') {
    return message.reply(`✨ **Crystal Bot Help Menu** ✨\n\n💎 **Economy:** \`cry!bal\`, \`cry!work\`, \`cry!daily\`, \`cry!pay\`, \`cry!leaderboard\`\n🎲 **Gambling:** \`cry!coinflip\`, \`cry!slots\`\n🦹 **Crime:** \`cry!beg\`\n❤️ **Marriage:** \`cry!marry\`, \`cry!accept\`, \`cry!decline\`, \`cry!partner\`, \`cry!divorce\`\n🎉 **Fun:** \`cry!crystalfortune\`, \`cry!gay\`, \`cry!tea\`\n🤝 **Social:** \`cry!hug\`, \`cry!slap\`, \`cry!blush\`\n🛡 **Admin:** \`cry!addmoney\`, \`cry!removemoney\``);
  }

  // If they typed something that isn't a command, remove the cooldown so they aren't punished!
  else {
    commandCooldowns.delete(cdKey);
  }

}); // <-- DO NOT DELETE THIS BRACKET!

// 6. Turn the bot on!
client.login(process.env.TOKEN);



                                            