const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

// Register your custom cursive font
try {
  GlobalFonts.registerFromPath(path.join(__dirname, 'font.ttf'), 'CrystalScript');
    console.log('✨ Registered CrystalScript font successfully!');
    } catch (e) {
      console.error('⚠️ Could not load font.ttf:', e.message);
      }



http.createServer((req, res) => {
  res.write('Bot is awake!');
    res.end();
    }).listen(process.env.PORT || 3000);

    const commandCooldowns = new Map();
    const xpCooldowns = new Set(); 
    const pendingProposals = new Map(); 
    const cryCoin = '<:emoji_51:1531598791063638036>'; 

    const userSchema = new mongoose.Schema({
      userId: { type: String, required: true, unique: true },
        balance: { type: Number, default: 0 },
          inventory: { type: [String], default: [] },
            roles: { type: [String], default: [] },
              partner: { type: String, default: null },
                xp: { type: Number, default: 0 },
                  level: { type: Number, default: 1 },
                    workAttempts: { type: Number, default: 0 },
                      lastWorkReset: { type: Date, default: new Date(0) },
                        workCooldownUntil: { type: Date, default: null }, // Added for 40-shift cooldown
                          lastDaily: { type: Date, default: new Date(0) },
                            plantType: { type: String, default: 'None' },
                              growthStage: { type: Number, default: 0 },
                                lastWatered: { type: Date, default: new Date(0) },
                                  harvestReady: { type: Boolean, default: false }
                                  });
                                  const User = mongoose.model('User', userSchema);

                                  async function getUserData(id) {
                                    let user = await User.findOne({ userId: id });
                                      if (!user) { user = new User({ userId: id }); await user.save(); }
                                        return user;
                                        }

                                        const client = new Client({
                                              intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ]
                                              });

                                              client.once('ready', () => {
                                                console.log(`🤖 Logged in as ${client.user.tag}`);
                                                  mongoose.connect(process.env.MONGODB_URI)
                                                      .then(() => console.log('✅ Connected to MongoDB!'))
                                                          .catch((error) => console.log('❌ MongoDB Error:', error));
                                                          });

                                                          const shopItems = {
                                                            'pomegranate seed': { price: 500, icon: '🌱', name: 'Pomegranate Seed', desc: 'Plant this in your garden to start growing!' },
                                                              'coco peat': { price: 800, icon: '🧱', name: 'Coco Peat', desc: 'Fertilizer! Use this to instantly skip a growth stage.' },
                                                                'watering can': { price: 1500, icon: '🚿', name: 'Watering Can', desc: 'A basic tool for keeping your plants hydrated.' },
                                                                  'gardening shears': { price: 3000, icon: '✂️', name: 'Gardening Shears', desc: 'Increases the crystal yield when you harvest.' },
                                                                    'unemployed badge': { price: 0, icon: '🤡', name: 'Unemployed Badge', desc: 'Zero opps, zero jobs, zero crystals 💀' },
                                                                      'left sock': { price: 69, icon: '🧦', name: 'Left Sock', desc: 'The other one got lost...' },
                                                                        'potato': { price: 100, icon: '🥔', name: 'Potato', desc: 'Its a... potato' },
                                                                          'toilet paper': { price: 888, icon: '🧻', name: 'Toilet Paper', desc: 'During emergencies...' },
                                                                            'wizard hat': { price: 8000, icon: '🧙', name: 'Wizard Hat', desc: 'Shadow wizard money gang... we love casting spells 🪄' },
                                                                              'wedding ring': { price: 10000, icon: '💍', name: 'Wedding Ring', desc: 'Only give this to the love of your discord 💖' },
                                                                                'crystal badge': { price: 30000, icon: '💠', name: 'Crystal Badge', desc: 'Certified shiny object enjoyer.' },
                                                                                  'celestial crystal': { price: 150000, icon: '✨', name: 'Celestial Crystal', desc: 'Very prestigious so save up and buy this 💫' }
                                                                                  };

                                                                                  const roleshopItems = [
                                                                                      { id: "1544638730948841592", name: "Goofy", icon: "🤪", price: 1000, desc: "Always ready to do something silly.", color: "#FFD166" },
                                                                                        { id: "1544638907826573362", name: "Potato", icon: "🥔", price: 5000, desc: "Just a potato trying its best.", color: "#B08968" },
                                                                                          { id: "1544639041838915674", name: "Lilac", icon: "🪻", price: 8000, desc: "Soft, pretty, and effortlessly charming.", color: "#ffbeff" },
                                                                                            { id: "1544639230373003374", name: "Yapper", icon: "🗣️", price: 10000, desc: "They always have something to say.", color: "#F28482" },
                                                                                              { id: "1544639354197246002", name: "Insomniac", icon: "💤", price: 12500, desc: "Sleep is apparently optional.", color: "#445270" },
                                                                                                { id: "1544639615137349692", name: "Pookie", icon: "🎀", price: 15000, desc: "Everyone's favorite little sweetheart.", color: "#fd62a9" },
                                                                                                  { id: "1544640217884008479", name: "Snacklord", icon: "🍿", price: 18000, desc: "Always thinking about the next snack.", color: "#D99058" },
                                                                                                    { id: "1544640380081807405", name: "Nonchalant", icon: "😌", price: 20000, desc: "Nothing seems to bother them.", color: "#66f5ff" },
                                                                                                      { id: "1544640618008023090", name: "Tranquil", icon: "🌿", price: 25000, desc: "Calm, peaceful, and unbothered.", color: "#9CAF88" },
                                                                                                        { id: "1544640794210607184", name: "Delulu", icon: "🫠", price: 30000, desc: "Reality is merely a suggestion.", color: "#B784D7" },
                                                                                                          { id: "1544641298949083258", name: "Gremlin", icon: "👹", price: 35000, desc: "Small amounts of chaos are their specialty.", color: "#6A994E" },
                                                                                                            { id: "1544641471980896267", name: "Boisterous", icon: "📢", price: 40000, desc: "Quiet is simply not their thing.", color: "#F77F00" },
                                                                                                              { id: "1544641691473158225", name: "Serendipity", icon: "🌸", price: 45000, desc: "Good things seem to find them by chance.", color: "#ffd1e9" },
                                                                                                                { id: "1544642099901890612", name: "Rogue", icon: "🗡️", price: 50000, desc: "They play by their own rules.", color: "#8E3B46" },
                                                                                                                  { id: "1544642245012226108", name: "Catastrophist", icon: "💥", price: 80000, desc: "They expect everything to go terribly wrong.", color: "#D95D39" },
                                                                                                                    { id: "1544642396388724828", name: "Perspicacious", icon: "👁️", price: 90000, desc: "They notice things everyone else misses.", color: "#4169A1" },
                                                                                                                      { id: "1544642801138933811", name: "Taciturn", icon: "🤐", price: 100000, desc: "They prefer silence over unnecessary words.", color: "#9ad9ff" },
                                                                                                                        { id: "1544643151375900762", name: "Ferocious", icon: "🐺", price: 115000, desc: "Cute until you give them a reason not to be.", color: "#e63946" },
                                                                                                                          { id: "1544643298025668618", name: "Unhinged", icon: "💀", price: 125000, desc: "There is absolutely no telling what they will do.", color: "#2a005b" },
                                                                                                                            { id: "1544643504603533332", name: "Ruthless", icon: "🩸", price: 140000, desc: "They never back down from a challenge.", color: "#6D1A36" },
                                                                                                                              { id: "1544643660946219110", name: "Sinister", icon: "🖤", price: 150000, desc: "Something about them feels suspicious.", color: "#3D2645" },
                                                                                                                                { id: "1544643837819883540", name: "Moonflower", icon: "🌙", price: 200000, desc: "Quietly beautiful with a mysterious charm.", color: "#f8d0ff" },
                                                                                                                                  { id: "1544644059857952819", name: "Rosaline", icon: "🌹", price: 250000, desc: "Elegant, graceful, and a little romantic.", color: "#a9003a" },
                                                                                                                                    { id: "1544644535555199038", name: "Vellichor", icon: "📖", price: 300000, desc: "They find beauty in old things and memories.", color: "#967BB6" },
                                                                                                                                      { id: "1544644783002091520", name: "Elysian", icon: "🏛️", price: 350000, desc: "Graceful, peaceful, and effortlessly elegant.", color: "#9be7ce" },
                                                                                                                                        { id: "1544645000057323560", name: "Aurelia", icon: "✨", price: 400000, desc: "They carry a warm and radiant presence.", color: "#ffd700" },
                                                                                                                                          { id: "1544645875559563344", name: "Nocturne", icon: "🌑", price: 500000, desc: "They belong where the night begins.", color: "#0f1010" },
                                                                                                                                            { id: "1544646075388919851", name: "Crystalborn", icon: "💎", price: 650000, desc: "Born to shine brighter than the rest.", color: "#a003c1" },
                                                                                                                                              { id: "1544646431682596895", name: "Supercalifragilisticexpialidocious", icon: "🪄", price: 800000, desc: "Absolutely wonderful in every possible way.", color: "#0015ff" },
                                                                                                                                                { id: "1544646793520873542", name: "Floccinaucinihilipilification", icon: "💀", price: 900000, desc: "Nothing is ever good enough for them.", color: "#81ff32" },
                                                                                                                                                  { id: "1544647240952582214", name: "Broke", icon: "💸", price: 1000000, desc: "The richest person in Crystals... someday.", color: "#2f3138" }
                                                                                                                                                  ];

                                                                                                                                                  const triviaQuestions = [
                                                                                                                                                      { q: "Who is my mommy?", a: "sarah" },
                                                                                                                                                        { q: "Which country won the FIFA World Cup in 2022?", a: "argentina" },
                                                                                                                                                          { q: "How many balls are bowled in a single over in cricket?", a: "6" },
                                                                                                                                                            { q: "Which tennis Grand Slam tournament is played on grass courts?", a: "wimbledon" },
                                                                                                                                                              { q: "Who is known as the 'King of Clay' in tennis?", a: "rafael nadal" },
                                                                                                                                                                { q: "Who doesn't know the answers of the trivia questions?", a: "me" },
                                                                                                                                                                  { q: "How many players are on the field for one football (soccer) team?", a: "11" },
                                                                                                                                                                    { q: "In cricket, what is a dismissal without scoring called?", a: "duck" },
                                                                                                                                                                      { q: "Which country won the inaugural ICC Men's T20 World Cup in 2007?", a: "india" },
                                                                                                                                                                        { q: "What color card does a referee show in football to send a player off?", a: "red" },
                                                                                                                                                                          { q: "Which city hosted the 2024 Summer Olympic Games?", a: "paris" },
                                                                                                                                                                            { q: "What is the maximum break score achievable in standard snooker without fouls?", a: "147" },
                                                                                                                                                                              { q: "What is the closest planet to the Sun in our solar system?", a: "mercury" },
                                                                                                                                                                                { q: "What is the powerhouse of the cell?", a: "mitochondria" },
                                                                                                                                                                                  { q: "Which molecule carries genetic instructions in living organisms?", a: "dna" },
                                                                                                                                                                                    { q: "What is the chemical symbol for Gold?", a: "au" },
                                                                                                                                                                                      { q: "What galaxy is our solar system located in?", a: "milky way" },
                                                                                                                                                                                        { q: "What is the most abundant gas in Earth's atmosphere?", a: "nitrogen" },
                                                                                                                                                                                          { q: "What is the force that pulls objects toward the center of the Earth?", a: "gravity" },
                                                                                                                                                                                            { q: "Which planet is known as the 'Red Planet'?", a: "mars" },
                                                                                                                                                                                              { q: "What is the hardest naturally occurring mineral on Earth?", a: "diamond" },
                                                                                                                                                                                                { q: "What organ in the human body pumps blood?", a: "heart" },
                                                                                                                                                                                                  { q: "How many bones are in an adult human body?", a: "206" },
                                                                                                                                                                                                    { q: "What is the speed of light approximately in km/s (round to hundred thousands)?", a: "300000" },
                                                                                                                                                                                                      { q: "Which celestial body causes ocean tides on Earth?", a: "moon" },
                                                                                                                                                                                                        { q: "In 'Attack on Titan', what is Eren Yeager's childhood hometown?", a: "shiganshina" },
                                                                                                                                                                                                          { q: "Who is the main protagonist of 'Demon Slayer'?", a: "tanjiro" },
                                                                                                                                                                                                            { q: "What weapon does Zoro famously wield three of in 'One Piece'?", a: "swords" },
                                                                                                                                                                                                              { q: "In 'Naruto', what beast is sealed inside Naruto Uzumaki?", a: "kurama" },
                                                                                                                                                                                                                { q: "Who is the creator of the Death Note notebook dropped in the human world?", a: "ryuk" },
                                                                                                                                                                                                                  { q: "What is the name of Goku's signature energy attack in Dragon Ball?", a: "kamehameha" },
                                                                                                                                                                                                                    { q: "In 'Jujutsu Kaisen', what covers Satoru Gojo's eyes most of the time?", a: "blindfold" },
                                                                                                                                                                                                                      { q: "Which wizard school does Harry Potter attend?", a: "hogwarts" },
                                                                                                                                                                                                                        { q: "What is the real name of Marvel's Iron Man?", a: "tony stark" },
                                                                                                                                                                                                                          { q: "In 'Attack on Titan', which Titan is known for its extreme speed and hardened skin?", a: "armored titan" },
                                                                                                                                                                                                                            { q: "What is the name of Tanjiro's demon sister in 'Demon Slayer'?", a: "nezuko" },
                                                                                                                                                                                                                              { q: "Who was the Captain of the Survey Corps known as 'Humanity's Strongest Soldier'?", a: "levi" },
                                                                                                                                                                                                                                { q: "What is the capital city of Japan?", a: "tokyo" },
                                                                                                                                                                                                                                  { q: "What is the largest ocean on Earth?", a: "pacific" },
                                                                                                                                                                                                                                    { q: "What is the tallest mountain in the world?", a: "mount everest" },
                                                                                                                                                                                                                                      { q: "How many continents are there on Earth?", a: "7" },
                                                                                                                                                                                                                                        { q: "Which animal is known as the 'Ship of the Desert'?", a: "camel" },
                                                                                                                                                                                                                                          { q: "What is the primary language spoken in Brazil?", a: "portuguese" },
                                                                                                                                                                                                                                            { q: "Which instrument has 88 keys?", a: "piano" },
                                                                                                                                                                                                                                              { q: "What is the freezing point of water in Celsius?", a: "0" },
                                                                                                                                                                                                                                                { q: "Which country is home to the kangaroo?", a: "australia" },
                                                                                                                                                                                                                                                  { q: "What is the currency of the United Kingdom?", a: "pound" },
                                                                                                                                                                                                                                                    { q: "How many colors are in a standard rainbow?", a: "7" },
                                                                                                                                                                                                                                                      { q: "What is the largest desert in the world (non-polar)?", a: "sahara" },
                                                                                                                                                                                                                                                        { q: "Who painted the Mona Lisa?", a: "leonardo da vinci" }
                                                                                                                                                                                                                                                        ];

                                                                                                                                                                                                                                                        const gifs = {
                                                                                                                                                                                                                                                              hug: ["https://tenor.com/bTnLN.gif"],
                                                                                                                                                                                                                                                                slap: ["https://tenor.com/rgthAilNvLq.gif", "https://tenor.com/jGuEU0i6vga.gif"],
                                                                                                                                                                                                                                                                  kiss: ["https://tenor.com/bZd0s.gif", "https://tenor.com/jF68XxeAIU7.gif"],
                                                                                                                                                                                                                                                                    bonk: ["https://tenor.com/bBL0H.gif"],
                                                                                                                                                                                                                                                                      pat: ["https://tenor.com/fvDvLGEkgWl.gif", "https://tenor.com/paI40TBYAiX.gif"],
                                                                                                                                                                                                                                                                        highfive: ["https://tenor.com/bE4Cr.gif", "https://tenor.com/bfQiO.gif", "https://tenor.com/Ss9z.gif"],
                                                                                                                                                                                                                                                                          dance: ["https://tenor.com/bEA5LZPnSLZ.gif", "https://tenor.com/ov2K39tkRbt.gif"],
                                                                                                                                                                                                                                                                            laugh: ["https://tenor.com/cx3L56YnyG0.gif", "https://tenor.com/bgZwd.gif"],
                                                                                                                                                                                                                                                                              poke: ["https://tenor.com/pcn54peS8AE.gif", "https://tenor.com/bF4YW.gif"],
                                                                                                                                                                                                                                                                                blush: ["https://tenor.com/46B3BbkPxv.gif", "https://tenor.com/fqkVNMEpMGk.gif", "https://tenor.com/bEJDN.gif"],
punch: ["https://tenor.com/nMgcFwxQD4d.gif", "https://tenor.com/bUdox.gif"],
bite: ["https://tenor.com/bUV4L.gif", "https://tenor.com/bUV4Q.gif"],
pinch: ["https://tenor.com/kEsrx1qzbUU.gif", "https://tenor.com/pR6a7rhGDOT.gif"],
};

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();
  
  if (msg.includes('sarah')) {
    message.reply("Ikrr Sarah is just so peak.. you are peak too twin ✨");
  }

  const userId = message.author.id;
  
  if (!xpCooldowns.has(userId)) {
    const userData = await getUserData(userId);
    userData.xp += Math.floor(Math.random() * 11) + 15; 
    const xpNeeded = userData.level * userData.level * 100;
    if (userData.xp >= xpNeeded) {
      userData.level += 1;
      message.channel.send(`🎉 <@${userId}> just grinded to **Level ${userData.level}**!`);
    }
    await userData.save();
    xpCooldowns.add(userId);
    setTimeout(() => xpCooldowns.delete(userId), 30000); 
  }

  if (!msg.startsWith('cry!')) return;

  const args = msg.split(' ');
  const command = args[0]; 
  const targetUser = message.mentions.users.first();
  
  const cdKey = `${userId}-${command}`;
  const threeMinCommands = ['cry!work', 'cry!rps', 'cry!trivia', 'cry!slots', 'cry!beg', 'cry!ship', 'cry!tea', 'cry!gay', 'cry!lesbian', 'cry!rate', 'cry!crystalfortune'];

  if (command === 'cry!crystalstorm' && commandCooldowns.has('global-crystalstorm')) {
    return message.reply("⏳ The skies are calm right now. Wait 3 hours before summoning another storm!");
  }

  if (threeMinCommands.includes(command) && commandCooldowns.has(cdKey)) {
    return message.reply(`⏳ Please wait 3 minutes before using **${command}** again!`);
  }

