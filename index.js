import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} from 'discord.js';
import mongoose from 'mongoose';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

const PREFIX = 'cry!';
const cryCoin = '<:emoiji_51:1531598791063638036>';
const VIP_USER_ID = '1471141307400454245';

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

const activeGames = new Map();

// ==========================================
// 2. MONGOOSE SCHEMAS & DATABASE MODELS
// ==========================================
const plantSchema = new mongoose.Schema({
  slot: { type: Number, required: true },
  seedType: { type: String, required: true },
  plantedAt: { type: Date, default: Date.now },
  harvestReadyAt: { type: Date, required: true }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 150 },
  bank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  workCount: { type: Number, default: 0 },
  equippedRole: { type: String, default: 'Default Prism' },
  rolesOwned: { type: [String], default: ['Default Prism'] },
  spouseId: { type: String, default: null },
  marriageDate: { type: Date, default: null },
  garden: [plantSchema]
});

const User = mongoose.model('User', userSchema);

async function getUserData(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId, garden: [] });
  }
  return user;
}

async function addExp(user, amount, message) {
  user.exp += amount;
  const needed = user.level * 100;
  if (user.exp >= needed) {
    user.level += 1;
    user.exp -= needed;
    user.balance += user.level * 50;
    message.channel.send(`🎉 **ASCENSION!** <@${user.userId}> attuned deeper with the crystal realm and reached **Level ${user.level}**! (+${user.level * 50}${cryCoin})`);
  }
}

// ==========================================
// 3. CANVAS GENERATORS
// ==========================================

