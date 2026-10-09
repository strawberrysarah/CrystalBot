import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  AttachmentBuilder 
} from 'discord.js';
import mongoose from 'mongoose';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// 1. CLIENT & INTENTS CONFIGURATION
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

const PREFIX = 'cry!';
const cryCoin = '<:emoji_51:1531598791063638036>';
const VIP_USER_IDS = ['1471141307400454245']; // Replace with your Discord User ID

// In-Memory Runtime Caches
const cooldowns = new Map();
const activeGames = new Map();

function checkCooldown(key, ms) {
  const now = Date.now();
  const expire = cooldowns.get(key) || 0;
  if (now < expire) return Math.ceil((expire - now) / 1000);
  cooldowns.set(key, now + ms);
  return 0;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ==========================================
// 2. MONGOOSE SCHEMA & USER DATA ENGINE
// ==========================================
const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 500 },
  bank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  rolesOwned: { type: [String], default: ['Default Prism'] },
  equippedRole: { type: String, default: 'Default Prism' },
  partnerId: { type: String, default: null },
  marriageRing: { type: String, default: null },
  lovies: { type: Number, default: 0 },
  inventory: { type: Map, of: Number, default: () => new Map() },
  plant: {
    active: { type: Boolean, default: false },
    strain: { type: String, default: null },
    stage: { type: Number, default: 0 },
    lastWatered: { type: Date, default: null },
    hasCocopeat: { type: Boolean, default: false },
    plantedAt: { type: Date, default: null }
  },
  workAttempts: { type: Number, default: 0 },
  workResetTime: { type: Date, default: null },
  begAttempts: { type: Number, default: 0 },
  begResetTime: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Date, default: null }
});

// Bound to the clean 'crystalusers' collection
const User = mongoose.model('CrystalUser', userProfileSchema, 'crystalusers');

async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) user = await User.create({ userId });

  if (!user.inventory || typeof user.inventory.get !== 'function') {
    user.inventory = new Map();
  }
  if (!Array.isArray(user.rolesOwned)) user.rolesOwned = ['Default Prism'];
  if (user.workAttempts === undefined) user.workAttempts = 0;
  if (user.begAttempts === undefined) user.begAttempts = 0;
  if (!user.plant) {
    user.plant = { active: false, strain: null, stage: 0, lastWatered: null, hasCocopeat: false, plantedAt: null };
  }

  const now = Date.now();
  if (user.workResetTime && now >= new Date(user.workResetTime).getTime()) {
    user.workAttempts = 0;
    user.workResetTime = null;
  }
  if (user.begResetTime && now >= new Date(user.begResetTime).getTime()) {
    user.begAttempts = 0;
    user.begResetTime = null;
  }
  return user;
}

// ==========================================
// 3. COMPLETE 31-ROLE WARDROBE CATALOG
// ==========================================
const ROLE_CATALOG = [
  { id: 'goofy', name: 'Goofy', price: 10000, color: '#fca311', desc: 'Embrace whimsical chaos in every corridor.', roleId: '1347000000000000001' },
  { id: 'moonflower', name: 'Moonflower', price: 12500, color: '#c77dff', desc: 'Blooms solely under quiet moonlight.', roleId: '1347000000000000002' },
  { id: 'prism', name: 'Prism Walker', price: 15000, color: '#70d6ff', desc: 'Refracts starlight into radiant spectral paths.', roleId: '1347000000000000003' },
  { id: 'starlight', name: 'Starlight Dreamer', price: 17500, color: '#ffb703', desc: 'Carries distant constellation dust in their wake.', roleId: '1347000000000000004' },
  { id: 'nebula', name: 'Nebula Nomad', price: 20000, color: '#9d4edd', desc: 'Drifts across interstate cosmic gas and stardust.', roleId: '1347000000000000005' },
  { id: 'celestial', name: 'Celestial Knight', price: 22500, color: '#48cae4', desc: 'Armored in meteorite alloy and starlight valor.', roleId: '1347000000000000006' },
  { id: 'aurora', name: 'Aurora Seeker', price: 25000, color: '#52b788', desc: 'Chases polar lights dancing across the stratosphere.', roleId: '1347000000000000007' },
  { id: 'eclipse', name: 'Eclipse Warden', price: 27500, color: '#e63946', desc: 'Maintains equilibrium between stellar light and shadow.', roleId: '1347000000000000008' },
  { id: 'solar', name: 'Solar Vanguard', price: 30000, color: '#f77f00', desc: 'Empowered by raw coronal solar flares.', roleId: '1347000000000000009' },
  { id: 'lunar', name: 'Lunar Ascendant', price: 32500, color: '#e0e1dd', desc: 'Attuned to gravitational tides and white lunar glow.', roleId: '1347000000000000010' },
  { id: 'astral', name: 'Astral Monarch', price: 35000, color: '#7209b7', desc: 'Commands ancient starry thrones across dimensions.', roleId: '1347000000000000011' },
  { id: 'cosmic', name: 'Cosmic Weaver', price: 37500, color: '#f72585', desc: 'Spins temporal cosmic threads into reality.', roleId: '1347000000000000012' },
  { id: 'void', name: 'Void Sentinel', price: 40000, color: '#10002b', desc: 'Guards the boundary where matter ceases to exist.', roleId: '1347000000000000013' },
  { id: 'crystal', name: 'Crystal Paragon', price: 45000, color: '#00b4d8', desc: 'Pure harmonic resonance encased in geode gemstone.', roleId: '1347000000000000014' },
  { id: 'diamond', name: 'Diamond Herald', price: 50000, color: '#e2eafc', desc: 'Unbreakable brilliance forged under immense pressure.', roleId: '1347000000000000015' },
  { id: 'obsidian', name: 'Obsidian Reaver', price: 55000, color: '#2b2d42', desc: 'Volcanic glass blade sharpened to razor perfection.', roleId: '1347000000000000016' },
  { id: 'amethyst', name: 'Amethyst Mage', price: 60000, color: '#b5179e', desc: 'Channels arcane violet sorcery and quartz focus.', roleId: '1347000000000000017' },
  { id: 'emerald', name: 'Emerald Sage', price: 65000, color: '#2d6a4f', desc: 'Deep terrestrial plant alchemy and verdant grace.', roleId: '1347000000000000018' },
  { id: 'ruby', name: 'Ruby Champion', price: 70000, color: '#d90429', desc: 'Blazing crimson courage burning from within.', roleId: '1347000000000000019' },
  { id: 'sapphire', name: 'Sapphire Mystic', price: 75000, color: '#0077b6', desc: 'Abyssal depths of wisdom and ocean clairvoyance.', roleId: '1347000000000000020' },
  { id: 'opal', name: 'Opal Enchanter', price: 80000, color: '#d8b4e2', desc: 'Iridescent color-shifting enchantments and luck.', roleId: '1347000000000000021' },
  { id: 'topaz', name: 'Topaz Guardian', price: 85000, color: '#ffaa00', desc: 'Steadfast golden shield enduring centuries.', roleId: '1347000000000000022' },
  { id: 'garnet', name: 'Garnet Striker', price: 90000, color: '#9d0208', desc: 'Explosive garnet precision in every confrontation.', roleId: '1347000000000000023' },
  { id: 'quartz', name: 'Quartz Warden', price: 95000, color: '#edf2f4', desc: 'High frequency harmonic shields and purity.', roleId: '1347000000000000024' },
  { id: 'jade', name: 'Jade Sovereign', price: 100000, color: '#40916c', desc: 'Serene longevity, prosperity, and royal harmony.', roleId: '1347000000000000025' },
  { id: 'pearl', name: 'Pearl Luminary', price: 110000, color: '#f8edeb', desc: 'Bioluminescent ocean majesty forged over eons.', roleId: '1347000000000000026' },
  { id: 'onyx', name: 'Onyx Warlord', price: 120000, color: '#1a1a1a', desc: 'Shadow tactician dominating the midnight battlefield.', roleId: '1347000000000000027' },
  { id: 'zenith', name: 'Zenith Arbiter', price: 130000, color: '#80ed99', desc: 'Stands at the highest apex where heavens meet space.', roleId: '1347000000000000028' },
  { id: 'aether', name: 'Aether Overlord', price: 140000, color: '#38b000', desc: 'Controls the fifth primordial element binding stars.', roleId: '1347000000000000029' },
  { id: 'archon', name: 'Apex Archon', price: 150000, color: '#ffd166', desc: 'The sovereign master of all crystal vaults.', roleId: '1347000000000000030' },
  { id: 'solaris', name: 'Solaris Eternal', price: 200000, color: '#ff4d6d', desc: 'The primordial sun deity reincarnated in crystal flesh.', roleId: '1347000000000000031' }
];

// Marriage Bands Catalog
const RING_CATALOG = [
  { id: 'silver', name: 'Silver Starlight Band', price: 5000, desc: 'Forged from fallen meteoric silver dust.' },
  { id: 'amethyst', name: 'Amethyst Promise Ring', price: 15000, desc: 'Set with an enchanted raw purple quartz jewel.' },
  { id: 'diamond', name: 'Diamond Solitaire Ring', price: 50000, desc: 'A timeless crystalline band reflecting pure love.' },
  { id: 'eternity', name: 'Cosmic Eternity Band', price: 100000, desc: 'Two intertwined rings carved from perpetual starlight.' }
];

// ==========================================
// 4. ADVANCED VISUAL CANVAS ENGINES
// ==========================================