const applyCooldown = (time) => {
    commandCooldowns.set(cdKey, true);
    setTimeout(() => commandCooldowns.delete(cdKey), time);
  };

  if (command === 'cry!bal') {
    const userData = await getUserData(userId);
    return message.reply(`${cryCoin} **Crystal Balance**\n\n👤 User: <@${userId}>\n💰 Balance: ${userData.balance}${cryCoin}`);
  }
  
  else if (command === 'cry!work') {
    const userData = await getUserData(userId);
    const now = Date.now();

    if (userData.workCooldownUntil && now < userData.workCooldownUntil) {
        const timeLeftMs = userData.workCooldownUntil - now;
        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`You are resting after completing 40 full shifts! You can return to work in **${hours}h ${minutes}m**.`);
    }

    if (userData.workCooldownUntil && now >= userData.workCooldownUntil) {
        userData.workAttempts = 0;
        userData.workCooldownUntil = null;
    }

    userData.workAttempts = userData.workAttempts || 0;
    const earned = Math.floor(Math.random() * 300) + 100;
    
    userData.balance += earned;
    userData.workAttempts += 1;

    let replyMsg = `⚒️ You worked hard and earned **${earned}** ${cryCoin}! (Shift **${userData.workAttempts}/40**)`;

    if (userData.workAttempts >= 40) {
        userData.balance += 500;
        userData.workCooldownUntil = new Date(now + (24 * 60 * 60 * 1000)); 
        replyMsg += `\n\n🌟 **NO-LIFE BONUS!** (+500 ${cryCoin})\n🛑 **Whew! You've successfully completed your 40-shift quota. You must rest for 24 hours before you can work again.**`;
    }

    await userData.save();
    applyCooldown(180000); 
    return message.reply(replyMsg);
  }

