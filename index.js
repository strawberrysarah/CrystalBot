import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
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
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember]
});

const PREFIX_REGEX = /^cry!\s*/i;
const cryCoin = '<:emoji_51:1531598791063638036>';
const VIP_USER_ID = '1471141307400454245';

const WELCOME_CHANNEL_ID = '1531265642928541786';
const GOODBYE_CHANNEL_ID = '1558487271630708756';

const SELF_ROLE_IDS = {
  gender: {
    'she_her': '1558480429273583678',
    'he_him': '1558480593073868841',
    'they_them': '1558480712695414874',
    'any_all': '1558480820874780722'
  },
  age: {
    '13_17': '1558481003746697266',
    '18_21': '1558481095446495233',
    '21_plus': '1558481253370433536'
  },
  region: {
    'asia': '1558481398069727362',
    'europe': '1558481498347413584',
    'americas': '1558481607093125200',
    'other': '1558482222242209904'
  },
  relationship: {
    'single': '1558482393395101897',
    'taken': '1558482471891247204',
    'married': '1558482562593067089',
    'third_wheeler': '1558482718705188874',
    'hopeless_romantic': '1558482810136694844',
    'i_give_up': '1558482907755053286'
  },
  aesthetic: {
    'moonlight': '1558483084884574411',
    'daydream': '1558483165293707344',
    'rosewater': '1558483247237828681',
    'ethereal': '1558483493644668998',
    'blue_hour': '1558483592378581113',
    'lover': '1558483731701047406'
  },
  notifications: {
    'arise': '1558483922654863370',
    'gaming': '1558484017710629075',
    'movie': '1558484104843100190',
    'anime': '1558484202184515734'
  }
};

// Memory maps for cooldowns & active game sessions
if (!global.botCooldowns) global.botCooldowns = new Map();
const activeGames = new Map();
const xpCooldowns = new Set();

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

function getCooldownTimeRemaining(key, durationMs) {
  const now = Date.now();
  if (global.botCooldowns.has(key)) {
    const expiration = global.botCooldowns.get(key) + durationMs;
    if (now < expiration) {
      return Math.ceil((expiration - now) / 1000);
    }
  }
  return 0;
}

function formatDuration(seconds) {
  if (seconds <= 0) return 'READY';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Canvas rounded rect fallback
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ==========================================
// 2. STATIC CATALOGS & DATA
// ==========================================
const MARKET_ITEMS = {
  // Page 1: Mental Store
  unemployed_badge: { id: 'unemployed_badge', name: 'Unemployed Badge', price: 0, sell: 0, category: 'mental', desc: 'Proof that you do absolutely nothing all day.' },
  left_sock: { id: 'left_sock', name: 'Left Sock', price: 69, sell: 34, category: 'mental', desc: 'Where did the right one go? Nobody knows.' },
  potato: { id: 'potato', name: 'Potato', price: 2300, sell: 1150, category: 'mental', desc: 'Can survive nuclear fallout and runs basic bots.' },
  toilet_paper: { id: 'toilet_paper', name: 'Toilet Paper', price: 8888, sell: 4444, category: 'mental', desc: 'Peak pandemic luxury flex.' },
  wizard_hat: { id: 'wizard_hat', name: 'Wizard Hat', price: 12000, sell: 6000, category: 'mental', desc: '+5 Intelligence, -10 social competence.' },

  // Page 2: Nursery
  cocopeat: { id: 'cocopeat', name: 'Cocopeat (Fertiliser)', price: 800, sell: 400, category: 'nursery', desc: 'Rich compost that boosts plants by 2 stages.' },
  watering_can: { id: 'watering_can', name: 'Watering Can', price: 1500, sell: 750, category: 'nursery', desc: 'Starlight vessel required for daily hydration.' },
  rose_seed: { id: 'rose_seed', name: 'Rose Seed', price: 500, sell: 250, category: 'seeds', plantName: 'Rose' },
  lavender_seed: { id: 'lavender_seed', name: 'Lavender Seed', price: 600, sell: 300, category: 'seeds', plantName: 'Lavender' },
  sunflower_seed: { id: 'sunflower_seed', name: 'Sunflower Seed', price: 700, sell: 350, category: 'seeds', plantName: 'Sunflower' },
  moonflower_seed: { id: 'moonflower_seed', name: 'Moonflower Seed', price: 800, sell: 400, category: 'seeds', plantName: 'Moonflower' },
  orchid_seed: { id: 'orchid_seed', name: 'Orchid Seed', price: 900, sell: 450, category: 'seeds', plantName: 'Orchid' },
  lotus_seed: { id: 'lotus_seed', name: 'Lotus Seed', price: 950, sell: 475, category: 'seeds', plantName: 'Lotus' },
  crystal_geode_seed: { id: 'crystal_geode_seed', name: 'Crystal Geode Seed', price: 1000, sell: 500, category: 'seeds', plantName: 'Crystal Geode' },

  // Page 3: Jewellery Shop
  normal_ring: { id: 'normal_ring', name: 'Normal Ring', price: 5000, sell: 2500, category: 'jewellery', desc: 'Required to propose and become BF/GF.' },
  wedding_ring: { id: 'wedding_ring', name: 'Wedding Ring', price: 10000, sell: 5000, category: 'jewellery', desc: 'Required to bind souls in holy matrimony.' },
  crystal_badge: { id: 'crystal_badge', name: 'Crystal Badge', price: 30000, sell: 15000, category: 'jewellery', desc: 'A gleaming sigil of crystal affluence.' },
  celestial_crystal: { id: 'celestial_crystal', name: 'Celestial Crystal', price: 150000, sell: 75000, category: 'jewellery', desc: 'A fragment of primordial astral energy.' }
};

const ROLE_CATALOG = [
  { id: 'goofy', name: 'Goofy', roleId: '1544638730948841592', price: 1000, desc: 'Always ready to do something silly.' },
  { id: 'potato', name: 'Potato', roleId: '1544638907826573362', price: 5000, desc: 'Just a potato trying its best.' },
  { id: 'lilac', name: 'Lilac', roleId: '1544639041838915674', price: 8000, desc: 'Soft, pretty, and effortlessly charming.' },
  { id: 'yapper', name: 'Yapper', roleId: '1544639230373003374', price: 10000, desc: 'They always have something to say.' },
  { id: 'insomniac', name: 'Insomniac', roleId: '1544639354197246002', price: 12500, desc: 'Sleep is apparently optional.' },
  { id: 'pookie', name: 'Pookie', roleId: '1544639615137349692', price: 15000, desc: 'Everyone\'s favorite little sweetheart.' },
  { id: 'snacklord', name: 'Snacklord', roleId: '1544640217884008479', price: 18000, desc: 'Always thinking about the next snack.' },
  { id: 'nonchalant', name: 'Nonchalant', roleId: '1544640380081807405', price: 20000, desc: 'Nothing seems to bother them.' },
  { id: 'tranquil', name: 'Tranquil', roleId: '1544640618008023090', price: 25000, desc: 'Calm, peaceful, and unbothered.' },
  { id: 'delulu', name: 'Delulu', roleId: '1544640794210607184', price: 30000, desc: 'Reality is merely a suggestion.' },
  { id: 'gremlin', name: 'Gremlin', roleId: '1544641298949083258', price: 35000, desc: 'Small amounts of chaos are their specialty.' },
  { id: 'boisterous', name: 'Boisterous', roleId: '1544641471980896267', price: 40000, desc: 'Quiet is simply not their thing.' },
  { id: 'serendipity', name: 'Serendipity', roleId: '1544641691473158225', price: 45000, desc: 'Good things seem to find them by chance.' },
  { id: 'rogue', name: 'Rogue', roleId: '1544642099901890612', price: 50000, desc: 'They play by their own rules.' },
  { id: 'catastrophist', name: 'Catastrophist', roleId: '1544642245012226108', price: 80000, desc: 'They expect everything to go terribly wrong.' },
  { id: 'perspicacious', name: 'Perspicacious', roleId: '1544642396388724828', price: 90000, desc: 'They notice things everyone else misses.' },
  { id: 'taciturn', name: 'Taciturn', roleId: '1544642801138933811', price: 100000, desc: 'They prefer silence over unnecessary words.' },
  { id: 'ferocious', name: 'Ferocious', roleId: '1544643151375900762', price: 115000, desc: 'Cute until you give them a reason not to be.' },
  { id: 'unhinged', name: 'Unhinged', roleId: '1544643298025668618', price: 125000, desc: 'There is absolutely no telling what they will do.' },
  { id: 'ruthless', name: 'Ruthless', roleId: '1544643504603533332', price: 140000, desc: 'They never back down from a challenge.' },
  { id: 'sinister', name: 'Sinister', roleId: '1544643660946219110', price: 150000, desc: 'Something about them feels suspicious.' },
  { id: 'moonflower', name: 'Moonflower', roleId: '1544643837819883540', price: 200000, desc: 'Quietly beautiful with a mysterious charm.' },
  { id: 'rosaline', name: 'Rosaline', roleId: '1544644059857952819', price: 250000, desc: 'Elegant, graceful, and a little romantic.' },
  { id: 'vellichor', name: 'Vellichor', roleId: '1544644535555199038', price: 300000, desc: 'They find beauty in old things and memories.' },
  { id: 'elysian', name: 'Elysian', roleId: '1544644783002091520', price: 350000, desc: 'Graceful, peaceful, and effortlessly elegant.' },
  { id: 'aurelia', name: 'Aurelia', roleId: '1544645000057323560', price: 400000, desc: 'They carry a warm and radiant presence.' },
  { id: 'nocturne', name: 'Nocturne', roleId: '1544645875559563344', price: 500000, desc: 'They belong where the night begins.' },
  { id: 'crystalborn', name: 'Crystalborn', roleId: '1544646075388919851', price: 650000, desc: 'Born to shine brighter than the rest.' },
  { id: 'supercalifragilisticexpialidocious', name: 'Supercalifragilisticexpialidocious', roleId: '1544646431682596895', price: 800000, desc: 'Wonderful in every single possible way.' },
  { id: 'floccinaucinihilipilification', name: 'Floccinaucinihilipilification', roleId: '1544646793520873542', price: 900000, desc: 'Nothing is ever good enough for them.' },
  { id: 'broke', name: 'Broke', roleId: '1544647240952582214', price: 1000000, desc: 'The richest person in Crystals... someday.' }
];

const BOTANICAL_FACTS = {
  Rose: [
    "Fossil evidence shows roses have existed on Earth for over 35 million years.",
    "Rose hips contain more concentrated Vitamin C than oranges.",
    "Wild roses naturally have exactly five petals.",
    "During the Roman era, rose petals were used as confetti and currency.",
    "Attar of roses requires thousands of pounds of petals to yield just one ounce of oil."
  ],
  Lavender: [
    "The word lavender comes from the Latin verb 'lavare', which translates to 'to wash'.",
    "Lavender naturally deters insects like mosquitoes and flies using its essential oils.",
    "Queen Elizabeth I insisted on having fresh lavender flowers in her tea every day.",
    "Lavender is part of the mint (Lamiaceae) plant family.",
    "Bees produce exceptionally high-quality monofloral honey from lavender nectar."
  ],
  Sunflower: [
    "Young sunflowers exhibit heliotropism, turning from east to west each day to follow the sun.",
    "A single sunflower head is actually made up of 1,000 to 2,000 tiny individual flowers.",
    "The spiral pattern of seeds in a sunflower head follows the Fibonacci mathematical sequence.",
    "Sunflowers were used to clean up radiation after the Chernobyl disaster.",
    "Sunflowers can grow over 30 feet tall under optimal conditions."
  ],
  Moonflower: [
    "Moonflowers bloom exclusively at dusk and close before the morning sun touches them.",
    "Their intense nocturnal fragrance is designed specifically to attract nighttime hawkmoths.",
    "Moonflowers are closely related to the morning glory family.",
    "They produce large, pure white blossoms that glow noticeably under moonlight.",
    "The opening of a moonflower blossom can happen quickly enough to watch in real-time."
  ],
  Orchid: [
    "Orchids constitute one of the two largest families of flowering plants on Earth.",
    "Vanilla flavoring is harvested directly from the seed pods of the Vanilla planifolia orchid.",
    "Orchid seeds are microscopic and have zero endosperm, relying entirely on fungi to sprout.",
    "Some orchid species can live for more than 100 years.",
    "Certain orchids mimic female wasps in look and scent to fool male wasps into pollinating them."
  ],
  Lotus: [
    "Lotus seeds can remain viable and sprout after lying dormant for over 1,300 years.",
    "The lotus leaf exhibits extreme superhydrophobicity, naturally repelling all mud and water.",
    "The lotus flower regulates its internal temperature like a warm-blooded animal.",
    "In ancient Egyptian and Asian traditions, the lotus symbolizes purity and rebirth.",
    "Every single part of the lotus plant—from root to flower—is completely edible."
  ],
  'Crystal Geode': [
    "Geodes form inside hollow cavities created by volcanic gas bubbles over millions of years.",
    "The outer shell of a geode is hardened chalcedony, protecting the inner crystal matrix.",
    "Amethyst crystals inside geodes acquire their violet color from irradiated iron impurities.",
    "The world's largest known geode is the Pulpí Geode in Spain, measuring 8 meters long.",
    "A geode may look like an ordinary, rough stone until cracked open to reveal its treasure."
  ]
};

const TRIVIA_QUESTIONS = [
  { q: "Whom do I love unconditionally in this server?", a: "Sarah" },
  { q: "Which planet in our solar system has the highest number of recognized moons?", a: "saturn" },
  { q: "What is the hardest known naturally occurring mineral on Earth?", a: "diamond" },
  { q: "What element gives natural amethyst its signature purple hue?", a: "iron" },
  { q: "What is the capital of Japan?", a: "tokyo" },
  { q: "Which anime features characters fighting colossal humanoids with 3D maneuver gear?", a: "attack on titan"},
  { q: "What is the chemical symbol for the element Gold?", a: "au" },
  { q: "How many squares are there on a standard tournament chessboard?", a: "64" },
  { q: "Which gas makes up approximately 78% of Earth's atmosphere?", a: "nitrogen" },
  { q: "In cricket, how many runs are awarded when a batter hits the ball over the boundary on the full?", a: "6" },
  { q: "Which legendary Studio Ghibli film tells the story of an engineer designing airplanes?", a: "the wind rises" },
  { q: "What is the powerhouse organelle of eukaryotic cells?", a: "mitochondria" },
  { q: "What is the largest ocean on Earth?", a: "Pacific"},
  { q: "What is the fastest land animal?", a: "Cheetah"},
  { q: "Which scientist formulated the theory of relativity?", a: "Einstein"},
  { q: "What is the name of the fantasy drama series based on George R.R. Martin's novels?", a: "Game of thrones"},
  { q: "Which planet is known as the Red Planet?", a: "Mars"},
  { q: "Who is the founder and CEO of SpaceX?", a: "Elon Musk"},
  { q: "Which superhero is known as the Man of Steel?", a: "Superman"},
  { q: "How many continents are there on Earth?", a: "7"},
  { q: "How many sides does a decagon have?", a: "10"},
  { q: "What is the smallest prime number?", a: "2"},
  { q: "How many minutes are in 24 hours?", a: "1440"},
  { q: "What is the freezing point of water in degree celsius?", a: "0"},
  { q: "What is the largest organ in the human body?", a: "skin"},
  { q: "The ancient pyramids of Giza are located in which country?", a: "Egypt"},
  { q: "What is the smallest country in the world?", a: "Vatican City"},
  { q: "How many teeth does an adult human have?", a: "32"},
  { q: "How many chambers does a human heart have?", a: "4"},
  { q: "Who is known as the father of genetics?", a: "Mendel"}
  
];

const ROAST_BANK = [
  "has the turning radius of a loaded cargo ship and the ping of dial-up internet.",
  "is like an optional software update—whenever people see them, they click 'Remind me tomorrow'.",
  "brings so much radiant joy to the call... whenever they disconnect.",
  "is living proof that light travels faster than sound; they looked brilliant until they spoke.",
  "could drop their weapon in a turn-based RPG and still find a way to lose their turn.",
  "possesses the charisma and emotional depth of an unseasoned potato in a microwave.",
  "is the human equivalent of a 404 page not found error.",
  "has a brain with 2 tabs open: one is frozen, and the other is playing elevator music.",
  "has a face that would make onions cry.",
  "I consider you my Sun. Now, please get 93 million miles away from here.",
  "You are the human version of cramps.",
  "Were you born this dumb, or did you acquire experience over the time?",
  "is the reason why the middle finger was invented in the first place",
  "You can’t imagine how much happiness you can bring…by leaving the server.",
  "Somewhere, a tree is producing oxygen for you. I’m sorry for it.",
  "A glowstick has a brighter future than you",
  "Your birth certificate needs to be rewritten as a letter of apology.",
  "If I throw a stick for you, will you leave?",
  "needs a kiss on the neck from an alligator.",
  "I will kick your ass so hard that you will fly to the farthest planet and it will also crash",
  "is the reason I don’t want kids.",
  "Your face could scare the shit out of a toilet.",
  "Twinkle, twinkle, little star, I want to hit you with my car.",
  "Roses are red, monsters are green, look in the mirror, you’ll see what I mean.",
  "If I were a dog and you were a flower, I’d lift my leg up and give you a shower."
  
  
];

const PICKUP_BANK = [
  "Are you a celestial beacon? Because my entire orbital plane just shifted toward you.",
  "Are you made of quartz? Because you bring pure crystal clarity into my chaotic server.",
  "Do you have a map of the cosmos? Because I just got lost in your celestial frequency.",
  "My internet ping might be 200ms, but my heart registers you at 0ms.",
  "If crystals were smiles, you would own the wealthiest geode mine in the multiverse.",
  "Are you an astral anomaly? Because every time you enter chat, time completely dilates.",
  "You must be an end-game drop, because people grind for weeks just to catch your attention.",
  "I'd like to take you to the movies but they don't let you bring your own snacks in.",
  "I'm lost. Can you give me directions to your heart?",
  "Wanna be Minecraft without the craft?",
  "You know, I'm actually terrible at flirting. How about you try to pick me up instead?",
  "4+4=8 but you+me=fate.",
  "What's your favorite drink? I'm asking so I know what to buy you when we go on our first date.",
  "Do you have Instagram? My parents always told me to follow my dreams.",
  "What is it like to be the most gorgeous person in this server?",
  "They say nothing lasts forever. Want to be my nothing?",
  "Are your parents bakers? Because you're a cutie pie.",
  "I had a good pickup line ready to go, but you're so good-looking I'm literally speechless.",
  "On a scale of 1 to 10, you're a 9…because I'm the 1 you need.",
  "Want to go outside and get some fresh air with me? You just took my breath away.",
  "Your lips look lonely. Would they like to meet mine?",
  "I'm not currently an organ donor, but I'd love to give you my heart.",
  "If you let me borrow a kiss, I promise I'll give it right back.",
  "My mom told me not to talk to strangers online, but I'll make an exception for you.",
  "Trust me, I'm not drunk I'm just intoxicated by you."
];

// ==========================================
// SELF-ROLES REACTION MAPPING
// ==========================================
const REACTION_ROLES_MAP = {
  // 1. Gender / Pronouns
  '🌸': '1558480429273583678', // She/her
  '🌿': '1558480593073868841', // He/him
  '🌙': '1558480712695414874', // They/them
  '✨': '1558480820874780722', // Any/all

  // 2. Age Bracket
  '🐣': '1558481003746697266', // 13-17
  '🪷': '1558481095446495233', // 18-21
  '☕': '1558481253370433536', // 21+

  // 3. Region / Continent
  '🌏': '1558481398069727362', // Asia
  '🌍': '1558481498347413584', // Europe
  '🌎': '1558481607093125200', // Americas
  '🏝️': '1558482222242209904', // Other

  // 4. Relationship Status
  '💙': '1558482393395101897', // Single
  '💖': '1558482471891247204', // Taken
  '💍': '1558482562593067089', // Married
  '🍿': '1558482718705188874', // Third Wheeler
  '💌': '1558482810136694844', // Hopeless Romantic
  '🥀': '1558482907755053286', // I Give Up

  // 5. Aesthetic Colors
  '🔮': '1558483084884574411', // Moonlight
  '☁️': '1558483165293707344', // Daydream
  '🩷': '1558483247237828681', // Rosewater
  '💜': '1558483493644668998', // Ethereal
  '🌌': '1558483592378581113', // Blue Hour
  '🌷': '1558483731701047406', // Lover

  // 6. Notifications
  '🔔': '1558483922654863370', // Arise
  '🎮': '1558484017710629075', // Gaming
  '🎬': '1558484104843100190', // Movie
  '⛩️': '1558484202184515734'  // Anime
};


// ==========================================
// 3. MONGOOSE SCHEMAS & DATABASE ENGINE
// ==========================================
const plantDocSchema = new mongoose.Schema({
  plantName: { type: String, required: true },
  stage: { type: Number, default: 1 },
  plantedAt: { type: Date, default: Date.now },
  lastWatered: { type: Date, default: null },
  fertilised: { type: Boolean, default: false },
  neglectDays: { type: Number, default: 0 },
  lastCheckedDate: { type: Date, default: Date.now }
});

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 100 },
  bank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  
  // Economy Attempt Trackers
  workAttempts: { type: Number, default: 0 },
  workResetTime: { type: Date, default: null },
  begAttempts: { type: Number, default: 0 },
  begResetTime: { type: Date, default: null },
  dailyLastClaimed: { type: Date, default: null },

  // Inventory & Wardrobe
  inventory: { type: Map, of: Number, default: {} },
  equippedRole: { type: String, default: 'Default Prism' },
  rolesOwned: { type: [String], default: ['Default Prism'] },

  // Romance
  datingPartnerId: { type: String, default: null },
  datingDate: { type: Date, default: null },
  spouseId: { type: String, default: null },
  marriageDate: { type: Date, default: null },
  loviesCount: { type: Number, default: 0 },
  lastLoveDate: { type: Date, default: null },

  // Nursery
  activePlant: { type: plantDocSchema, default: null },
  harvestedPlants: { type: [String], default: [] },

  // Utility
  anonymousCount: { type: Number, default: 0 }
});