// Celestial Astral Gate (Custom Ship Card)
async function generateAstralShipCard(user1, user2, resonance) {
  const width = 800;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0d0118');
  grad.addColorStop(0.5, '#280b3d');
  grad.addColorStop(1, '#06000c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = resonance > 50 ? 'rgba(247, 37, 133, 0.8)' : 'rgba(112, 214, 255, 0.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(175, 175);
  ctx.lineTo(625, 175);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.beginPath();
  ctx.arc(400, 175, 46, 0, Math.PI * 2);
  ctx.fillStyle = resonance >= 70 ? '#f72585' : resonance >= 30 ? '#7209b7' : '#3a0ca3';
  ctx.shadowColor = resonance >= 70 ? '#ff70a6' : '#b5179e';
  ctx.shadowBlur = 25;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${resonance}%`, 400, 175);

  async function drawFacetedAvatar(avatarUrl, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f72585';
    ctx.shadowColor = '#ff70a6';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
      const img = await loadImage(avatarUrl);
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    } catch {
      ctx.fillStyle = '#4a0e4e';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  await drawFacetedAvatar(user1.displayAvatarURL({ extension: 'png', size: 256 }), 175, 175, 75);
  await drawFacetedAvatar(user2.displayAvatarURL({ extension: 'png', size: 256 }), 625, 175, 75);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(user1.username.slice(0, 12), 175, 280);
  ctx.fillText(user2.username.slice(0, 12), 625, 280);

  return canvas.toBuffer('image/png');
}

// Universal Identity Meter (Gay, Lesbian, Rate)
async function generateGaugeCard(user, percentage, typeName, colorStops) {
  const width = 700;
  const height = 240;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#120422';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(90, 120, 50, 0, Math.PI * 2);
  ctx.strokeStyle = colorStops[0];
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.closePath();
  ctx.clip();
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 40, 70, 100, 100);
  } catch {
    ctx.fillStyle = '#3a0ca3';
    ctx.fillRect(40, 70, 100, 100);
  }
  ctx.restore();

  const trackX = 180;
  const trackY = 125;
  const trackW = 460;
  const trackH = 26;

  ctx.fillStyle = '#220b3b';
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, trackW, trackH, 13);
  ctx.fill();

  const fillW = Math.max(15, (trackW * percentage) / 100);
  const barGrad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
  colorStops.forEach((stop, idx) => barGrad.addColorStop(idx / (colorStops.length - 1), stop));

  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, fillW, trackH, 13);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(user.username.slice(0, 15), trackX, 75);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#d8b4e2';
  ctx.fillText(typeName.toUpperCase(), trackX, 105);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${percentage}%`, trackX + trackW, 105);

  return canvas.toBuffer('image/png');
}

// ==========================================
// 4. CLIENT READY
// ==========================================
client.once('ready', () => {
  console.log(`✨ CrystalBot fully operational as ${client.user.tag}`);
  console.log(`💎 Currency & System Config: Verified`);
});

// ==========================================
// 5. MESSAGE EVENT & COMMAND ENGINE
// ==========================================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // ------------------------------------------
  // EASTER EGG CHAT TRIGGER: "SARAH"
  // ------------------------------------------
  if (message.content.toLowerCase().includes('sarah')) {
    const sarahQuotes = [
      "✨ *My mom loves me bish*"
    ];
    return message.channel.send(sarahQuotes[Math.floor(Math.random() * sarahQuotes.length)]);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // ------------------------------------------
    // ECONOMY: WORK (20-80 + Shift Jackpot)
    // ------------------------------------------
    if (command === 'work') {
      const cd = checkCooldown(`work_${message.author.id}`, 300000);
      if (cd > 0) return message.reply(`⏳ Take a breather! The crystal mines reopen for you in **${cd}s**.`);

      const user = await getUserData(message.author.id);
      const earned = Math.floor(Math.random() * 61) + 20; // 20 to 80
      user.balance += earned;
      user.workCount = (user.workCount || 0) + 1;
      await addExp(user, 15, message);

      let extra = '';
      if (user.workCount >= 5) {
        user.balance += 200;
        user.workCount = 0;
        extra = `\n🎉 **DAILY SHIFT JACKPOT!** You completed 5 full shifts! A massive bonus of **+200 ${cryCoin}** dropped into your vault!`;
      }

      await user.save();
      return message.reply(`⛏️ You worked diligently in the crystal caves and harvested **${earned} ${cryCoin}**!${extra}`);
    }

    // ------------------------------------------
    // ECONOMY: BEG (0-67 + Trolls & Brainrot)
    // ------------------------------------------
    if (command === 'beg') {
      const cd = checkCooldown(`beg_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ People are avoiding you. Wait **${cd}s** before begging again.`);

      const user = await getUserData(message.author.id);
      const roll = Math.floor(Math.random() * 68); // 0 to 67

      if (roll === 0) {
        const trollLines = [
          "A wealthy traveler glanced at you, sighed, and handed you a coupon for expired milk.",
          "Someone dropped a rusty button into your chalice and sprinted away.",
          "A stray astral cat strolled over and knocked your cup over.",
          "A passerby told you to 'invest in your mindset' and gave zero crystals."
        ];
        return message.reply(`💀 **Tough Luck!** ${trollLines[Math.floor(Math.random() * trollLines.length)]}\n*(Earned: **0${cryCoin}**)*`);
      }

      user.balance += roll;
      await addExp(user, 5, message);
      await user.save();

      if (roll >= 60) {
        return message.reply(`🗣️ **What in the Skibidi Ohio?!** A crypto-bard tossed you **${roll}${cryCoin}** for reciting pure brainrot poetry!`);
      }

      return message.reply(`🤲 A kind passerby dropped **${roll}${cryCoin}** into your hands. Count your blessings!`);
    }

    // ------------------------------------------
    // ECONOMY: DUAL TRANSFERS (cry!pay & cry!send)
    // ------------------------------------------
    if (command === 'pay' || command === 'send') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1], 10);

      if (!target || target.bot || target.id === message.author.id) {
        return message.reply(`⚠️ Correct usage: \`cry!${command} @user <amount>\``);
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

      return message.reply(`✨ Transferred **${amount.toLocaleString()}${cryCoin}** from <@${message.author.id}> to <@${target.id}>!`);
    }

    // ------------------------------------------
    // ECONOMY: COINFLIP (cry!coinflip & cry!cf)
    // ------------------------------------------
    if (command === 'coinflip' || command === 'cf') {
      const bet = parseInt(args[0], 10);
      const choice = (args[1] || '').toLowerCase();

      if (isNaN(bet) || bet <= 0 || !['heads', 'h', 'tails', 't'].includes(choice)) {
        return message.reply("⚠️ Usage: `cry!cf <bet> <heads/tails>`");
      }

      const user = await getUserData(message.author.id);
      if (user.balance < bet) return message.reply("❌ You don't have enough crystals for this bet!");

      const isHeads = Math.random() < 0.5;
      const outcome = isHeads ? 'heads' : 'tails';
      const won = choice.startsWith(outcome[0]);

      if (won) {
        user.balance += bet;
        await addExp(user, 10, message);
        await user.save();
        return message.reply(`🪙 The coin spun and landed on **${outcome.toUpperCase()}**! You won **+${bet.toLocaleString()}${cryCoin}**! 🎉`);
      } else {
        user.balance -= bet;
        await user.save();
        return message.reply(`🪙 The coin spun and landed on **${outcome.toUpperCase()}**! You lost **-${bet.toLocaleString()}${cryCoin}**.`);
      }
    }

    // ------------------------------------------
    // MINIGAME: CHESS DUEL (TACTICAL RPS ENGINE)
    // ------------------------------------------
    if (command === 'chessduel' || command === 'chess') {
      const opponent = message.mentions.users.first();
      const wager = parseInt(args[1], 10) || 0;

      if (!opponent || opponent.bot || opponent.id === message.author.id) {
        return message.reply("⚠️ Challenge an opponent: `cry!chessduel @user <wager>`");
      }
      if (wager < 0) return message.reply("⚠️ Wager cannot be negative.");

      const challenger = await getUserData(message.author.id);
      const defender = await getUserData(opponent.id);

      if (challenger.balance < wager) return message.reply(`❌ You don't have enough crystals for a wager of **${wager}${cryCoin}**!`);
      if (defender.balance < wager) return message.reply(`❌ <@${opponent.id}> doesn't have enough crystals!`);

      const duelEmbed = new EmbedBuilder()
        .setTitle('♟️ GRANDMASTER\'S TACTICAL DUEL')
        .setColor('#2d0c45')
        .setDescription(`<@${message.author.id}> challenged <@${opponent.id}> to a tactical chess confrontation!\n**Pot:** **${wager * 2}${cryCoin}**\n\nChoose your playstyle by clicking a button below!`)
        .setFooter({ text: "Attacks beat Squeezes | Defenses beat Attacks | Squeezes beat Defenses" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('chess_attack').setLabel('⚔️️ All-Out Attack').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('chess_defense').setLabel('🛡️ Solid Defense').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('chess_squeeze').setLabel('🧠 Position Squeeze').setStyle(ButtonStyle.Secondary)
      );

      const duelMsg = await message.channel.send({ embeds: [duelEmbed], components: [row] });
      const choices = new Map();

      const collector = duelMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id && i.user.id !== opponent.id) {
          return i.reply({ content: "You are not part of this duel!", ephemeral: true });
        }
        if (choices.has(i.user.id)) {
          return i.reply({ content: "You have already locked in your strategy!", ephemeral: true });
        }

        const picked = i.customId.replace('chess_', '');
        choices.set(i.user.id, picked);
        await i.reply({ content: `✅ Strategy chosen: **${picked.toUpperCase()}**`, ephemeral: true });

        if (choices.size === 2) collector.stop('resolved');
      });

      collector.on('end', async (_, reason) => {
        row.components.forEach(b => b.setDisabled(true));
        await duelMsg.edit({ components: [row] });

        if (reason !== 'resolved') {
          return message.channel.send("⌛ **Duel Expired!** One of the players failed to make a move in time. Wagers returned.");
        }

        const p1Choice = choices.get(message.author.id);
        const p2Choice = choices.get(opponent.id);

        let winner = null;
        let story = "";

        if (p1Choice === p2Choice) {
          story = `Both players opted for **${p1Choice.toUpperCase()}**! A rapid, chaotic blitz scramble led to a threefold repetition draw! Wagers refunded.`;
        } else if (
          (p1Choice === 'attack' && p2Choice === 'squeeze') ||
          (p1Choice === 'defense' && p2Choice === 'attack') ||
          (p1Choice === 'squeeze' && p2Choice === 'defense')
        ) {
          winner = message.author;
          if (p1Choice === 'attack') story = `<@${message.author.id}> launched an unrelenting queen-side piece sacrifice before <@${opponent.id}> could finish developing! Checkmate on the f7 square!`;
          if (p1Choice === 'defense') story = `<@${opponent.id}> threw everything into a reckless attack, but <@${message.author.id}> stood tall behind an iron pawn fortress! Resignation on move 22!`;
          if (p1Choice === 'squeeze') story = `<@${message.author.id}> slowly suffocated <@${opponent.id}>'s passive setup, winning two passed pawns and the match in the endgame!`;
        } else {
          winner = opponent;
          if (p2Choice === 'attack') story = `<@${opponent.id}> unleashed a terrifying king-hunt before <@${message.author.id}> could establish their board control! Checkmate!`;
          if (p2Choice === 'defense') story = `<@${message.author.id}> attacked relentlessly, but <@${opponent.id}> parried every tactic and converted the counter-attack!`;
          if (p2Choice === 'squeeze') story = `<@${opponent.id}> dominated all open files, leaving <@${message.author.id}> completely out-maneuvered in the rook endgame!`;
        }

        if (winner && wager > 0) {
          const wUser = await getUserData(winner.id);
          const lUser = await getUserData(winner.id === message.author.id ? opponent.id : message.author.id);
          wUser.balance += wager;
          lUser.balance -= wager;
          await wUser.save();
          await lUser.save();
        }

        const resEmbed = new EmbedBuilder()
          .setTitle('♟️ MATCH RESOLUTION')
          .setColor('#7209b7')
          .setDescription(`${story}\n\n🏆 **Winner:** ${winner ? `<@${winner.id}> (+${wager * 2} ${cryCoin})` : '**DRAW**'}`)
          .setFooter({ text: "CrystalBot Grandmaster Circuit" });

        return message.channel.send({ embeds: [resEmbed] });
      });
      return;
    }

    // ------------------------------------------
    // SOCIAL: LOVE SUITE (MARRY, DIVORCE, LOVE)
    // ------------------------------------------
    if (command === 'marry') {
      const target = message.mentions.users.first();
      if (!target || target.bot || target.id === message.author.id) {
        return message.reply("Tag someone to propose to: `cry!marry @user`");
      }

      const user = await getUserData(message.author.id);
      const spouse = await getUserData(target.id);

      if (user.spouseId) return message.reply("💍 You are already bound to someone! Divorce first if you wish to remarry.");
      if (spouse.spouseId) return message.reply(`💍 <@${target.id}> is already married!`);

      const marryRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_marry').setLabel('Accept Proposal').setStyle(ButtonStyle.Success).setEmoji('💍'),
        new ButtonBuilder().setCustomId('deny_marry').setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      const msg = await message.channel.send({
        content: `💖 <@${target.id}>, <@${message.author.id}> has dropped to one knee and presented a ring of pure starlight! Will you accept?`,
        components: [marryRow]
      });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on('collect', async i => {
        if (i.user.id !== target.id) return i.reply({ content: "This proposal is not for you!", ephemeral: true });

        marryRow.components.forEach(b => b.setDisabled(true));
        await msg.edit({ components: [marryRow] });

        if (i.customId === 'accept_marry') {
          user.spouseId = target.id;
          user.marriageDate = new Date();
          spouse.spouseId = message.author.id;
          spouse.marriageDate = new Date();
          await user.save();
          await spouse.save();
          return i.reply(`💒 **CONGRATULATIONS!** <@${message.author.id}> and <@${target.id}> are now officially bound under the crystal stars!`);
        } else {
          return i.reply(`🥀 <@${target.id}> declined the proposal. The ring returns to the shadows.`);
        }
      });
      return;
    }

    if (command === 'divorce') {
      const user = await getUserData(message.author.id);
      if (!user.spouseId) return message.reply("❌ You are not currently married.");

      const formerSpouse = await getUserData(user.spouseId);
      const exId = user.spouseId;

      user.spouseId = null;
      user.marriageDate = null;
      formerSpouse.spouseId = null;
      formerSpouse.marriageDate = null;

      await user.save();
      await formerSpouse.save();

      return message.reply(`💔 The celestial bond between <@${message.author.id}> and <@${exId}> has been severed. You are now single.`);
    }

    if (command === 'love') {
      const user = await getUserData(message.author.id);
      if (!user.spouseId) return message.reply("🥀 You don't have a spouse yet! Use `cry!marry @user` first.");

      const days = Math.floor((Date.now() - new Date(user.marriageDate).getTime()) / (1000 * 60 * 60 * 24));
      return message.reply(`💖 You and <@${user.spouseId}> have been attuned together in celestial union for **${days} day(s)**!`);
    }

    // ------------------------------------------
    // VIP PERK: CELESTIAL SHIP (0-CD for VIP)
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
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'astral_ship.png' });

      let reading = "";
      if (resonance >= 90) reading = "🌌 *Written in the constellations. Absolute cosmic harmony!*";
      else if (resonance >= 60) reading = "✨ *A strong magnetic celestial pull. The stars shine brightly on this!*";
      else if (resonance >= 30) reading = "💫 *Orbiting cautiously. Requires patience and starlight.*";
      else reading = "💥 *Supernova alert! Crystals say eww.*";

      const shipEmbed = new EmbedBuilder()
        .setTitle('✧ CELESTIAL RESONANCE ✧')
        .setColor('#f72585')
        .setDescription(`**${message.author.username}** × **${target.username}**\n\n**Resonance Score:** **${resonance}\%**\n${reading}`)
        .setImage('attachment://astral_ship.png')
        .setFooter({ text: message.author.id === VIP_USER_ID ? "👑 Cosmic VIP: Instant Resonance Unlocked" : "CrystalBot Astral Gate" });

      return message.reply({ embeds: [shipEmbed], files: [attachment] });
    }

    // ------------------------------------------
    // LEADERBOARD (CLEAN GUILD-FILTERED TOP 10)
    // ------------------------------------------
    if (command === 'lb' || command === 'leaderboard') {
      const allDocs = await User.find({}).sort({ balance: -1 }).limit(100);
      const activeCohort = [];

      for (const doc of allDocs) {
        if (message.guild.members.cache.has(doc.userId)) {
          activeCohort.push(doc);
        }
        if (activeCohort.length >= 10) break;
      }

      const rows = activeCohort.map((doc, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
        return `${medal} <@${doc.userId}> — **${doc.balance.toLocaleString()}** ${cryCoin} *(Lvl${doc.level || 1})*`;
      }).join('\n') || "*No active server members found on ledger.*";

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

      const allSorted = await User.find({}).sort({ balance: -1 });
      const rankIdx = allSorted.findIndex(u => u.userId === target.id);
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
          { name: '💰 Vault', value: `**Balance:** ${user.balance.toLocaleString()}${cryCoin}\n**Rank:** \`${standing}\``, inline: true },
          { name: '🔮 Wardrobe & Bond', value: `**Equipped:** ${user.equippedRole}\n**Bonded:** ${user.spouseId ? `<@${user.spouseId}>` : 'Single'}`, inline: true },
          { name: '✨ Astral Badges', value: target.id === VIP_USER_ID ? '👑 **Cosmic VIP** • ⭐ **High Caliber**' : '💠 **Mansion Traveler**', inline: false }
        )
        .setFooter({ text: `Requested by ${message.author.username} • CrystalBot OS`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return message.reply({ embeds: [profileEmbed] });
    }

    // ------------------------------------------
    // SHOPS (GENERAL & ROLESHOP)
    // ------------------------------------------
    if (command === 'shop') {
      const shopEmbed = new EmbedBuilder()
        .setTitle('✧ THE CELESTIAL BAZAAR ✧')
        .setColor('#2d0c45')
        .setDescription("Trade your crystals for rare astral artifacts and utility gear!\nUse `cry!buy <item_name>` to acquire items.")
        .addFields(
          { name: '🌱 Astral Seed', value: `Price: **50 ${cryCoin}**\nA sparkling geode seed for your botanical garden.`, inline: true },
          { name: '⚡ Shift Overcharge', value: `Price: **500 ${cryCoin}**\nHalves your next work shift cooldown.`, inline: true },
          { name: '🎟️ Mansion Pass', value: `Price: **1,000 ${cryCoin}**\nSpecial roleplay credentials for Imposter.`, inline: true }
        )
        .setFooter({ text: "Use cry!roleshop to view exclusive cosmetic roles" });

      return message.reply({ embeds: [shopEmbed] });
    }

    if (command === 'roleshop') {
      const roleshopEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTAL WARDROBE ATRIUM ✧')
        .setColor('#7209b7')
        .setDescription("Permanent cosmetic attunements for your profile codex.")
        .addFields(
          { name: '🟣 Violet Flare', value: `Price: **1,500 ${cryCoin}**\nID: \`violet\``, inline: true },
          { name: '🌹 Neon Rose', value: `Price: **3,000 ${cryCoin}**\nID: \`neonrose\``, inline: true },
          { name: '🌌 Astral Prism', value: `Price: **6,000 ${cryCoin}**\nID: \`astral\``, inline: true }
        )
        .setFooter({ text: "Use cry!buyrole <id> to unlock and equip" });

      return message.reply({ embeds: [roleshopEmbed] });
    }

    // ------------------------------------------
    // ROAST, PICKUP & TRIVIA (1-MIN COOLDOWNS)
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

      return message.channel.send(`🔥 <@${target.id}> ${roasts[Math.floor(Math.random() * roasts.length)]}`);
    }

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

      const line = lines[Math.floor(Math.random() * lines.length)];
      return message.channel.send(target ? `<@${target.id}>, ${line} ✨` : `${line} ✨`);
    }

    if (command === 'trivia') {
      const cd = checkCooldown(`trivia_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ Give your brain a break! Wait **${cd}s**.`);

      const triviaBank = [
        { q: "What crystal is known as the stone of unconditional love?", a: "rose quartz" },
        { q: "Which planet in our solar system has the most moons?", a: "saturn" },
        { q: "What is the hardest known natural mineral on Earth?", a: "diamond" },
        { q: "What chemical element gives amethysts their violet color?", a: "iron" }
      ];

      const selected = triviaBank[Math.floor(Math.random() * triviaBank.length)];
      await message.reply(`🧠 **CELESTIAL TRIVIA:**\n${selected.q}\n*(Type your answer in chat within 15 seconds!)*`);

      const filter = m => !m.author.bot;
      const collector = message.channel.createMessageCollector({ filter, time: 15000 });

      let answered = false;
      collector.on('collect', async m => {
        if (m.content.toLowerCase().includes(selected.a.toLowerCase())) {
          answered = true;
          collector.stop();
          const winner = await getUserData(m.author.id);
          winner.balance += 50;
          await addExp(winner, 20, message);
          await winner.save();
          return m.reply(`🎉 **CORRECT!** You attuned with the answer first and earned **+50 ${cryCoin}**!`);
        }
      });

      collector.on('end', () => {
        if (!answered) {
          message.channel.send(`⏰ **Time is up!** The correct answer was **${selected.a}**.`);
        }
      });
      return;
    }

    // ------------------------------------------
    // IDENTITY GAUGES (CHAOTIC REROLLS)
    // ------------------------------------------
    if (command === 'gay') {
      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);
      const buffer = await generateGaugeCard(target, pct, 'Prism Spectrum', ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#ee82ee']);
      const attach = new AttachmentBuilder(buffer, { name: 'prism.png' });

      let desc = pct >= 85 ? "🌈 **Maximum Rainbow Resonance!** The prism shattered from absolute radiance."
               : pct >= 50 ? "✨ **Radiant Spectrum.** Immaculate and colorful energy detected."
               : pct >= 20 ? "💫 **Faint Glint.** A subtle pop anthem plays softly."
               : "🏹 **Certified Straight Arrow.** Zero prismatic reflection detected.";

      const embed = new EmbedBuilder()
        .setTitle('✧ PRISM SPECTRUM SCAN ✧')
        .setColor('#ff70a6')
        .setDescription(`Target: <@${target.id}>\n**Score:** **${pct}%**\n${desc}`)
        .setImage('attachment://prism.png')
        .setFooter({ text: 'Rerolls freely on every scan' });

      return message.reply({ embeds: [embed], files: [attach] });
    }

    if (command === 'lesbian') {
      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);
      const buffer = await generateGaugeCard(target, pct, 'Sunset Aura', ['#d62246', '#e06d53', '#f4a261', '#fceade', '#a37081']);
      const attach = new AttachmentBuilder(buffer, { name: 'sunset.png' });

      let desc = pct >= 85 ? "🌅 **Peak Lavender Royalty!** Radiating pure cinematic romance energy."
               : pct >= 50 ? "☕ **Heavy Cottagecore Resonance.** Iced coffee in hand, flawless vibe."
               : pct >= 20 ? "🌿 **Subtle Indie Playlist Vibe.** Definite potential detected."
               : "🌲 **Silent Horizon.** No flannel or floral energy on the radar.";

      const embed = new EmbedBuilder()
        .setTitle('✧ SUNSET AURA GAUGE ✧')
        .setColor('#ff9770')
        .setDescription(`Target: <@${target.id}>\n**Score:** **${pct}%**\n${desc}`)
        .setImage('attachment://sunset.png')
        .setFooter({ text: 'Rerolls freely on every scan' });

      return message.reply({ embeds: [embed], files: [attach] });
    }

    if (command === 'rate') {
      const query = args.join(' ');
      if (!query) return message.reply("Give the Oracle something to evaluate: `cry!rate <@user/thing>`");

      const targetUser = message.mentions.users.first() || message.author;
      const score = Math.floor(Math.random() * 101);
      const buffer = await generateGaugeCard(targetUser, score, 'Cosmic Rating', ['#4361ee', '#7209b7', '#f72585']);
      const attach = new AttachmentBuilder(buffer, { name: 'rate.png' });

      let verdict = score === 100 ? "👑 **Transcendent Brilliance!** Blinded by sheer perfection."
                  : score >= 75 ? "✨ **Astral Perfection.** Solid S-tier frequency."
                  : score >= 40 ? "💎 **Respectable Vibration.** Solid and functional."
                  : score >= 10 ? "🥀 **Needs Polishing.** Mediocre vibration detected."
                  : "💀 **Cursed Energy.** The reading shattered the glass. Discard immediately.";

      const embed = new EmbedBuilder()
        .setTitle('✧ UNIVERSAL CRYSTAL ORACLE ✧')
        .setColor('#70d6ff')
        .setDescription(`Subject: **${query}**\n**Rating:** **${score} / 100**\n${verdict}`)
        .setImage('attachment://rate.png')
        .setFooter({ text: 'CrystalBot Oracle Arbiter' });

      return message.reply({ embeds: [embed], files: [attach] });
    }

    // ------------------------------------------
    // SOCIAL ACTIONS (VALID DIRECT CDN GIFS)
    // ------------------------------------------
    if (command === 'hug') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to embrace: `cry!hug @user`");

      const embed = new EmbedBuilder()
        .setColor('#f72585')
        .setDescription(`🫂 <@${message.author.id}> wrapped <@${target.id}> in a warm celestial hug!`)
        .setImage('https://media.tenor.com/7xZlqN0i3lAAAAAC/anime-hug.gif');

      return message.reply({ embeds: [embed] });
    }

    if (command === 'slap') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to discipline: `cry!slap @user`");

      const embed = new EmbedBuilder()
        .setColor('#7209b7')
        .setDescription(`💥 <@${message.author.id}> slapped <@${target.id}> into another dimension!`)
        .setImage('https://media.tenor.com/Ws6Dm1ZW_vMAAAAC/anime-slap.gif');

      return message.reply({ embeds: [embed] });
    }

    if (command === 'pat') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to pat: `cry!pat @user`");

      const embed = new EmbedBuilder()
        .setColor('#70d6ff')
        .setDescription(`✨ <@${message.author.id}> gently patted <@${target.id}> on the head.`)
        .setImage('https://media.tenor.com/E6fWJRekLGgAAAAC/anime-pat.gif');

      return message.reply({ embeds: [embed] });
    }

    if (command === 'kiss') {
      const target = message.mentions.users.first();
      if (!target) return message.reply("Tag someone to kiss: `cry!kiss @user`");

      const embed = new EmbedBuilder()
        .setColor('#ff70a6')
        .setDescription(`💋 <@${message.author.id}> shared a passionate kiss with <@${target.id}>!`)
        .setImage('https://media.tenor.com/F0228X8ToqAAAAAC/anime-kiss.gif');

      return message.reply({ embeds: [embed] });
    }

    // ------------------------------------------
    // BOTANICAL GARDEN (UNTOUCHED ENGINE)
    // ------------------------------------------
    if (command === 'garden') {
      const user = await getUserData(message.author.id);
      const gardenSlots = user.garden || [];

      let desc = "**Your Shimmering Botanical Sanctuary:**\n\n";
      for (let i = 1; i <= 3; i++) {
        const plant = gardenSlots.find(p => p.slot === i);
        if (!plant) {
          desc += `**Plot #${i}:** 🕳️ *Empty Soil* (Use \`cry!plant ${i}\`)\n`;
        } else {
          const ready = Date.now() >= new Date(plant.harvestReadyAt).getTime();
          desc += `**Plot #${i}:** ${ready ? '🌸 **Blooming Geode** *(Ready for `cry!harvest`)!*' : '🌱 *Growing...*'}\n`;
        }
      }

      const gardenEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTAL BOTANICAL ATRIUM ✧')
        .setColor('#57cc99')
        .setDescription(desc)
        .setFooter({ text: "Buy seeds in cry!shop and cultivate crystals" });

      return message.reply({ embeds: [gardenEmbed] });
    }

    if (command === 'plant') {
      const slotNum = parseInt(args[0], 10);
      if (![1, 2, 3].includes(slotNum)) return message.reply("⚠️ Specify an available plot: `cry!plant <1-3>`");

      const user = await getUserData(message.author.id);
      const existing = user.garden.find(p => p.slot === slotNum);
      if (existing) return message.reply(`❌ Plot #${slotNum} is already occupied!`);

      const seedCost = 50;
      if (user.balance < seedCost) return message.reply(`❌ You need **${seedCost} ${cryCoin}** to purchase a seed.`);

      user.balance -= seedCost;
      const readyTime = new Date(Date.now() + 600000); // 10 minutes maturation
      user.garden.push({ slot: slotNum, seedType: 'Astral Geode', plantedAt: new Date(), harvestReadyAt: readyTime });

      await user.save();
      return message.reply(`🌱 Planted an **Astral Geode** in Plot #${slotNum}! It will blossom into crystals in 10 minutes.`);
    }

    if (command === 'harvest') {
      const user = await getUserData(message.author.id);
      const now = Date.now();
      const readyPlots = user.garden.filter(p => now >= new Date(p.harvestReadyAt).getTime());

      if (readyPlots.length === 0) {
        return message.reply("🥀 None of your garden plots have blossomed yet. Be patient!");
      }

      const totalYield = readyPlots.length * 120;
      user.balance += totalYield;
      user.garden = user.garden.filter(p => now < new Date(p.harvestReadyAt).getTime());

      await addExp(user, readyPlots.length * 20, message);
      await user.save();

      return message.reply(`🌸 **HARVEST SUCCESSFUL!** You harvested **${readyPlots.length}** plots and reaped **+${totalYield} ${cryCoin}**!`);
    }

    // ------------------------------------------
    // MANSION IMPOSTER (4-PHASE ENGINE)
    // ------------------------------------------
    if (command === 'imposter') {
      if (activeGames.has(message.channel.id)) {
        return message.reply("⚠️ An expedition is already progressing in this corridor!");
      }

      const lobbyEmbed = new EmbedBuilder()
        .setTitle('🏰 MANSION IMPOSTER — EXPEDITION REGISTRATION')
        .setColor('#2d0c45')
        .setDescription("A sinister entity stalks the corridors.\nNeed **at least 3 explorers** to begin.\n\nClick **Join Expedition** below!")
        .setFooter({ text: "Expedition embarks in 25 seconds." });

      const joinBtn = new ButtonBuilder().setCustomId('join_imposter').setLabel('Join Expedition').setStyle(ButtonStyle.Primary).setEmoji('🚪');
      const row = new ActionRowBuilder().addComponents(joinBtn);

      const lobbyMsg = await message.channel.send({ embeds: [lobbyEmbed], components: [row] });
      const players = new Set([message.author.id]);

      const collector = lobbyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 25000
      });

      collector.on('collect', async i => {
        if (players.has(i.user.id)) {
          return i.reply({ content: "You're already in the expedition roster!", ephemeral: true });
        }
        players.add(i.user.id);
        await i.reply({ content: `✅ Registered! (${players.size} players ready)`, ephemeral: true });
      });

      collector.on('end', async () => {
        row.components[0].setDisabled(true);
        await lobbyMsg.edit({ components: [row] });

        if (players.size < 3) {
          activeGames.delete(message.channel.id);
          return message.channel.send("❌ Not enough explorers entered the corridor. Minimum 3 required.");
        }

        activeGames.set(message.channel.id, true);
        const playerArray = Array.from(players);
        const murdererId = playerArray[Math.floor(Math.random() * playerArray.length)];

        for (const pid of playerArray) {
          try {
            const mem = await message.guild.members.fetch(pid);
            if (pid === murdererId) {
              await mem.send("🗡️ **YOU ARE THE MANSION MURDERER.** Eliminate the innocents without getting identified.");
            } else {
              await mem.send("🕯️ **YOU ARE AN INNOCENT EXPLORER.** Survive and identify the culprit during the council.");
            }
          } catch {
            // Proceed if DMs closed
          }
        }

        message.channel.send("🌑 **The heavy gates lock behind you. Night falls over the corridors...** (10 seconds until morning)");

        setTimeout(async () => {
          const innocents = playerArray.filter(id => id !== murdererId);
          const victimId = innocents[Math.floor(Math.random() * innocents.length)];

          message.channel.send(`🚨 **A CHILLING SCREAM RESONATES!**\n<@${victimId}> was found lifeless beside a shattered geode mirror!\n\n**Emergency Council initiated.** You have 30 seconds to debate and vote.`);

          const alivePlayers = playerArray.filter(id => id !== victimId);
          const voteButtons = alivePlayers.map(pid => {
            const member = message.guild.members.cache.get(pid);
            return new ButtonBuilder()
              .setCustomId(`vote_${pid}`)
              .setLabel(member ? member.displayName.slice(0, 20) : 'Explorer')
              .setStyle(ButtonStyle.Danger);
          });

          const voteRow = new ActionRowBuilder().addComponents(voteButtons.slice(0, 5));
          const voteMsg = await message.channel.send({
            content: "Cast your vote for who you believe the murderer is:",
            components: [voteRow]
          });

          const votes = new Map();
          const voteCollector = voteMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 25000
          });

          voteCollector.on('collect', async vi => {
            if (!alivePlayers.includes(vi.user.id)) {
              return vi.reply({ content: "Spectators cannot vote.", ephemeral: true });
            }
            const votedFor = vi.customId.replace('vote_', '');
            votes.set(vi.user.id, votedFor);
            await vi.reply({ content: "Vote cast secretly.", ephemeral: true });
          });

          voteCollector.on('end', async () => {
            voteRow.components.forEach(b => b.setDisabled(true));
            await voteMsg.edit({ components: [voteRow] });

            const voteTally = {};
            for (const [, targetId] of votes) {
              voteTally[targetId] = (voteTally[targetId] || 0) + 1;
            }

            let executedId = null;
            let maxVotes = 0;
            for (const [tId, count] of Object.entries(voteTally)) {
              if (count > maxVotes) {
                maxVotes = count;
                executedId = tId;
              }
            }

            if (!executedId) {
              message.channel.send("⚖️ The council could not reach a consensus. The murderer strikes again in the shadows!\n**MURDERER WINS!**");
              const killer = await getUserData(murdererId);
              killer.balance += 250;
              await killer.save();
              message.channel.send(`👑 <@${murdererId}> was the murderer and collected **+250 ${cryCoin}**!`);
            } else if (executedId === murdererId) {
              message.channel.send(`🎉 **JUSTICE RESTORED!** <@${executedId}> was thrown out the crystal window and was indeed the **MURDERER**!\n**INNOCENTS WIN!**`);
              for (const survivorId of alivePlayers.filter(id => id !== murdererId)) {
                const survivor = await getUserData(survivorId);
                survivor.balance += 150;
                await survivor.save();
              }
              message.channel.send(`💎 All surviving innocents received **+150 ${cryCoin}**!`);
            } else {
              message.channel.send(`💀 A fatal mistake! <@${executedId}> was **INNOCENT**!\n**THE MURDERER ESCAPES WITH THE LOOT!**`);
              const killer = await getUserData(murdererId);
              killer.balance += 250;
              await killer.save();
              message.channel.send(`👑 <@${murdererId}> was the killer and escaped with **+250 ${cryCoin}**!`);
            }

            activeGames.delete(message.channel.id);
          });
        }, 10000);
      });
    }

  } catch (err) {
    console.error('Command Execution Error:', err);
    return message.reply("⚠️ An astral disruption occurred while executing this command.");
  }
});

// ==========================================
// 6. DATABASE CONNECT & BOOTSTRAP
// ==========================================
async function startCrystalEngine() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

    if (!mongoUri) throw new Error("Missing MONGO_URI in Environment Variables.");
    if (!token) throw new Error("Missing TOKEN in Environment Variables.");

    await mongoose.connect(mongoUri);
    console.log('💎 Connected directly to MongoDB Cluster');

    await client.login(token);
  } catch (error) {
    console.error('Fatal Bot Startup Error:', error);
  }
}

startCrystalEngine();