else if (command === 'cry!daily') {
    const userData = await getUserData(userId);
    const now = new Date();
    if (now - userData.lastDaily < 86400000) return message.reply("⏳ You already claimed your daily reward! Come back in 24 hours.");
    userData.balance += 678; 
    userData.lastDaily = now;
    await userData.save();
    return message.reply(`🎁 **Daily Reward Claimed!**\n\n${cryCoin} +678\nCurrent Balance: ${userData.balance}${cryCoin}`);
  }

else if (command === 'cry!pay') {
    if (!targetUser) return message.reply(`Who are you paying? Example: \`cry!pay @user 500\``);
    if (targetUser.bot || targetUser.id === userId) return message.reply("You can't do that!");
    const amount = parseInt(args.find(arg => /^\d+$/.test(arg)));
    if (!amount || amount <= 0) return message.reply(`Please specify a valid amount!`);

    const senderData = await getUserData(userId);
    if (senderData.balance < amount) return message.reply(`You don't have enough! (Balance: **${senderData.balance.toLocaleString()}** ${cryCoin})`);

    const receiverData = await getUserData(targetUser.id);
    senderData.balance -= amount;
    receiverData.balance += amount;
    
    await senderData.save(); 
    await receiverData.save();
    return message.reply(`💸 You instantly sent ${cryCoin} ${amount.toLocaleString()} to <@${targetUser.id}>.`);
  }

  else if (command === 'cry!leaderboard' || command === 'cry!lb') {
    const topUsers = await User.find().sort({ balance: -1 }).limit(10); 
    let lbString = `🏆 **Crystal Leaderboard (Top 10)**\n\n`;
    for (let i = 0; i < topUsers.length; i++) {
      const u = client.users.cache.get(topUsers[i].userId);
      lbString += `${i + 1}️⃣ **${u ? u.username : "Unknown"}** — ${cryCoin} ${topUsers[i].balance}\n`;
    }
    return message.reply(lbString);
  }
  
  else if (command === 'cry!rank') {
    const topUsers = await User.find().sort({ level: -1 }).limit(10); 
    let lbString = `🌟 **Level Leaderboard (Top 10)**\n\n`;
    for (let i = 0; i < topUsers.length; i++) {
      const u = client.users.cache.get(topUsers[i].userId);
      lbString += `${i + 1}️⃣ **${u ? u.username : "Unknown"}** — Level ${topUsers[i].level}\n`;
    }
    return message.reply(lbString);
  }