// 4A. CELESTIAL SHIP CARD (1400x720 HD STANDALONE)
async function renderShipCard(u1, u2, resonance) {
  const w = 1400;
  const h = 720;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  let glowColor = '#7209b7';
  let primaryHue = '#f72585';
  let secondaryHue = '#4cc9f0';
  let tagline = "DIFFERENT STARS, SAME SKY";
  let loreReading = "Two souls drifting in sync through parallel galaxies.";

  if (resonance === 100) {
    glowColor = '#ff0055';
    primaryHue = '#ff007f';
    secondaryHue = '#ffd166';
    tagline = "ETERNAL TWIN FLAMES • ABSOLUTE SOULMATE PERFECTION";
    loreReading = "The universe stopped in its tracks. A legendary 100% soul resonance!";
  } else if (resonance >= 90) {
    glowColor = '#ff4d6d';
    primaryHue = '#ff007f';
    secondaryHue = '#b5179e';
    tagline = "WRITTEN IN THE CONSTELLATIONS • COSMIC HARMONY";
    loreReading = "Written in the constellations. Absolute cosmic harmony!";
  } else if (resonance >= 75) {
    glowColor = '#d946ef';
    primaryHue = '#ec4899';
    secondaryHue = '#8b5cf6';
    tagline = "A POWERFUL CELESTIAL PULL • RADIANT GRAVITY";
    loreReading = "A powerful celestial pull. The stars shine brightly on this bond!";
  } else if (resonance >= 50) {
    glowColor = '#8a2be2';
    primaryHue = '#c084fc';
    secondaryHue = '#38bdf8';
    tagline = "DRIFTING THROUGH PARALLEL GALAXIES";
    loreReading = "Two souls drifting in sync through parallel galaxies.";
  } else if (resonance >= 30) {
    glowColor = '#4361ee';
    primaryHue = '#7209b7';
    secondaryHue = '#4cc9f0';
    tagline = "ORBITING CAUTIOUSLY • REQUIRES PATIENCE";
    loreReading = "Orbiting cautiously. Requires starlight, care, and patience.";
  } else if (resonance >= 10) {
    glowColor = '#3a0ca3';
    primaryHue = '#5c4d7d';
    secondaryHue = '#3a0ca3';
    tagline = "FAINT STATIC • UNSTABLE CELESTIAL FREQUENCY";
    loreReading = "Faint static resonance. Some planetary interference detected.";
  } else if (resonance > 0) {
    glowColor = '#2b0938';
    primaryHue = '#4a4e69';
    secondaryHue = '#22223b';
    tagline = "SUPERNOVA COLLISION • DEFCON 1 DANGER";
    loreReading = "Supernova alert! Major orbital collapse warning!";
  } else {
    glowColor = '#1a0022';
    primaryHue = '#343a40';
    secondaryHue = '#212529';
    tagline = "BLACK HOLE DISASTER • RUN IN OPPOSITE DIRECTIONS";
    loreReading = "An astral catastrophe. Do not make eye contact.";
  }

  // Backdrop Gradient
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 850);
  bgGrad.addColorStop(0, '#1c032e');
  bgGrad.addColorStop(0.5, '#0d0118');
  bgGrad.addColorStop(1, '#030006');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  function drawGlowBlob(x, y, r, color) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  drawGlowBlob(250, 360, 320, `${primaryHue}33`);
  drawGlowBlob(1150, 360, 320, `${secondaryHue}33`);
  drawGlowBlob(700, 360, 420, `${glowColor}44`);

  function drawSparkle(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = primaryHue;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  // Ambient Star Dust
  for (let i = 0; i < 90; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const sr = Math.random() * 1.8 + 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  [[120, 110, 14], [1280, 110, 14], [120, 610, 12], [1280, 610, 12], [380, 160, 10], [1020, 160, 10], [620, 270, 8], [780, 270, 8], [700, 560, 9]].forEach(([x, y, s]) => drawSparkle(x, y, s));

  function drawMoon(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.5 * Math.PI, 1.5 * Math.PI, true);
    ctx.bezierCurveTo(r * 0.4, -r, r * 0.4, r, 0, r);
    ctx.fill();
    ctx.restore();
  }
  drawMoon(1290, 90, 24, -0.4);
  drawMoon(90, 580, 24, 0.4);

  // Infinity Ribbon
  ctx.save();
  ctx.lineWidth = 16;
  ctx.strokeStyle = primaryHue;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 28;
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2; t += 0.02) {
    const scale = 270;
    const ix = 700 + (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
    const iy = 350 + (scale * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
    if (t === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  // Heart
  function drawHeartPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.2);
    ctx.bezierCurveTo(cx - s * 0.6, cy - s * 0.8, cx - s * 1.1, cy + s * 0.1, cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx + s * 1.1, cy + s * 0.1, cx + s * 0.6, cy - s * 0.8, cx, cy - s * 0.2);
    ctx.closePath();
  }

  ctx.save();
  drawHeartPath(700, 335, 90);
  ctx.fillStyle = '#170126';
  ctx.shadowColor = primaryHue;
  ctx.shadowBlur = 35;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = primaryHue;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = primaryHue;
  ctx.shadowBlur = 18;
  ctx.fillText(`${resonance}%`, 700, 350);
  ctx.restore();

  async function drawAvatarPort(user, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = primaryHue;
    ctx.lineWidth = 6;
    ctx.shadowColor = primaryHue;
    ctx.shadowBlur = 24;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = secondaryHue;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
      const url = user.displayAvatarURL({ extension: 'png', forceStatic: true, size: 512 });
      const img = await loadImage(url);
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } catch {
      ctx.fillStyle = '#2d0c45';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();

    drawSparkle(cx, cy - r - 6, 12);
    drawSparkle(cx, cy + r + 6, 12);
    drawSparkle(cx - r - 6, cy, 12);
    drawSparkle(cx + r + 6, cy, 12);
  }

  await drawAvatarPort(u1, 240, 350, 140);
  await drawAvatarPort(u2, 1160, 350, 140);

  // Header Texts
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillText('Celestial Resonance', 700, 80);
  drawMoon(890, 66, 12, -0.2);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 115);
  ctx.lineTo(1000, 115);
  ctx.stroke();
  drawSparkle(400, 115, 6);
  drawSparkle(1000, 115, 6);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#e8d5f5';
  ctx.shadowBlur = 0;
  ctx.fillText(tagline, 700, 138);
  ctx.restore();

  // Footer Combo & Reading (Without visual clutter "User1 + User2")
  ctx.save();
  ctx.textAlign = 'center';
  const part1 = u1.username.slice(0, Math.max(2, Math.ceil(u1.username.length / 2)));
  const part2 = u2.username.slice(Math.floor(u2.username.length / 2));
  const combo = `${part1}${part2}`.toUpperCase().replace(/[^A-Z0-9]/gi, '');

  ctx.font = 'bold 36px serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = primaryHue;
  ctx.shadowBlur = 18;
  ctx.fillText(`✦   ${combo || 'CELESTIAL'}   ✦`, 700, 560);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(480, 595);
  ctx.lineTo(920, 595);
  ctx.stroke();

  ctx.save();
  drawHeartPath(700, 590, 9);
  ctx.fillStyle = primaryHue;
  ctx.shadowColor = primaryHue;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  ctx.font = 'italic 18px sans-serif';
  ctx.fillStyle = '#d8b4e2';
  ctx.shadowBlur = 6;
  ctx.fillText(loreReading, 700, 635);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// 4B. ASTRAL RANK CARD (850x280 Compact Status)
async function renderRankCard(targetUser, dbUser, currentRank) {
  const w = 850;
  const h = 280;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const lvl = dbUser.level || 1;
  const exp = dbUser.experience || 0;
  const nextExp = lvl * 100;
  const progress = Math.min(1, Math.max(0, exp / nextExp));

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0d011a');
  bg.addColorStop(0.5, '#17032d');
  bg.addColorStop(1, '#080010');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = 140;
  const cy = 140;
  const r = 75;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#f72585';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 18;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const url = targetUser.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });
    const img = await loadImage(url);
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#2d0c45';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.shadowColor = '#7209b7';
  ctx.shadowBlur = 10;
  const nameText = targetUser.username.length > 14 ? targetUser.username.slice(0, 13) + '…' : targetUser.username;
  ctx.fillText(nameText, 260, 95);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#c77dff';
  ctx.fillText(`✧ ${dbUser.equippedRole || 'Explorer'}`, 260, 130);

  ctx.textAlign = 'right';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#e0aaff';
  ctx.fillText(`RANK #${currentRank}`, 800, 95);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`LEVEL ${lvl}`, 800, 135);
  ctx.restore();

  const barX = 260;
  const barY = 175;
  const barW = 540;
  const barH = 24;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 12);
  ctx.fill();

  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#7209b7');
  barGrad.addColorStop(0.5, '#f72585');
  barGrad.addColorStop(1, '#4cc9f0');
  ctx.fillStyle = barGrad;
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(24, barW * progress), barH, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${exp.toLocaleString()} / ${nextExp.toLocaleString()} EXP`, 800, 225);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// 4C. ASTRAL LEADERBOARD CARD (900x650 Vertical Board)
async function renderLeaderboardCard(topUsers, client) {
  const w = 900;
  const h = 650;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0c0217');
  bg.addColorStop(0.5, '#17042c');
  bg.addColorStop(1, '#07000e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 15;
  ctx.fillText('✧ ASTRAL SOVEREIGNTY ✧', w / 2, 60);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#c8b6ff';
  ctx.shadowBlur = 0;
  ctx.fillText('TOP WEALTH ARCHONS OF THE REALM', w / 2, 90);
  ctx.restore();

  const startY = 120;
  const rowH = 68;
  const rowW = 800;
  const rowX = (w - rowW) / 2;

  for (let i = 0; i < Math.min(6, topUsers.length); i++) {
    const entry = topUsers[i];
    const y = startY + i * (rowH + 12);
    let userObj = null;

    try {
      userObj = await client.users.fetch(entry.userId);
    } catch {}

    const name = userObj ? userObj.username : `Explorer (${entry.userId.slice(-4)})`;
    const net = (entry.balance || 0) + (entry.bank || 0);

    ctx.save();
    ctx.fillStyle = i === 0 ? 'rgba(247, 37, 133, 0.12)' : 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = i === 0 ? '#f72585' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rowX, y, rowW, rowH, 10);
    ctx.fill();
    ctx.stroke();

    const badgeColors = ['#ffd166', '#e0e1dd', '#cd7f32', '#9d4edd', '#9d4edd', '#9d4edd'];
    ctx.fillStyle = badgeColors[i];
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${i + 1}`, rowX + 40, y + 42);

    if (userObj) {
      const avR = 22;
      const avX = rowX + 95;
      const avY = y + rowH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      try {
        const aImg = await loadImage(userObj.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.drawImage(aImg, avX - avR, avY - avR, avR * 2, avR * 2);
      } catch {}
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(name.slice(0, 16), rowX + 135, y + 42);

    ctx.textAlign = 'right';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#70d6ff';
    ctx.fillText(`${net.toLocaleString()} Crystals`, rowX + rowW - 25, y + 42);
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}

// 4D. CELESTIAL PROFILE CARD (900x520 Stat Sheet)
async function renderProfileCard(targetUser, dbUser, partnerUser) {
  const w = 900;
  const h = 520;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0c0116');
  bg.addColorStop(0.5, '#19032e');
  bg.addColorStop(1, '#06000c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = 160;
  const cy = 180;
  const r = 85;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
  ctx.strokeStyle = '#f72585';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 22;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const aImg = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(aImg, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#2d0c45';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.shadowColor = '#7209b7';
  ctx.shadowBlur = 12;
  ctx.fillText(targetUser.username.slice(0, 14), 280, 130);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#c77dff';
  ctx.fillText(`✧ Title: ${dbUser.equippedRole || 'Default Prism'}`, 280, 170);

  ctx.fillStyle = '#e0aaff';
  ctx.fillText(`Level: ${dbUser.level || 1}  •  Attunement EXP: ${dbUser.experience || 0}`, 280, 205);
  ctx.restore();

  function drawGlassPanel(x, y, pw, ph, title, val1, val2) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f72585';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(title, x + 16, y + 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(val1, x + 16, y + 60);

    ctx.fillStyle = '#c8b6ff';
    ctx.font = '14px sans-serif';
    ctx.fillText(val2, x + 16, y + 85);
    ctx.restore();
  }

  drawGlassPanel(50, 310, 245, 110, '💎 CELESTIAL VAULT', `Wallet: ${(dbUser.balance || 0).toLocaleString()}`, `Bank: ${(dbUser.bank || 0).toLocaleString()}`);

  const partnerName = partnerUser ? partnerUser.username.slice(0, 10) : 'None';
  const ringName = dbUser.marriageRing || 'No Band';
  drawGlassPanel(325, 310, 245, 110, '💖 ROMANTIC NEXUS', `Bond: ${partnerName}`, `Ring: ${ringName}`);

  const pStage = dbUser.plant?.active ? `Stage ${dbUser.plant.stage}/5` : 'Dormant';
  const pStrain = dbUser.plant?.strain ? dbUser.plant.strain.toUpperCase() : 'None';
  drawGlassPanel(600, 310, 250, 110, '🌱 FLORA SANCTUARY', `Strain: ${pStrain}`, `Growth: ${pStage}`);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 460);
  ctx.lineTo(850, 460);
  ctx.stroke();

  ctx.fillStyle = '#c8b6ff';
  ctx.font = 'italic 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦ CrystalBot Soul Slate • Starlight Sanctuary ✦', w / 2, 490);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// 4E. GEODE CONSERVATORY CARD (850x480 Botanics Specimen)
async function renderPlantsCard(targetUser, dbUser) {
  const w = 850;
  const h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#03140f');
  bg.addColorStop(0.5, '#08332c');
  bg.addColorStop(1, '#020a08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Background glow
  const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 350);
  glow.addColorStop(0, 'rgba(42, 157, 143, 0.15)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Floating bioluminescent sparks
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(42, 157, 143, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#2a9d8f';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const pActive = dbUser.plant?.active || false;
  const pStrain = (dbUser.plant?.strain || 'Unplanted').toUpperCase();
  const pStage = dbUser.plant?.stage || 0;
  const hasCocopeat = dbUser.plant?.hasCocopeat || false;

  // Glass Terrarium Dome
  const tx = 220;
  const ty = 240;
  const tr = 130;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tx, ty, tr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glass Highlight Glows
  ctx.beginPath();
  ctx.arc(tx, ty, tr - 3, Math.PI * 1.1, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Soil Bed
  ctx.beginPath();
  ctx.arc(tx, ty + 90, 80, Math.PI, 0, true);
  ctx.fillStyle = hasCocopeat ? '#352208' : '#1e1a12';
  ctx.fill();
  ctx.restore();

  // Plant stage procedural renderer inside terrarium
  if (pActive) {
    ctx.save();
    ctx.translate(tx, ty + 80);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#2a9d8f';

    if (pStage === 1) { // Sprout seed/rock geode
      ctx.fillStyle = '#4f772d';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6, -15, -12, -20);
      ctx.quadraticCurveTo(-15, -24, -20, -22);
      ctx.strokeStyle = '#4f772d';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (pStage === 2) { // Small stem branching
      ctx.strokeStyle = '#31572c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.quadraticCurveTo(5, -20, 0, -45);
      ctx.stroke();
    } else if (pStage === 3) { // Growing foliage
      ctx.strokeStyle = '#132a13';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(10, -30, -5, -65);
      ctx.stroke();
    } else if (pStage === 4) { // Heavy bloom budding
      ctx.strokeStyle = '#023e17';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(-15, -45, 10, -85);
      ctx.stroke();
    } else { // Stage 5: Full geode blossom glowing
      ctx.strokeStyle = '#132a13';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.quadraticCurveTo(0, -45, 10, -95);
      ctx.stroke();

      // Giant flower blossom
      ctx.fillStyle = pStrain.includes('ROSE') ? '#d90429' : pStrain.includes('LOTUS') ? '#70d6ff' : '#e0b1cb';
      ctx.beginPath();
      ctx.arc(10, -95, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Empty message
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NO SPECIMEN ACTIVE', tx, ty);
  }

  // Right Block UI Cards
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px serif';
  ctx.fillText('✧ GEODE CONSERVATORY ✧', 400, 95);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#2a9d8f';
  ctx.fillText('ACTIVE NURSERY RECORD', 400, 130);

  function drawGlassSpec(x, y, w, h, title, val) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(42, 157, 143, 0.2)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8baf9a';
    ctx.font = '13px sans-serif';
    ctx.fillText(title, x + 16, y + 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(val, x + 16, y + 54);
    ctx.restore();
  }

  drawGlassSpec(400, 175, 400, 75, 'SPECIMEN NAME', pActive ? pStrain : 'NOT ACTIVE');
  drawGlassSpec(400, 270, 190, 75, 'GROWTH PROGRESS', pActive ? `Stage ${pStage}/5` : 'N/A');
  drawGlassSpec(610, 270, 190, 75, 'COCOPEAT ENRICHED', hasCocopeat ? 'YES (Active)' : 'NO (None)');

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 390);
  ctx.lineTo(800, 390);
  ctx.stroke();

  ctx.fillStyle = '#8baf9a';
  ctx.font = 'italic 14px sans-serif';
  ctx.fillText('✦ Utilize cry!water or cry!cocopeat daily ✦', 400, 425);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// ==========================================
// 5. MESSAGE CREATE DISPATCHER
// ==========================================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const isVip = VIP_USER_IDS.includes(message.author.id);

  try {
    // ------------------------------------------
    // MODULE: SYSTEM & DIRECTORY
    // ------------------------------------------
    if (command === 'help' || command === 'cmds') {
      const helpEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTALBOT SYSTEM DIRECTORY ✧')
        .setColor('#7209b7')
        .setDescription("Aesthetic crystal economy, celestial romance, interactive duels, and status flexes.")
        .addFields(
          { 
            name: '🪙 Economy & Wardrobe', 
            value: '`balance`, `deposit`, `withdraw`, `daily`, `work`, `beg`, `roleshop`, `buyrole`, `equip`, `ac`' 
          },
          { 
            name: '♟️ Games & Social Deduction', 
            value: '`cf`, `imposter`, `imposterlearn`, `ship`, `chessduel`, `slots`, `rps`, `trivia`' 
          },
          { 
            name: '💖 Romance & Marriage', 
            value: '`propose`, `divorce`, `ringshop`, `buyring`, `lovies`' 
          },
          { 
            name: '🌿 Flora Conservatory', 
            value: '`plants`, `seedshop`, `buyitem`, `inv`, `plant`, `water`, `cocopeat`, `harvest`' 
          },
          { 
            name: '🔮 Visual Identity (Canvas)', 
            value: '`profile`, `rank`, `lb`' 
          }
        )
        .setFooter({ text: `Prefix: ${PREFIX} • Engineered for 256MB High-Performance Containers` });

      return message.reply({ embeds: [helpEmbed] });
    }

    // ------------------------------------------
    // MODULE: IDENTITY (PROFILE, RANK, LB)
    // ------------------------------------------
    if (command === 'profile') {
      const target = message.mentions.users.first() || message.author;
      const dbUser = await getUser(target.id);
      let partnerUser = null;
      if (dbUser.partnerId) {
        partnerUser = await client.users.fetch(dbUser.partnerId).catch(() => null);
      }

      const cardBuffer = await renderProfileCard(target, dbUser, partnerUser);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'crystal_profile.png' });
      return message.reply({ files: [attachment] });
    }

    if (command === 'rank') {
      const target = message.mentions.users.first() || message.author;
      const dbUser = await getUser(target.id);
      const allUsers = await User.find({}).sort({ level: -1, experience: -1 }).lean();
      const rankPos = allUsers.findIndex(u => u.userId === target.id) + 1 || 1;

      const cardBuffer = await renderRankCard(target, dbUser, rankPos);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'crystal_rank.png' });
      return message.reply({ files: [attachment] });
    }

    if (command === 'lb' || command === 'leaderboard') {
      const topUsers = await User.find({}).sort({ balance: -1 }).limit(6).lean();
      if (!topUsers.length) return message.reply("No recorded crystal vaults found.");

      const cardBuffer = await renderLeaderboardCard(topUsers, client);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'crystal_leaderboard.png' });
      return message.reply({ files: [attachment] });
    }

    // ------------------------------------------
    // MODULE: ECONOMY & WARDROBE
    // ------------------------------------------
    if (command === 'bal' || command === 'balance') {
      const target = message.mentions.users.first() || message.author;
      const user = await getUser(target.id);
      return message.reply(`💎 **${target.username}**'s Vault: **${user.balance.toLocaleString()} ${cryCoin}** | Bank: **${user.bank.toLocaleString()} ${cryCoin}**`);
    }

    if (command === 'dep' || command === 'deposit') {
      const user = await getUser(message.author.id);
      const amt = args[0] === 'all' ? user.balance : parseInt(args[0]);
      if (isNaN(amt) || amt <= 0 || user.balance < amt) return message.reply("Specify a valid amount to deposit!");
      user.balance -= amt;
      user.bank += amt;
      await user.save();
      return message.reply(`🏦 Deposited **${amt.toLocaleString()} ${cryCoin}** into your secure bank vault.`);
    }

    if (command === 'with' || command === 'withdraw') {
      const user = await getUser(message.author.id);
      const amt = args[0] === 'all' ? user.bank : parseInt(args[0]);
      if (isNaN(amt) || amt <= 0 || user.bank < amt) return message.reply("Specify a valid amount to withdraw!");
      user.bank -= amt;
      user.balance += amt;
      await user.save();
      return message.reply(`💸 Withdrew **${amt.toLocaleString()} ${cryCoin}** to your liquid wallet.`);
    }

    if (command === 'daily') {
      const user = await getUser(message.author.id);
      const now = new Date();
      if (user.lastDaily) {
        const diff = now.getTime() - new Date(user.lastDaily).getTime();
        if (diff < 86400000 && !isVip) {
          const remain = Math.ceil((86400000 - diff) / 1000);
          return message.reply(`⏳ Daily tribute already claimed! Return in **${formatDuration(remain)}**.`);
        }
      }
      user.lastDaily = now;
      user.balance += 250;
      await user.save();
      return message.reply(`✨ Claimed your daily celestial tribute of **+250 ${cryCoin}**!`);
    }

    if (command === 'work') {
      const user = await getUser(message.author.id);
      if (user.workAttempts >= 5 && !isVip) {
        return message.reply("⏳ You have reached your 5 daily work shifts. Rest for the cosmic reset!");
      }
      user.workAttempts += 1;
      const earnings = Math.floor(Math.random() * 80) + 40;
      user.balance += earnings;
      await user.save();
      return message.reply(`⛏️ Completed crystal mining shift (**${user.workAttempts}/5**)! Earned **+${earnings} ${cryCoin}**.`);
    }

    if (command === 'beg') {
      const user = await getUser(message.author.id);
      if (user.begAttempts >= 10 && !isVip) {
        return message.reply("⏳ You have pleaded too many times today. Await celestial resets!");
      }
      user.begAttempts += 1;
      const reward = Math.floor(Math.random() * 25) + 5;
      user.balance += reward;
      await user.save();
      return message.reply(`🤲 A passing archon tossed you **+${reward} ${cryCoin}**!`);
    }

    // MULTI-PAGE INTERACTIVE ROLE SHOP (Full 31 Roles Paginated)
    if (command === 'roleshop') {
      const itemsPerPage = 8;
      const totalPages = Math.ceil(ROLE_CATALOG.length / itemsPerPage);
      let page = 1;

      const getShopEmbed = (p) => {
        const start = (p - 1) * itemsPerPage;
        const pageItems = ROLE_CATALOG.slice(start, start + itemsPerPage);

        return new EmbedBuilder()
          .setTitle(`✧ CELESTIAL WARDROBE CATALOG (Page ${p}/${totalPages}) ✧`)
          .setColor('#f72585')
          .setDescription(
            pageItems.map(r => `• **${r.name}** (\`cry!buyrole ${r.id}\`)\n  └ Price: **${r.price.toLocaleString()} ${cryCoin}** | *${r.desc}*`).join('\n\n')
          )
          .setFooter({ text: "Equip any unlocked role title anytime using cry!equip <id>" });
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary)
      );

      const sMsg = await message.reply({ embeds: [getShopEmbed(1)], components: [row] });
      const collector = sMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "Open your own shop using cry!roleshop", ephemeral: true });
        if (i.customId === 'shop_prev') page = page > 1 ? page - 1 : totalPages;
        else page = page < totalPages ? page + 1 : 1;
        await i.update({ embeds: [getShopEmbed(page)], components: [row] });
      });

      collector.on('end', () => {
        row.components.forEach(b => b.setDisabled(true));
        sMsg.edit({ components: [row] }).catch(() => {});
      });
      return;
    }

    if (command === 'buyrole') {
      const rId = (args[0] || '').toLowerCase();
      const roleItem = ROLE_CATALOG.find(r => r.id === rId);
      if (!roleItem) return message.reply("⚠️ Role ID not found! View catalog via `cry!roleshop`.");

      const user = await getUser(message.author.id);
      if (user.rolesOwned.includes(roleItem.name) && !isVip) {
        return message.reply(`❌ You already own the **${roleItem.name}** title!`);
      }
      if (user.balance < roleItem.price && !isVip) {
        return message.reply(`❌ You need **${roleItem.price.toLocaleString()} ${cryCoin}** to purchase this role!`);
      }

      if (!isVip) user.balance -= roleItem.price;
      if (!user.rolesOwned.includes(roleItem.name)) user.rolesOwned.push(roleItem.name);
      user.equippedRole = roleItem.name;
      await user.save();

      try {
        const member = await message.guild.members.fetch(message.author.id);
        const guildRole = await message.guild.roles.fetch(roleItem.roleId);
        if (guildRole) await member.roles.add(guildRole);
      } catch (err) {
        console.warn('Role assign notice:', err.message);
      }

      return message.reply(`✨ Successfully unlocked and equipped the **${roleItem.name}** title!`);
    }

    // EQUIP ROLE (Full safe swap + hierarchy warning)
    if (command === 'equip') {
      const rId = (args[0] || '').toLowerCase();
      const roleItem = ROLE_CATALOG.find(r => r.id === rId);
      if (!roleItem) return message.reply("⚠️ Specify a valid role ID: `cry!equip <id>` (e.g. `cry!equip goofy`). Check `cry!roleshop`.");

      const user = await getUser(message.author.id);
      if (!user.rolesOwned.includes(roleItem.name) && !isVip) {
        return message.reply(`❌ You do not own the **${roleItem.name}** title! Unlock it first in \`cry!roleshop\`.`);
      }

      const prevEquipped = user.equippedRole;
      user.equippedRole = roleItem.name;
      await user.save();

      try {
        const member = await message.guild.members.fetch(message.author.id);
        if (prevEquipped && prevEquipped !== roleItem.name) {
          const prevItem = ROLE_CATALOG.find(r => r.name === prevEquipped);
          if (prevItem) {
            const prevRole = await message.guild.roles.fetch(prevItem.roleId).catch(() => null);
            if (prevRole && member.roles.cache.has(prevRole.id)) {
              await member.roles.remove(prevRole).catch(() => {});
            }
          }
        }

        const targetRole = await message.guild.roles.fetch(roleItem.roleId).catch(() => null);
        if (!targetRole) {
          return message.reply(`✨ Equipped **${roleItem.name}** to your profile card! *(Role ID was not found on this server)*`);
        }

        const botMember = await message.guild.members.fetch(client.user.id);
        if (botMember.roles.highest.position <= targetRole.position) {
          return message.reply(`✨ Equipped **${roleItem.name}** to your profile card!\n⚠️ *Discord Warning: Move CrystalBot's role above <@&${targetRole.id}> in Server Settings to grant the server role in chat.*`);
        }

        await member.roles.add(targetRole);
        return message.reply(`✨ Successfully equipped **${roleItem.name}** and applied your server role!`);
      } catch (err) {
        return message.reply(`✨ Equipped **${roleItem.name}** to your profile card!`);
      }
    }

    if (command === 'ac') {
      if (!isVip && !message.member.permissions.has('Administrator')) return;
      const target = message.mentions.users.first();
      const amt = parseInt(args[1]);
      if (!target || isNaN(amt)) return message.reply("Usage: `cry!ac @user <amount>`");
      const user = await getUser(target.id);
      user.balance += amt;
      await user.save();
      return message.reply(`⚖️ Granted **+${amt.toLocaleString()} ${cryCoin}** to <@${target.id}>.`);
    }

    // ------------------------------------------
    // MODULE: ROMANCE & MARRIAGE
    // ------------------------------------------
    if (command === 'ringshop') {
      const ringEmbed = new EmbedBuilder()
        .setTitle('💍 CELESTIAL JEWELRY ATELIER')
        .setColor('#f72585')
        .setDescription(RING_CATALOG.map(r => `• **${r.name}** (\`cry!buyring ${r.id}\`)\n  └ Price: **${r.price.toLocaleString()} ${cryCoin}** | *${r.desc}*`).join('\n\n'))
        .setFooter({ text: "Use cry!propose @user to offer your equipped ring in marriage." });
      return message.reply({ embeds: [ringEmbed] });
    }

    if (command === 'buyring') {
      const rId = (args[0] || '').toLowerCase();
      const ring = RING_CATALOG.find(r => r.id === rId);
      if (!ring) return message.reply("Specify a valid ring ID from `cry!ringshop`.");

      const user = await getUser(message.author.id);
      if (user.balance < ring.price && !isVip) return message.reply("Insufficient crystals for this ring!");

      if (!isVip) user.balance -= ring.price;
      user.marriageRing = ring.name;
      await user.save();
      return message.reply(`💍 Acquired the **${ring.name}**! Propose to your partner with \`cry!propose @user\`.`);
    }

    if (command === 'propose') {
      const target = message.mentions.users.first();
      if (!target || target.id === message.author.id) return message.reply("Tag someone to propose to!");

      const user = await getUser(message.author.id);
      const targetUser = await getUser(target.id);

      if (user.partnerId) return message.reply("You are already bound in marriage!");
      if (targetUser.partnerId) return message.reply("They are already married to another soul!");
      if (!user.marriageRing) return message.reply("You need a ring from `cry!ringshop` to propose!");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_marry').setLabel('Accept Proposal').setStyle(ButtonStyle.Success).setEmoji('💖'),
        new ButtonBuilder().setCustomId('decline_marry').setLabel('Decline').setStyle(ButtonStyle.Danger)
      );

      const propMsg = await message.channel.send({
        content: `💍 <@${target.id}>, **${message.author.username}** has offered the **${user.marriageRing}** in marriage!`,
        components: [row]
      });

      const collector = propMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
      collector.on('collect', async i => {
        if (i.user.id !== target.id) return i.reply({ content: "Only the proposed partner may answer!", ephemeral: true });

        if (i.customId === 'accept_marry') {
          user.partnerId = target.id;
          targetUser.partnerId = message.author.id;
          targetUser.marriageRing = user.marriageRing;
          await user.save();
          await targetUser.save();
          await i.update({ content: `🎉 **A CELESTIAL UNION!** <@${message.author.id}> and <@${target.id}> are now bonded in marriage! 💍✨`, components: [] });
        } else {
          await i.update({ content: `💔 The proposal was gently declined.`, components: [] });
        }
      });
      return;
    }

    if (command === 'divorce') {
      const user = await getUser(message.author.id);
      if (!user.partnerId) return message.reply("You are not married!");

      const partner = await getUser(user.partnerId);
      const oldPartnerId = user.partnerId;

      user.partnerId = null;
      user.marriageRing = null;
      if (partner) {
        partner.partnerId = null;
        partner.marriageRing = null;
        await partner.save();
      }
      await user.save();
      return message.reply(`💔 The celestial bond between you and <@${oldPartnerId}> has been severed.`);
    }

    if (command === 'lovies') {
      const user = await getUser(message.author.id);
      if (!user.partnerId) return message.reply("You must be married to cultivate lovies!");

      const cd = checkCooldown(`lovies_${message.author.id}`, 43200000);
      if (cd > 0 && !isVip) return message.reply(`⏳ You can embrace your partner again in **${formatDuration(cd)}**.`);

      user.lovies += 10;
      await user.save();
      return message.reply(`💖 Embraced <@${user.partnerId}>! You gained **+10 Lovies** (Total: **${user.lovies}**)!`);
    }

    // ------------------------------------------
    // MODULE: FLORA CONSERVATORY
    // ------------------------------------------
    if (command === 'plants') {
      const target = message.mentions.users.first() || message.author;
      const dbUser = await getUser(target.id);

      const cardBuffer = await renderPlantsCard(target, dbUser);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'crystal_plants.png' });
      return message.reply({ files: [attachment] });
    }

    if (command === 'seedshop') {
      const embed = new EmbedBuilder()
        .setTitle('🌿 CELESTIAL BOTANICAL SEEDSHOP')
        .setColor('#2a9d8f')
        .setDescription(
          "• **Moonflower Seed** (`moonflower`) — **500 Crystals**\n" +
          "• **Starlight Lotus Seed** (`lotus`) — **1,200 Crystals**\n" +
          "• **Cosmic Rose Seed** (`rose`) — **2,500 Crystals**\n\n" +
          "• **Cocopeat Soil Enricher** (`cocopeat`) — **300 Crystals** (Boosts growth level)"
        )
        .setFooter({ text: "Purchase seeds or soil using cry!buyitem <id>" });
      return message.reply({ embeds: [embed] });
    }

    if (command === 'buyitem') {
      const itemId = (args[0] || '').toLowerCase();
      const shopItems = {
        moonflower: 500,
        lotus: 1200,
        rose: 2500,
        cocopeat: 300
      };

      if (!shopItems[itemId]) return message.reply("Specify a valid item ID from `cry!seedshop`.");
      const user = await getUser(message.author.id);
      const cost = shopItems[itemId];
      if (user.balance < cost && !isVip) return message.reply("Insufficient crystals for this item!");

      if (!isVip) user.balance -= cost;
      const cur = user.inventory.get(itemId) || 0;
      user.inventory.set(itemId, cur + 1);
      await user.save();
      return message.reply(`🌱 Purchased **1x ${itemId}**! View inventory via \`cry!inv\`.`);
    }

    if (command === 'inv' || command === 'inventory') {
      const user = await getUser(message.author.id);
      const entries = Array.from(user.inventory.entries()).filter(([_, count]) => count > 0);
      const list = entries.map(([id, count]) => `• **${id.toUpperCase()}**: ${count}`).join('\n') || '*Inventory empty*';

      const embed = new EmbedBuilder()
        .setTitle(`🎒 ${message.author.username}'s Botanical Inventory`)
        .setColor('#2a9d8f')
        .setDescription(list);
      return message.reply({ embeds: [embed] });
    }

    if (command === 'plant') {
      const strain = (args[0] || '').toLowerCase();
      const validStrains = ['moonflower', 'lotus', 'rose'];
      if (!validStrains.includes(strain)) return message.reply("Specify a valid seed to plant: `moonflower`, `lotus`, or `rose`.");

      const user = await getUser(message.author.id);
      if (user.plant?.active) return message.reply("You already have an active botanical specimen growing! Check `cry!plants`.");

      const owned = user.inventory.get(strain) || 0;
      if (owned <= 0 && !isVip) return message.reply(`You do not have any **${strain}** seeds! Buy one via \`cry!seedshop\`.`);

      if (!isVip) user.inventory.set(strain, owned - 1);
      user.plant = {
        active: true,
        strain: strain,
        stage: 1,
        lastWatered: new Date(),
        hasCocopeat: false,
        plantedAt: new Date()
      };
      await user.save();
      return message.reply(`🌱 Planted your **${strain.toUpperCase()}** seed in the conservatory! Water it daily with \`cry!water\`.`);
    }

    if (command === 'water') {
      const user = await getUser(message.author.id);
      if (!user.plant?.active) return message.reply("No active flora growing! Plant a seed first.");

      const now = new Date();
      if (user.plant.lastWatered) {
        const diff = now.getTime() - new Date(user.plant.lastWatered).getTime();
        if (diff < 43200000 && !isVip) {
          return message.reply(`💧 Your flora is already hydrated! Water again in **${formatDuration(Math.ceil((43200000 - diff) / 1000))}**.`);
        }
      }

      user.plant.lastWatered = now;
      if (user.plant.stage < 5) user.plant.stage += 1;
      await user.save();
      return message.reply(`💧 Watered your **${user.plant.strain}**! Current Growth: **Stage ${user.plant.stage}/5**.`);
    }

    if (command === 'cocopeat') {
      const user = await getUser(message.author.id);
      if (!user.plant?.active) return message.reply("No active flora growing!");
      if (user.plant.hasCocopeat) return message.reply("This specimen already has cocopeat enrichment active!");

      const owned = user.inventory.get('cocopeat') || 0;
      if (owned <= 0 && !isVip) return message.reply("You do not own any cocopeat! Purchase it via `cry!seedshop`.");

      if (!isVip) user.inventory.set('cocopeat', owned - 1);
      user.plant.hasCocopeat = true;
      if (user.plant.stage < 5) user.plant.stage += 1;
      await user.save();
      return message.reply(`🌿 Applied cocopeat! Your flora absorbed rich nutrients (Advanced to **Stage ${user.plant.stage}/5**)!`);
    }

    if (command === 'harvest') {
      const user = await getUser(message.author.id);
      if (!user.plant?.active) return message.reply("No active flora to harvest!");
      if (user.plant.stage < 5) return message.reply(`Your plant is still growing (**Stage ${user.plant.stage}/5**). Wait until Stage 5!`);

      const yields = { moonflower: 1500, lotus: 3500, rose: 7000 };
      const payout = yields[user.plant.strain] || 1000;
      const strainName = user.plant.strain;

      user.balance += payout;
      user.plant = { active: false, strain: null, stage: 0, lastWatered: null, hasCocopeat: false, plantedAt: null };
      await user.save();
      return message.reply(`🌸 **HARVEST COMPLETE!** You harvested your fully bloomed **${strainName.toUpperCase()}** and earned **+${payout.toLocaleString()} ${cryCoin}**!`);
    }

        // ------------------------------------------
    // MODULE: GAMES & GAMBLING
    // ------------------------------------------

    // COIN FLIP (Neatly situated under Gambling)
    if (command === 'cf' || command === 'coinflip') {
      const choice = (args[0] || '').toLowerCase();
      const bet = parseInt(args[1]);

      if (!['heads', 'tails', 'h', 't'].includes(choice) || isNaN(bet) || bet <= 0) {
        return message.reply("Usage: `cry!cf <heads/tails> <amount>` (e.g. `cry!cf heads 100`)");
      }

      const user = await getUser(message.author.id);
      if (user.balance < bet) return message.reply(`❌ You only possess **${user.balance.toLocaleString()} ${cryCoin}**!`);

      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      const playerPick = choice.startsWith('h') ? 'heads' : 'tails';

      if (playerPick === outcome) {
        user.balance += bet;
        await user.save();
        return message.reply(`🪙 The coin landed on **${outcome.toUpperCase()}**! You won **+${bet.toLocaleString()} ${cryCoin}**!`);
      } else {
        user.balance -= bet;
        await user.save();
        return message.reply(`🪙 The coin landed on **${outcome.toUpperCase()}**! You lost **-${bet.toLocaleString()} ${cryCoin}**!`);
      }
    }

    // SLOTS MACHINE
    if (command === 'slots') {
      const bet = parseInt(args[0]);
      if (isNaN(bet) || bet <= 0) return message.reply("Usage: `cry!slots <bet>`");
      const user = await getUser(message.author.id);
      if (user.balance < bet) return message.reply("❌ Insufficient crystals for this spin!");

      const icons = ['💎', '🌸', '⭐', '🪐', '🔮'];
      const r1 = icons[Math.floor(Math.random() * icons.length)];
      const r2 = icons[Math.floor(Math.random() * icons.length)];
      const r3 = icons[Math.floor(Math.random() * icons.length)];

      if (r1 === r2 && r2 === r3) {
        const prize = bet * 4;
        user.balance += prize;
        await user.save();
        return message.reply(`🎰 [ ${r1} | ${r2} | ${r3} ]\n✨ **JACKPOT!** You won **+${prize.toLocaleString()} ${cryCoin}**!`);
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        const prize = Math.floor(bet * 1.5);
        user.balance += prize;
        await user.save();
        return message.reply(`🎰 [ ${r1} | ${r2} | ${r3} ]\n🌟 Two matched! You won **+${prize.toLocaleString()} ${cryCoin}**!`);
      } else {
        user.balance -= bet;
        await user.save();
        return message.reply(`🎰 [ ${r1} | ${r2} | ${r3} ]\n💀 No matches. You lost **-${bet.toLocaleString()} ${cryCoin}**.`);
      }
    }

    // ROCK PAPER SCISSORS
    if (command === 'rps') {
      const pick = (args[0] || '').toLowerCase();
      const valid = ['rock', 'paper', 'scissors', 'r', 'p', 's'];
      if (!valid.includes(pick)) return message.reply("Usage: `cry!rps <rock/paper/scissors>`");

      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      let pChoice = pick.startsWith('r') ? 'rock' : pick.startsWith('p') ? 'paper' : 'scissors';

      if (pChoice === botChoice) {
        return message.reply(`🤝 Both cast **${botChoice.toUpperCase()}**! It's a draw.`);
      }

      const winCondition = (pChoice === 'rock' && botChoice === 'scissors') ||
                            (pChoice === 'paper' && botChoice === 'rock') ||
                            (pChoice === 'scissors' && botChoice === 'paper');

      const user = await getUser(message.author.id);
      if (winCondition) {
        user.balance += 50;
        await user.save();
        return message.reply(`🎉 You threw **${pChoice.toUpperCase()}**, bot threw **${botChoice.toUpperCase()}**! You won **+50 ${cryCoin}**!`);
      } else {
        return message.reply(`💀 You threw **${pChoice.toUpperCase()}**, bot threw **${botChoice.toUpperCase()}**! Better luck next round!`);
      }
    }

    // ASTRAL TRIVIA
    if (command === 'trivia') {
      const questions = [
        { q: "What is the hardest mineral known to science?", a: "diamond" },
        { q: "Which celestial body is known as the Red Planet?", a: "mars" },
        { q: "What element does 'Au' represent on the periodic table?", a: "gold" },
        { q: "What is the largest moon of Saturn?", a: "titan" },
        { q: "Which gem is formed entirely from crystallized carbon?", a: "diamond" }
      ];
      const item = questions[Math.floor(Math.random() * questions.length)];
      await message.reply(`❓ **ASTRAL TRIVIA:** ${item.q}\n*(Respond with the answer in chat within 15 seconds!)*`);

      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

      collector.on('collect', async m => {
        if (m.content.toLowerCase().trim() === item.a) {
          const user = await getUser(message.author.id);
          user.balance += 75;
          await user.save();
          return message.channel.send(`✨ Correct! You earned **+75 ${cryCoin}**!`);
        } else {
          return message.channel.send(`❌ Incorrect! The correct answer was **${item.a}**.`);
        }
      });
      return;
    }

    // STANDALONE HD CELESTIAL SHIP COMMAND
    if (command === 'ship') {
      const mentions = message.mentions.users;
      let user1, user2;

      if (mentions.size >= 2) {
        const iter = mentions.values();
        user1 = iter.next().value;
        user2 = iter.next().value;
      } else if (mentions.size === 1) {
        user1 = message.author;
        user2 = mentions.first();
      } else {
        return message.reply("⚠️ Specify who to ship!\n• Ship yourself: `cry!ship @user`\n• Ship two members: `cry!ship @user1 @user2`");
      }

      if (user1.id === user2.id) {
        return message.reply("Self-resonance detected: You cannot ship someone with themselves!");
      }

      if (!isVip) {
        const cd = checkCooldown(`ship_${message.author.id}`, 180000);
        if (cd > 0) return message.reply(`⏳ Astral resonance cooling down. Wait **${cd}s**.`);
      }

      const resonance = Math.floor(Math.random() * 101);
      const cardBuffer = await renderShipCard(user1, user2, resonance);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'celestial_ship.png' });
      return message.reply({ files: [attachment] });
    }

    // ------------------------------------------
    // MODULE: INTERACTIVE CHESS DUEL ENGINE
    // ------------------------------------------
    if (command === 'chessduel' || command === 'chess') {
      const opponent = message.mentions.users.first();
      const wager = parseInt(args[1]) || 0;

      if (!opponent || opponent.id === message.author.id || opponent.bot) {
        return message.reply("Usage: `cry!chessduel @opponent [wager]`");
      }

      const challenger = await getUser(message.author.id);
      const rival = await getUser(opponent.id);

      if (wager > 0) {
        if (challenger.balance < wager) return message.reply(`❌ You do not have **${wager.toLocaleString()} ${cryCoin}**!`);
        if (rival.balance < wager) return message.reply(`❌ <@${opponent.id}> does not have **${wager.toLocaleString()} ${cryCoin}**!`);
      }

      if (activeGames.has(message.channel.id)) {
        return message.reply("⚠️ A game duel is already ongoing in this channel!");
      }

      const cRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('chess_accept').setLabel('Accept Duel').setStyle(ButtonStyle.Success).setEmoji('♟️'),
        new ButtonBuilder().setCustomId('chess_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
      );

      const challengeMsg = await message.channel.send({
        content: `⚔️ <@${opponent.id}>, **${message.author.username}** has challenged you to an Astral Chess Duel!${wager > 0 ? ` (Wager: **${wager.toLocaleString()}${cryCoin}**)` : ''}`,
        components: [cRow]
      });

      const acceptCollector = challengeMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      acceptCollector.on('collect', async i => {
        if (i.user.id !== opponent.id) return i.reply({ content: "Only the challenged player may respond!", ephemeral: true });

        if (i.customId === 'chess_decline') {
          acceptCollector.stop('declined');
          return i.update({ content: `🛡️ Duel declined by <@${opponent.id}>.`, components: [] });
        }

        acceptCollector.stop('accepted');
        activeGames.set(message.channel.id, true);

        // Deduct wagers if present
        if (wager > 0) {
          challenger.balance -= wager;
          rival.balance -= wager;
          await challenger.save();
          await rival.save();
        }

        // Initialize 8x8 Board
        let board = [
          ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
          ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
          ['·', '·', '·', '·', '·', '·', '·', '·'],
          ['·', '·', '·', '·', '·', '·', '·', '·'],
          ['·', '·', '·', '·', '·', '·', '·', '·'],
          ['·', '·', '·', '·', '·', '·', '·', '·'],
          ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
          ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];

        let turn = message.author.id; // White moves first (Challenger)
        let whiteId = message.author.id;
        let blackId = opponent.id;

        function printBoard() {
          const files = '   a  b  c  d  e  f  g  h';
          let out = '```\n' + files + '\n';
          for (let r = 0; r < 8; r++) {
            out += `${8 - r}  ${board[r].join('  ')}  ${8 - r}\n`;
          }
          out += files + '\n```';
          return out;
        }

        function parseSquare(sq) {
          if (!/^[a-h][1-8]$/i.test(sq)) return null;
          const col = sq.toLowerCase().charCodeAt(0) - 97;
          const row = 8 - parseInt(sq[1]);
          return { row, col };
        }

        const matchMsg = await message.channel.send({
          content: `♟️ **MATCH STARTED!**\n⚪ White: <@${whiteId}>\n⚫ Black: <@${blackId}>\n\n${printBoard()}\n**Turn:** <@${turn}> (Type move like \`e2 e4\` or type \`resign\` to forfeit)`
        });

        const gameFilter = m => [whiteId, blackId].includes(m.author.id);
        const gameCollector = message.channel.createMessageCollector({ filter: gameFilter, time: 600000 });

        gameCollector.on('collect', async m => {
          if (m.author.id !== turn) return;

          const content = m.content.trim().toLowerCase();

          // Resign check
          if (content === 'resign' || content === 'forfeit') {
            const winnerId = turn === whiteId ? blackId : whiteId;
            const loserId = turn;
            gameCollector.stop('resigned');
            activeGames.delete(message.channel.id);

            if (wager > 0) {
              const pot = wager * 2;
              const winnerUser = await getUser(winnerId);
              winnerUser.balance += pot;
              await winnerUser.save();
              return message.channel.send(`🏳️ <@${loserId}> resigned! <@${winnerId}> wins the duel and the **${pot.toLocaleString()} ${cryCoin}** prize pool!`);
            }
            return message.channel.send(`🏳️ <@${loserId}> resigned! <@${winnerId}> wins the duel!`);
          }

          const parts = content.split(/\s+/);
          if (parts.length !== 2) return;

          const from = parseSquare(parts[0]);
          const to = parseSquare(parts[1]);

          if (!from || !to) return;
          const piece = board[from.row][from.col];

          if (piece === '·') {
            return message.channel.send("⚠️ No piece on that starting square!");
          }

          // Execute board move
          const captured = board[to.row][to.col];
          board[to.row][to.col] = piece;
          board[from.row][from.col] = '·';

          // King capture detection
          if (captured === '♚' || captured === '♔') {
            gameCollector.stop('checkmate');
            activeGames.delete(message.channel.id);

            const winnerId = turn;
            if (wager > 0) {
              const pot = wager * 2;
              const winnerUser = await getUser(winnerId);
              winnerUser.balance += pot;
              await winnerUser.save();
              return message.channel.send(`👑 **ROYAL DESTRUCTION!** <@${winnerId}> captured the sovereign King and won **+${pot.toLocaleString()} ${cryCoin}**!\n\n${printBoard()}`);
            }
            return message.channel.send(`👑 **ROYAL DESTRUCTION!** <@${winnerId}> captured the King and won the match!\n\n${printBoard()}`);
          }

          // Switch turns
          turn = turn === whiteId ? blackId : whiteId;
          const turnColor = turn === whiteId ? '⚪ White' : '⚫ Black';

          await message.channel.send({
            content: `♟️ Move: **${parts[0]}** ➔ **${parts[1]}**\n\n${printBoard()}\n**Turn:** ${turnColor} (<@${turn}>) (e.g. \`e7 e5\` or \`resign\`)`
          });
        });

        gameCollector.on('end', (collected, reason) => {
          activeGames.delete(message.channel.id);
          if (reason === 'time') {
            message.channel.send("⏳ Chess duel timed out due to inactivity!");
          }
        });
      });

      acceptCollector.on('end', (c, reason) => {
        if (reason === 'time') {
          challengeMsg.edit({ content: "⏳ Chess duel challenge expired.", components: [] }).catch(() => {});
        }
      });
      return;
    }

    // ------------------------------------------
    // MODULE: MANSION IMPOSTER SOCIAL DEDUCTION
    // ------------------------------------------
    if (command === 'imposterlearn') {
      let page = 1;
      const getLearnEmbed = (p) => {
        const embed = new EmbedBuilder().setColor('#2d0c45');
        if (p === 1) {
          embed.setTitle('✧ MANSION IMPOSTER: GAMEPLAY & PHASES (1/3) ✧')
            .setDescription(
              "**Objective:** Innocents must uncover and banish the Phantom before the mansion falls to darkness.\n\n" +
              "**1. Expedition Lobby:** Join with `cry!imposter`. Needs $\\ge 3$ explorers.\n\n" +
              "**2. Night Phase (30s):** Special roles receive private DM action buttons.\n\n" +
              "**3. Morning Dawn & Roll Call:** Casualties and shields are revealed alongside survivors.\n\n" +
              "**4. Council & Banishment:** 60s discussion followed by 25s secret voting."
            );
        } else if (p === 2) {
          embed.setTitle('✧ MANSION IMPOSTER: SECRET ROLES (2/3) ✧')
            .setDescription(
              "🗡️ **The Phantom (Imposter):** Secretly picks a victim to strike each night via DMs.\n\n" +
              "🔮 **The Oracle (Detective):** Inspects one guest each night to detect pure or dark resonance.\n\n" +
              "🛡️ **The Guardian (Doctor):** Shields one guest per night. Cannot protect the same person on consecutive nights.\n\n" +
              "🕯️ **The Explorer (Innocent):** Uses logic to piece clues together and votes out suspects."
            );
        } else {
          embed.setTitle('✧ MANSION IMPOSTER: REWARDS & RULES (3/3) ✧')
            .setDescription(
              "**🏆 Victory Conditions & Rewards:**\n" +
              "• **Innocents Win:** Banishing the Phantom grants surviving innocents **+200 crystals** each!\n" +
              "• **Phantom Wins:** Parity with survivors grants the Phantom **+500 crystals**!\n\n" +
              "**⚠️ Note:** Ensure direct messages are open to receive your action buttons."
            );
        }
        embed.setFooter({ text: `Page ${p} of 3 • Use buttons below to navigate` });
        return embed;
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('imp_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('imp_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary)
      );

      const lMsg = await message.reply({ embeds: [getLearnEmbed(1)], components: [row] });
      const collector = lMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "Open your own guide via cry!imposterlearn", ephemeral: true });
        if (i.customId === 'imp_prev') page = page > 1 ? page - 1 : 3;
        else page = page < 3 ? page + 1 : 1;
        await i.update({ embeds: [getLearnEmbed(page)], components: [row] });
      });

      collector.on('end', () => {
        row.components.forEach(b => b.setDisabled(true));
        lMsg.edit({ components: [row] }).catch(() => {});
      });
      return;
    }

    if (command === 'imposter') {
      const cd = checkCooldown('imposter_global', 600000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Mansion corridors sealed! Cooldown: **${formatDuration(cd)}**.`);
      if (activeGames.has(message.channel.id)) return message.reply("⚠️ An expedition is already underway in this channel!");

      const lobbyEmbed = new EmbedBuilder()
        .setTitle('🏰 MANSION IMPOSTER — EXPEDITION REGISTRATION')
        .setColor('#2d0c45')
        .setDescription("A malevolent presence stalks the crystal corridors.\nRequires **at least 3 players**.\n\nClick **Join Expedition** below!")
        .setFooter({ text: "Registration closes in 25 seconds." });

      const joinBtn = new ButtonBuilder().setCustomId('join_imposter').setLabel('Join Expedition').setStyle(ButtonStyle.Primary).setEmoji('🚪');
      const row = new ActionRowBuilder().addComponents(joinBtn);

      const lobbyMsg = await message.channel.send({ embeds: [lobbyEmbed], components: [row] });
      const players = new Set([message.author.id]);

      const lobbyCollector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });

      lobbyCollector.on('collect', async i => {
        if (players.has(i.user.id)) return i.reply({ content: "Already registered!", ephemeral: true });
        players.add(i.user.id);
        await i.reply({ content: `✅ Registered! (${players.size} players in lobby)`, ephemeral: true });
      });

      lobbyCollector.on('end', async () => {
        row.components[0].setDisabled(true);
        await lobbyMsg.edit({ components: [row] });

        if (players.size < 3) {
          return message.channel.send("❌ Minimum 3 explorers required to venture into the mansion.");
        }

        activeGames.set(message.channel.id, true);
        const playerArray = Array.from(players);
        const roles = new Map();
        let living = [...playerArray];
        let dead = [];
        let lastProtected = null;
        let dayCount = 1;

        const shuffled = [...playerArray].sort(() => Math.random() - 0.5);
        const phantomId = shuffled[0];
        roles.set(phantomId, 'Phantom');

        let oracleId = null;
        let guardianId = null;

        if (shuffled.length <= 4) {
          if (Math.random() < 0.5) {
            oracleId = shuffled[1];
            roles.set(oracleId, 'Oracle');
          } else {
            guardianId = shuffled[1];
            roles.set(guardianId, 'Guardian');
          }
        } else {
          oracleId = shuffled[1];
          guardianId = shuffled[2];
          roles.set(oracleId, 'Oracle');
          roles.set(guardianId, 'Guardian');
        }

        for (const pid of playerArray) {
          if (!roles.has(pid)) roles.set(pid, 'Explorer');
        }

        for (const pid of playerArray) {
          try {
            const member = await message.guild.members.fetch(pid);
            const role = roles.get(pid);
            if (role === 'Phantom') await member.send("🗡️ **YOU ARE THE PHANTOM.** Eliminate explorers secretly each night.");
            else if (role === 'Oracle') await member.send("🔮 **YOU ARE THE ORACLE.** Inspect one guest's aura each night.");
            else if (role === 'Guardian') await member.send("🛡️ **YOU ARE THE GUARDIAN.** Protect one guest from death each night.");
            else await member.send("🕯️ **YOU ARE AN EXPLORER.** Survive and vote out the Phantom!");
          } catch {}
        }

        message.channel.send(`🕯️ **The heavy gates lock shut! Roles have been dispatched to DMs.** (${playerArray.length} explorers entered)`);

        const renderRollCall = (day) => {
          const aliveLines = living.map(id => `• <@${id}>`).join('\n') || '*None*';
          const deadLines = dead.map(d => `• ~~<@${d.id}>~~ *(${d.reason})*`).join('\n') || '*None yet*';

          return new EmbedBuilder()
            .setTitle(`✧ MANSION STATUS • DAY ${day} ✧`)
            .setColor('#1a0826')
            .addFields(
              { name: `🕯️ Survivors Standing (${living.length})`, value: aliveLines, inline: true },
              { name: `💀 Fallen Guests (${dead.length})`, value: deadLines, inline: true }
            );
        };

        async function runRound() {
          if (!living.includes(phantomId)) {
            message.channel.send("🎉 **JUSTICE RESTORED!** The Phantom has been banished!\n**INNOCENTS WIN!**");
            for (const sid of living) {
              const survivor = await getUser(sid);
              survivor.balance += 200;
              await survivor.save();
            }
            message.channel.send(`💎 All surviving innocents received **+200 ${cryCoin}**!`);
            activeGames.delete(message.channel.id);
            return;
          }

          if (living.length <= 2) {
            message.channel.send("💀 **THE MANSION HAS FALLEN!** The Phantom overwhelmed the survivors!\n**PHANTOM WINS!**");
            const killer = await getUser(phantomId);
            killer.balance += 500;
            await killer.save();
            message.channel.send(`👑 <@${phantomId}> was the Phantom and claimed **+500 ${cryCoin}**!`);
            activeGames.delete(message.channel.id);
            return;
          }

          message.channel.send(`🌑 **NIGHT ${dayCount}: Darkness descends...** Special roles check DMs! (30 seconds)`);

          let targetKillId = null;
          let targetProtectId = null;

          try {
            const pMember = await message.guild.members.fetch(phantomId);
            const killButtons = living.filter(id => id !== phantomId).map(id => {
              const mem = message.guild.members.cache.get(id);
              return new ButtonBuilder().setCustomId(`kill_${id}`).setLabel(mem ? mem.displayName.slice(0, 20) : 'Explorer').setStyle(ButtonStyle.Danger);
            });
            const kRow = new ActionRowBuilder().addComponents(killButtons.slice(0, 5));
            const kMsg = await pMember.send({ content: "🗡️ **Choose your strike target:**", components: [kRow] });
            const kCollector = kMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
            kCollector.on('collect', async ki => {
              targetKillId = ki.customId.replace('kill_', '');
              await ki.reply({ content: `Target chosen: <@${targetKillId}>`, ephemeral: true });
              kCollector.stop();
            });
          } catch {}

          if (guardianId && living.includes(guardianId)) {
            try {
              const gMember = await message.guild.members.fetch(guardianId);
              const protectButtons = living.filter(id => id !== lastProtected).map(id => {
                const mem = message.guild.members.cache.get(id);
                return new ButtonBuilder().setCustomId(`ward_${id}`).setLabel(mem ? mem.displayName.slice(0, 20) : 'Guest').setStyle(ButtonStyle.Primary);
              });
              const gRow = new ActionRowBuilder().addComponents(protectButtons.slice(0, 5));
              const gMsg = await gMember.send({ content: "🛡️ **Choose someone to shield:**", components: [gRow] });
              const gCollector = gMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
              gCollector.on('collect', async gi => {
                targetProtectId = gi.customId.replace('ward_', '');
                lastProtected = targetProtectId;
                await gi.reply({ content: `Shield raised on <@${targetProtectId}>`, ephemeral: true });
                gCollector.stop();
              });
            } catch {}
          }

          if (oracleId && living.includes(oracleId)) {
            try {
              const oMember = await message.guild.members.fetch(oracleId);
              const inspectButtons = living.filter(id => id !== oracleId).map(id => {
                const mem = message.guild.members.cache.get(id);
                return new ButtonBuilder().setCustomId(`inspect_${id}`).setLabel(mem ? mem.displayName.slice(0, 20) : 'Guest').setStyle(ButtonStyle.Secondary);
              });
              const oRow = new ActionRowBuilder().addComponents(inspectButtons.slice(0, 5));
              const oMsg = await oMember.send({ content: "🔮 **Choose a guest to inspect:**", components: [oRow] });
              const oCollector = oMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
              oCollector.on('collect', async oi => {
                const inspectTarget = oi.customId.replace('inspect_', '');
                await oi.reply({
                  content: inspectTarget === phantomId ? "🔮 **Dark resonance detected! They are the Phantom!**" : "✨ **Pure starlight aura. They are innocent.**",
                  ephemeral: true
                });
                oCollector.stop();
              });
            } catch {}
          }

          setTimeout(async () => {
            let morningText = "";

            if (targetKillId && targetKillId === targetProtectId) {
              morningText = "🛡️ **A clash in the shadows!** The Guardian's ward blocked the strike! **Nobody died!**";
            } else if (targetKillId) {
              living = living.filter(id => id !== targetKillId);
              dead.push({ id: targetKillId, reason: `Eliminated Night ${dayCount}` });
              morningText = `🚨 **A SCREAM IN THE DARK!** <@${targetKillId}> was eliminated!`;
            } else {
              morningText = "🕊️ An eerie silence. Nobody was harmed.";
            }

            message.channel.send(`🌅 **MORNING BREAKS (DAY ${dayCount})**\n${morningText}`);
            message.channel.send({ embeds: [renderRollCall(dayCount)] });

            if (living.length <= 2 || !living.includes(phantomId)) {
              return runRound();
            }

            message.channel.send("🗣️ **Emergency Council!** You have **60 seconds** to debate before voting begins!");

            setTimeout(async () => {
              const voteButtons = living.map(pid => {
                const mem = message.guild.members.cache.get(pid);
                return new ButtonBuilder()
                  .setCustomId(`vote_${pid}`)
                  .setLabel(mem ? mem.displayName.slice(0, 20) : 'Explorer')
                  .setStyle(ButtonStyle.Danger);
              });

              const vRow = new ActionRowBuilder().addComponents(voteButtons.slice(0, 5));
              const voteMsg = await message.channel.send({
                content: "⚖️ **Debate closed! Cast your vote for banishment:**",
                components: [vRow]
              });

              const votes = new Map();
              const vCollector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });

              vCollector.on('collect', async vi => {
                if (!living.includes(vi.user.id)) return vi.reply({ content: "Dead guests cannot vote.", ephemeral: true });
                votes.set(vi.user.id, vi.customId.replace('vote_', ''));
                await vi.reply({ content: "Vote cast.", ephemeral: true });
              });

              vCollector.on('end', async () => {
                vRow.components.forEach(b => b.setDisabled(true));
                await voteMsg.edit({ components: [vRow] });

                const voteTally = {};
                for (const [, targetId] of votes) voteTally[targetId] = (voteTally[targetId] || 0) + 1;

                let exiledId = null;
                let highest = 0;
                for (const [tId, cnt] of Object.entries(voteTally)) {
                  if (cnt > highest) {
                    highest = cnt;
                    exiledId = tId;
                  }
                }

                if (!exiledId || highest <= 1) {
                  message.channel.send("⚖️ Council votes were divided. No one was banished!");
                } else {
                  living = living.filter(id => id !== exiledId);
                  const exiledRole = roles.get(exiledId);
                  dead.push({ id: exiledId, reason: `Banished Day ${dayCount} (${exiledRole})` });
                  message.channel.send(`🪟 <@${exiledId}> was banished! Their role was: **${exiledRole.toUpperCase()}**!`);
                }

                dayCount++;
                setTimeout(() => runRound(), 5000);
              });
            }, 60000);
          }, 30000);
        }

        runRound();
      });
      return;
    }

  } catch (error) {
    console.error('Command Execution Error:', error);
    message.reply("⚠️ An astral disruption occurred while executing this command.");
  }
});

// ==========================================
// 6. DATABASE CONNECT & BOT LOGIN
// ==========================================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('🔮 Connected to MongoDB (crystalusers collection)'))
  .catch(err => console.error('MongoDB Connection Error:', err));

client.login(process.env.TOKEN);
