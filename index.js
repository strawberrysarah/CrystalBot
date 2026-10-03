import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import mongoose from 'mongoose';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// 1. CLIENT & CONFIGURATION
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

const PREFIX = 'cry!';
const cryCoin = '1531598791063638036>';
const VIP_USER_ID = '1471141307400454245'; // Replace with your exact Discord User ID

if (!global.botCooldowns) global.botCooldowns = new Map();

function checkCooldown(key, durationMs) {
  const now = Date.now();
  if (global.botCooldowns.has(key)) {
    const expiration = global.botCooldowns.get(key) + durationMs;
    if (now < expiration) {
      return Math.ceil((expiration - now) / 1000);
    }
  }
  global.botCooldowns.set(key, now);
  return 0;
}

// ==========================================
// 2. DATABASE SCHEMA & USER MODEL
// ==========================================
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 100 },
  bank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  workCount: { type: Number, default: 0 },
  equippedRole: { type: String, default: 'Default Prism' },
  rolesOwned: { type: [String], default: ['Default Prism'] }
});

const User = mongoose.model('User', userSchema);

async function getUserData(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId });
  }
  return user;
}

// ==========================================
// 3. CANVAS SHIP CARD GENERATOR
// ==========================================
async function generateAstralShipCard(user1, user2, resonance) {
  const width = 800;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Deep Astral Nebula Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#10051d');
  bgGrad.addColorStop(0.5, '#230b3b');
  bgGrad.addColorStop(1, '#090114');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Background Starfield Particles
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Astral Constellation Line connecting the two cores
  ctx.strokeStyle = resonance > 50 ? 'rgba(247, 37, 133, 0.7)' : 'rgba(112, 214, 255, 0.4)';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(175, 175);
  ctx.lineTo(625, 175);
  ctx.stroke();
  ctx.setLineDash([]);

  // Central Crystal Core
  ctx.save();
  ctx.beginPath();
  ctx.arc(400, 175, 48, 0, Math.PI * 2);
  ctx.fillStyle = resonance >= 70 ? '#f72585' : resonance >= 30 ? '#b5179e' : '#4a2040';
  ctx.shadowColor = resonance >= 70 ? '#ff70a6' : '#7209b7';
  ctx.shadowBlur = 25;
  ctx.fill();
  ctx.restore();

  // Percentage Text in Central Core
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${resonance}%`, 400, 175);

  // Helper function for circular avatars with glowing crystal borders
  async function drawAvatar(avatarUrl, x, y, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f72585';
    ctx.shadowColor = '#ff70a6';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  const pfp1 = user1.displayAvatarURL({ extension: 'png', size: 256 });
  const pfp2 = user2.displayAvatarURL({ extension: 'png', size: 256 });
  await drawAvatar(pfp1, 175, 175, 75);
  await drawAvatar(pfp2, 625, 175, 75);

  // Names Label
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(user1.username.slice(0, 12), 175, 280);
  ctx.fillText(user2.username.slice(0, 12), 625, 280);

  return canvas.toBuffer('image/png');
}

// ==========================================
// 4. BOT EVENTS & MESSAGE HANDLER
// ==========================================
client.once('ready', () => {
  console.log(`✨ CrystalBot is fully operational as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // ------------------------------------------
    // WORK (20 - 80 Crystals + Shift Jackpot)
    // ------------------------------------------
    if (command === 'work') {
      const cd = checkCooldown(`work_${message.author.id}`, 300000); // 5 minutes
      if (cd > 0) return message.reply(`⏳ Take a breather! You can work again in **${cd}s**.`);

      const user = await getUserData(message.author.id);
      const earned = Math.floor(Math.random() * 61) + 20; // 20 to 80
      user.balance += earned;
      user.workCount = (user.workCount || 0) + 1;

      let extraMsg = '';
      if (user.workCount >= 5) {
        user.balance += 200;
        user.workCount = 0;
        extraMsg = `\n🎉 **DAILY SHIFT JACKPOT!** You completed your work shift and secured a bonus of **200 ${cryCoin}**!`;
      }

      await user.save();
      return message.reply(`⛏️ You worked diligently in the crystal mines and harvested **${earned} ${cryCoin}**!${extraMsg}`);
    }

    // ------------------------------------------
    // BEG (0 - 67 Crystals)
    // ------------------------------------------
    if (command === 'beg') {
      const cd = checkCooldown(`beg_${message.author.id}`, 60000); // 1 minute
      if (cd > 0) return message.reply(`⏳ People are avoiding you. Wait **${cd}s** before begging again.`);

      const user = await getUserData(message.author.id);
      const roll = Math.floor(Math.random() * 68); // 0 to 67

      if (roll === 0) {
        const trollQuotes = [
          "A passerby glanced at you, sighed, and handed you a coupon for expired milk.",
          "Someone dropped a shiny button in your bowl and walked away smiling.",
          "A stray cat walked up, stared into your soul, and knocked your begging cup over.",
          "A wealthy traveler told you to 'invest in the grind' and left zero crystals."
        ];
        const quote = trollQuotes[Math.floor(Math.random() * trollQuotes.length)];
        return message.reply(`💀 **Tough Luck!** ${quote}\n*(You received **0 ${cryCoin}**)*`);
      }

      user.balance += roll;
      await user.save();

      if (roll >= 60) {
        return message.reply(`🗣️ **What in the Skibidi Ohio?!** A crypto-bard tossed you **${roll}${cryCoin}** for reciting pure brainrot poetry!`);
      }

      return message.reply(`🤲 A kind resident dropped **${roll}${cryCoin}** into your hands. Count your blessings!`);
    }

    // ------------------------------------------
    // DUAL TRANSFERS: cry!pay & cry!send
    // ------------------------------------------
    if (command === 'pay' || command === 'send') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1], 10);

      if (!target || target.bot || target.id === message.author.id) {
        return message.reply(`⚠️ Tag a valid user: \`cry!${command} @user <amount>\``);
      }
      if (isNaN(amount) || amount <= 0) {
        return message.reply("⚠️ Specify a valid positive crystal amount.");
      }

      const sender = await getUserData(message.author.id);
      if (sender.balance < amount) {
        return message.reply(`❌ You don't have enough crystals! Balance: **${sender.balance}${cryCoin}**`);
      }

      const receiver = await getUserData(target.id);
      sender.balance -= amount;
      receiver.balance += amount;

      await sender.save();
      await receiver.save();

      return message.reply(`✨ Successfully transferred **${amount.toLocaleString()}${cryCoin}** to <@${target.id}>!`);
    }

    // ------------------------------------------
    // COINFLIP: cry!coinflip & cry!cf
    // ------------------------------------------
    if (command === 'coinflip' || command === 'cf') {
      const bet = parseInt(args[0], 10);
      const choice = (args[1] || '').toLowerCase();

      if (isNaN(bet) || bet <= 0 || !['heads', 'h', 'tails', 't'].includes(choice)) {
        return message.reply("⚠️ Usage: `cry!cf <amount> <heads/tails>`");
      }

      const user = await getUserData(message.author.id);
      if (user.balance < bet) return message.reply("❌ Insufficient crystals for this bet!");

      const isHeads = Math.random() < 0.5;
      const outcome = isHeads ? 'heads' : 'tails';
      const won = choice.startsWith(outcome[0]);

      if (won) {
        user.balance += bet;
        await user.save();
        return message.reply(`🪙 The coin rolled **${outcome.toUpperCase()}**! You won **+${bet.toLocaleString()}${cryCoin}**! 🎉`);
      } else {
        user.balance -= bet;
        await user.save();
        return message.reply(`🪙 The coin rolled **${outcome.toUpperCase()}**! You lost **-${bet.toLocaleString()}${cryCoin}**.`);
      }
    }

    // ------------------------------------------
    // CELESTIAL SHIP (CANVAS + VIP ZERO-CD PERK)
    // ------------------------------------------
    if (command === 'ship') {
      if (message.author.id !== VIP_USER_ID) {
        const cd = checkCooldown(`ship_${message.author.id}`, 30000);
        if (cd > 0) return message.reply(`⏳ Celestial resonance cooling down. Wait **${cd}s**.`);
      }

      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to calculate resonance with: `cry!ship @user`");

      const resonance = Math.floor(Math.random() * 101);
      const cardBuffer = await generateAstralShipCard(message.author, target, resonance);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'ship.png' });

      let reading = "";
      if (resonance >= 90) reading = "🌌 *Written in the constellations. Absolute cosmic harmony!*";
      else if (resonance >= 60) reading = "✨ *A strong magnetic celestial pull. The stars shine brightly on this!*";
      else if (resonance >= 30) reading = "💫 *Orbiting cautiously. Requires patience and starlight.*";
      else reading = "💥 *Supernova alert! Planetary collision imminent.*";

      const shipEmbed = new EmbedBuilder()
        .setTitle('✧ CELESTIAL RESONANCE ✧')
        .setColor('#f72585')
        .setDescription(`**${message.author.username}** × **${target.username}**\n**Resonance Score:** **${resonance}\%**\n${reading}`)
        .setImage('attachment://ship.png')
        .setFooter({ text: message.author.id === VIP_USER_ID ? "👑 Cosmic VIP: Instant Resonance Unlocked" : "CrystalBot Astral Gate" });

      return message.reply({ embeds: [shipEmbed], files: [attachment] });
    }

    // ------------------------------------------
    // ROAST COMMAND (1-MIN COOLDOWN)
    // ------------------------------------------
    if (command === 'roast') {
      const cd = checkCooldown(`roast_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ Cool down! Wait **${cd}s**.`);

      const target = message.mentions.users.first() || message.author;
      const roasts = [
        "has the turning radius of a cruise ship and the reaction time of dial-up internet.",
        "is like a software update—whenever people see them, they click 'Remind me tomorrow'.",
        "brings everyone so much joy... whenever they leave the voice channel.",
        "is living proof that even light cannot escape a black hole of awkwardness.",
        "could drop their weapon in a turn-based game and still lose their turn.",
        "has the charisma of an unseasoned potato in a microwave."
      ];

      const chosenRoast = roasts[Math.floor(Math.random() * roasts.length)];
      return message.channel.send(`🔥 <@${target.id}>${chosenRoast}`);
    }

    // ------------------------------------------
    // PICKUP LINES (1-MIN COOLDOWN)
    // ------------------------------------------
    if (command === 'pickup') {
      const cd = checkCooldown(`pickup_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ Keep some charm for later! Wait **${cd}s**.`);

      const target = message.mentions.users.first();
      const lines = [
        "Are you a celestial beacon? Because my entire orbit just shifted toward you.",
        "Are you made of quartz? Because you bring pure clarity into my chaotic server.",
        "Do you have a map of the cosmos? Because I just got lost in your frequency.",
        "My ping might be 200ms, but my heart registers you at 0ms.",
        "If crystals were smiles, you'd own the richest mine in the universe."
      ];

      const chosenLine = lines[Math.floor(Math.random() * lines.length)];
      return message.channel.send(target ? `<@${target.id}>,${chosenLine} ✨` : `${chosenLine} ✨`);
    }

    // ------------------------------------------
    // TRIVIA WITH 1-MIN COOLDOWN
    // ------------------------------------------
    if (command === 'trivia') {
      const cd = checkCooldown(`trivia_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ Give your brain a break! Wait **${cd}s**.`);

      return message.reply("🧠 **Trivia Question:** What crystal is known as the stone of unconditional love?\n*Reply with your answer in chat within 15 seconds!*");
    }

    // ------------------------------------------
    // LEADERBOARD (CLEAN GUILD-FILTERED TOP 10)
    // ------------------------------------------
    if (command === 'lb' || command === 'leaderboard') {
      const allUsers = await User.find({}).sort({ balance: -1 }).limit(100);
      const activeMembers = [];

      for (const doc of allUsers) {
        if (message.guild.members.cache.has(doc.userId)) {
          activeMembers.push(doc);
        }
        if (activeMembers.length >= 10) break;
      }

      const rows = activeMembers.map((doc, idx) => {
        const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
        return `${badge} <@${doc.userId}> — **${doc.balance.toLocaleString()}**${cryCoin}`;
      }).join('\n') || "*No active members found on the ledger.*";

      const lbEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTAL SOUL LEDGER — TOP 10 ✧')
        .setColor('#2d0c45')
        .setDescription(rows)
        .setFooter({ text: `${message.guild.name} • Active Cohort` });

      return message.reply({ embeds: [lbEmbed] });
    }

    // ------------------------------------------
    // PROFILE EMBED (CRYSTAL SOUL CODEX)
    // ------------------------------------------
    if (command === 'profile' || command === 'me') {
      const target = message.mentions.users.first() || message.author;
      const user = await getUserData(target.id);

      const allRanked = await User.find({}).sort({ balance: -1 });
      const rankIdx = allRanked.findIndex(u => u.userId === target.id);
      const standing = rankIdx !== -1 ? `#${rankIdx + 1}` : 'Unranked';

      const level = user.level || 1;
      const exp = user.exp || 0;
      const needed = level * 100;
      const filled = Math.min(8, Math.floor((exp / needed) * 8));
      const bar = `⬢`.repeat(filled) + `⬡`.repeat(8 - filled);

      const profileEmbed = new EmbedBuilder()
        .setAuthor({ name: `✧ CRYSTAL ARCHIVES: ${target.username} ✧`, iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor('#2d0c45')
        .addFields(
          { name: '🌌 Attunement & Level', value: `**Level ${level}** • \`[ ${bar} ]\`\n*EXP: ${exp} /${needed}*`, inline: false },
          { name: '💎 Crystal Vault', value: `**Balance:** ${user.balance.toLocaleString()}${cryCoin}\n**Rank:** \`${standing}\``, inline: true },
          { name: '🔮 Wardrobe', value: `**Equipped:** ${user.equippedRole}\n**Unlocked:** \`${user.rolesOwned.length} items\``, inline: true },
          { name: '✨ Astral Badges', value: target.id === VIP_USER_ID ? '👑 **Cosmic VIP** • 💎 **High Caliber**' : '💠 **Mansion Traveler**', inline: false }
        )
        .setFooter({ text: `Requested by ${message.author.username} • CrystalBot OS`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return message.reply({ embeds: [profileEmbed] });
    }

    // ------------------------------------------
    // SHOP EMBED (THEMED WITH ROLESHOP STYLE)
    // ------------------------------------------
    if (command === 'shop') {
      const shopEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTAL BAZAAR ✧')
        .setColor('#2d0c45')
        .setDescription("Spend your harvested crystals on rare badges, roles, and multipliers!\nUse `cry!buy <item_name>` to make a purchase.")
        .addFields(
          { name: '🔮 Amethyst Cloak', value: `Price: **500 ${cryCoin}**\nA sparkling violet vanity display.`, inline: true },
          { name: '⚡ Shift Overcharge', value: `Price: **1,200 ${cryCoin}**\nDoubles payout on your next \`cry!work\`.`, inline: true },
          { name: '👑 Cosmic VIP Title', value: `Price: **10,000 ${cryCoin}**\nSpecial role and spammable \`cry!ship\`.`, inline: true }
        )
        .setFooter({ text: "CrystalBot Economy Catalog" });

      return message.reply({ embeds: [shopEmbed] });
    }

    // ------------------------------------------
    // IDENTITY & ORACLE COMMANDS (CHAOTIC REROLLS)
    // ------------------------------------------
    if (command === 'gay') {
      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);

      let desc = pct >= 85 ? "🌈 **Maximum Rainbow Resonance!** The prism shattered from sheer brilliance."
               : pct >= 50 ? "✨ **Radiant Spectrum.** Immaculate colorful aura detected."
               : pct >= 20 ? "💫 **Faint Glint.** A subtle pop anthem plays softly."
               : "🏹 **Certified Straight Arrow.** Zero prismatic reflection.";

      const gayEmbed = new EmbedBuilder()
        .setTitle('✧ PRISM SPECTRUM SCAN ✧')
        .setColor('#ff70a6')
        .setDescription(`Target: <@${target.id}>\n\n**Prism Affinity:** **${pct}%**\n${desc}`)
        .setFooter({ text: 'Rerolls freely on every scan' });

      return message.reply({ embeds: [gayEmbed] });
    }

    if (command === 'lesbian') {
      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);

      let desc = pct >= 85 ? "🌅 **Peak Lavender Royalty!** Radiating pure cinematic romance energy."
               : pct >= 50 ? "☕ **Heavy Cottagecore Resonance.** Iced coffee in hand, flawless vibe."
               : pct >= 20 ? "🌿 **Subtle Indie Playlist Vibe.** Definite potential detected."
               : "🌲 **Silent Horizon.** No flannel or floral energy on the radar.";

      const lesEmbed = new EmbedBuilder()
        .setTitle('✧ SUNSET AURA GAUGE ✧')
        .setColor('#ff9770')
        .setDescription(`Target: <@${target.id}>\n\n**Sunset Affinity:** **${pct}%**\n${desc}`)
        .setFooter({ text: 'Rerolls freely on every scan' });

      return message.reply({ embeds: [lesEmbed] });
    }

    if (command === 'rate') {
      const query = args.join(' ');
      if (!query) return message.reply("Give the Oracle something to evaluate: `cry!rate <@user/thing>`");

      const score = Math.floor(Math.random() * 101);
      let verdict = score === 100 ? "👑 **Transcendent Brilliance!** Blinded by perfection."
                  : score >= 75 ? "✨ **Astral Perfection.** Solid S-tier energy."
                  : score >= 40 ? "💎 **Respectable Vibration.** Solid and functional."
                  : score >= 10 ? "🥀 **Needs Polishing.** Mediocre frequency detected."
                  : "💀 **Cursed Energy.** The reading cracked the glass. Discard immediately.";

      const rateEmbed = new EmbedBuilder()
        .setTitle('✧ UNIVERSAL CRYSTAL ORACLE ✧')
        .setColor('#70d6ff')
        .setDescription(`Target: **${query}**\n\n**Rating:** **${score} / 100**\n${verdict}`)
        .setFooter({ text: 'CrystalBot Oracle Arbiter' });

      return message.reply({ embeds: [rateEmbed] });
    }

    // ------------------------------------------
    // SOCIAL ACTIONS (DIRECT CDN GIFS)
    // ------------------------------------------
    if (command === 'hug') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to hug!");

      const hugEmbed = new EmbedBuilder()
        .setColor('#f72585')
        .setDescription(`🫂 <@${message.author.id}> wrapped <@${target.id}> in a warm celestial hug!`)
        .setImage('https://media.tenor.com/7xZlqN0i3lAAAAAC/anime-hug.gif');

      return message.reply({ embeds: [hugEmbed] });
    }

    if (command === 'slap') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to slap!");

      const slapEmbed = new EmbedBuilder()
        .setColor('#7209b7')
        .setDescription(`💥 <@${message.author.id}> slapped <@${target.id}> into another dimension!`)
        .setImage('https://media.tenor.com/Ws6Dm1ZW_vMAAAAC/anime-slap.gif');

      return message.reply({ embeds: [slapEmbed] });
    }

    // ------------------------------------------
    // MANSION IMPOSTER INITIATION
    // ------------------------------------------
    if (command === 'imposter') {
      const imposterEmbed = new EmbedBuilder()
        .setTitle('🏰 MANSION IMPOSTER — LOBBY OPEN')
        .setColor('#2d0c45')
        .setDescription("A murderer lurks in the crystal corridors.\nReact with 🚪 to join the expedition!\nNeed at least 3 players to begin.")
        .setFooter({ text: "Lobby closes in 30 seconds" });

      const lobbyMsg = await message.channel.send({ embeds: [imposterEmbed] });
      await lobbyMsg.react('🚪');
    }

  } catch (err) {
    console.error('Command Execution Error:', err);
    return message.reply("⚠️ An astral disruption occurred while running this command.");
  }
});

// ==========================================
// 5. DATABASE CONNECTION & BOT STARTUP
// ==========================================
async function startCrystalBot() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const botToken = process.env.TOKEN || process.env.DISCORD_TOKEN;

    if (!mongoUri) throw new Error("Missing MONGO_URI in environment variables.");
    if (!botToken) throw new Error("Missing TOKEN in environment variables.");

    await mongoose.connect(mongoUri);
    console.log('💎 MongoDB Connection Established');

    await client.login(botToken);
  } catch (err) {
    console.error('Initialization Failure:', err);
  }
}

startCrystalBot();