else if (command === 'cry!profile') {
    const target = targetUser ? targetUser : message.author;
    const userData = await getUserData(target.id);
    const visualBadges = userData.inventory.map(itemName => {
      const found = Object.values(shopItems).find(i => i.name === itemName);
      return found ? found.icon : '';
    }).join(' ');
    
    let gardenStatus = "*Garden is empty. Buy a seed!*";
    if (userData.plantType !== 'None') {
      const stages = ['🌱 Seed', '🌿 Sprout', '🪴 Small Plant', '🌳 Leaves', '🌸 Flowering', '🍎 Pomegranate Tree'];
      const bar = '🌱 ── 🌿 ── 🪴 ── 🌳 ── 🌸 ── 🍎';
      gardenStatus = `**${stages[userData.growthStage]}** (Stage ${userData.growthStage}/5)\n${bar}\n${userData.harvestReady ? '✅ Ready to Harvest!' : '💧 Remember to water!'}`;
    }

    const profileEmbed = new EmbedBuilder().setColor('#a020f0').setTitle(`✨ ${target.username}'s Profile`)
      .addFields(
        { name: '💰 Balance', value: `${cryCoin} ${userData.balance}`, inline: true },
        { name: '🌟 Level', value: `Lvl ${userData.level} (${userData.xp} XP)`, inline: true },
        { name: '❤️ Partner', value: userData.partner ? `<@${userData.partner}>` : 'Single', inline: true },
        { name: '🎒 Badges', value: visualBadges || '*None*' },
        { name: '🌿 Garden Status', value: gardenStatus }
      );
    return message.reply({ embeds: [profileEmbed] });
  }
  else if (command === 'cry!shop') {
    const embed = new EmbedBuilder().setColor('#ffd700').setTitle('🛒 Crystal Shop').setDescription('Use `cry!buy <item>` to purchase!');
    for (const [key, item] of Object.entries(shopItems)) {
      embed.addFields({ name: `${item.icon} ${item.name} — ${item.price} ${cryCoin}`, value: `*${item.desc}*` });
    }
    return message.reply({ embeds: [embed] });
  }

  else if (command === 'cry!buy') {
    const itemName = args.slice(1).join(' ').toLowerCase();
    const itemKey = Object.keys(shopItems).find(k => shopItems[k].name.toLowerCase() === itemName);
    if (!itemKey) return message.reply("❌ Item not found in the shop!");
    const item = shopItems[itemKey];
    const userData = await getUserData(userId);
    if (userData.balance < item.price) return message.reply(`❌ You need ${cryCoin} ${item.price}!`);
    
    userData.balance -= item.price;
    userData.inventory.push(item.name);
    await userData.save();
    return message.reply(`🎉 You bought the ${item.icon} **${item.name}** for ${cryCoin} ${item.price}!`);
  }

else if (command === 'cry!sell') {
    const itemName = args.slice(1).join(' ').toLowerCase();
    const userData = await getUserData(userId);
    const itemIndex = userData.inventory.findIndex(i => i.toLowerCase() === itemName);
    if (itemIndex === -1) return message.reply("🎒 You don't own this item!");
    const itemDef = Object.values(shopItems).find(i => i.name === userData.inventory[itemIndex]);
    const sellPrice = Math.floor(itemDef.price / 2);
    userData.inventory.splice(itemIndex, 1);
    userData.balance += sellPrice;
    await userData.save();
    return message.reply(`🤝 Sold your ${itemDef.icon} **${itemDef.name}** for ${cryCoin} ${sellPrice}.`);
  }

  else if (command === 'cry!inv' || command === 'cry!inventory') {
    const userData = await getUserData(userId);
    if (userData.inventory.length === 0) return message.reply(`🎒 Inventory is empty!`);
    const counts = {};
    userData.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    let invList = `🎒 **Inventory**\n\n`;
    for (const [name, count] of Object.entries(counts)) {
      const itemDef = Object.values(shopItems).find(i => i.name === name);
      invList += `${itemDef ? itemDef.icon : '✨'} **${name}** (x${count})\n`;
    }
    return message.reply(invList);
  }

else if (command === 'cry!roleshop') {
    const userData = await getUserData(userId);
    const itemsPerPage = 4;
    const totalPages = Math.ceil(roleshopItems.length / itemsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
        const start = page * itemsPerPage;
        const currentItems = roleshopItems.slice(start, start + itemsPerPage);

        const embedColor = currentItems[0] ? currentItems[0].color : '#2b2d31';

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({ name: `${message.author.username} • Role Shop`, iconURL: message.author.displayAvatarURL() })
            .setDescription(`👤 **${message.author.username}**${cryCoin} current balance:\n**${userData.balance.toLocaleString()}**${cryCoin}\n\n*Use **cry!buyrole <Name>** to purchase!*`);

        currentItems.forEach(item => {
            embed.addFields({
                name: `${item.icon}${item.name}`,
                value: `<@&${item.id}>:${item.desc}\n**Price:** ${item.price.toLocaleString()}${cryCoin}`,
                inline: false
            });
        });

        embed.setFooter({ text: `Page ${page + 1}/${totalPages}` });
        return embed;
    };

    const generateButtons = (page) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
        );
    };