const User = mongoose.model('CrystalUser', userProfileSchema, 'crystalusers');

async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId });
  }

  if (user.workResetTime && Date.now() >= new Date(user.workResetTime).getTime()) {
    user.workAttempts = 0;
    user.workResetTime = null;
  }

  if (user.begResetTime && Date.now() >= new Date(user.begResetTime).getTime()) {
    user.begAttempts = 0;
    user.begResetTime = null;
  }

  return user;
}

function getRequiredXp(lvl) {
  return Math.floor(100 * Math.pow(lvl, 1.5));
}

async function addExperience(user, amount, message) {
  user.exp += amount;
  let needed = getRequiredXp(user.level || 1);
  if (user.exp >= needed) {
    user.level += 1;
    user.exp -= needed;
    const bonus = user.level * 50;
    user.balance += bonus;
    message.channel.send(`🎉 **ASCENSION!** <@${user.userId}> attuned deeper with the crystal realm and reached **Level ${user.level}**! (+${bonus} ${cryCoin})`).catch(() => {});
  }
}

// ==========================================
// CELESTIAL INFINITY SHIP CARD RENDERER (HD)
// ==========================================
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

  function drawSparkle(x, y, size, alpha = 0.9) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
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

  for (let i = 0; i < 95; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const sr = Math.random() * 1.8 + 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const sparkles = [
    [120, 110, 14], [1280, 110, 14], [120, 610, 12], [1280, 610, 12],
    [380, 160, 10], [1020, 160, 10], [620, 270, 8], [780, 270, 8],
    [700, 560, 9]
  ];
  sparkles.forEach(([x, y, s]) => drawSparkle(x, y, s));

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

// Universal Identity Meter (Gay, Lesbian, Rate)
async function renderGauge(user, pct, label, colors) {
  const w = 700, h = 240;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#120422';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.arc(90, 120, 50, 0, Math.PI * 2);
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.closePath();
  ctx.clip();
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 40, 70, 100, 100);
  } catch {
    ctx.fillStyle = '#4a0e4e';
    ctx.fillRect(40, 70, 100, 100);
  }
  ctx.restore();

  const tX = 180, tY = 125, tW = 460, tH = 26;
  ctx.fillStyle = '#220b3b';
  drawRoundedRect(ctx, tX, tY, tW, tH, 13);
  ctx.fill();

  const fW = Math.max(16, (tW * pct) / 100);
  const grad = ctx.createLinearGradient(tX, 0, tX + tW, 0);
  colors.forEach((c, idx) => grad.addColorStop(idx / (colors.length - 1), c));

  ctx.fillStyle = grad;
  drawRoundedRect(ctx, tX, tY, fW, tH, 13);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(user.username.slice(0, 15), tX, 75);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#d8b4e2';
  ctx.fillText(label.toUpperCase(), tX, 105);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${pct}%`, tX + tW, 105);

  return canvas.toBuffer('image/png');
}

// ==========================================
// CANVAS CARD ENGINES: RANK/LB, PROFILE, PLANTS
// ==========================================

// 1. TOP 10 CELESTIAL LEADERBOARD & RANK CARD
async function renderLeaderboardCard(topUsers, authorUser, authorRank, authorMember) {
  const w = 1200;
  const h = 760;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0c0714');
  bg.addColorStop(0.5, '#160d26');
  bg.addColorStop(1, '#07040d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Nebula blooms
  const bloom = ctx.createRadialGradient(600, 200, 50, 600, 200, 500);
  bloom.addColorStop(0, 'rgba(114, 9, 183, 0.25)');
  bloom.addColorStop(1, 'transparent');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Outer border
  ctx.strokeStyle = '#c8a2c8';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✧ CELESTIAL SOUL LEADERBOARD • TOP 10 ✧', w / 2, 65);

  // Render Top 10 Entries (Left Column: 1-5, Right Column: 6-10)
  for (let idx = 0; idx < 10; idx++) {
    const entry = topUsers[idx];
    const col = idx < 5 ? 0 : 1;
    const row = idx % 5;
    const x = col === 0 ? 55 : 625;
    const y = 95 + (row * 105);

    // Entry box
    ctx.fillStyle = idx === 0 ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, x, y, 520, 90, 10);
    ctx.fill();

    ctx.strokeStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, 520, 90, 10);
    ctx.stroke();

    if (entry) {
      // Rank Badge
      ctx.fillStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#d8b4e2';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${idx + 1}`, x + 18, y + 52);

      // Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 95, y + 45, 28, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      try {
        const ava = await loadImage(entry.member.user.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.drawImage(ava, x + 67, y + 17, 56, 56);
      } catch {
        ctx.fillStyle = '#2d0c45';
        ctx.fillRect(x + 67, y + 17, 56, 56);
      }
      ctx.restore();

      // Username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      const name = entry.member.user.username.length > 13 
        ? entry.member.user.username.substring(0, 11) + '...' 
        : entry.member.user.username;
      ctx.fillText(name, x + 140, y + 42);

      // Level & Crystals
      ctx.fillStyle = '#b8a9c9';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Lvl ${entry.doc.level || 1} • ${(entry.doc.balance || 0).toLocaleString()} Crystals`, x + 140, y + 68);
    } else {
      ctx.fillStyle = '#554d66';
      ctx.font = 'italic 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Slot #${idx + 1} Empty`, x + 25, y + 52);
    }
  }

  // Author Personal Footer Strip
  ctx.fillStyle = '#1e1133';
  drawRoundedRect(ctx, 55, 645, 1090, 75, 10);
  ctx.fill();
  ctx.strokeStyle = '#f72585';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 55, 645, 1090, 75, 10);
  ctx.stroke();

  // Author Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(95, 682, 26, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const authorAva = await loadImage(authorMember.user.displayAvatarURL({ extension: 'png', size: 128 }));
    ctx.drawImage(authorAva, 69, 656, 52, 52);
  } catch {}
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(authorMember.user.username, 140, 678);

  ctx.fillStyle = '#f72585';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`YOUR RANK: #${authorRank}`, 140, 703);

  ctx.fillStyle = '#e9d5ff';
  ctx.textAlign = 'right';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Level ${authorUser.level || 1}  •  ${(authorUser.balance || 0).toLocaleString()} Crystals`, 1110, 688);

  return canvas.toBuffer('image/png');
}

// 2. CELESTIAL PROFILE CODEX CARD
async function renderProfileCard(userDoc, member, rankStr, isVip) {
  const w = 900;
  const h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0f0a1c');
  bg.addColorStop(0.5, '#1b1030');
  bg.addColorStop(1, '#090512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Border
  ctx.strokeStyle = '#c8a2c8';
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, w - 30, h - 30);

  // Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(140, 140, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const ava = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(ava, 70, 70, 140, 140);
  } catch {}
  ctx.restore();

  ctx.beginPath();
  ctx.arc(140, 140, 73, 0, Math.PI * 2);
  ctx.strokeStyle = '#f72585';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Name & Badges
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(member.user.username, 240, 110);

  ctx.fillStyle = '#d8b4e2';
  ctx.font = '16px sans-serif';
  ctx.fillText(isVip ? '👑 Cosmic VIP • Sanctuary Patron' : '💠 Mansion Traveler', 240, 140);

  ctx.fillStyle = '#b8a9c9';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Title: ${userDoc.equippedRole || 'Default Prism'}  •  Global Rank: ${rankStr}`, 240, 168);

  // Stats Grid (Level, Wallet, Bank, Spouse)
  const stats = [
    { label: 'ATTUNEMENT LEVEL', val: `Level ${userDoc.level || 1} (${userDoc.exp || 0} XP)` },
    { label: 'LIQUID CRYSTALS', val: `${(userDoc.balance || 0).toLocaleString()} Crystals` },
    { label: 'BANK VAULT', val: `${(userDoc.bank || 0).toLocaleString()} Crystals` },
    { label: 'ROMANTIC BOND', val: userDoc.spouseId ? `Married` : userDoc.datingPartnerId ? `Dating` : 'Single & Radiant' }
  ];

  stats.forEach((s, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 50 + col * 410;
    const y = 240 + row * 100;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, x, y, 390, 80, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, 390, 80, 8);
    ctx.stroke();

    ctx.fillStyle = '#f72585';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(s.label, x + 20, y + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(s.val, x + 20, y + 58);
  });

  return canvas.toBuffer('image/png');
}