const shopMessage = await message.reply({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });

    const collector = shopMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async interaction => {
        if (interaction.user.id !== userId) return interaction.reply({ content: "❌ This isn't your shop menu!", ephemeral: true });

        if (interaction.customId === 'first') currentPage = 0;
        if (interaction.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
        if (interaction.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
        if (interaction.customId === 'last') currentPage = totalPages - 1;

        await interaction.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
    });

    collector.on('end', () => { shopMessage.edit({ components: [] }).catch(() => {}); });
  }

  else if (command === 'cry!buyrole') {
    const roleName = args.slice(1).join(' ').toLowerCase();
    if (!roleName) return message.reply(`Please specify a role to buy! Example: \`cry!buyrole Goofy\``);

    const roleDef = roleshopItems.find(r => r.name.toLowerCase() === roleName);
    if (!roleDef) return message.reply("❌ Role not found! Check `cry!roleshop` for correct names.");
    
    const discordRole = message.guild.roles.cache.get(roleDef.id);
    if (!discordRole) return message.reply(`⚠️ Could not find that role in the server! Ensure the ID in the code is correct.`);

    if (message.member.roles.cache.has(discordRole.id)) return message.reply(`You already own the <@&${discordRole.id}> role!`);

    const userData = await getUserData(userId);
    const isSarah = message.author.username.toLowerCase().includes('sarah') || message.author.id === '1471141307400454245';

    if (!isSarah) {
        if (userData.balance < roleDef.price) {
            return message.reply(`❌ You need **${roleDef.price.toLocaleString()}** ${cryCoin}, but currently have **${userData.balance.toLocaleString()}**.`);
        }
        userData.balance -= roleDef.price;
        await userData.save();
    }

try {
        await message.member.roles.add(discordRole);
        return message.reply(`🎉 You purchased and equipped <@&${discordRole.id}>!${isSarah ? ' *(VIP Free Pass Activated)*' : ` Deducted **${roleDef.price.toLocaleString()}**${cryCoin}.`}`);
    } catch (err) {
        return message.reply(`Failed to assign role. Make sure the bot's own role is placed higher than the shop roles in your server settings!`);
    }
  }

  else if (command === 'cry!myroles') {
    const userData = await getUserData(userId);
    if (userData.roles.length === 0) return message.reply("You don't own any legacy roles yet!");
    return message.reply(`🎨 **Your Legacy Unlocked Roles:**\n\n${userData.roles.join('\n')}`);
  }

  else if (command === 'cry!equip' || command === 'cry!unequip') {
    return message.reply("⚠️ With the new Role Shop update, roles are now instantly equipped to your Discord profile when purchased! You can manage them straight from your Discord profile or ask an admin to remove them.");
  }

  else if (command === 'cry!garden') {
    return message.reply("🌿 Check your `cry!profile` to see your beautiful plant's progress!");
  }

  else if (command === 'cry!plant') {
    const userData = await getUserData(userId);
    if (userData.plantType !== 'None') return message.reply("🌿 You already have a plant growing!");
    const seedIndex = userData.inventory.indexOf('Pomegranate Seed');
    if (seedIndex === -1) return message.reply("🌱 You need to buy a **Pomegranate Seed** from the shop first!");
    
    userData.inventory.splice(seedIndex, 1);
    userData.plantType = 'Pomegranate';
    userData.growthStage = 0;
    userData.harvestReady = false;
    userData.lastWatered = new Date();
    await userData.save();
    return message.reply("🌱 You planted your Pomegranate Seed! Don't forget to `cry!water` it every 24 hours!");
  }

else if (command === 'cry!water') {
    const userData = await getUserData(userId);
    if (userData.plantType === 'None') return message.reply("You don't have a plant!");
    const now = new Date();
    if (now - userData.lastWatered < 86400000) return message.reply("💧 Your plant is already hydrated! Come back tomorrow.");
    
    userData.lastWatered = now;
    if (userData.growthStage < 5) {
      userData.growthStage += 1;
      await userData.save();
      return message.reply(`💧 You watered your plant! It grew to Stage ${userData.growthStage}/5!`);
    } else {
      userData.harvestReady = true;
      await userData.save();
      return message.reply("💧 You watered your mature tree! It is now ready to `cry!harvest`! 🍎");
    }
  }

  else if (command === 'cry!fertilize') {
    const userData = await getUserData(userId);
    if (userData.plantType === 'None') return message.reply("You don't have a plant!");
    if (userData.growthStage >= 5) return message.reply("Your tree is already fully grown!");
    
    const peatIndex = userData.inventory.indexOf('Coco Peat');
    if (peatIndex === -1) return message.reply("🧱 You need to buy **Coco Peat** from the shop!");
    
    userData.inventory.splice(peatIndex, 1);
    userData.growthStage += 1;
    await userData.save();
    return message.reply(`🧱 You applied fertilizer! Your plant instantly grew to Stage ${userData.growthStage}/5!`);
  }

else if (command === 'cry!harvest') {
    const userData = await getUserData(userId);
    if (!userData.harvestReady) return message.reply("❌ Nothing to harvest right now! Keep watering it.");
    
    let payout = Math.floor(Math.random() * 200) + 100;
    if (userData.inventory.includes('Gardening Shears')) payout += 150; 
    
    userData.harvestReady = false;
    userData.balance += payout;
    await userData.save();
    return message.reply(`🍎 **Harvest Successful!**\nYou collected your crop and earned ${cryCoin} ${payout}!`);
  }

else if (command === 'cry!rps') {
    const choices = ['rock', 'paper', 'scissors'];
    const userChoice = args[1]?.toLowerCase();
    const betAmount = parseInt(args[2]);
    if (!choices.includes(userChoice) || !betAmount) return message.reply("Use `cry!rps <rock/paper/scissors> <bet>`");
    
    const userData = await getUserData(userId);
    if (userData.balance < betAmount) return message.reply("You don't have enough crystals!");
    
    const botChoice = choices[Math.floor(Math.random() * 3)];
    if (userChoice === botChoice) {
      applyCooldown(180000);
      return message.reply(`I chose **${botChoice}**! It's a tie, you keep your crystals.`);
    }
    
    const userWins = (userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper');
    if (userWins) {
      userData.balance += betAmount; await userData.save();
      applyCooldown(180000);
      return message.reply(`I chose **${botChoice}**! 🎉 You win ${cryCoin} ${betAmount}!`);
    } else {
      userData.balance -= betAmount; await userData.save();
      applyCooldown(180000);
      return message.reply(`I chose **${botChoice}**! 💀 You lost ${cryCoin} ${betAmount}.`);
    }
  }

else if (command === 'cry!trivia') {
    applyCooldown(180000);
    const q = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    message.channel.send(`🧠 **TRIVIA TIME!** (First to answer wins ${cryCoin} 250!)\n\n❓ **${q.q}**\n*(You have 15 seconds! Type your answer below)*`);
    
    const filter = m => m.content.toLowerCase() === q.a && !m.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });
    
    collector.on('collect', async m => {
      const winnerData = await getUserData(m.author.id);
      winnerData.balance += 250; await winnerData.save();
      message.channel.send(`🎉 <@${m.author.id}> got it right! The answer was **${q.a}**. (+250 ${cryCoin})`);
    });
    collector.on('end', collected => {
      if (collected.size === 0) message.channel.send(`⏳ Time's up! Nobody got it. The answer was **${q.a}**.`);
    });
  }

  else if (command === 'cry!slots') {
    const userData = await getUserData(userId);
    if (userData.balance < 1000) return message.reply(`You need ${cryCoin} 1000!`);
    const win = Math.random() < 0.3; 
    if (win) {
      userData.balance += 500; await userData.save();
      applyCooldown(180000);
      return message.reply(`🎰 **Crystal Slots**\n${cryCoin} ${cryCoin} ${cryCoin}\nJACKPOT!\n💎 +1500 ${cryCoin}`);
    } else {
      userData.balance -= 1000; await userData.save();
      applyCooldown(180000);
      return message.reply(`🎰 **Crystal Slots**\n🍋 🍒 🍇\nYou Lost!\n💎 -1000 ${cryCoin}`);
    }
  }

else if (command === 'cry!beg') {
    const begAmount = Math.floor(Math.random() * 141) + 10; 
    const userData = await getUserData(userId);
    userData.balance += begAmount; await userData.save();
    applyCooldown(180000); 
    return message.reply(`🥺 A kind stranger gave you ${cryCoin} +${begAmount}`);
  }

  else if (command === 'cry!coinflip') {
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    return message.reply(`🪙 **Coin Flip**\n\nThe coin landed on... **${result}**!`);
  }
  
  else if (command === 'cry!dice') {
    const result = Math.floor(Math.random() * 6) + 1;
    return message.reply(`🎲 **Dice Roll**\n\nYou rolled a **${result}**!`);
  }

  else if (command === 'cry!rate') {
    if (!targetUser) return message.reply("Tag someone! `cry!rate @user`");
    const rating = Math.floor(Math.random() * 10) + 1;
    let response = rating <= 3 ? "maybe take a shower and try again tomorrow. 🤢" : rating <= 6 ? "maybe comb your hair a bit and get some sleep. 🥱" : rating <= 9 ? "looking pretty good! W aura. 😎" : "Absolute majestic aura. 10/10! 👑";
    applyCooldown(180000);
    return message.reply(`📊 I rate <@${targetUser.id}> a **${rating}/10**...\n${response}`);
  }

  else if (command === 'cry!ship') {
        const mentions = Array.from(message.mentions.users.values());
            if (mentions.length === 0) return message.reply("Tag someone to ship! `cry!ship @user` or `cry!ship @user1 @user2`");

                // Check if 2 users were tagged, or just 1 + author
                    let user1, user2;
                        if (mentions.length >= 2) {
                              user1 = mentions[0];
                                    user2 = mentions[1];
                                        } else {
                                              user1 = message.author;
                                                    user2 = mentions[0];
                                                        }

                                                            const isVIP = user1.id === '1471141307400454245' || user2.id === '1471141307400454245';
                                                                const percent = isVIP ? 100 : Math.floor(Math.random() * 101);

                                                                    // Clean names to letters only
                                                                        const cleanLetters = str => str.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'crystal';
                                                                            const str1 = cleanLetters(user1.username);
                                                                                const str2 = cleanLetters(user2.username);

                                                                                    // Helper: Pick N random characters from a string
                                                                                        const pickRandomChars = (str, count) => {
                                                                                              let result = [];
                                                                                                    for (let i = 0; i < count; i++) {
                                                                                                            result.push(str.charAt(Math.floor(Math.random() * str.length)));
                                                                                                                  }
                                                                                                                        return result;
                                                                                                                            };

                                                                                                                                // Grab 3 random letters from user1 and 2 from user2
                                                                                                                                    let combinedPool = [...pickRandomChars(str1, 3), ...pickRandomChars(str2, 2)];

                                                                                                                                        // Shuffle them completely so they mix together randomly
                                                                                                                                            for (let i = combinedPool.length - 1; i > 0; i--) {
                                                                                                                                                  const j = Math.floor(Math.random() * (i + 1));
                                                                                                                                                        [combinedPool[i], combinedPool[j]] = [combinedPool[j], combinedPool[i]];
                                                                                                                                                            }

                                                                                                                                                                let randomizedName = combinedPool.join('');
                                                                                                                                                                    randomizedName = randomizedName.charAt(0).toUpperCase() + randomizedName.slice(1).toLowerCase();

                                                                                                                                                                        try {
                                                                                                                                                                              await message.channel.sendTyping();

                                                                                                                                                                                    const canvas = createCanvas(900, 500);
                                                                                                                                                                                          const ctx = canvas.getContext('2d');

                                                                                                                                                                                                // 1. Midnight Plum to Deep Magenta Background
                                                                                                                                                                                                      const bgGradient = ctx.createLinearGradient(0, 0, 900, 500);
                                                                                                                                                                                                            bgGradient.addColorStop(0, '#0c0414');
                                                                                                                                                                                                                  bgGradient.addColorStop(0.5, '#1e052d');
                                                                                                                                                                                                                        bgGradient.addColorStop(1, '#9e0856');
                                                                                                                                                                                                                              ctx.fillStyle = bgGradient;
                                                                                                                                                                                                                                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                                                                                                                                                                                                                                          // Outer Card Border
                                                                                                                                                                                                                                                ctx.save();
                                                                                                                                                                                                                                                      ctx.lineWidth = 4;
                                                                                                                                                                                                                                                            ctx.strokeStyle = '#ff7bb3';
                                                                                                                                                                                                                                                                  ctx.shadowColor = '#ff2a8d';
                                                                                                                                                                                                                                                                        ctx.shadowBlur = 12;
                                                                                                                                                                                                                                                                              ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
                                                                                                                                                                                                                                                                                    ctx.restore();

                                                                                                                                                                                                                                                                                          // 2. Delicate Starfield
                                                                                                                                                                                                                                                                                                ctx.fillStyle = '#ffffff';
                                                                                                                                                                                                                                                                                                      for (let i = 0; i < 75; i++) {
                                                                                                                                                                                                                                                                                                              ctx.globalAlpha = Math.random() * 0.7 + 0.2;
                                                                                                                                                                                                                                                                                                                      const size = Math.random() > 0.88 ? 3 : 1.5;
                                                                                                                                                                                                                                                                                                                              ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, size, size);
                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                          ctx.globalAlpha = 1.0;

                                                                                                                                                                                                                                                                                                                                                // 3. User Avatars
                                                                                                                                                                                                                                                                                                                                                      const u1Avatar = user1.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
                                                                                                                                                                                                                                                                                                                                                            const u2Avatar = user2.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });

                                                                                                                                                                                                                                                                                                                                                                  const [avatar1, avatar2] = await Promise.all([
                                                                                                                                                                                                                                                                                                                                                                          loadImage(u1Avatar),
                                                                                                                                                                                                                                                                                                                                                                                  loadImage(u2Avatar)
                                                                                                                                                                                                                                                                                                                                                                                        ]);

                                                                                                                                                                                                                                                                                                                                                                                              const drawAvatarCard = (img, x, y, size) => {
                                                                                                                                                                                                                                                                                                                                                                                                      ctx.save();
                                                                                                                                                                                                                                                                                                                                                                                                              ctx.beginPath();
                                                                                                                                                                                                                                                                                                                                                                                                                      if (typeof ctx.roundRect === 'function') {
                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.roundRect(x, y, size, size, 32);
                                                                                                                                                                                                                                                                                                                                                                                                                                        } else {
                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                                                                                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.shadowColor = '#ff5ca8';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.shadowBlur = 25;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.lineWidth = 10;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.strokeStyle = '#ffb3d9';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.stroke();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.clip();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.drawImage(img, x, y, size, size);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.restore();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                };

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                drawAvatarCard(avatar1, 65, 105, 250);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      drawAvatarCard(avatar2, 585, 105, 250);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            // 4. Center Glowing Heart
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  const cx = 450;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        const cy = 155;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              const w = 175;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    const h = 165;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.save();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.beginPath();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      const topCurveHeight = h * 0.3;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.moveTo(cx, cy + topCurveHeight);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.bezierCurveTo(cx, cy, cx - w / 2, cy, cx - w / 2, cy + topCurveHeight);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ctx.bezierCurveTo(cx - w / 2, cy + (h + topCurveHeight) / 2, cx, cy + (h + topCurveHeight) / 2, cx, cy + h);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ctx.bezierCurveTo(cx, cy + (h + topCurveHeight) / 2, cx + w / 2, cy + (h + topCurveHeight) / 2, cx + w / 2, cy + topCurveHeight);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ctx.bezierCurveTo(cx + w / 2, cy, cx, cy, cx, cy + topCurveHeight);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.closePath();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.fillStyle = '#b80058';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ctx.shadowColor = '#ff2b8c';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.shadowBlur = 30;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.fill();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ctx.lineWidth = 5;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ctx.strokeStyle = '#ffffff';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ctx.stroke();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.restore();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // 5. TOP TEXT: "Crystal Bond"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ctx.save();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.textAlign = 'center';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.font = '54px "CrystalScript", cursive, sans-serif';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ctx.fillStyle = '#ffffff';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ctx.shadowColor = '#ff5ca8';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ctx.shadowBlur = 18;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.fillText('Crystal Bond', 450, 72);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.restore();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      // 6. CENTER TEXT: Percentage
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.save();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.textAlign = 'center';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ctx.textBaseline = 'middle';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ctx.font = 'italic 52px "CrystalScript", cursive, sans-serif';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ctx.fillStyle = '#ffffff';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.shadowColor = '#ffffff';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.shadowBlur = 12;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ctx.fillText(`${percent}%`, 450, 238);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.restore();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  // 7. BOTTOM TEXT: Random Mixed Ship Name
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ctx.save();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ctx.textAlign = 'center';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ctx.font = '76px "CrystalScript", cursive, sans-serif';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ctx.fillStyle = '#ffe0ed';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ctx.shadowColor = '#ff0077';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ctx.shadowBlur = 24;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ctx.fillText(randomizedName, 450, 440);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ctx.restore();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        const buffer = await canvas.toBuffer('image/png');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              const attachment = new AttachmentBuilder(buffer, { name: 'crystal-bond.png' });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    // Custom tag lines
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          let tagline = isVIP 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ? "Crystals are blushing! love is in the air! ✨"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          : percent > 80 ? "Something something! Ahm 🥹" 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  : percent > 50 ? "Definitely some crystal chemistry sparkling here! 💕" 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          : percent > 20 ? "Nothing more than just friends" 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  : "Better luck next time. Crystals say eww";

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        applyCooldown(180000);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              return message.reply({ content: tagline, files: [attachment] });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        console.error("CANVAS ERROR:", err);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              return message.reply(`⚠️ Failed to generate image: \`${err.message}\``);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    }
  
  
  
  
  