// 3. BOTANICAL NURSERY PLOT CARD
async function renderPlantsCard(userDoc, username) {
  const w = 800;
  const h = 420;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0a1410');
  bg.addColorStop(0.5, '#10241c');
  bg.addColorStop(1, '#060d0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#2ec4b6';
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, w - 30, h - 30);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`✧ BOTANICAL SANCTUARY: ${username.toUpperCase()} ✧`, w / 2, 60);

  if (!userDoc.activePlant) {
    ctx.fillStyle = '#b8a9c9';
    ctx.font = 'italic 20px sans-serif';
    ctx.fillText('Your plot is currently empty soil.', w / 2, 210);
    ctx.fillText('Sow a seed anytime using cry!sow <seed_id>', w / 2, 245);
  } else {
    const stage = userDoc.activePlant.stage || 1;
    const pName = userDoc.activePlant.plantName;

    ctx.fillStyle = '#2ec4b6';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`🌱 Active Plant: ${pName}`, w / 2, 120);

    // Progress Bar Track
    const barX = 150, barY = 160, barW = 500, barH = 24;
    ctx.fillStyle = '#1e382d';
    drawRoundedRect(ctx, barX, barY, barW, barH, 12);
    ctx.fill();

    // Progress Bar Fill
    const fillW = Math.max(24, (barW * stage) / 5);
    ctx.fillStyle = '#2ec4b6';
    drawRoundedRect(ctx, barX, barY, fillW, barH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Stage ${stage} / 5`, w / 2, 215);

    // Info Pills
    const lastW = userDoc.activePlant.lastWatered ? new Date(userDoc.activePlant.lastWatered).toLocaleDateString() : 'Never';
    const fert = userDoc.activePlant.fertilised ? 'Yes (Maxed)' : 'No (Use cry!fertilise)';

    ctx.fillStyle = '#b8a9c9';
    ctx.font = '16px sans-serif';
    ctx.fillText(`💧 Last Watered: ${lastW}   •   🧪 Fertilised: ${fert}`, w / 2, 260);

    // Historical Vault Tally
    const harvestCount = userDoc.harvestedPlants ? userDoc.harvestedPlants.length : 0;
    ctx.fillStyle = '#ffd166';
    ctx.font = '16px sans-serif';
    ctx.fillText(`🏆 Historical Blooms Harvested: ${harvestCount}`, w / 2, 330);
  }

  return canvas.toBuffer('image/png');
}

// ==========================================
// 4. WELCOME & GOODBYE LISTENERS
// ==========================================
client.on('guildMemberAdd', async (member) => {
  try {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const width = 900;
    const height = 360;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0d0b18');
    bgGrad.addColorStop(0.5, '#19142b');
    bgGrad.addColorStop(1, '#08070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const glowGrad = ctx.createRadialGradient(200, 180, 20, 200, 180, 280);
    glowGrad.addColorStop(0, 'rgba(147, 112, 219, 0.35)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#c8a2c8';
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(170, 180, 85, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 85, 95, 170, 170);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(170, 180, 88, 0, Math.PI * 2, true);
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('✧ WELCOME TO THE SANCTUARY ✧', 320, 130);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    const cleanTag = member.user.username.length > 16 
      ? member.user.username.substring(0, 14) + '...' 
      : member.user.username;
    ctx.fillText(cleanTag, 320, 195);

    ctx.fillStyle = '#b8a9c9';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Traveler #${member.guild.memberCount}`, 320, 245);

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome-card.png' });
    
    await channel.send({
      content: `Welcome to the server, ${member}! ✨ Take a breath, pick your roles, and enjoy your stay among the stars!`,
      files: [attachment]
    });
  } catch (err) {
    console.error('Welcome Card Error:', err);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
    if (!channel) return;

    const goodbyeEmbed = new EmbedBuilder()
      .setColor('#4a6572')
      .setTitle('✧ Safe Travels... 🌌')
      .setDescription(`**${member.user.username}** has drifted away from the sanctuary.\nWe wish them peace on their journey through the cosmos.`)
      .setFooter({ text: `Member count now: ${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [goodbyeEmbed] });
  } catch (err) {
    console.error('Goodbye Embed Error:', err);
  }
});

// ==========================================
// REACTION ROLE LISTENERS (WITH PERSISTENT PARTIALS)
// ==========================================
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  // Fetch partials if the reaction or message was created prior to bot launch
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) { return; }
  }

  const roleId = REACTION_ROLES_MAP[reaction.emoji.name];
  if (!roleId) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (member) {
      await member.roles.add(roleId);
    }
  } catch (err) {
    console.error(`Could not add role ${roleId} to${user.tag}:`, err.message);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) { return; }
  }

  const roleId = REACTION_ROLES_MAP[reaction.emoji.name];
  if (!roleId) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (member) {
      await member.roles.remove(roleId);
    }
  } catch (err) {
    console.error(`Could not remove role ${roleId} from${user.tag}:`, err.message);
  }
});


// ==========================================
// 6. READY & STATUS
// ==========================================
client.once('ready', () => {
  console.log(`✨ CrystalBot is online as ${client.user.tag}`);
  console.log(`💎 All engines loaded: Market, Wardrobe, Games, Economy, Love, Nursery`);
});

// ==========================================
// 7. MESSAGE DISPATCHER & COMMAND ROUTING
// ==========================================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // XP Engine
  if (!xpCooldowns.has(message.author.id)) {
    xpCooldowns.add(message.author.id);
    setTimeout(() => xpCooldowns.delete(message.author.id), 30000);

    const user = await getUser(message.author.id);
    const earnedXp = Math.floor(Math.random() * 16) + 25; // 25-40 XP
    await addExperience(user, earnedXp, message);
    await user.save();
  }

  // Easter Egg Triggers
  if (message.content.toLowerCase().includes('sarah')) {
    return message.channel.send("*🥹 Ikrr Sarah is so peak, you are peak too twin...*");
  }

  if (message.content.toLowerCase().trim() === 'cry!cry') {
    return message.channel.send("Why are you crying sweetie, are you missing anyone?");
  }

  // Verify prefix match
  if (!PREFIX_REGEX.test(message.content)) return;

  const rawArgs = message.content.replace(PREFIX_REGEX, '').trim().split(/ +/);
  const command = rawArgs.shift().toLowerCase();
  const args = rawArgs;

  try {
    const isVip = message.author.id === VIP_USER_ID;

    // ==========================================
    // MODULE: UTILITY
    // ==========================================

    // FAST COMMAND LIST (cry!cmds)
    if (command === 'cmds') {
      const cmdsEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTALBOT COMMAND REGISTRY ✧')
        .setColor('#2d0c45')
        .setDescription(
          `**🪙 Economy:** \`work\`, \`bal\`, \`daily\`, \`pay\`, \`lb\`\n` +
          `**🛍️ Market:** \`shop\`, \`buy\`, \`sell\`, \`inv\`\n` +
          `**👗 Wardrobe:** \`roleshop\`, \`buyrole\`, \`equip\`, \`unequip\`, \`myroles\`\n` +
          `**🌱 Nursery:** \`sow\`, \`water\`, \`fertilise\`, \`harvest\`, \`plants\`\n` +
          `**♟️ Games & Gambling:** \`chessduel\`, \`imposter\`, \`imposterlearn\`, \`trivia\`, \`slots\`, \`beg\`, \`rps\`\n` +
          `**💍 Romance:** \`propose\`, \`marry\`, \`divorce\`, \`partner\`, \`love\`, \`ship\`\n` +
          `**✨ Social:** \`slap\`, \`bonk\`, \`poke\`, \`punch\`, \`pinch\`, \`bite\`, \`hug\`, \`kiss\`, \`pat\`, \`highfive\`, \`dance\`, \`laugh\`, \`blush\`, \`twerk\`\n` +
          `**🔮 Identity & Fun:** \`gay\`, \`lesbian\`, \`rate\`, \`cf\`, \`dice\`, \`crystalstorm\`, \`pickup\`, \`roast\`, \`anonymous\`\n` +
          `**🛡️ Admin:** \`setup-roles\`, \`poll\`, \`ac\`, \`rc\`\n` +
          `**⚙️ Utility:** \`profile\`, \`rank\`, \`cd\`, \`cmds\`, \`help\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `*💡 Use \`cry!help\` to access the interactive category guide and rules!*`
        )
        .setFooter({ text: 'CrystalBot OS • High Frequency Engine' });

      return message.reply({ embeds: [cmdsEmbed] });
    }

    // COOLDOWN DASHBOARD (cry!cd)
    if (command === 'cd') {
      const user = await getUser(message.author.id);

      const workRem = getCooldownTimeRemaining(`work_${message.author.id}`, 180000);
      const begRem = getCooldownTimeRemaining(`beg_${message.author.id}`, 180000);
      const chessRem = getCooldownTimeRemaining(`chess_${message.author.id}`, 180000);
      const imposterRem = getCooldownTimeRemaining('imposter_global', 600000);
      const stormRem = getCooldownTimeRemaining('crystalstorm_global', 10800000);

      let dailyStr = 'READY';
      if (user.dailyLastClaimed) {
        const diff = Date.now() - new Date(user.dailyLastClaimed).getTime();
        if (diff < 86400000) dailyStr = formatDuration(Math.ceil((86400000 - diff) / 1000));
      }

      let loveStr = 'READY';
      if (user.lastLoveDate) {
        const diff = Date.now() - new Date(user.lastLoveDate).getTime();
        if (diff < 86400000) loveStr = formatDuration(Math.ceil((86400000 - diff) / 1000));
      }

      let waterStr = 'READY';
      if (user.activePlant && user.activePlant.lastWatered) {
        const diff = Date.now() - new Date(user.activePlant.lastWatered).getTime();
        if (diff < 86400000) waterStr = formatDuration(Math.ceil((86400000 - diff) / 1000));
      }

      const cdEmbed = new EmbedBuilder()
        .setTitle('✧ ASTRAL TEMPORAL LEDGER ✧')
        .setColor('#1a0826')
        .setDescription(
          `**⛏️ Work Shift:** \`${formatDuration(workRem)}\` *(Attempts: ${user.workAttempts}/40)*\n` +
          `**🤲 Begging:** \`${formatDuration(begRem)}\` *(Attempts: ${user.begAttempts}/20)*\n` +
          `**🎁 Daily Allowance:** \`${dailyStr}\`\n` +
          `**🌱 Plant Hydration:** \`${waterStr}\`\n` +
          `**💍 Partner Lovies:** \`${loveStr}\`\n` +
          `**♟️ Chess Duel:** \`${formatDuration(chessRem)}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**🏰 Mansion Imposter:** \`${formatDuration(imposterRem)}\` *(Global)*\n` +
          `**⚡ Crystalstorm:** \`${formatDuration(stormRem)}\` *(Global)*`
        )
        .setFooter({ text: `Temporal records for ${message.author.username}` });

      return message.reply({ embeds: [cdEmbed] });
    }

    // MULTI-PAGE INTERACTIVE HELP MENU (cry!help)
    if (command === 'help') {
      const getHelpPage = (cat) => {
        const embed = new EmbedBuilder().setColor('#2d0c45');
        if (cat === 'landing') {
          embed.setTitle('✧ CRYSTALBOT OPERATING SYSTEM ✧')
            .setDescription(
              "Welcome to **CrystalBot**! An aesthetic, feature-rich crystal sanctuary.\n\n" +
              "**Prefixes Supported:** `cry!`, `Cry!`, `CRY!`, or with a space (e.g. `Cry! work`)\n" +
              "Use the interactive buttons below to browse commands and cooldowns by category!"
            )
            .addFields(
              { name: '🪙 Economy', value: 'Mining shifts, vault ledgers, and allowance.', inline: true },
              { name: '🛍️ Market & Wardrobe', value: 'Item stores, geode seeds, and 31 vanity roles.', inline: true },
              { name: '🌱 Botanical Nursery', value: 'Grow, water, fertilise, and quiz-harvest plants.', inline: true },
              { name: '♟️ Games & Gambling', value: 'Tactical chess duels, slots, and Mansion Imposter.', inline: true },
              { name: '💍 Romance & Social', value: 'Dating, starlight weddings, and CDN interactions.', inline: true },
              { name: '🔮 Identity & Fun', value: 'Gay/lesbian gauges, crystalstorms, and roasts.', inline: true },
              { name: '🛡️ Admin Utility', value: 'Setup self-roles, interactive polls, and crystal awards.', inline: true }
            );
        } else if (cat === 'econ') {
          embed.setTitle('✧ MODULE: ECONOMY ✧')
            .setDescription(
              "`cry!work` — Mine 20-80 crystals (3m CD). 40 shifts triggers a 24h reset!\n" +
              "`cry!bal [@user]` — Inspect crystal wallet and net worth (1m CD).\n" +
              "`cry!daily` — Collect your 667 crystal daily grant (24h CD).\n" +
              "`cry!pay @user <amt>` — Transfer crystals from your vault (1m CD).\n" +
              "`cry!lb` — View Top 10 active server members (1m CD)."
            );
        } else if (cat === 'market') {
          embed.setTitle('✧ MODULE: MARKET & WARDROBE ✧')
            .setDescription(
              "`cry!shop` — Browse Mental, Nursery, and Jewellery catalogs.\n" +
              "`cry!buy <item_id> [qty]` — Purchase an item using crystals.\n" +
              "`cry!sell <item_id> [qty]` — Sell back items for 50% refund.\n" +
              "`cry!inv` — Inspect your current backpack.\n" +
              "`cry!roleshop` — Browse the 31 unique vanity cosmetic titles.\n" +
              "`cry!buyrole <id>` — Purchase and equip a role instantly.\n" +
              "`cry!equip <id>` / `cry!unequip` — Manage your profile codex title.\n" +
              "`cry!myroles` — View all owned titles."
            );
        } else if (cat === 'nursery') {
          embed.setTitle('✧ MODULE: BOTANICAL NURSERY ✧')
            .setDescription(
              "`cry!sow <seed_id>` — Plant a seed in your private sanctuary.\n" +
              "`cry!water` — Hydrate your active plant (24h CD). Missing >3 days wilts it!\n" +
              "`cry!fertilise` — Use cocopeat once per plant to jump 2 stages instantly.\n" +
              "`cry!harvest` — Answer a botanical quiz on your plant to reap crystals!\n" +
              "`cry!plants` — View your growth bar and historical harvest archive."
            );
        } else if (cat === 'games') {
          embed.setTitle('✧ MODULE: GAMES & GAMBLING ✧')
            .setDescription(
              "`cry!chessduel @user <wager>` — 3-minute tactical RPS duel!\n" +
              "`cry!imposter` — 4-phase Murder Mystery (10m Server Global CD).\n" +
              "`cry!trivia` — 15-second answering race for crystals.\n" +
              "`cry!slots <bet>` — Spin the crystal reels (3m CD).\n" +
              "`cry!beg` — Beg for 0-67 crystals (3m CD, 20 attempts limit).\n" +
              "`cry!rps <bet> <r/p/s>` — Rock Paper Scissors against the bot."
            );
        } else if (cat === 'romance') {
          embed.setTitle('✧ MODULE: ROMANCE & SOCIAL ✧')
            .setDescription(
              "`cry!propose @user` — Propose with a normal ring to become BF/GF!\n" +
              "`cry!marry @user` — Bind souls with a wedding ring!\n" +
              "`cry!divorce` — Break celestial bonds (with troll ping).\n" +
              "`cry!partner [@user]` — View dating, marriage, and lovies codex.\n" +
              "`cry!love` — Send daily affection to your spouse (24h CD).\n" +
              "`cry!ship @user [@user2]` — Astral Gate Canvas card (3m CD, 0s for VIP).\n\n" +
              "**Social (1m CD):** `slap`, `bonk`, `poke`, `punch`, `pinch`, `bite`, `hug`, `kiss`, `pat`, `highfive`, `dance`, `laugh`, `blush`, `twerk`"
            );
        } else if (cat === 'fun') {
          embed.setTitle('✧ MODULE: FUN & UTILITY ✧')
            .setDescription(
              "`cry!gay` / `cry!lesbian` / `cry!rate` — Dynamic canvas gauges!\n" +
              "`cry!cf` — Animated crystal coin toss (Zero-bet utility).\n" +
              "`cry!dice` — Animated six-sided crystal die roll (Zero-bet utility).\n" +
              "`cry!crystalstorm` — Bless a random active user with 500 crystals (3h Server CD)!\n" +
              "`cry!pickup` / `cry!roast` — Aesthetic charm or ruthless burns.\n" +
              "`cry!anonymous <msg>` — Send an untraceable message (3 uses max).\n" +
              "`cry!profile` / `cry!rank` — Soul Codex visual profile."
            );
        } else if (cat === 'admin') {
          embed.setTitle('✧ MODULE: ADMIN UTILITY ✧')
            .setDescription(
              "`cry!setup-roles` — Deploys all 6 modular self-role dropdown menus.\n" +
              "`cry!poll <question>` — Initiates an interactive Yes/No or multi-option poll.\n" +
              "`cry!ac @user <amt>` — Grants crystals directly to an account.\n" +
              "`cry!rc @user <amt>` — Deducts crystals from an account."
            );
        }
        return embed;
      };

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('help_econ').setLabel('Economy').setStyle(ButtonStyle.Primary).setEmoji('🪙'),
        new ButtonBuilder().setCustomId('help_market').setLabel('Market').setStyle(ButtonStyle.Primary).setEmoji('🛍️'),
        new ButtonBuilder().setCustomId('help_nursery').setLabel('Nursery').setStyle(ButtonStyle.Primary).setEmoji('🌱')
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('help_games').setLabel('Games').setStyle(ButtonStyle.Secondary).setEmoji('♟️'),
        new ButtonBuilder().setCustomId('help_romance').setLabel('Romance').setStyle(ButtonStyle.Secondary).setEmoji('💍'),
        new ButtonBuilder().setCustomId('help_fun').setLabel('Fun').setStyle(ButtonStyle.Secondary).setEmoji('🔮'),
        new ButtonBuilder().setCustomId('help_admin').setLabel('Admin').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
      );

      const helpMsg = await message.reply({ embeds: [getHelpPage('landing')], components: [row1, row2] });
      const collector = helpMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "Run cry!help to open your own guide!", ephemeral: true });
        const cat = i.customId.replace('help_', '');
        await i.update({ embeds: [getHelpPage(cat)], components: [row1, row2] });
      });

      collector.on('end', () => {
        row1.components.forEach(b => b.setDisabled(true));
        row2.components.forEach(b => b.setDisabled(true));
        helpMsg.edit({ components: [row1, row2] }).catch(() => {});
      });
      return;
    }

    // ==========================================
    // PROFILE (CANVAS GRAPHIC CARD)
    // ==========================================
    if (command === 'profile' || command === 'p' || command === 'me') {
      const cd = checkCooldown(`prof_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Profile synchronization resting. Wait **${cd}s**.`);

      const targetMember = message.mentions.members.first() || message.member;
      const userDoc = await getUser(targetMember.id);
      const isTargetVip = targetMember.id === VIP_USER_ID;

      const allSorted = await User.find({}).sort({ balance: -1 });
      const rankIdx = allSorted.findIndex(u => u.userId === targetMember.id);
      const rankStr = rankIdx !== -1 ? `#${rankIdx + 1}` : 'Unranked';

      const cardBuffer = await renderProfileCard(userDoc, targetMember, rankStr, isTargetVip);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile_card.png' });

      return message.reply({ files: [attachment] });
    }

    // ==========================================
    // RANK & LB (TOP 10 CANVAS CARD)
    // ==========================================
    if (command === 'rank' || command === 'lb' || command === 'leaderboard') {
      const cd = checkCooldown(`lb_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Wait **${cd}s**.`);

      const allUsers = await User.find({}).sort({ balance: -1 }).limit(100);
      const top10List = [];

      for (const doc of allUsers) {
        const member = message.guild.members.cache.get(doc.userId);
        if (member) {
          top10List.push({ doc, member });
        }
        if (top10List.length >= 10) break;
      }

      const authorDoc = await getUser(message.author.id);
      const authorRankIdx = allUsers.findIndex(u => u.userId === message.author.id);
      const authorRank = authorRankIdx !== -1 ? authorRankIdx + 1 : 'Unranked';

      const lbBuffer = await renderLeaderboardCard(top10List, authorDoc, authorRank, message.member);
      const attachment = new AttachmentBuilder(lbBuffer, { name: 'leaderboard.png' });

      return message.reply({ files: [attachment] });
    }

    // ==========================================
    // MODULE: ECONOMY
    // ==========================================

    // WORK
    if (command === 'work') {
      const user = await getUser(message.author.id);

      if (user.workAttempts >= 40) {
        if (!user.workResetTime) user.workResetTime = new Date(Date.now() + 86400000);
        await user.save();
        const remSecs = Math.ceil((new Date(user.workResetTime).getTime() - Date.now()) / 1000);
        return message.reply(`🛑 **Shift Exhaustion!** You completed all **40 shifts**! Recharges in **${formatDuration(remSecs)}**.`);
      }

      const cd = checkCooldown(`work_${message.author.id}`, 180000);
      if (cd > 0) return message.reply(`⏳ Take a breather! The crystal mines reopen in **${cd}s**.`);

      const earned = Math.floor(Math.random() * 61) + 20; // 20 to 80
      user.balance += earned;
      user.workAttempts += 1;
      await addExperience(user, 15, message);

      let extra = '';
      if (user.workAttempts === 40) {
        user.balance += 500;
        user.workResetTime = new Date(Date.now() + 86400000);
        extra = `\n🎉 **DAILY SHIFT JACKPOT!** You completed all 40 shifts! Secured a massive bonus of **+500 ${cryCoin}**! (24-hour lockout begins)`;
      }

      await user.save();
      return message.reply(`⛏️ You mined through the crystal caverns and harvested **${earned} ${cryCoin}**! *(Shift ${user.workAttempts}/40)*${extra}`);
    }

    // BALANCE (cry!bal, cry!balance)
    if (command === 'bal' || command === 'balance') {
      const cd = checkCooldown(`bal_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Wait **${cd}s**.`);

      const target = message.mentions.users.first() || message.author;
      const user = await getUser(target.id);

      const balEmbed = new EmbedBuilder()
        .setTitle('✧ CRYSTAL VAULT ARCHIVE ✧')
        .setColor('#2d0c45')
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Account Holder:** <@${target.id}>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👛 **Liquid Crystals:** \`${user.balance.toLocaleString()}\` ${cryCoin}\n` +
          `🏛️ **Vault Stash:** \`${user.bank.toLocaleString()}\` ${cryCoin}\n` +
          `💎 **Net Worth:** \`${(user.balance + user.bank).toLocaleString()}\` ${cryCoin}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({ text: 'Crystal Financial Ledger • Verified Attunement' });

      return message.reply({ embeds: [balEmbed] });
    }

    // DAILY
    if (command === 'daily') {
      const user = await getUser(message.author.id);
      if (user.dailyLastClaimed) {
        const diff = Date.now() - new Date(user.dailyLastClaimed).getTime();
        if (diff < 86400000) {
          const rem = Math.ceil((86400000 - diff) / 1000);
          return message.reply(`⏳ You already received your astral grant! Return in **${formatDuration(rem)}**.`);
        }
      }

      user.balance += 667;
      user.dailyLastClaimed = new Date();
      await addExperience(user, 25, message);
      await user.save();

      return message.reply(`🎁 **ASTRAL ALLOWANCE!** The cosmos gifted you **667 ${cryCoin}**!`);
    }

    // TRANSFERS (cry!pay, cry!send)
    if (command === 'pay' || command === 'send') {
      const cd = checkCooldown(`pay_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Transfer frequency restricted. Wait **${cd}s**.`);

      const target = message.mentions.users.first();
      const amt = parseInt(args[1], 10);

      if (!target || target.bot || target.id === message.author.id) {
        return message.reply(`⚠️ Correct usage: \`cry!${command} @user <amount>\``);
      }
      if (isNaN(amt) || amt <= 0) return message.reply("⚠️ Specify a valid positive crystal amount.");

      const sender = await getUser(message.author.id);
      if (sender.balance < amt) return message.reply(`❌ Insufficient funds! Current Balance: **${sender.balance} ${cryCoin}**`);

      const receiver = await getUser(target.id);
      sender.balance -= amt;
      receiver.balance += amt;

      await sender.save();
      await receiver.save();

      return message.reply(`✨ Transferred **${amt.toLocaleString()} ${cryCoin}** to <@${target.id}>!`);
    }
    
    // ==========================================
    // MODULE: MARKET & WARDROBE
    // ==========================================

    // SHOP
    if (command === 'shop') {
      let page = 1;
      const renderShop = (p) => {
        const embed = new EmbedBuilder().setColor('#1a0826');
        if (p === 1) {
          embed.setTitle('✧ THE CELESTIAL BAZAAR • MENTAL STORE (1/3) ✧')
            .setDescription(
              `🏷️ **Unemployed Badge** — \`FREE\` (ID: \`unemployed_badge\`)\n*Proof that you do absolutely nothing all day.*\n\n` +
              `🧦 **Left Sock** — \`69\` ${cryCoin} (ID: \`left_sock\`)\n*Where did the right one go? Nobody knows.*\n\n` +
              `🥔 **Potato** — \`2,300\` ${cryCoin} (ID: \`potato\`)\n*Can survive nuclear fallout and runs basic bots.*\n\n` +
              `🧻 **Toilet Paper** — \`8,888\` ${cryCoin} (ID: \`toilet_paper\`)\n*Peak pandemic luxury flex.*\n\n` +
              `🧙‍♂️ **Wizard Hat** — \`12,000\` ${cryCoin} (ID: \`wizard_hat\`)\n*+5 Intelligence, -10 social skills.*`
            );
        } else if (p === 2) {
          embed.setTitle('✧ THE CELESTIAL BAZAAR • BOTANICAL NURSERY (2/3) ✧')
            .setDescription(
              `🧪 **Cocopeat (Fertiliser)** — \`800\` ${cryCoin} (ID: \`cocopeat\`)\n*Advances your plant by 2 stages instantly.*\n\n` +
              `🚿 **Watering Can** — \`1,500\` ${cryCoin} (ID: \`watering_can\`)\n*Starlight vessel required for plant hydration.*\n\n` +
              `**🌱 Geode Seeds:**\n` +
              `• **Rose Seed** — \`500\` ${cryCoin} (ID: \`rose_seed\`)\n` +
              `• **Lavender Seed** — \`600\` ${cryCoin} (ID: \`lavender_seed\`)\n` +
              `• **Sunflower Seed** — \`700\` ${cryCoin} (ID: \`sunflower_seed\`)\n` +
              `• **Moonflower Seed** — \`800\` ${cryCoin} (ID: \`moonflower_seed\`)\n` +
              `• **Orchid Seed** — \`900\` ${cryCoin} (ID: \`orchid_seed\`)\n` +
              `• **Lotus Seed** — \`950\` ${cryCoin} (ID: \`lotus_seed\`)\n` +
              `• **Crystal Geode Seed** — \`1,000\` ${cryCoin} (ID: \`crystal_geode_seed\`)`
            );
        } else {
          embed.setTitle('✧ THE CELESTIAL BAZAAR • JEWELLERY ATELIER (3/3) ✧')
            .setDescription(
              `💍 **Normal Ring** — \`5,000\` ${cryCoin} (ID: \`normal_ring\`)\n*Required to propose via cry!propose.*\n\n` +
              `👑 **Wedding Ring** — \`10,000\` ${cryCoin} (ID: \`wedding_ring\`)\n*Required to bind souls via cry!marry.*\n\n` +
              `🎖️ **Crystal Badge** — \`30,000\` ${cryCoin} (ID: \`crystal_badge\`)\n*A gleaming sigil of crystal affluence.*\n\n` +
              `🌌 **Celestial Crystal** — \`150,000\` ${cryCoin} (ID: \`celestial_crystal\`)\n*A fragment of primordial astral energy.*`
            );
        }
        embed.setFooter({ text: `Page ${p} of 3 • Use cry!buy <id> [qty] to purchase` });
        return embed;
      };

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary)
      );

      const msg = await message.reply({ embeds: [renderShop(1)], components: [btnRow] });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "Run cry!shop to browse yourself!", ephemeral: true });
        if (i.customId === 'shop_prev') page = page > 1 ? page - 1 : 3;
        else page = page < 3 ? page + 1 : 1;
        await i.update({ embeds: [renderShop(page)], components: [btnRow] });
      });

      collector.on('end', () => {
        btnRow.components.forEach(b => b.setDisabled(true));
        msg.edit({ components: [btnRow] }).catch(() => {});
      });
      return;
    }

    // BUY ITEM
    if (command === 'buy') {
      const itemId = (args[0] || '').toLowerCase();
      const qty = parseInt(args[1], 10) || 1;
      const item = MARKET_ITEMS[itemId];

      if (!item) return message.reply("⚠️ Unknown item! Check `cry!shop` for valid item IDs.");
      if (qty <= 0) return message.reply("⚠️ Specify a valid quantity.");

      const totalCost = item.price * qty;
      const user = await getUser(message.author.id);

      if (user.balance < totalCost && !isVip) {
        return message.reply(`❌ You need **${totalCost.toLocaleString()} ${cryCoin}** to purchase this!`);
      }

      if (!isVip) user.balance -= totalCost;
      const currentQty = user.inventory.get(itemId) || 0;
      user.inventory.set(itemId, currentQty + qty);

      await user.save();
      return message.reply(`✨ Purchased **${qty}x ${item.name}** for **${totalCost.toLocaleString()} ${cryCoin}**!`);
    }

    // SELL ITEM
    if (command === 'sell') {
      const itemId = (args[0] || '').toLowerCase();
      const qty = parseInt(args[1], 10) || 1;
      const item = MARKET_ITEMS[itemId];

      if (!item) return message.reply("⚠️ Unknown item! Check `cry!inv` for your items.");
      if (qty <= 0) return message.reply("⚠️ Specify a valid quantity.");

      const user = await getUser(message.author.id);
      const currentQty = user.inventory.get(itemId) || 0;

      if (currentQty < qty) return message.reply(`❌ You only own **${currentQty}x ${item.name}**!`);

      const refund = item.sell * qty;
      user.balance += refund;
      if (currentQty === qty) user.inventory.delete(itemId);
      else user.inventory.set(itemId, currentQty - qty);

      await user.save();
      return message.reply(`💰 Sold **${qty}x ${item.name}** for **${refund.toLocaleString()} ${cryCoin}** (50% value)!`);
    }

    // INVENTORY (cry!inv, cry!inventory)
    if (command === 'inv' || command === 'inventory') {
      const user = await getUser(message.author.id);
      let desc = '';

      if (isVip) {
        desc = "**👑 VIP Vault:** All items unlocked & verified across all realms.\n\n";
        for (const it of Object.values(MARKET_ITEMS)) {
          desc += `• **${it.name}** \`[${it.id}]\` — 999x\n`;
        }
      } else {
        if (!user.inventory || user.inventory.size === 0) {
          desc = "*Your backpack is currently empty. Visit `cry!shop` to purchase items!*";
        } else {
          for (const [key, amount] of user.inventory.entries()) {
            const it = MARKET_ITEMS[key];
            if (it && amount > 0) {
              desc += `• **${it.name}** \`[${it.id}]\` — **${amount}x**\n`;
            }
          }
        }
      }

      const invEmbed = new EmbedBuilder()
        .setTitle(`✧ CRYSTAL BACKPACK: ${message.author.username} ✧`)
        .setColor('#2d0c45')
        .setDescription(desc)
        .setFooter({ text: "Use cry!sell <id> [qty] to sell items for 50% crystals" });

      return message.reply({ embeds: [invEmbed] });
    }

    // ROLESHOP
    if (command === 'roleshop') {
      let rPage = 1;
      const totalPages = Math.ceil(ROLE_CATALOG.length / 5);

      const renderRoles = (p) => {
        const start = (p - 1) * 5;
        const pageRoles = ROLE_CATALOG.slice(start, start + 5);

        const lines = pageRoles.map(r => {
          return `<@&${r.roleId}> • \`${r.price.toLocaleString()}\` ${cryCoin}\n*ID:* \`${r.id}\` • *${r.desc}*`;
        }).join('\n\n');

        return new EmbedBuilder()
          .setTitle(`✧ THE CRYSTAL ATRIUM • WARDROBE (${p}/${totalPages}) ✧`)
          .setColor('#f72585')
          .setDescription(lines)
          .setFooter({ text: `Page ${p} of ${totalPages} • Use cry!buyrole <id> to unlock and equip` });
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rshop_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rshop_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary)
      );

      const rMsg = await message.reply({ embeds: [renderRoles(1)], components: [row] });
      const collector = rMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "Open your own roleshop with cry!roleshop", ephemeral: true });
        if (i.customId === 'rshop_prev') rPage = rPage > 1 ? rPage - 1 : totalPages;
        else rPage = rPage < totalPages ? rPage + 1 : 1;
        await i.update({ embeds: [renderRoles(rPage)], components: [row] });
      });

      collector.on('end', () => {
        row.components.forEach(b => b.setDisabled(true));
        rMsg.edit({ components: [row] }).catch(() => {});
      });
      return;
    }

    // BUY ROLE
    if (command === 'buyrole') {
      const rId = (args[0] || '').toLowerCase();
      const roleItem = ROLE_CATALOG.find(r => r.id === rId);

      if (!roleItem) return message.reply("⚠️ Role ID not found! Check `cry!roleshop`.");

      const user = await getUser(message.author.id);
      if (user.rolesOwned.includes(roleItem.name) && !isVip) {
        return message.reply(`❌ You already own the **${roleItem.name}** title!`);
      }

      if (user.balance < roleItem.price && !isVip) {
        return message.reply(`❌ You need **${roleItem.price.toLocaleString()} ${cryCoin}** to unlock this role!`);
      }

      if (!isVip) user.balance -= roleItem.price;
      if (!user.rolesOwned.includes(roleItem.name)) user.rolesOwned.push(roleItem.name);
      user.equippedRole = roleItem.name;

      try {
        const guildRole = message.guild.roles.cache.get(roleItem.roleId);
        if (guildRole) await message.member.roles.add(guildRole);
      } catch (err) {
        console.warn('Role assign failed in guild hierarchy:', err.message);
      }

      await user.save();
      return message.reply(`✨ Successfully unlocked and equipped the **${roleItem.name}** title!`);
    }

    // ==========================================
    // EQUIP ROLE (FIXED CASE MATCHING & ROLE SYNC)
    // ==========================================
    if (command === 'equip') {
      const query = args.join(' ').toLowerCase().trim();
      if (!query) return message.reply("⚠️ Specify a valid role: `cry!equip <id or name>`");

      // Match by ID or Name
      const roleItem = ROLE_CATALOG.find(r => r.id.toLowerCase() === query || r.name.toLowerCase() === query);
      if (!roleItem) return message.reply("⚠️ Role not found in catalogue! Check `cry!roleshop`.");

      const user = await getUser(message.author.id);
      const ownsRole = user.rolesOwned.some(r => r.toLowerCase() === roleItem.name.toLowerCase()) || isVip;

      if (!ownsRole) {
        return message.reply(`❌ You do not own the **${roleItem.name}** title! Buy it in \`cry!roleshop\`.`);
      }

      // Strip any other existing vanity roles from member
      try {
        const allVanityIds = ROLE_CATALOG.map(r => r.roleId);
        await message.member.roles.remove(allVanityIds);
      } catch {}

      user.equippedRole = roleItem.name;

      // Assign the matching guild role
      let roleNotice = '';
      try {
        const targetGuildRole = message.guild.roles.cache.get(roleItem.roleId);
        if (targetGuildRole) {
          await message.member.roles.add(targetGuildRole);
          roleNotice = ` and assigned you the **${targetGuildRole.name}** server role!`;
        }
      } catch {
        roleNotice = ' (Title updated in profile; ensure bot role is higher to assign server role).';
      }

      await user.save();
      return message.reply(`✨ Equipped **${roleItem.name}** as your active profile title${roleNotice}`);
    }

    // ==========================================
    // UNEQUIP ROLE (STRIPS GUILD ROLE PROPERLY)
    // ==========================================
    if (command === 'unequip') {
      const user = await getUser(message.author.id);
      user.equippedRole = 'Default Prism';

      try {
        const allVanityIds = ROLE_CATALOG.map(r => r.roleId);
        await message.member.roles.remove(allVanityIds);
      } catch {}

      await user.save();
      return message.reply("✨ Unequipped your active title and removed server vanity roles! Reset to Default Prism.");
    }

    // MY ROLES
    if (command === 'myroles') {
      const user = await getUser(message.author.id);
      const list = user.rolesOwned.map(r => `• **${r}**`).join('\n') || '• Default Prism';

      const myRolesEmbed = new EmbedBuilder()
        .setTitle(`✧ WARDROBE VAULT: ${message.author.username} ✧`)
        .setColor('#f72585')
        .setDescription(list)
        .setFooter({ text: "Use cry!equip <id> to switch active titles" });

      return message.reply({ embeds: [myRolesEmbed] });
    }

    // ==========================================
    // MODULE: BOTANICAL NURSERY
    // ==========================================

    // SOW SEED
    if (command === 'sow') {
      const user = await getUser(message.author.id);
      if (user.activePlant) {
        return message.reply("❌ You already have an active seedling growing! Check `cry!plants`.");
      }

      const seedId = (args[0] || '').toLowerCase();
      const seedItem = MARKET_ITEMS[seedId];

      if (!seedItem || seedItem.category !== 'seeds') {
        return message.reply("⚠️ Specify a valid seed from your inventory: `cry!sow <seed_id>` (e.g., `cry!sow moonflower_seed`)");
      }

      const count = user.inventory.get(seedId) || 0;
      if (count < 1 && !isVip) {
        return message.reply(`❌ You don't have any **${seedItem.name}**! Buy one from \`cry!shop\`.`);
      }

      if (!isVip) {
        if (count === 1) user.inventory.delete(seedId);
        else user.inventory.set(seedId, count - 1);
      }

      user.activePlant = {
        plantName: seedItem.plantName,
        stage: 1,
        plantedAt: new Date(),
        lastWatered: new Date(),
        fertilised: false,
        neglectDays: 0,
        lastCheckedDate: new Date()
      };

      await user.save();
      const factList = BOTANICAL_FACTS[seedItem.plantName] || ["Crystals resonate with botanical life."];
      return message.reply(`🌱 Planted a **${seedItem.plantName}** in your sanctuary!\n\n📜 **Botanical Insight:**\n*"${factList[0]}"*`);
    }

    // WATER PLANT
    if (command === 'water') {
      const user = await getUser(message.author.id);
      if (!user.activePlant) return message.reply("🥀 You don't have any plants growing! Use `cry!sow <seed_id>`.");

      const cd = checkCooldown(`water_${message.author.id}`, 86400000);
      if (cd > 0) return message.reply(`⏳ Your plant is fully hydrated! Next watering in **${formatDuration(cd)}**.`);

      if (user.activePlant.lastWatered) {
        const daysPassed = Math.floor((Date.now() - new Date(user.activePlant.lastWatered).getTime()) / (1000 * 60 * 60 * 24));
        if (daysPassed > 3) {
          user.activePlant = null;
          await user.save();
          return message.reply("💀 **Tragedy!** You neglected your plant for more than 3 days. It wilted into dust.");
        } else if (daysPassed > 1) {
          user.activePlant.stage = Math.max(1, user.activePlant.stage - (daysPassed - 1));
        }
      }

      user.activePlant.stage = Math.min(5, user.activePlant.stage + 1);
      user.activePlant.lastWatered = new Date();
      user.activePlant.neglectDays = 0;

      const facts = BOTANICAL_FACTS[user.activePlant.plantName] || ["Botanical frequencies align with crystals."];
      const fact = facts[user.activePlant.stage - 1] || facts[0];

      await addExperience(user, 20, message);
      await user.save();

      return message.reply(`💧 You watered your **${user.activePlant.plantName}**! Growth reached **Stage ${user.activePlant.stage}/5**!\n\n📜 **Botanical Discovery:**\n*"${fact}"*`);
    }

    // FERTILISE PLANT
    if (command === 'fertilise' || command === 'fertilize') {
      const user = await getUser(message.author.id);
      if (!user.activePlant) return message.reply("🥀 You don't have an active plant!");
      if (user.activePlant.fertilised) return message.reply("⚠️ This plant has already received fertiliser! (1 use per plant)");

      const count = user.inventory.get('cocopeat') || 0;
      if (count < 1 && !isVip) return message.reply("❌ You need **Cocopeat** to fertilise! Buy it in `cry!shop`.");

      if (!isVip) {
        if (count === 1) user.inventory.delete('cocopeat');
        else user.inventory.set('cocopeat', count - 1);
      }

      user.activePlant.fertilised = true;
      user.activePlant.stage = Math.min(5, user.activePlant.stage + 2);
      await user.save();

      return message.reply(`🧪 Applied Cocopeat! Your **${user.activePlant.plantName}** rapidly surged to **Stage ${user.activePlant.stage}/5**!`);
    }

    // HARVEST PLANT (WITH QUIZ)
    if (command === 'harvest') {
      const user = await getUser(message.author.id);
      if (!user.activePlant) return message.reply("🥀 You don't have any plants growing!");
      if (user.activePlant.stage < 5) {
        return message.reply(`🌿 Your **${user.activePlant.plantName}** is only at **Stage ${user.activePlant.stage}/5**. It must reach Stage 5 to harvest!`);
      }

      const pName = user.activePlant.plantName;
      const facts = BOTANICAL_FACTS[pName] || ["Botanical magic."];
      const correctFact = facts[Math.floor(Math.random() * facts.length)];

      const qEmbed = new EmbedBuilder()
        .setTitle(`✧ HARVEST QUIZ: ${pName.toUpperCase()} ✧`)
        .setColor('#2ec4b6')
        .setDescription(`To harvest your blooming **${pName}**, prove your botanical mastery!\n\n**Is the following fact TRUE or FALSE regarding this plant?**\n\n> *"${correctFact}"*`)
        .setFooter({ text: "Respond using the buttons below within 20 seconds!" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('quiz_true').setLabel('TRUE').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('quiz_false').setLabel('FALSE').setStyle(ButtonStyle.Danger)
      );

      const qMsg = await message.reply({ embeds: [qEmbed], components: [row] });
      const collector = qMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "This harvest quiz is not for you!", ephemeral: true });

        row.components.forEach(b => b.setDisabled(true));
        await qMsg.edit({ components: [row] });

        if (i.customId === 'quiz_true') {
          const reward = 1200;
          user.balance += reward;
          user.harvestedPlants.push(pName);
          user.activePlant = null;
          await addExperience(user, 50, message);
          await user.save();
          return i.reply(`🎉 **HARVEST TRIUMPH!** Correct! You harvested your **${pName}** and reaped **+${reward} ${cryCoin}**!`);
        } else {
          user.activePlant.stage = Math.max(1, user.activePlant.stage - 2);
          await user.save();
          return i.reply(`❌ **INCORRECT!** The plant suffered botanical shock and decayed down to **Stage ${user.activePlant.stage}/5**!`);
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'user') {
          row.components.forEach(b => b.setDisabled(true));
          qMsg.edit({ components: [row] }).catch(() => {});
        }
      });
      return;
    }

    // ==========================================
    // PLANTS (CANVAS GREENHOUSE CARD)
    // ==========================================
    if (command === 'plants') {
      const user = await getUser(message.author.id);
      const plantsBuffer = await renderPlantsCard(user, message.author.username);
      const attachment = new AttachmentBuilder(plantsBuffer, { name: 'botanical_sanctuary.png' });

      return message.reply({ files: [attachment] });
    }

    // ==========================================
    // MODULE: GAMES & GAMBLING
    // ==========================================

    // CHESS DUEL
    if (command === 'chessduel') {
      const opponent = message.mentions.users.first();
      const wager = parseInt(args[1], 10) || 0;

      if (!opponent || opponent.bot || opponent.id === message.author.id) {
        return message.reply("⚠️ Challenge an opponent: `cry!chessduel @user <wager>`");
      }
      if (wager < 0) return message.reply("⚠️ Wager cannot be negative.");

      const cd = checkCooldown(`chess_${message.author.id}`, 180000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Grandmaster duel cooling down. Wait **${cd}s**.`);

      const p1 = await getUser(message.author.id);
      const p2 = await getUser(opponent.id);

      if (p1.balance < wager) return message.reply(`❌ You don't have enough crystals for a wager of **${wager} ${cryCoin}**!`);
      if (p2.balance < wager) return message.reply(`❌ <@${opponent.id}> doesn't have enough crystals!`);

      const duelEmbed = new EmbedBuilder()
        .setTitle('♟️ GRANDMASTER\'S TACTICAL DUEL')
        .setColor('#2d0c45')
        .setDescription(`<@${message.author.id}> challenged <@${opponent.id}> to a tactical chess match!\n**Pot:** **${wager * 2} ${cryCoin}**\n\nChoose your playstyle by clicking a button below!`)
        .setFooter({ text: "All-Out Attack beats Squeeze | Defense beats Attack | Squeeze beats Defense" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('chess_attack').setLabel('⚔ All-Out Attack').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('chess_defense').setLabel('🛡️ Solid Defense').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('chess_squeeze').setLabel('🧠 Position Squeeze').setStyle(ButtonStyle.Secondary)
      );

      const duelMsg = await message.channel.send({ embeds: [duelEmbed], components: [row] });
      const choices = new Map();

      const collector = duelMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 35000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id && i.user.id !== opponent.id) {
          return i.reply({ content: "You are not part of this duel!", ephemeral: true });
        }
        if (choices.has(i.user.id)) {
          return i.reply({ content: "You already locked in your strategy!", ephemeral: true });
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
          return message.channel.send("⌛ **Duel Expired!** One of the players failed to choose. Wagers refunded.");
        }

        const c1 = choices.get(message.author.id);
        const c2 = choices.get(opponent.id);

        let winner = null;
        let story = "";

        if (c1 === c2) {
          story = `Both players chose **${c1.toUpperCase()}**! A rapid blitz scramble led to a threefold repetition draw! Wagers returned.`;
        } else if (
          (c1 === 'attack' && c2 === 'squeeze') ||
          (c1 === 'defense' && c2 === 'attack') ||
          (c1 === 'squeeze' && c2 === 'defense')
        ) {
          winner = message.author;
          if (c1 === 'attack') story = `<@${message.author.id}> unleashed an aggressive king-hunt before <@${opponent.id}> could finish developing! Checkmate!`;
          if (c1 === 'defense') story = `<@${opponent.id}> sacrificed pieces recklessly, but <@${message.author.id}> held an impenetrable pawn fortress! Resignation on move 24!`;
          if (c1 === 'squeeze') story = `<@${message.author.id}> quietly dominated every open file and ground down <@${opponent.id}> in the endgame!`;
        } else {
          winner = opponent;
          if (c2 === 'attack') story = `<@${opponent.id}> caught <@${message.author.id}> unawares with a deadly queen-side tactic! Checkmate!`;
          if (c2 === 'defense') story = `<@${message.author.id}> overextended, and <@${opponent.id}> converted the clean counter-punch victory!`;
          if (c2 === 'squeeze') story = `<@${opponent.id}> completely dominated the center squares, taking the victory effortlessly!`;
        }

        if (winner && wager > 0) {
          const wUser = await getUser(winner.id);
          const lUser = await getUser(winner.id === message.author.id ? opponent.id : message.author.id);
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

    // MANSION IMPOSTER: COMPREHENSIVE GUIDE
    if (command === 'imposterlearn') {
      let page = 1;
      const getLearnEmbed = (p) => {
        const embed = new EmbedBuilder().setColor('#2d0c45');
        if (p === 1) {
          embed.setTitle('✧ MANSION IMPOSTER: GAMEPLAY & PHASES (1/3) ✧')
            .setDescription(
              "**Objective:** Innocents must uncover and banish the hidden Phantom before the mansion falls completely into darkness.\n\n" +
              "**1. Expedition Lobby:**\n" +
              "• Trigger with `cry!imposter`. Needs **at least 3 explorers** to begin.\n\n" +
              "**2. Night Phase (30 seconds):**\n" +
              "• Night falls and the mansion goes dark.\n" +
              "• Players with secret roles receive private DM action buttons (Kill, Protect, or Inspect).\n\n" +
              "**3. Morning Dawn & Roll Call:**\n" +
              "• The bot announces night casualties or shields along with an updated list of **Survivors** and **Fallen Guests**.\n\n" +
              "**4. Council & Banishment:**\n" +
              "• **60s Debate Phase:** Discuss clues in chat.\n" +
              "• **30s Secret Voting Phase:** Vote via interactive buttons to banish a suspect! Majority vote eliminates them."
            );
        } else if (p === 2) {
          embed.setTitle('✧ MANSION IMPOSTER: SECRET ROLES (2/3) ✧')
            .setDescription(
              "🗡️ **The Phantom (The Imposter):**\n" +
              "• *Objective:* Eliminate players until parity with survivors is reached.\n" +
              "• *Night Action:* Receives DM buttons each night to secretly choose a victim to assassinate.\n\n" +
              "🔮 **The Oracle (The Detective):**\n" +
              "• *Objective:* Identify the Phantom and guide the innocents.\n" +
              "• *Night Action:* Inspects one player per night. The bot whispers back whether their aura is pure or dark resonance.\n\n" +
              "🛡️ **The Guardian (The Bodyguard):**\n" +
              "• *Objective:* Keep guests alive.\n" +
              "• *Night Action:* Wards one player each night. If the Phantom attacks them, the murder is blocked!\n" +
              "• *Restriction:* Cannot shield the same guest on consecutive nights.\n\n" +
              "🕯️ **The Explorer (The Innocent):**\n" +
              "• *Objective:* Survive, analyze behavioral clues, debate, and vote out the Phantom."
            );
        } else {
          embed.setTitle('✧ MANSION IMPOSTER: REWARDS & RULES (3/3) ✧')
            .setDescription(
              "**🏆 Victory Conditions & Rewards:**\n" +
              "• **Innocents Win:** Banishing the Phantom awards all surviving innocents, the Oracle, and the Guardian **+200 crystals** each!\n" +
              "• **Phantom Wins:** Reducing survivors down to 1 (or parity) awards the Phantom the grand pot of **+500 crystals**!\n\n" +
              "**⚠️ Important Rules:**\n" +
              "• **Keep DMs Open:** The bot must be able to DM you your secret night action buttons!\n" +
              "• **Tied Votes:** If votes tie or time expires without a majority, nobody is banished and night falls immediately."
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
        if (i.user.id !== message.author.id) return i.reply({ content: "Open your own guide with cry!imposterlearn", ephemeral: true });
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

    // MULTI-ROUND MANSION IMPOSTER
    if (command === 'imposter') {
      const cd = checkCooldown('imposter_global', 600000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Mansion corridors are sealed under investigation! Server Cooldown: **${formatDuration(cd)}**.`);

      if (activeGames.has(message.channel.id)) return message.reply("⚠️ An expedition is already underway in this channel!");

      const lobbyEmbed = new EmbedBuilder()
        .setTitle('🏰 MANSION IMPOSTER — EXPEDITION REGISTRATION')
        .setColor('#2d0c45')
        .setDescription("A malevolent presence stalks the crystal corridors.\nRequires **at least 3 players** to begin.\n\nClick **Join Expedition** below!")
        .setFooter({ text: "Registration closes in 25 seconds." });

      const joinBtn = new ButtonBuilder().setCustomId('join_imposter').setLabel('Join Expedition').setStyle(ButtonStyle.Primary).setEmoji('🚪');
      const row = new ActionRowBuilder().addComponents(joinBtn);

      const lobbyMsg = await message.channel.send({ embeds: [lobbyEmbed], components: [row] });
      const players = new Set([message.author.id]);

      const lobbyCollector = lobbyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });

      lobbyCollector.on('collect', async i => {
        if (players.has(i.user.id)) return i.reply({ content: "You are already registered!", ephemeral: true });
        players.add(i.user.id);
        await i.reply({ content: `✅ Registered! (${players.size} players in lobby)`, ephemeral: true });
      });

      lobbyCollector.on('end', async () => {
        row.components[0].setDisabled(true);
        await lobbyMsg.edit({ components: [row] });

        if (players.size < 3) {
          return message.channel.send("❌ Not enough explorers entered the corridor. Minimum 3 required.");
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

        if (shuffled.length === 3 || shuffled.length === 4) {
          if (Math.random() < 0.5) {
            oracleId = shuffled[1];
            roles.set(oracleId, 'Oracle');
          } else {
            guardianId = shuffled[1];
            roles.set(guardianId, 'Guardian');
          }
        } else if (shuffled.length >= 5) {
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
            if (role === 'Phantom') {
              await member.send("🗡️ **YOU ARE THE PHANTOM.** Eliminate the explorers one by one without getting caught.");
            } else if (role === 'Oracle') {
              await member.send("🔮 **YOU ARE THE ORACLE.** Each night, inspect one guest to uncover their aura.");
            } else if (role === 'Guardian') {
              await member.send("🛡️ **YOU ARE THE GUARDIAN.** Each night, shield one guest from being attacked.");
            } else {
              await member.send("🕯️ **YOU ARE AN EXPLORER.** Survive the nights, analyze clues, and vote out the Phantom during the council.");
            }
          } catch {}
        }

        message.channel.send(`🕯️ **The heavy gates lock shut! Roles have been dispatched to your private DMs.** (${playerArray.length} explorers entered)`);

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
            message.channel.send("🎉 **JUSTICE RESTORED!** The Phantom has been banished from the mansion!\n**INNOCENTS WIN!**");
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
            message.channel.send("💀 **THE MANSION HAS FALLEN!** The Phantom overwhelmed the survivors in the darkness!\n**PHANTOM WINS!**");
            const killer = await getUser(phantomId);
            killer.balance += 500;
            await killer.save();
            message.channel.send(`👑 <@${phantomId}> was the Phantom and escaped with **+500 ${cryCoin}**!`);
            activeGames.delete(message.channel.id);
            return;
          }

          message.channel.send(`🌑 **NIGHT ${dayCount}: Pitch darkness engulfs the corridors...** Special roles, check your DMs! (30 seconds)`);

          let targetKillId = null;
          let targetProtectId = null;

          try {
            const pMember = await message.guild.members.fetch(phantomId);
            const killButtons = living.filter(id => id !== phantomId).map(id => {
              const mem = message.guild.members.cache.get(id);
              return new ButtonBuilder().setCustomId(`kill_${id}`).setLabel(mem ? mem.displayName.slice(0, 20) : 'Explorer').setStyle(ButtonStyle.Danger);
            });
            const kRow = new ActionRowBuilder().addComponents(killButtons.slice(0, 5));
            const kMsg = await pMember.send({ content: "🗡️ **Choose your strike target for tonight:**", components: [kRow] });
            const kCollector = kMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
            kCollector.on('collect', async ki => {
              targetKillId = ki.customId.replace('kill_', '');
              await ki.reply({ content: `Target locked: <@${targetKillId}>`, ephemeral: true });
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
              const gMsg = await gMember.send({ content: "🛡️ **Choose someone to shield tonight:**", components: [gRow] });
              const gCollector = gMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
              gCollector.on('collect', async gi => {
                targetProtectId = gi.customId.replace('ward_', '');
                lastProtected = targetProtectId;
                await gi.reply({ content: `Barrier raised over <@${targetProtectId}>`, ephemeral: true });
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
              const oMsg = await oMember.send({ content: "🔮 **Choose a guest's aura to inspect:**", components: [oRow] });
              const oCollector = oMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });
              oCollector.on('collect', async oi => {
                const inspectTarget = oi.customId.replace('inspect_', '');
                const isTargetPhantom = inspectTarget === phantomId;
                await oi.reply({
                  content: isTargetPhantom ? "🔮 **Dark, malevolent resonance detected! They are the Phantom!**" : "✨ **Pure starlight aura. They are an innocent explorer.**",
                  ephemeral: true
                });
                oCollector.stop();
              });
            } catch {}
          }

          setTimeout(async () => {
            let morningMessage = "";

            if (targetKillId && targetKillId === targetProtectId) {
              morningMessage = "🛡️ **A clash in the shadows!** The Phantom attempted a strike, but the Guardian's starlight ward blocked the blade! **Nobody died tonight!**";
            } else if (targetKillId) {
              living = living.filter(id => id !== targetKillId);
              dead.push({ id: targetKillId, reason: `Eliminated Night ${dayCount}` });
              morningMessage = `🚨 **A CHILLING SCREAM RESONATES!** <@${targetKillId}> was discovered lifeless in the courtyard!`;
            } else {
              morningMessage = "🕊️ **An eerie quiet.** The shadows crept through the halls, but no one was harmed.";
            }

            message.channel.send(`🌅 **MORNING BREAKS (DAY ${dayCount})**\n${morningMessage}`);
            message.channel.send({ embeds: [renderRollCall(dayCount)] });

            if (living.length <= 2 || !living.includes(phantomId)) {
              return runRound();
            }

            message.channel.send("🗣️ **Emergency Council initiated!** You have **60 seconds** to debate clues before voting opens!");

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
                content: "⚖️ **Discussion closed! Cast your vote for banishment:**",
                components: [vRow]
              });

              const votes = new Map();
              const vCollector = voteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 25000 });

              vCollector.on('collect', async vi => {
                if (!living.includes(vi.user.id)) return vi.reply({ content: "Dead guests cannot vote.", ephemeral: true });
                const votedFor = vi.customId.replace('vote_', '');
                votes.set(vi.user.id, votedFor);
                await vi.reply({ content: "Vote cast secretly.", ephemeral: true });
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
                  message.channel.send("⚖️ The council was divided. Nobody received a decisive majority. No one was banished!");
                } else {
                  living = living.filter(id => id !== exiledId);
                  const exiledRole = roles.get(exiledId);
                  dead.push({ id: exiledId, reason: `Banished Day ${dayCount} (${exiledRole})` });
                  message.channel.send(`🪟 <@${exiledId}> was exiled through the stained-glass gates! Their true role was: **${exiledRole.toUpperCase()}**!`);
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

    // BEG
    if (command === 'beg') {
      const user = await getUser(message.author.id);

      if (user.begAttempts >= 20) {
        if (!user.begResetTime) user.begResetTime = new Date(Date.now() + 86400000);
        await user.save();
        const remSecs = Math.ceil((new Date(user.begResetTime).getTime() - Date.now()) / 1000);
        return message.reply(`🛑 **Begging Quota Met!** You completed all **20 attempts**! Recharges in **${formatDuration(remSecs)}**.`);
      }

      const cd = checkCooldown(`beg_${message.author.id}`, 180000);
      if (cd > 0) return message.reply(`⏳ People are avoiding you. Wait **${cd}s**.`);

      const roll = Math.floor(Math.random() * 68);
      user.begAttempts += 1;

      if (roll === 0) {
        const trollQuotes = [
          "A passerby glanced at you, sighed, and handed you a coupon for expired milk.",
          "Someone dropped a rusty button into your chalice and sprinted away.",
          "A stray astral cat strolled over and knocked your cup over.",
          "A traveler told you to 'invest in your mindset' and gave zero crystals."
        ];
        await user.save();
        return message.reply(`💀 **Tough Luck!** ${trollQuotes[Math.floor(Math.random() * trollQuotes.length)]}\n*(Earned: **0 ${cryCoin}** | Attempt ${user.begAttempts}/20)*`);
      }

      user.balance += roll;
      await addExperience(user, 5, message);
      await user.save();

      if (roll >= 60) {
        return message.reply(`🗣️ **What in the Skibidi Ohio?!** A crypto-bard tossed you **${roll} ${cryCoin}** for reciting pure brainrot! *(Attempt ${user.begAttempts}/20)*`);
      }

      return message.reply(`🤲 A kind passerby tossed **${roll} ${cryCoin}** into your hands! *(Attempt ${user.begAttempts}/20)*`);
    }

    // SLOTS
    if (command === 'slots') {
      const bet = parseInt(args[0], 10);
      if (isNaN(bet) || bet <= 0) return message.reply("⚠️ Specify a valid bet: `cry!slots <bet>`");

      const cd = checkCooldown(`slots_${message.author.id}`, 180000);
      if (cd > 0 && !isVip) return message.reply(`⏳ The reels are hot! Wait **${cd}s**.`);

      const user = await getUser(message.author.id);
      if (user.balance < bet) return message.reply("❌ Insufficient crystals for this bet!");

      const symbols = ['💎', '🌸', '🔮', '🌙', '🍒'];
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols[Math.floor(Math.random() * symbols.length)];
      const s3 = symbols[Math.floor(Math.random() * symbols.length)];

      let winAmt = 0;
      let title = "💀 No Luck!";

      if (s1 === s2 && s2 === s3) {
        winAmt = bet * 5;
        title = "🎉 TRIPLE JACKPOT!";
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        winAmt = Math.floor(bet * 1.5);
        title = "✨ Matching Resonance!";
      } else {
        winAmt = -bet;
      }

      user.balance += winAmt;
      await user.save();

      const slotsEmbed = new EmbedBuilder()
        .setTitle(`🎰 CRYSTAL SLOTS • ${title}`)
        .setColor('#f72585')
        .setDescription(`[ ${s1} | ${s2} | ${s3} ]\n\n${winAmt > 0 ? `You won **+${winAmt.toLocaleString()}** ${cryCoin}!` : `You lost **-${bet.toLocaleString()}** ${cryCoin}.`}`)
        .setFooter({ text: `Current Balance: ${user.balance.toLocaleString()} crystals` });

      return message.reply({ embeds: [slotsEmbed] });
    }

    // RPS (ROCK PAPER SCISSORS)
    if (command === 'rockpaperscissors' || command === 'rps') {
      const bet = parseInt(args[0], 10);
      const choice = (args[1] || '').toLowerCase();

      if (isNaN(bet) || bet <= 0 || !['rock', 'paper', 'scissors', 'r', 'p', 's'].includes(choice)) {
        return message.reply("⚠️ Usage: `cry!rps <bet> <rock/paper/scissors>`");
      }

      const cd = checkCooldown(`rps_${message.author.id}`, 180000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Wait **${cd}s**.`);

      const user = await getUser(message.author.id);
      if (user.balance < bet) return message.reply("❌ Insufficient crystals!");

      const botOptions = ['rock', 'paper', 'scissors'];
      const botChoice = botOptions[Math.floor(Math.random() * botOptions.length)];
      const playerChoice = choice.startsWith('r') ? 'rock' : choice.startsWith('p') ? 'paper' : 'scissors';

      if (playerChoice === botChoice) {
        return message.reply(`⚖️ Both chose **${playerChoice}**! It's a draw. Bet refunded.`);
      }

      const won = (playerChoice === 'rock' && botChoice === 'scissors') ||
                  (playerChoice === 'paper' && botChoice === 'rock') ||
                  (playerChoice === 'scissors' && botChoice === 'paper');

      if (won) {
        user.balance += bet;
        await user.save();
        return message.reply(`🎉 You chose **${playerChoice}** and beat my **${botChoice}**! Won **+${bet.toLocaleString()} ${cryCoin}**!`);
      } else {
        user.balance -= bet;
        await user.save();
        return message.reply(`💀 I chose **${botChoice}** and beat your **${playerChoice}**! Lost **-${bet.toLocaleString()} ${cryCoin}**.`);
      }
    }

    // TRIVIA
    if (command === 'trivia') {
      const cd = checkCooldown(`trivia_${message.author.id}`, 60000);
      if (cd > 0) return message.reply(`⏳ Give your brain a break! Wait **${cd}s**.`);

      const selected = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
      await message.reply(`🧠 **CELESTIAL TRIVIA:**\n${selected.q}\n*(Type your answer in chat within 15 seconds!)*`);

      const filter = m => !m.author.bot;
      const collector = message.channel.createMessageCollector({ filter, time: 15000 });

      let answered = false;
      collector.on('collect', async m => {
        if (m.content.toLowerCase().includes(selected.a.toLowerCase())) {
          answered = true;
          collector.stop();
          const winner = await getUser(m.author.id);
          winner.balance += 50;
          await addExperience(winner, 20, message);
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

    // ==========================================
    // MODULE: ROMANCE
    // ==========================================

    // PROPOSE (BF/GF)
    if (command === 'propose') {
      const target = message.mentions.users.first();
      if (!target || target.bot || target.id === message.author.id) {
        return message.reply("Tag someone to propose to: `cry!propose @user`");
      }

      const user = await getUser(message.author.id);
      const ringCount = user.inventory.get('normal_ring') || 0;
      if (ringCount < 1 && !isVip) {
        return message.reply("💍 You need a **Normal Ring** in your inventory to propose! Buy one in `cry!shop`.");
      }

      const spouse = await getUser(target.id);
      if (user.datingPartnerId) return message.reply("💖 You are already dating someone! Break up first if you wish to date someone else.");
      if (spouse.datingPartnerId) return message.reply(`💖 <@${target.id}> is already in a relationship!`);

      const pRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_prop').setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('💖'),
        new ButtonBuilder().setCustomId('reject_prop').setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      const pMsg = await message.channel.send({
        content: `💖 <@${target.id}>, <@${message.author.id}> has asked you to be their celestial partner! Do you accept?`,
        components: [pRow]
      });

      const collector = pMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on('collect', async i => {
        if (i.user.id !== target.id) return i.reply({ content: "This proposal is not for you!", ephemeral: true });

        pRow.components.forEach(b => b.setDisabled(true));
        await pMsg.edit({ components: [pRow] });

        if (i.customId === 'accept_prop') {
          if (!isVip) {
            if (ringCount === 1) user.inventory.delete('normal_ring');
            else user.inventory.set('normal_ring', ringCount - 1);
          }
          user.datingPartnerId = target.id;
          user.datingDate = new Date();
          spouse.datingPartnerId = message.author.id;
          spouse.datingDate = new Date();

          await user.save();
          await spouse.save();
          return i.reply(`💞 **CELESTIAL HARMONY!** <@${message.author.id}> and <@${target.id}> are now officially dating!`);
        } else {
          return i.reply(`🥀 <@${target.id}> declined the proposal.`);
        }
      });
      return;
    }

    // MARRY
    if (command === 'marry') {
      const target = message.mentions.users.first();
      if (!target || target.bot || target.id === message.author.id) {
        return message.reply("Tag someone to marry: `cry!marry @user`");
      }

      const user = await getUser(message.author.id);
      const ringCount = user.inventory.get('wedding_ring') || 0;
      if (ringCount < 1 && !isVip) {
        return message.reply("👑 You need a **Wedding Ring** in your inventory to marry! Buy one in `cry!shop`.");
      }

      const spouse = await getUser(target.id);
      if (user.spouseId) return message.reply("💍 You are already married! Use `cry!divorce` first.");
      if (spouse.spouseId) return message.reply(`💍 <@${target.id}> is already married!`);

      const mRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_marry').setLabel('Say I Do').setStyle(ButtonStyle.Success).setEmoji('💒'),
        new ButtonBuilder().setCustomId('reject_marry').setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      const mMsg = await message.channel.send({
        content: `💒 <@${target.id}>, <@${message.author.id}> has dropped to one knee with a **Wedding Ring**! Will you bind your souls?`,
        components: [mRow]
      });

      const collector = mMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on('collect', async i => {
        if (i.user.id !== target.id) return i.reply({ content: "This wedding proposal is not for you!", ephemeral: true });

        mRow.components.forEach(b => b.setDisabled(true));
        await mMsg.edit({ components: [mRow] });

        if (i.customId === 'accept_marry') {
          if (!isVip) {
            if (ringCount === 1) user.inventory.delete('wedding_ring');
            else user.inventory.set('wedding_ring', ringCount - 1);
          }
          user.spouseId = target.id;
          user.marriageDate = new Date();
          spouse.spouseId = message.author.id;
          spouse.marriageDate = new Date();

          await user.save();
          await spouse.save();
          return i.reply(`💒 **SACRED MATRIMONY!** <@${message.author.id}> and <@${target.id}> are now officially married under the crystal stars!`);
        } else {
          return i.reply(`🥀 <@${target.id}> declined the wedding.`);
        }
      });
      return;
    }

    // DIVORCE
    if (command === 'divorce') {
      const user = await getUser(message.author.id);
      if (!user.spouseId) return message.reply("❌ You are not married to anyone.");

      const exId = user.spouseId;
      const exSpouse = await getUser(exId);

      user.spouseId = null;
      user.marriageDate = null;
      exSpouse.spouseId = null;
      exSpouse.marriageDate = null;

      await user.save();
      await exSpouse.save();

      return message.reply(`💔 <@${message.author.id}> threw the wedding ring into a dumpster and filed for divorce! <@${exId}> you are officially single!`);
    }

    // LOVE (SEND LOVIES)
    if (command === 'love') {
      const user = await getUser(message.author.id);
      if (!user.spouseId) return message.reply("🥀 You can only send lovies to your married spouse! Use `cry!marry` first.");

      const cd = checkCooldown(`love_${message.author.id}`, 86400000);
      if (cd > 0) return message.reply(`⏳ You already sent lovies today! Return in **${formatDuration(cd)}**.`);

      const spouse = await getUser(user.spouseId);
      user.loviesCount += 1;
      spouse.loviesCount += 1;
      user.lastLoveDate = new Date();

      await user.save();
      await spouse.save();

      return message.reply(`💖 <@${message.author.id}> sent warm starlight lovies to <@${user.spouseId}>! Total Lovies: **${user.loviesCount}** ❤️`);
    }

    // PARTNER
    if (command === 'partner') {
      const target = message.mentions.users.first() || message.author;
      const user = await getUser(target.id);

      const pEmbed = new EmbedBuilder()
        .setTitle(`✧ CELESTIAL AFFINITY CODEX: ${target.username} ✧`)
        .setColor('#ff70a6')
        .setDescription(
          `💖 **Dating Companion (BF/GF):** ${user.datingPartnerId ? `<@${user.datingPartnerId}>` : '*None*'}\n` +
          `💍 **Sacred Marriage Partner:** ${user.spouseId ? `<@${user.spouseId}>` : '*None*'}\n` +
          `💞 **Accrued Lovies:** \`${user.loviesCount}\` ❤️\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `*Send daily lovies using cry!love • Marry with cry!marry*`
        )
        .setThumbnail(target.displayAvatarURL({ dynamic: true }));

      return message.reply({ embeds: [pEmbed] });
    }

    // CELESTIAL SHIP COMMAND (DUAL MENTION FIX)
    if (command === 'ship') {
      if (!isVip) {
        const cd = checkCooldown(`ship_${message.author.id}`, 180000);
        if (cd > 0) return message.reply(`⏳ Astral resonance cooling down. Wait **${cd}s**.`);
      }

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
        return message.reply("⚠️ Tag someone to calculate resonance with: `cry!ship @user` or `cry!ship @user1 @user2`");
      }

      if (user1.id === user2.id) {
        return message.reply("Self-love is the purest resonance of all! Compatibility: **100%** 💖");
      }

      const resonance = Math.floor(Math.random() * 101);
      const cardBuffer = await renderShipCard(user1, user2, resonance);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'celestial_ship.png' });

      return message.reply({ files: [attachment] });
    }

    // ==========================================
    // MODULE: SOCIAL INTERACTIONS (1-MIN CD)
    // ==========================================
    const SOCIAL_ACTIONS = {
      slap: { gif: 'https://media.tenor.com/Ws6Dm1ZW_vMAAAAC/anime-slap.gif', text: (a, t) => `💥 <@${a}> slapped <@${t}> into another dimension!` },
      bonk: { gif: 'https://media.tenor.com/e5kFh9pZgHIAAAAC/bonk-anime.gif', text: (a, t) => `🔨 <@${a}> bonked <@${t}> on the head!` },
      poke: { gif: 'https://media.tenor.com/34pM-p1x2-4AAAAC/poke-anime.gif', text: (a, t) => `👉 <@${a}> poked <@${t}> repeatedly!` },
      punch: { gif: 'https://media.tenor.com/BoYBoopAYekAAAAC/anime-punch.gif', text: (a, t) => `🥊 <@${a}> punched <@${t}> straight in the jaw!` },
      pinch: { gif: 'https://media.tenor.com/h5vYp9pZgHIAAAAC/anime-pinch.gif', text: (a, t) => `🤏 <@${a}> pinched <@${t}>'s cheek!` },
      bite: { gif: 'https://media.tenor.com/b9L_YhRzW_gAAAAC/anime-bite.gif', text: (a, t) => `🦷 <@${a}> took a gentle bite out of <@${t}>!` },
      hug: { gif: 'https://media.tenor.com/7xZlqN0i3lAAAAAC/anime-hug.gif', text: (a, t) => `🫂 <@${a}> wrapped <@${t}> in a warm celestial hug!` },
      kiss: { gif: 'https://media.tenor.com/F0228X8ToqAAAAAC/anime-kiss.gif', text: (a, t) => `💋 <@${a}> passionately kissed <@${t}>!` },
      pat: { gif: 'https://media.tenor.com/E6fWJRekLGgAAAAC/anime-pat.gif', text: (a, t) => `✨ <@${a}> gently patted <@${t}> on the head!` },
      highfive: { gif: 'https://media.tenor.com/1G8jJmF4b8YAAAAC/anime-high-five.gif', text: (a, t) => `🖐️ <@${a}> shared a crisp high-five with <@${t}>!` },
      dance: { gif: 'https://media.tenor.com/U3eT2B2x1oQAAAAC/anime-dance.gif', text: (a, t) => t ? `💃 <@${a}> danced gracefully with <@${t}>!` : `💃 <@${a}> started dancing under the starlight!` },
      laugh: { gif: 'https://media.tenor.com/Q2eR4yL2mB8AAAAC/anime-laugh.gif', text: (a, t) => t ? `😂 <@${a}> burst out laughing at <@${t}>!` : `😂 <@${a}> burst into uncontrollable laughter!` },
      blush: { gif: 'https://media.tenor.com/y2eF9kL2mB8AAAAC/anime-blush.gif', text: (a, t) => t ? `😳 <@${a}> blushed crimson looking at <@${t}>!` : `😳 <@${a}> blushed shyly!` },
      twerk: { gif: 'https://media.tenor.com/1G8jJmF4b8YAAAAC/anime-dance.gif', text: (a, t) => t ? `🍑 <@${a}> started twerking in front of <@${t}>!` : `🍑 <@${a}> started twerking uncontrollably!` }
    };

    if (SOCIAL_ACTIONS[command]) {
      const cd = checkCooldown(`soc_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Wait **${cd}s**.`);

      const target = message.mentions.users.first();
      const action = SOCIAL_ACTIONS[command];

      const sEmbed = new EmbedBuilder()
        .setColor('#f72585')
        .setDescription(action.text(message.author.id, target ? target.id : null))
        .setImage(action.gif);

      return message.reply({ embeds: [sEmbed] });
    }

    // ==========================================
    // MODULE: FUN & IDENTITY
    // ==========================================

    // GAY GAUGE
    if (command === 'gay') {
      if (!isVip) {
        const cd = checkCooldown(`gay_${message.author.id}`, 180000);
        if (cd > 0) return message.reply(`⏳ Spectrum scanner cooling down. Wait **${cd}s**.`);
      }

      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);
      const buffer = await renderGauge(target, pct, 'Prism Spectrum', ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#ee82ee']);
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

    // LESBIAN GAUGE
    if (command === 'lesbian') {
      if (!isVip) {
        const cd = checkCooldown(`les_${message.author.id}`, 180000);
        if (cd > 0) return message.reply(`⏳ Sunset meter cooling down. Wait **${cd}s**.`);
      }

      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(Math.random() * 101);
      const buffer = await renderGauge(target, pct, 'Sunset Aura', ['#d62246', '#e06d53', '#f4a261', '#fceade', '#a37081']);
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

    // UNIVERSAL RATE
    if (command === 'rate') {
      if (!isVip) {
        const cd = checkCooldown(`rate_${message.author.id}`, 180000);
        if (cd > 0) return message.reply(`⏳ Oracle Arbiter cooling down. Wait **${cd}s**.`);
      }

      const query = args.join(' ');
      if (!query) return message.reply("Give the Oracle something to evaluate: `cry!rate <@user/thing>`");

      const targetUser = message.mentions.users.first() || message.author;
      const score = Math.floor(Math.random() * 101);
      const buffer = await renderGauge(targetUser, score, 'Cosmic Rating', ['#4361ee', '#7209b7', '#f72585']);
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

    // ZERO-BET ANIMATED COINFLIP (cry!cf, cry!coinflip)
    if (command === 'cf' || command === 'coinflip') {
      const animMsg = await message.channel.send('🪙 *Tossing the crystal coin into the air...* ⚪');
      
      setTimeout(async () => {
        await animMsg.edit('🪙 *The coin spins gleaming in the light...* 🟡 `[ Heads? ]`').catch(() => {});
      }, 700);

      setTimeout(async () => {
        await animMsg.edit('🪙 *Slowing down mid-air...* ⚪ `[ Tails? ]`').catch(() => {});
      }, 1400);

      setTimeout(async () => {
        const outcome = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        const resultEmbed = new EmbedBuilder()
          .setColor(outcome === 'HEADS' ? '#ffd700' : '#c0c0c0')
          .setTitle('✧ The Coin Has Landed! ✧')
          .setDescription(`Result: **${outcome}** 🪙`)
          .setFooter({ text: `Flipped by ${message.author.username}` });

        await animMsg.edit({ content: null, embeds: [resultEmbed] }).catch(() => {});
      }, 2100);
      return;
    }

    // ZERO-BET ANIMATED DICE (cry!dice, cry!roll)
    if (command === 'dice' || command === 'roll') {
      const animMsg = await message.channel.send('🎲 *Shaking the dice in the cup...* ⚅ ⚂');

      setTimeout(async () => {
        await animMsg.edit('🎲 *Rolling across the table...* ⚁ ⚄').catch(() => {});
      }, 700);

      setTimeout(async () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const resultEmbed = new EmbedBuilder()
          .setColor('#a8c5a5')
          .setTitle('✧ The Die Settles! ✧')
          .setDescription(`You rolled a **[ ${roll} ]** ${diceEmojis[roll]}`)
          .setFooter({ text: `Rolled by ${message.author.username}` });

        await animMsg.edit({ content: null, embeds: [resultEmbed] }).catch(() => {});
      }, 1400);
      return;
    }

    // CRYSTALSTORM (3-HR GLOBAL CD)
    if (command === 'crystalstorm') {
      const cd = checkCooldown('crystalstorm_global', 10800000);
      if (cd > 0 && !isVip) return message.reply(`⏳ The celestial heavens are quiet! Global Cooldown: **${formatDuration(cd)}**.`);

      const members = await message.guild.members.fetch();
      const realMembers = members.filter(m => !m.user.bot);
      const luckyMember = realMembers.random();

      if (!luckyMember) return message.reply("❌ No active members found to bless!");

      const winner = await getUser(luckyMember.id);
      winner.balance += 500;
      await winner.save();

      return message.channel.send(`⚡ **CRYSTALSTORM UNLEASHED!**\nThe heavens opened up and showered **500 ${cryCoin}** directly onto <@${luckyMember.id}>!`);
    }

    // PICKUP
    if (command === 'pickup') {
      const cd = checkCooldown(`pickup_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Save some charm for later! Wait **${cd}s**.`);

      const target = message.mentions.users.first();
      const line = PICKUP_BANK[Math.floor(Math.random() * PICKUP_BANK.length)];
      return message.channel.send(target ? `<@${target.id}>, ${line} ✨` : `${line} ✨`);
    }

    // ROAST (WITH MOTHER'S SHIELD FOR VIP)
    if (command === 'roast') {
      const cd = checkCooldown(`roast_${message.author.id}`, 60000);
      if (cd > 0 && !isVip) return message.reply(`⏳ Cool down! Wait **${cd}s**.`);

      const target = message.mentions.users.first() || message.author;

      if (target.id === VIP_USER_ID) {
        return message.channel.send("You lil piece of ox shit, can't mess with my mom.");
      }

      const roast = ROAST_BANK[Math.floor(Math.random() * ROAST_BANK.length)];
      return message.channel.send(`🔥 <@${target.id}> ${roast}`);
    }

    // ANONYMOUS (3 MSGS PER USER + ADMIN AUDIT LOG)
    if (command === 'anonymous') {
      const user = await getUser(message.author.id);
      if (user.anonymousCount >= 3 && !isVip) {
        return message.reply("❌ You have exhausted your quota of **3 anonymous messages**!");
      }

      const text = args.join(' ');
      if (!text) return message.reply("⚠️ Specify your message: `cry!anonymous <your message>`");

      try {
        await message.delete();
      } catch {}

      user.anonymousCount += 1;
      await user.save();

      const anonEmbed = new EmbedBuilder()
        .setTitle('🕵️ ANONYMOUS TRANSMISSION')
        .setColor('#2d0c45')
        .setDescription(text)
        .setFooter({ text: 'Sent via CrystalBot Anonymous Gateway • Irrevocable' });

      await message.channel.send({ embeds: [anonEmbed] });

      try {
        const vipUser = await client.users.fetch(VIP_USER_ID);
        if (vipUser) {
          const auditEmbed = new EmbedBuilder()
            .setTitle('🕵️ ANONYMOUS AUDIT LOG')
            .setColor('#e63946')
            .addFields(
              { name: 'Author Tag', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
              { name: 'Channel', value: `${message.channel.name} (\`${message.channel.id}\`)`, inline: true },
              { name: 'Message Content', value: text, inline: false }
            )
            .setTimestamp();
          await vipUser.send({ embeds: [auditEmbed] });
        }
      } catch (err) {
        console.warn('VIP Audit Relay Notice:', err.message);
      }
      return;
    }

    // ==========================================
    // MODULE: ADMIN COMMANDS
    // ==========================================

        // SETUP REACTION ROLES (ALL 6 EMBEDS WITH LIVE EMOJI REACTIONS)
    if (command === 'setup-roles') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isVip) {
        return message.reply('❌ You need Administrator permissions to deploy self-roles.');
      }

      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      try {
        // 1. Gender / Pronouns
        const genderEmbed = new EmbedBuilder()
          .setColor('#f6c6ea')
          .setTitle('🌸 Pronouns & Gender')
          .setDescription(
            'React below to claim your pronouns:\n\n' +
            '🌸 • <@&1558480429273583678> — `She / Her`\n' +
            '🌿 • <@&1558480593073868841> — `He / Him`\n' +
            '🌙 • <@&1558480712695414874> — `They / Them`\n' +
            '✨ • <@&1558480820874780722> — `Any / All`'
          );
        const m1 = await message.channel.send({ embeds: [genderEmbed] });
        for (const emoji of ['🌸', '🌿', '🌙', '✨']) {
          await m1.react(emoji);
          await wait(250);
        }
        await wait(600);

        // 2. Age Bracket
        const ageEmbed = new EmbedBuilder()
          .setColor('#caffbf')
          .setTitle('🪷 Age Bracket')
          .setDescription(
            'React below to claim your age group:\n\n' +
            '🐣 • <@&1558481003746697266> — `13 – 17`\n' +
            '🪷 • <@&1558481095446495233> — `18 – 21`\n' +
            '☕ • <@&1558481253370433536> — `21+`'
          );
        const m2 = await message.channel.send({ embeds: [ageEmbed] });
        for (const emoji of ['🐣', '🪷', '☕']) {
          await m2.react(emoji);
          await wait(250);
        }
        await wait(600);

        // 3. Region / Continent
        const regionEmbed = new EmbedBuilder()
          .setColor('#9bf6ff')
          .setTitle('🌏 Region & Continent')
          .setDescription(
            'React below to show where you are logging in from:\n\n' +
            '🌏 • <@&1558481398069727362> — `Asia`\n' +
            '🌍 • <@&1558481498347413584> — `Europe`\n' +
            '🌎 • <@&1558481607093125200> — `Americas`\n' +
            '🏝️ • <@&1558482222242209904> — `Other`'
          );
        const m3 = await message.channel.send({ embeds: [regionEmbed] });
        for (const emoji of ['🌏', '🌍', '🌎', '🏝️']) {
          await m3.react(emoji);
          await wait(250);
        }
        await wait(600);

        // 4. Relationship Status
        const relEmbed = new EmbedBuilder()
          .setColor('#ffa6c9')
          .setTitle('💌 Relationship Status')
          .setDescription(
            'React below to display your status on your profile:\n\n' +
            '💙 • <@&1558482393395101897> — `Single`\n' +
            '💖 • <@&1558482471891247204> — `Taken`\n' +
            '💍 • <@&1558482562593067089> — `Married`\n' +
            '🍿 • <@&1558482718705188874> — `Third Wheeler`\n' +
            '💌 • <@&1558482810136694844> — `Hopeless Romantic`\n' +
            '🥀 • <@&1558482907755053286> — `I Give Up`'
          );
        const m4 = await message.channel.send({ embeds: [relEmbed] });
        for (const emoji of ['💙', '💖', '💍', '🍿', '💌', '🥀']) {
          await m4.react(emoji);
          await wait(250);
        }
        await wait(600);

        // 5. Aesthetic Palette
        const aestheticEmbed = new EmbedBuilder()
          .setColor('#c8a2c8')
          .setTitle('🌙 Aesthetic Name Palette')
          .setDescription(
            'React below to change your name color in chat:\n\n' +
            '🔮 • <@&1558483084884574411> — `Moonlight`\n' +
            '☁️ • <@&1558483165293707344> — `Daydream`\n' +
            '🩷 • <@&1558483247237828681> — `Rosewater`\n' +
            '💜 • <@&1558483493644668998> — `Ethereal`\n' +
            '🌌 • <@&1558483592378581113> — `Blue Hour`\n' +
            '🌷 • <@&1558483731701047406> — `Lover`'
          );
        const m5 = await message.channel.send({ embeds: [aestheticEmbed] });
        for (const emoji of ['🔮', '☁️', '🩷', '💜', '🌌', '🌷']) {
          await m5.react(emoji);
          await wait(250);
        }
        await wait(600);

        // 6. Notifications
        const notifEmbed = new EmbedBuilder()
          .setColor('#f59e0b')
          .setTitle('🔔 Server Notifications')
          .setDescription(
            'React below to opt-in or out of specific event pings:\n\n' +
            '🔔 • <@&1558483922654863370> — `Arise`\n' +
            '🎮 • <@&1558484017710629075> — `Gaming`\n' +
            '🎬 • <@&1558484104843100190> — `Movie`\n' +
            '⛩️ • <@&1558484202184515734> — `Anime`'
          );
        const m6 = await message.channel.send({ embeds: [notifEmbed] });
        for (const emoji of ['🔔', '🎮', '🎬', '⛩️']) {
          await m6.react(emoji);
          await wait(250);
        }

        await message.delete().catch(() => {});
      } catch (err) {
        console.error('Reaction Role Deployment Error:', err);
        message.channel.send(`⚠️ Error deploying reaction roles: \`${err.message}\``);
      }
      return;
    }


    // ADMIN POLL (cry!poll)
    if (command === 'poll') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isVip) {
        return message.reply('❌ You need Administrator permissions to start a community poll.');
      }

      const fullText = message.content.slice(PREFIX_REGEX.exec(message.content)[0].length + command.length).trim();
      if (!fullText) {
        return message.reply('Usage: `cry!poll <Question>` OR `cry!poll "Question" "Option 1" "Option 2" ...`');
      }

      const matches = fullText.match(/"([^"]+)"/g);

      if (!matches || matches.length === 1) {
        const question = matches ? matches[0].replace(/"/g, '') : fullText;
        const pollEmbed = new EmbedBuilder()
          .setColor('#9370db')
          .setTitle('📊 Server Community Poll')
          .setDescription(`**${question}**\n\nReact with ✅ for **Yes** or ❌ for **No**!`)
          .setFooter({ text: `Poll initiated by ${message.author.username}` })
          .setTimestamp();

        const pollMsg = await message.channel.send({ embeds: [pollEmbed] });
        await pollMsg.react('✅');
        await pollMsg.react('❌');
        return message.delete().catch(() => {});
      }

      const question = matches[0].replace(/"/g, '');
      const options = matches.slice(1).map(opt => opt.replace(/"/g, ''));

      if (options.length > 9) {
        return message.reply('❌ Polls support a maximum of 9 options.');
      }

      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
      let descriptionText = `**${question}**\n\n`;

      options.forEach((opt, idx) => {
        descriptionText += `${numberEmojis[idx]} ${opt}\n`;
      });

      const pollEmbed = new EmbedBuilder()
        .setColor('#9370db')
        .setTitle('📊 Server Community Poll')
        .setDescription(descriptionText)
        .setFooter({ text: `Poll initiated by ${message.author.username}` })
        .setTimestamp();

      const pollMsg = await message.channel.send({ embeds: [pollEmbed] });
      for (let i = 0; i < options.length; i++) {
        await pollMsg.react(numberEmojis[i]);
      }
      return message.delete().catch(() => {});
    }

    // ADD CRYSTALS
    if (command === 'addcrystals' || command === 'ac') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isVip) {
        return message.reply("❌ Administrator permissions required!");
      }

      const target = message.mentions.users.first();
      const amt = parseInt(args[1], 10);

      if (!target || isNaN(amt) || amt <= 0) return message.reply("⚠️ Usage: `cry!ac @user <amount>`");

      const tUser = await getUser(target.id);
      tUser.balance += amt;
      await tUser.save();

      return message.reply(`✅ Granted **+${amt.toLocaleString()} ${cryCoin}** to <@${target.id}>!`);
    }

    // REMOVE CRYSTALS
    if (command === 'removecrystals' || command === 'rc') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isVip) {
        return message.reply("❌ Administrator permissions required!");
      }

      const target = message.mentions.users.first();
      const amt = parseInt(args[1], 10);

      if (!target || isNaN(amt) || amt <= 0) return message.reply("⚠️ Usage: `cry!rc @user <amount>`");

      const tUser = await getUser(target.id);
      tUser.balance = Math.max(0, tUser.balance - amt);
      await tUser.save();

      return message.reply(`✅ Deducted **-${amt.toLocaleString()} ${cryCoin}** from <@${target.id}>!`);
    }

  } catch (error) {
    console.error('Command Execution Error:', error);
    return message.reply("⚠️ An astral disruption occurred while executing this command.");
  }
});

// ==========================================
// 8. INITIALIZATION & DATABASE BOOTSTRAP
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
  } catch (err) {
    console.error('Bot Initialization Error:', err);
  }
}

startCrystalEngine();