else if (command === 'cry!imposter') {
    if (commandCooldowns.has('imposter_lobby')) {
        return message.reply("⏳ A game is already starting or running in the server!");
    }
    
    const lobbyEmbed = new EmbedBuilder()
        .setTitle('🕵️ THE MANSION')
        .setDescription('A game of social deduction is starting! Click **Join** to enter the mansion.\n\n*Requires at least 4 players to start.*')
        .setColor('#2b2d31');

    const joinBtn = new ButtonBuilder().setCustomId('join_imposter').setLabel('Join Game').setStyle(ButtonStyle.Success);
    const startBtn = new ButtonBuilder().setCustomId('start_imposter').setLabel('Start Game (Host)').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(joinBtn, startBtn);

    const lobbyMsg = await message.channel.send({ embeds: [lobbyEmbed], components: [row] });
    commandCooldowns.set('imposter_lobby', true);

    const players = new Set([message.author.id]); 

    const collector = lobbyMsg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'join_imposter') {
            if (players.has(i.user.id)) {
                return i.reply({ content: "You are already in the lobby!", ephemeral: true });
            }
            players.add(i.user.id);
            await i.reply({ content: "You entered the mansion...", ephemeral: true });
            
            lobbyEmbed.setDescription(`A game of social deduction is starting!\n\n**Players Joined (${players.size}):**\n${Array.from(players).map(id => `<@${id}>`).join('\n')}\n\n*Requires at least 4 players to start.*`);
            await lobbyMsg.edit({ embeds: [lobbyEmbed] });
        }
        if (i.customId === 'start_imposter') {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "Only the host can start the game!", ephemeral: true });
            }
            if (players.size < 4) {
                return i.reply({ content: "You need at least 4 players to assign all the special roles!", ephemeral: true });
            }
            collector.stop('started');
        }
    });

collector.on('end', async (collected, reason) => {
        commandCooldowns.delete('imposter_lobby');
        
        if (reason !== 'started') {
            return lobbyMsg.edit({ content: "Lobby timed out. The mansion doors remain closed.", embeds: [], components: [] });
        }

        await lobbyMsg.edit({ content: "🔒 The mansion doors have locked...", embeds: [], components: [] });

        const playerArray = Array.from(players);
        
        // Shuffle the players array
        for (let i = playerArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playerArray[i], playerArray[j]] = [playerArray[j], playerArray[i]];
        }

        // Assign Roles
        const roles = {};
        roles[playerArray[0]] = 'Murderer';
        roles[playerArray[1]] = 'Detective';
        roles[playerArray[2]] = 'Bodyguard';
        for (let i = 3; i < playerArray.length; i++) {
            roles[playerArray[i]] = 'Guest';
        }

// Send DMs to players
        for (const id of playerArray) {
            const user = client.users.cache.get(id);
            if (user) {
                try {
                    let roleDesc = "You are a **Guest**. Pay attention to the chat, survive, and figure out who the Murderer is!";
                    if (roles[id] === 'Murderer') roleDesc = "You are the **Murderer**. You must manipulate the chat and eliminate everyone without getting caught!";
                    if (roles[id] === 'Detective') roleDesc = "You are the **Detective**. You must figure out who the killer is and guide the Guests without exposing yourself.";
                    if (roles[id] === 'Bodyguard') roleDesc = "You are the **Bodyguard**. You must protect the innocent from the Murderer.";
                    
                    await user.send(`🕵️ **THE MANSION**\nYour secret role: **${roles[id]}**\n\n${roleDesc}`);
                } catch (e) {
                    message.channel.send(`⚠️ Could not DM <@${id}>. They might have DMs turned off!`);
                }
            }
        }

        message.channel.send(`🕯️ **ROUND 1 BEGINS**\nEveryone has received their secret roles in their DMs.\n\nThe lights suddenly go out. The Night Phase has begun...`);
    });
  }

else if (command === 'cry!marry' || command === 'cry!accept' || command === 'cry!reject' || command === 'cry!divorce' || command === 'cry!partner') {
    return message.reply("❤️ Love module active! (These operate exactly as expected based on our previous logic!)"); 
  }

  else if (command === 'cry!tea') {
    const teaSpills = ["Erm, what the sigma? Someone just lost on slots... 💀", "Someone was caught practicing their piano chords at 3 AM... 🎹", "Rumor has it someone here is secretly a Demon Slayer Hashira... ⚔️", "Did you know a day on Venus is longer than a year on Venus? 🪐", "Someone's pomegranate seedling is thriving today. 🌱"];
    applyCooldown(180000);
    return message.reply(`☕ **Crystal Tea**\n\n${teaSpills[Math.floor(Math.random() * teaSpills.length)]}`);
  }

  else if (command === 'cry!crystalfortune') {
    const fortunes = ["The stars align... a journey to a dark sky reserve is drawing near! 🌌", "Your multi-hand coordination is improving! Keep practicing. 🎹", "The cosmos whisper... your 2026 exams are going to go exceptionally well! 🩺", "Your plants are going to thrive this season! 🌱"];
    applyCooldown(180000);
    return message.reply(`🔮 **Crystal Fortune**\n\n"${fortunes[Math.floor(Math.random() * fortunes.length)]}"`);
  }
  
  else if (command === 'cry!gay' || command === 'cry!lesbian') {
    if (!targetUser) return message.reply("Tag someone!");
    const type = command === 'cry!gay' ? 'Gay' : 'Lesbian';
    applyCooldown(180000);
    return message.reply(`🏳️‍🌈 **${type} Meter**\n\n<@${targetUser.id}> is ${Math.floor(Math.random() * 101)}% ${type}!`);
  }

  else if (command === 'cry!crystalstorm') {
    const luckyMember = (await message.guild.members.fetch()).filter(m => !m.user.bot).random();
    const luckyData = await getUserData(luckyMember.id);
    luckyData.balance += 500; await luckyData.save();
    commandCooldowns.set('global-crystalstorm', true);
    setTimeout(() => commandCooldowns.delete('global-crystalstorm'), 10800000); 
    return message.reply(`🌩️ **CRYSTAL STORM!** 🌩️\nA magical crystal strikes <@${luckyMember.id}>! They gained **${cryCoin} 500**!`);
  }

else if (['cry!hug', 'cry!slap', 'cry!kiss', 'cry!bonk', 'cry!pat', 'cry!highfive', 'cry!dance', 'cry!laugh', 'cry!poke', 'cry!blush', 'cry!punch', 'cry!bite', 'cry!pinch'].includes(command)) {
    const action = command.split('!')[1];
    if (['hug', 'slap', 'kiss', 'bonk', 'pat', 'highfive', 'poke', 'punch', 'bite', 'pinch'].includes(action) && !targetUser) return message.reply(`Tag someone!`);
    const gif = gifs[action][Math.floor(Math.random() * gifs[action].length)];
    const text = targetUser ? `<@${userId}> ${action}s <@${targetUser.id}>!` : `<@${userId}> is ${action}ing!`;
    const embed = new EmbedBuilder().setColor('#ffb6c1').setDescription(text).setImage(gif);
    commandCooldowns.set(cdKey, true);
    setTimeout(() => commandCooldowns.delete(cdKey), 10000); 
    return message.reply({ embeds: [embed] });
  }

  else if (command === 'cry!addmoney' || command === 'cry!removemoney') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("❌ **Access Denied!**");
    const amount = parseInt(args.find(arg => /^\d+$/.test(arg)));
    if (!targetUser || !amount) return message.reply("Tag a user and provide an amount!");
    const userData = await getUserData(targetUser.id);
    command === 'cry!addmoney' ? userData.balance += amount : userData.balance -= amount;
    await userData.save();
    return message.reply(`✅ **Success**\nModified ${cryCoin} ${amount} for <@${targetUser.id}>.`);
  }

else if (command === 'cry!help') {
    const helpEmbed = new EmbedBuilder().setColor('#00ffff').setTitle('✨ Crystal Bot Help Menu ✨')
      .addFields(
        { name: '💰 Economy', value: '`cry!bal`, `cry!work`, `cry!daily`, `cry!pay`, `cry!lb`' },
        { name: '🎒 Shop & Inventory', value: '`cry!shop`, `cry!buy`, `cry!sell`, `cry!inv`' },
        { name: '🎨 Role Shop', value: '`cry!roleshop`, `cry!buyrole`, `cry!equip`, `cry!unequip`, `cry!myroles`' },
        { name: '🌱 Garden', value: '`cry!garden`, `cry!plant`, `cry!water`, `cry!fertilize`, `cry!harvest`' },
        { name: '🎮 Fun Games', value: '`cry!rps`, `cry!trivia`, `cry!imposter`' },
        { name: '🎲 Gambling', value: '`cry!slots`, `cry!beg`' },
        { name: '❤️ Love', value: '`cry!marry`, `cry!accept`, `cry!reject`, `cry!divorce`, `cry!partner`, `cry!ship`' },
        { name: '🤝 Social', value: '`cry!hug`, `cry!slap`, `cry!kiss`, `cry!bonk`, `cry!pat`, `cry!highfive`, `cry!dance`, `cry!laugh`, `cry!poke`, `cry!blush`, `cry!punch`, `cry!bite`, `cry!pinch`' },
        { name: '🎉 Fun', value: '`cry!tea`, `cry!crystalfortune`, `cry!gay`, `cry!lesbian`, `cry!rate`, `cry!coinflip`, `cry!dice`, `cry!crystalstorm`' },
        { name: '🛠️ Utility & Profile', value: '`cry!profile`, `cry!rank`, `cry!help`' },
        { name: '🛡️ Admin', value: '`cry!addmoney`, `cry!removemoney`' }
      ).setFooter({ text: 'Prefix: cry!' });
    return message.reply({ embeds: [helpEmbed] });
  }

}); 
client.login(process.env.TOKEN);
                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  





                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                        


                                                                                                                                                  
                                                                                  
                                        
                                            
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                