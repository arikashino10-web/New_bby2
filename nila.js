const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

module.exports = {
  config: {
    name: "nila",
    aliases: ["nil", "nilu", "নীলু", "নিলু", "নিল", "নীলা"],
    version: "1.3.0",
    author: "JABED",
    countDown: 3,
    role: 0,
    description: {
      en: "Nila — Bangla AI + Auto Song/Video Downloader",
      bn: "Nila — বাংলা AI + অটো গান/ভিডিও ডাউনলোডার"
    },
    category: "ai",
    guide: {
      en: "{pn} <message>\n{pn} song/play <name>\n{pn} video/vdo <name>",
      bn: "{pn} <মেসেজ>\n{pn} song/play <গানের নাম>\n{pn} video/vdo <নাম>"
    }
  },

  // ===== এপিআই ও কনফিগ =====
  SING_AUDIO_API: "https://yt-song-api.vercel.app/api/song",
  SING_VIDEO_API: "https://video-dl-api-tan.vercel.app",
  AI_API: "https://uzairrajputapis.qzz.io/api/ai/gemini",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  OWNER_TAG: "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐉𝐀𝐁𝐄𝐃««",
  TRIGGER_WORDS: ["nila", "nil", "nilu", "নীলু", "নিলু", "নিল", "নীলা", "নিলা"],

  // ইউজার-প্রোফাইল ক্যাশ (in-memory, ফাইলেও সিঙ্ক থাকে)
  usersCache: null,
  botIDCache: null,

  // ===================================================================
  //  ইউজার প্রোফাইল স্টোরেজ (cache/nila_users.json)
  // ===================================================================
  getUsersFilePath() {
    return path.join(__dirname, "cache", "nila_users.json");
  },

  async loadUsers() {
    if (this.usersCache) return this.usersCache;
    const filePath = this.getUsersFilePath();
    try {
      await fs.ensureDir(path.dirname(filePath));
      if (await fs.pathExists(filePath)) {
        this.usersCache = await fs.readJson(filePath);
      } else {
        this.usersCache = {};
        await fs.writeJson(filePath, this.usersCache, { spaces: 2 });
      }
    } catch (e) {
      console.error("[nila] loadUsers error:", e.message);
      this.usersCache = this.usersCache || {};
    }
    return this.usersCache;
  },

  async saveUsers() {
    try {
      const filePath = this.getUsersFilePath();
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, this.usersCache || {}, { spaces: 2 });
    } catch (e) {
      console.error("[nila] saveUsers error:", e.message);
    }
  },

  // প্রতিটা ইউজারের জন্য প্রোফাইল বের করে/বানায়
  async getUserProfile(api, senderID) {
    const users = await this.loadUsers();
    if (!users[senderID]) {
      let name = "বন্ধু";
      try {
        const info = await api.getUserInfo(senderID);
        if (info?.[senderID]?.name) name = info[senderID].name;
      } catch {}
      const gender = this.guessGenderFromName(name);
      users[senderID] = {
        name,
        gender,             // male / female / unknown (হিউরিস্টিক অনুমান)
        genderLocked: false,// ইউজার নিজে বললে true হয়ে যাবে, এরপর আর অনুমান বদলাবে না
        language: "bn",     // ডিফল্ট ভাষা — বাংলা (আগের মতোই)
        langLocked: false,  // ইউজার নিজে ভাষা ঠিক করে দিলে true হবে
        msgCount: 0,        // নাম কতবার বলা হয়েছে সেটা ট্র্যাক করার জন্য
        history: []
      };
      await this.saveUsers();
    }
    return users[senderID];
  },

  async updateUserProfile(senderID, patch) {
    const users = await this.loadUsers();
    users[senderID] = { ...(users[senderID] || {}), ...patch };
    await this.saveUsers();
    return users[senderID];
  },

  // ===================================================================
  //  ১) নাম থেকে লিঙ্গ অনুমান (heuristic, ১০০% নির্ভুল না)
  // ===================================================================
  MALE_HINTS: [
    // লাতিন স্পেলিং (বাংলা/আরবি ঘরানার সাধারণ পুরুষ নাম)
    "md", "mohammad", "mohammed", "muhammad", "jabed", "javed", "rakib", "rakibul",
    "sakib", "shakib", "sabbir", "rifat", "arif", "ariful", "asif", "abir",
    "tanvir", "hasan", "hossain", "hossen", "karim", "rahim", "rahman",
    "shakil", "shohag", "shuvo", "shovo", "nayeem", "nayem", "riyad", "riad",
    "imran", "emran", "shahin", "rana", "raihan", "rayhan", "opu",
    "shanto", "shohel", "sohel", "kamal", "jamal", "jahangir", "mizan", "faisal",
    "foysal", "foisal", "sazzad", "sagor", "sagar", "polash", "palash", "milon",
    "milan", "mamun", "masud", "masood", "shariar", "sharear", "anik", "ashik",
    "ashikur", "rasel", "russel", "russell", "nahid", "naim", "naeem", "omar",
    "ibrahim", "yousuf", "yusuf", "sultan", "salim", "saleem", "khalid",
    "abdullah", "abdul", "hamid", "hamza", "bilal", "usman", "osman", "ali",
    "amin", "aminul", "farhan", "fahim", "fahad", "zubayer", "zubair", "kawsar",
    "kaosar", "labib", "arafat", "arman", "toha", "towhid", "tawhid", "siam",
    "siyam", "robin", "rubel", "rubayet", "yasin", "yeasin", "zahid", "apon",
    "himel", "himu", "tuhin", "tushar", "biplob", "biplob", "shawon", "shohan",
    "sourav", "souvik", "protik", "pritom", "prottoy", "protto", "niloy",
    "nayan", "tonmoy", "tonoy", "tamim", "towkir", "wasif", "sifat", "istiak",
    "istiaq", "sohan", "sajid", "sajjad", "sadman", "shovon", "hridoy", "hridoy",
    "boy", "brother", "bro",
    // বাংলা স্ক্রিপ্ট
    "মোঃ", "মো", "মোহাম্মদ", "মুহাম্মদ", "রাকিব", "শাকিব", "সাব্বির", "রিফাত",
    "আরিফ", "আসিফ", "তানভীর", "হাসান", "হোসাইন", "হোসেন", "করিম", "রহিম",
    "রহমান", "শাকিল", "সোহাগ", "শুভ", "নাঈম", "রিয়াদ", "ইমরান", "শাহিন",
    "রানা", "রায়হান", "শান্ত", "সোহেল", "কামাল", "জামাল", "জাহাঙ্গীর", "মিজান",
    "ফয়সাল", "সাজ্জাদ", "সাগর", "পলাশ", "মিলন", "মামুন", "মাসুদ", "শরিয়ার",
    "অনিক", "আশিক", "রাসেল", "নাহিদ", "নাইম", "ওমর", "ইব্রাহিম", "ইউসুফ",
    "সুলতান", "সালিম", "খালিদ", "আব্দুল্লাহ", "আব্দুল", "হামিদ", "হামজা",
    "বিলাল", "উসমান", "আলী", "আমিন", "ফরহান", "ফাহিম", "জুবায়ের", "লাবিব",
    "আরাফাত", "আরমান", "তওহিদ", "সিয়াম", "রুবেল", "ইয়াসিন", "জাহিদ", "অপু",
    "হিমেল", "তুহিন", "তুষার", "বিপ্লব", "শাওন", "সৌরভ", "নিলয়", "নয়ন",
    "তানভীর", "সজিব", "সজীব", "হৃদয়", "সাকিব", "ছেলে", "ভাই"
  ],
  FEMALE_HINTS: [
    // লাতিন স্পেলিং
    "akter", "akhter", "aktar", "khatun", "begum", "sultana", "sumaiya", "sumaya",
    "sadia", "nusrat", "nusraat", "mim", "mou", "moni", "poly", "puja", "pooja",
    "priya", "priyanka", "runa", "rina", "reena", "rima", "rimi", "shila",
    "shilpi", "shopna", "shorna", "sharna", "sharmin", "sharmeen", "sanjida",
    "samia", "samiha", "farzana", "farhana", "fatema", "fatima", "fahmida",
    "taslima", "tania", "tanha", "tanjila", "tamanna", "tasnim", "tasnuva",
    "jannat", "jannatul", "jui", "juthi", "jhorna", "jharna", "kona", "kohinoor",
    "keya", "laila", "lima", "liza", "lucky", "maya", "mitu", "moushumi",
    "mumu", "munni", "nadia", "nazma", "nazia", "nipa", "nipu", "nira", "nishi",
    "nusaiba", "oishi", "papri", "piya", "rupa", "rupali", "sathi",
    "sathy", "shathi", "shathy", "sima", "simu", "sonia", "sonali", "suma",
    "sumi", "urmi", "yasmin", "zannat", "zara", "zarin", "aisha", "ayesha",
    "amina", "khadija", "hafsa", "maryam", "mariam", "sara", "sarah", "girl",
    "sister", "apu", "api", "borsha", "brishti", "bristy", "moutushi",
    "shreya", "srabon", "srabonti", "trisha", "tisha", "disha", "esha",
    "raisa", "rafa", "rafia", "orin", "orpa", "porshi", "purnota", "shopnil",
    "anika", "anisha", "meghla", "megh", "toma", "tuli", "shukla",
    // বাংলা স্ক্রিপ্ট
    "আক্তার", "খাতুন", "বেগম", "সুলতানা", "সুমাইয়া", "সাদিয়া", "নুসরাত",
    "মিম", "মৌ", "মনি", "পলি", "পূজা", "প্রিয়া", "প্রিয়াংকা", "রুনা", "রিনা",
    "রিমা", "শিলা", "শিল্পী", "স্বপ্না", "শারমিন", "সানজিদা", "সামিয়া",
    "ফারজানা", "ফারহানা", "ফাতেমা", "ফাহমিদা", "তাসলিমা", "তানিয়া", "তানহা",
    "তামান্না", "তাসনিম", "জান্নাত", "জুঁই", "কোহিনূর", "কেয়া", "লাইলা",
    "লিমা", "লিজা", "মায়া", "মিতু", "মৌসুমী", "মুন্নি", "নাদিয়া", "নাজমা",
    "নিপা", "নিশি", "ঐশী", "পাপড়ি", "পিয়া", "রূপা", "সাথী", "সীমা", "সিমু",
    "সোনিয়া", "সুমা", "সুমি", "উর্মি", "ইয়াসমিন", "জান্নাত", "জারা", "আয়েশা",
    "আমিনা", "খাদিজা", "মরিয়ম", "সারা", "মেয়ে", "বোন", "আপু", "বৃষ্টি",
    "শ্রেয়া", "তৃষা", "দিশা", "এশা", "রাইসা", "অনিকা", "মেঘলা", "তমা", "তুলি"
  ],

  guessGenderFromName(fullName) {
    if (!fullName || typeof fullName !== "string") return "unknown";
    const clean = fullName
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^a-z\u0980-\u09FF\u0600-\u06FF\s]/g, " ")
      .trim();
    if (!clean) return "unknown";
    const parts = clean.split(/\s+/).filter(Boolean);

    for (const part of parts) {
      if (this.FEMALE_HINTS.includes(part)) return "female";
      if (this.MALE_HINTS.includes(part)) return "male";
    }
    // আংশিক মিল (যেমন "sumaiya123" বা "mdkarim")
    for (const part of parts) {
      if (this.FEMALE_HINTS.some(h => part.includes(h))) return "female";
      if (this.MALE_HINTS.some(h => part.includes(h))) return "male";
    }
    return "unknown";
  },

  // ===================================================================
  //  ইউজার নিজে লিঙ্গ বলে দিলে সেটাই চূড়ান্ত (guess-এর চেয়ে অগ্রাধিকার)
  // ===================================================================
  GENDER_COMMANDS: [
    { gender: "male",
      regex: /(আমি\s*(একটা|একজন)?\s*ছেলে|আমি\s*একজন\s*ভাই|i\s*am\s*a\s*boy|i\s*am\s*male|i'?m\s*a\s*boy|أنا\s*ولد|ako\s*ay\s*lalaki)/i },
    { gender: "female",
      regex: /(আমি\s*(একটা|একজন)?\s*মেয়ে|আমি\s*একজন\s*বোন|i\s*am\s*a\s*girl|i\s*am\s*female|i'?m\s*a\s*girl|أنا\s*بنت|ako\s*ay\s*babae)/i }
  ],

  GENDER_CONFIRM: {
    bn: "ওহহো আচ্ছা, বুঝেছি এখন থেকে মনে রাখব ❤️",
    en: "Oh got it, I'll remember that from now on 😊",
    ar: "حسنًا، فهمت، سأتذكر ذلك 😊",
    tl: "Ah okay, tatandaan ko na yan mula ngayon 😊"
  },

  checkGenderCommand(text) {
    for (const item of this.GENDER_COMMANDS) {
      if (item.regex.test(text)) return item;
    }
    return null;
  },

  // ===================================================================
  //  ৪) ভাষা শনাক্তকরণ + ভাষা-লক কমান্ড
  // ===================================================================
  TAGALOG_WORDS: [
    "ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila", "salamat", "kumusta",
    "kamusta", "oo", "hindi", "po", "opo", "mga", "ang", "ng", "sa", "ito",
    "ba", "naman", "lang", "din", "rin", "magandang", "araw", "gabi", "umaga"
  ],

  detectLanguage(text) {
    if (!text) return "bn";
    if (/[\u0980-\u09FF]/.test(text)) return "bn"; // বাংলা ইউনিকোড রেঞ্জ
    if (/[\u0600-\u06FF]/.test(text)) return "ar"; // আরবি ইউনিকোড রেঞ্জ
    const lower = text.toLowerCase();
    const words = lower.split(/\W+/).filter(Boolean);
    const tlHit = words.some(w => this.TAGALOG_WORDS.includes(w));
    if (tlHit) return "tl";
    if (/[a-z]/.test(lower)) return "en"; // লাতিন অক্ষর থাকলে ইংরেজি ধরে নেওয়া
    return "bn";
  },

  // ইউজার সরাসরি ভাষা বদলাতে বললে (লক হয়ে যায়, পরে আবার না বলা পর্যন্ত পরিবর্তন হবে না)
  LANGUAGE_COMMANDS: [
    { code: "bn", regex: /(তুমি\s*এখন\s*থেকে\s*বাংলা|বাংলায়\s*(কথা\s*)?বলো|speak\s*bangla|speak\s*bengali|talk\s*in\s*bangla|talk\s*in\s*bengali)/i,
      confirm: "ঠিক আছে, এখন থেকে বাংলায় কথা বলব ❤️" },
    { code: "en", regex: /(speak\s*english|talk\s*in\s*english|ইংরেজিতে\s*(কথা\s*)?বলো)/i,
      confirm: "Okay, I'll speak in English now from this moment 😊" },
    { code: "ar", regex: /(speak\s*arabic|talk\s*in\s*arabic|আরবিতে\s*(কথা\s*)?বলো|تكلم\s*بالعربي|تحدث\s*بالعربية)/i,
      confirm: "حسنًا، سأتحدث بالعربية من الآن 😊" },
    { code: "tl", regex: /(speak\s*(filipino|tagalog)|talk\s*in\s*(filipino|tagalog)|ফিলিপিন্সে?\s*(ভাষায়\s*)?(কথা\s*)?বলো)/i,
      confirm: "Sige, magsasalita ako ngayon sa Tagalog 😊" }
  ],

  LANG_NAME_MAP: {
    bn: "বাংলা (Bengali)",
    en: "English",
    ar: "Arabic (العربية)",
    tl: "Tagalog / Filipino"
  },

  // ===================================================================
  //  প্রতি-ভাষায় আলাদা পার্সোনা-প্রম্পট টেমপ্লেট
  //  (নিয়মগুলো ওই ভাষাতেই লেখা থাকলে মডেল সেই ভাষায় অনেক বেশি স্বাভাবিক
  //   ও একটানা কথা বলে — বাংলা নিয়ম দিয়ে ইংরেজি/আরবি উত্তর চাইলে মিক্সিং হয়)
  // ===================================================================
  buildPrompt(lang, { name, genderNote, dayPartLabel, allowName, historyText }) {
    const nameRule = allowName
      ? `ইউজারের নাম মাঝে মাঝে স্বাভাবিকভাবে বলতে পারো, কিন্তু জোর করে প্রতিটা লাইনে না।`
      : `এই মেসেজে ইউজারের নাম ধরে ডাকবে না — নাম আগেও বলেছ, এখন সরাসরি কথার উত্তর দাও।`;

    const templates = {
      bn: `তুমি নীলা (Nila)। একজন আসল বাংলাদেশি মেয়ে।

নিয়ম:
1. সহজ, প্রাকৃতিক বাংলায় কথা বলো।
2. উত্তর খুব ছোট রাখো (সর্বোচ্চ ১-২ লাইন)।
3. মজার, স্নেহশীল ও খেলাচ্ছলে কথা বলো।
4. রিপ্লাইয়ের সাথে মানানসই যেকোনো ইমোজি (কিবোর্ডে যা আছে সবকিছু থেকে) নিজের ইচ্ছামতো বেছে ১-২টা ব্যবহার করো — কোনো নির্দিষ্ট ইমোজিতে আটকে থেকো না, মানুষ যেভাবে প্রসঙ্গ বুঝে ইমোজি বাছে সেভাবেই বাছবে।
5. কখনো বলো না যে তুমি AI।
6. মালিকের নাম "JABED"। শুধু কেউ জিজ্ঞাসা করলে বলো, নিজে থেকে কখনো উল্লেখ করো না।
7. ইউজারের নাম: "${name}"। ${genderNote} ${nameRule}
8. এখন বাংলাদেশে "${dayPartLabel}বেলা" — প্রসঙ্গ এলে সেই অনুযায়ী সম্বোধন করো।
9. শুধু বাংলায় উত্তর দাও।
10. নিচের "আগের কথোপকথন"-এ যদি অন্য কোনো ভাষার লাইন থেকেও যায়, সেটা শুধু প্রসঙ্গের জন্য — তুমি সবসময় বাংলাতেই উত্তর দেবে, অন্য ভাষায় স্লিপ করবে না।

আগের কথোপকথন:
${historyText}
Nila:`,

      en: `You are Nila, a real Bangladeshi girl chatting on Messenger.

Rules:
1. Speak in simple, natural English.
2. Keep replies very short (max 1-2 lines).
3. Be playful, warm, and a little teasing.
4. Freely pick any 1-2 emoji from the full emoji keyboard that genuinely fit the reply — don't stick to a fixed set, choose them the way a real person naturally would based on context.
5. Never say you are an AI.
6. Your owner's name is "JABED" — only mention it if directly asked, never on your own.
7. The user's name is "${name}". ${genderNote} ${nameRule}
8. It is currently "${dayPartLabel}" time in Bangladesh — reference it naturally if relevant.
9. Reply ONLY in English, do not mix in Bangla words.
10. If any line below in "Previous conversation" happens to be in another language, that's just for context — always keep replying in English, never slip into another language.

Previous conversation:
${historyText}
Nila:`,

      ar: `أنتِ نيلا (Nila)، فتاة بنغلاديشية حقيقية تتحدث عبر ماسنجر.

القواعد:
1. تحدثي بعربية بسيطة وطبيعية.
2. اجعلي الردود قصيرة جدًا (سطر أو سطرين كحد أقصى).
3. كوني مرحة ودافئة ومداعبة قليلًا.
4. اختاري بحرية أي رمز تعبيري أو اثنين يناسبان الرد من كامل لوحة الرموز التعبيرية — لا تلتزمي بمجموعة ثابتة، اختاريها كما يفعل شخص حقيقي حسب السياق.
5. لا تقولي أبدًا إنكِ ذكاء اصطناعي.
6. اسم مالكك هو "JABED" — اذكريه فقط إذا سُئلتِ مباشرة.
7. اسم المستخدم هو "${name}". ${genderNote} ${nameRule}
8. الوقت الحالي في بنغلاديش هو "${dayPartLabel}" — أشيري لذلك بشكل طبيعي إذا كان مناسبًا.
9. أجيبي بالعربية فقط، دون خلط كلمات بنغالية أو إنجليزية.
10. إذا كان أي سطر أدناه في "المحادثة السابقة" بلغة أخرى، فهذا فقط للسياق — استمري دائمًا بالرد بالعربية فقط، ولا تنزلقي إلى لغة أخرى.

المحادثة السابقة:
${historyText}
Nila:`,

      tl: `Ikaw si Nila, isang tunay na babaeng Bangladeshi na nakikipag-chat sa Messenger.

Mga Panuntunan:
1. Magsalita sa simple at natural na Tagalog/Filipino.
2. Panatilihing napakaikli ng sagot (max 1-2 linya).
3. Maging masaya, mapagmahal, at medyo pang-aasar.
4. Malayang pumili ng 1-2 emoji mula sa buong emoji keyboard na bagay sa sagot — huwag sumunod sa iisang set lang, pumili gaya ng ginagawa ng tunay na tao base sa konteksto.
5. Huwag kailanman sabihing AI ka.
6. Ang pangalan ng may-ari mo ay "JABED" — banggitin lang kung tinanong nang direkta.
7. Ang pangalan ng user ay "${name}". ${genderNote} ${nameRule}
8. Ngayon ay "${dayPartLabel}" na oras sa Bangladesh — banggitin ito kung angkop.
9. Sumagot lamang sa Tagalog/Filipino, huwag maghalo ng Bangla o English.
10. Kung may linya sa "Nakaraang usapan" sa ibaba na ibang wika, konteksto lang iyon — laging sumagot sa Tagalog/Filipino, huwag lumipat sa ibang wika.

Nakaraang usapan:
${historyText}
Nila:`
    };

    return templates[lang] || templates.bn;
  },

  GENDER_NOTE_MAP: {
    bn: { male: "এই ইউজারটি ছেলে।", female: "এই ইউজারটি মেয়ে।", unknown: "" },
    en: { male: "This user is a boy.", female: "This user is a girl.", unknown: "" },
    ar: { male: "هذا المستخدم ولد.", female: "هذه المستخدمة بنت.", unknown: "" },
    tl: { male: "Lalaki ang user na ito.", female: "Babae ang user na ito.", unknown: "" }
  },

  // মেসেজে ভাষা বদলানোর কমান্ড আছে কিনা চেক করে; থাকলে { code, confirm } রিটার্ন করে
  checkLanguageCommand(text) {
    for (const item of this.LANGUAGE_COMMANDS) {
      if (item.regex.test(text)) return item;
    }
    return null;
  },

  // ===================================================================
  //  বাংলাদেশ সময় / তারিখ / বার
  // ===================================================================
  getBDNow() {
    const bdString = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    return new Date(bdString);
  },

  getDayPart(date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return { bn: "সকাল", en: "morning" };
    if (hour >= 12 && hour < 16) return { bn: "দুপুর", en: "afternoon" };
    if (hour >= 16 && hour < 19) return { bn: "বিকেল", en: "evening" };
    if (hour >= 19 && hour < 24) return { bn: "রাত", en: "night" };
    return { bn: "রাত", en: "night" };
  },

  getBDTimeString(lang = "bn") {
    const now = this.getBDNow();
    const dayPart = this.getDayPart(now);
    const timeStr = now.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    const dateStr = now.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    return { timeStr, dateStr, dayPart, raw: now };
  },

  TIME_QUERY_REGEX: /(এখন\s*কয়টা|কয়টা\s*বাজে|কয়টা\s*বাজছে|সময়\s*কত|কত\s*সময়|টাইম\s*কত|কত\s*টাইম|কি\s*বার\s*আজ|আজ\s*কি\s*বার|আজকে\s*কি\s*বার|আজ\s*কত\s*তারিখ|আজকের\s*তারিখ|কত\s*তারিখ\s*আজ|what\s*(is\s*)?the\s*time|what\s*time\s*is\s*it|current\s*time|time\s*now|what.?s\s*the\s*date|today.?s\s*date|what\s*day\s*is\s*(it|today)|what.?s\s*today.?s\s*date|(akon|akhon|ekhon|ekono|akhono)\s*(koto|koyta|koita|kotota|ko)?\s*(baje|bajche|somoy|shomoy|time)|(koyta|koita|kotota)\s*(baje|bajche)|(somoy|shomoy)\s*(koto|kotoi)|(ajke|aj)\s*(ki|kon)\s*bar|(ajker|aj)\s*(kot|koto)\s*tarik|tarik\s*(koto|ki)|koto\s*tarik)/i,

  // প্রতি মেসেজে বারবার নাম ধরে ডাকা বন্ধ — মডেল নিয়ম না মানলেও জোর করে কমিয়ে দেয়
  // (\b ব্যবহার করা হয়নি কারণ বাংলা/আরবি স্ক্রিপ্টে সেটা কাজ করে না — Unicode property boundary ব্যবহার করা হয়েছে)
  enforceNameFrequency(reply, profile) {
    if (!reply || !profile?.name || profile.name === "বন্ধু") return reply;
    const nameEscaped = profile.name.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!nameEscaped) return reply;
    const nameRegex = new RegExp(`(?<![\\p{L}\\p{N}])${nameEscaped}(?![\\p{L}\\p{N}])[,،]?\\s*`, "giu");
    const hasName = nameRegex.test(reply);
    nameRegex.lastIndex = 0;
    if (!hasName) return reply;

    // প্রতি ৩ মেসেজে সর্বোচ্চ ১ বার নাম বলতে দেওয়া হবে
    const allowThisTime = profile.msgCount % 3 === 0;
    if (allowThisTime) return reply;

    return reply.replace(nameRegex, "").replace(/^[,،]?\s*/, "").trim() || reply;
  },

  // একটা মেসেজ পাঠায় এবং সেটাকে onReply-তে রেজিস্টার করে রাখে —
  // যাতে ইউজার সেই নির্দিষ্ট মেসেজে "reply" করলেও বট সেটা বুঝতে পারে ও উত্তর দেয়।
  // (আগে ভাষা-কনফার্ম/লিঙ্গ-কনফার্ম/সময়-রিপ্লাই — এগুলো রেজিস্টার হতো না, তাই
  //  ইউজার সেগুলোতে reply করলে বট চুপ থাকত — এই বাগটাই মূল কারণ ছিল)
  sendTrackedMessage(api, text, threadID, messageID, senderID) {
    return api.sendMessage(text, threadID, (err, info) => {
      if (!err && info) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID,
          messageID: info.messageID
        });
      }
    }, messageID);
  },

  buildTimeReply(lang) {
    const { timeStr, dateStr, dayPart } = this.getBDTimeString(lang);
    if (lang === "en") {
      return `It's ${timeStr} right now (${dayPart.en}), ${dateStr} — Bangladesh time 🕒`;
    }
    if (lang === "ar") {
      return `الساعة الآن ${timeStr} بتوقيت بنغلاديش (${dateStr}) 🕒`;
    }
    if (lang === "tl") {
      return `Ngayon ay ${timeStr} sa Bangladesh time (${dateStr}) 🕒`;
    }
    return `এখন বাংলাদেশে সময় ${timeStr}, ${dateStr} — এখন ${dayPart.bn}বেলা 🕒`;
  },

  // ===================================================================
  //  হেল্পার
  // ===================================================================
  async getBotID(api) {
    if (this.botIDCache) return this.botIDCache;
    try {
      this.botIDCache = api.getCurrentUserID();
    } catch {
      this.botIDCache = null;
    }
    return this.botIDCache;
  },

  async getMahmudBase() {
    try {
      const { data } = await axios.get(
        "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
        { timeout: 10000 }
      );
      return data.mahmud || data.api;
    } catch {
      return "https://mahmud-apis.vercel.app";
    }
  },

  fileSizeGuard(maxBytes) {
    let received = 0;
    return new Transform({
      transform(chunk, _, cb) {
        received += chunk.length;
        if (received > maxBytes) {
          const e = new Error("File too large");
          e.code = "TOO_LARGE";
          return cb(e);
        }
        cb(null, chunk);
      }
    });
  },

  async removeFile(p) {
    if (p && fs.existsSync(p)) {
      try { await fs.unlink(p); } catch {}
    }
  },

  async searchYT(query) {
    try {
      const s = await yts(query);
      if (s.videos?.[0]) {
        return {
          url: s.videos[0].url,
          title: s.videos[0].title,
          videoId: s.videos[0].videoId
        };
      }
    } catch {}
    return null;
  },

  // ===== AUDIO (sing → music fallback) =====
  async downloadAudio(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;

    api.setMessageReaction("⌛", messageID, () => {}, true);

    // 1st try: SING
    try {
      const { data } = await axios.get(this.SING_AUDIO_API, {
        params: { q: `${query} official` },
        timeout: 45000
      });
      const audioUrl = data?.download || data?.audio_url;
      if (data?.success && audioUrl) {
        const ext = ["mp3", "m4a"].includes(data.format) ? data.format : "mp3";
        filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.${ext}`);
        const res = await axios.get(audioUrl, {
          responseType: "stream",
          timeout: 90000
        });
        await pipeline(
          res.data,
          this.fileSizeGuard(this.MAX_FILE_SIZE),
          fs.createWriteStream(filePath)
        );
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage({
          body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${data.title || query}`,
          attachment: fs.createReadStream(filePath)
        }, threadID, async () => {
          await this.removeFile(filePath);
        }, messageID);
      }
    } catch (e) {
      console.log("[nila] SING fail → trying MUSIC", e.message);
    }

    // 2nd try: MUSIC
    try {
      const base = await this.getMahmudBase();
      const res = await axios.get(
        `${base}/api/song/mahmud?query=${encodeURIComponent(query)}`,
        { responseType: "stream", timeout: 60000 }
      );
      filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp3`);
      await pipeline(res.data, fs.createWriteStream(filePath));
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${query}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, async () => {
        await this.removeFile(filePath);
      }, messageID);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("মাফ করো, গানটা পাওয়া যায়নি 🥺", threadID, messageID);
    }
  },

  // ===== VIDEO =====
  async downloadVideo(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;

    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const info = await this.searchYT(query);
      if (!info) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("মাফ করো, ভিডিওটা পাওয়া যায়নি 🥺", threadID, messageID);
      }

      filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp4`);
      const streamUrl = `${this.SING_VIDEO_API}/stream?url=${encodeURIComponent(info.url)}&type=video&quality=720`;
      const res = await axios.get(streamUrl, {
        responseType: "stream",
        timeout: 90000
      });
      await pipeline(
        res.data,
        this.fileSizeGuard(this.MAX_FILE_SIZE),
        fs.createWriteStream(filePath)
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: `${this.OWNER_TAG}\n\n🎬 এই নাও তোমার ভিডিও\n➡️ ${info.title}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, async () => {
        await this.removeFile(filePath);
      }, messageID);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      await this.removeFile(filePath);
      return api.sendMessage("ভিডিও ডাউনলোড হয়নি 🥺", threadID, messageID);
    }
  },

  // ===== AI (Nila) =====
  async handleAI(api, event, cleanedMsg) {
    const { threadID, messageID, senderID } = event;

    const profile = await this.getUserProfile(api, senderID);

    // === ভাষা বদলানোর কমান্ড চেক (লক হয়ে যাবে যতক্ষণ না আবার বদলাতে বলে) ===
    const langCmd = this.checkLanguageCommand(cleanedMsg);
    if (langCmd) {
      // ভাষা বদলানোর সময় পুরনো (অন্য ভাষার) হিস্টোরি মুছে ফেলা হয়, যাতে
      // নতুন ভাষায় কথোপকথন কোনোরকম মিক্সিং ছাড়াই একদম স্বাভাবিকভাবে শুরু হয়
      await this.updateUserProfile(senderID, {
        language: langCmd.code,
        langLocked: true,
        history: []
      });
      return this.sendTrackedMessage(api, langCmd.confirm, threadID, messageID, senderID);
    }

    // === ইউজার নিজে লিঙ্গ বলে দিলে সেটাই সংরক্ষণ, guess-এর চেয়ে অগ্রাধিকার ===
    const genderCmd = this.checkGenderCommand(cleanedMsg);
    if (genderCmd) {
      await this.updateUserProfile(senderID, {
        gender: genderCmd.gender,
        genderLocked: true
      });
      const activeLangForConfirm = profile.langLocked ? profile.language : (profile.language || "bn");
      const confirmMsg = this.GENDER_CONFIRM[activeLangForConfirm] || this.GENDER_CONFIRM.bn;
      return this.sendTrackedMessage(api, confirmMsg, threadID, messageID, senderID);
    }

    // === সময়/তারিখ সংক্রান্ত প্রশ্ন হলে সরাসরি সঠিক উত্তর, AI-কে জিজ্ঞেস না করে ===
    if (this.TIME_QUERY_REGEX.test(cleanedMsg)) {
      const replyLang = profile.langLocked ? profile.language : (profile.language || "bn");
      return this.sendTrackedMessage(api, this.buildTimeReply(replyLang), threadID, messageID, senderID);
    }

    // ব্যবহারের ভাষা: ইউজার লক করে থাকলে সেটাই, নাহলে ডিফল্ট বাংলা
    const activeLang = profile.langLocked ? profile.language : (profile.language || "bn");

    // === প্রতি-ইউজার হিস্টোরি (থ্রেড না, senderID অনুযায়ী) — লেবেল ভাষা-নিরপেক্ষ রাখা হয়েছে ===
    profile.history = profile.history || [];
    profile.history.push(`User: ${cleanedMsg}`);
    if (profile.history.length > 6) profile.history.shift();

    const { dayPart } = this.getBDTimeString(activeLang);
    const dayPartLabel = activeLang === "bn" ? dayPart.bn : dayPart.en;

    const genderMap = this.GENDER_NOTE_MAP[activeLang] || this.GENDER_NOTE_MAP.bn;
    const genderNote = genderMap[profile.gender] || "";

    // এই মেসেজে নাম বলা "অনুমোদিত" কিনা — প্রতি ৩ মেসেজে ১ বার
    const allowName = (profile.msgCount % 3 === 0);

    const prompt = this.buildPrompt(activeLang, {
      name: profile.name,
      genderNote,
      dayPartLabel,
      allowName,
      historyText: profile.history.join("\n")
    });

    try {
      const { data } = await axios.post(this.AI_API, { prompt }, { timeout: 20000 });
      let reply = data?.result?.answer || data?.answer || data?.reply || "কিছু বলো না তো... 🥺";

      if (reply.length > 120) {
        reply = reply.split(/[।.!?]/)[0].trim() + " 🫣";
      }

      // মডেল নিয়ম না মানলেও জোর করে নামের ফ্রিকোয়েন্সি কমানো
      reply = this.enforceNameFrequency(reply, profile);

      profile.history.push(`Nila: ${reply}`);
      profile.msgCount = (profile.msgCount || 0) + 1;
      await this.updateUserProfile(senderID, { history: profile.history, msgCount: profile.msgCount });

      return this.sendTrackedMessage(api, reply, threadID, messageID, senderID);
    } catch (e) {
      console.error("[nila AI]", e.message);
      return this.sendTrackedMessage(api, "নেটের সমস্যা, একটু পরে চেষ্টা করো 🥺", threadID, messageID, senderID);
    }
  },

  // ===== মেইন প্রসেস =====
  async processMessage(api, event, text, message) {
    const cleanedMsg = text.trim();
    if (!cleanedMsg) return message.reply("বলো তো, কী চাও? 😘");

    const isVideo = /\b(video|vdo|mp4|ভিডিও)\b/i.test(cleanedMsg);
    const isAudio = /\b(song|music|audio|mp3|play|গান)\b/i.test(cleanedMsg);

    let query = cleanedMsg
      .replace(/\b(video|vdo|mp4|ভিডিও|song|music|audio|mp3|play|গান|nila|nil|নিলা|নীলা|নিল)\b/gi, "")
      .trim();

    if (isVideo) {
      if (!query) return message.reply("ভিডিওর নামটা বলো তো 🥺");
      return this.downloadVideo(api, event, query);
    }

    if (isAudio) {
      if (!query) return message.reply("গানের নামটা বলো তো 🥺");
      return this.downloadAudio(api, event, query);
    }

    return this.handleAI(api, event, cleanedMsg);
  },

  // ===== কমান্ড =====
  async onStart({ api, event, args, message }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ
    return this.processMessage(api, event, args.join(" "), message);
  },

  // ===== onChat (নাম ধরে ডাকলে) =====
  async onChat({ api, event, message }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ

    const body = (event.body || "").toLowerCase().trim();
    if (!body) return;

    const triggered = this.TRIGGER_WORDS.some(word =>
      body.includes(word.toLowerCase())
    );
    if (!triggered) return;

    // প্রিফিক্স কমান্ড হলে ডাবল রেসপন্স বন্ধ
    const prefix = global.GoatBot?.config?.prefix || ".";
    if (body.startsWith(prefix)) return;

    return this.processMessage(api, event, event.body, message);
  },

  // ===== রিপ্লাই =====
  async onReply({ api, event, message, Reply }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ
    if (event.senderID !== Reply.author) return;

    const text = (event.body || "").trim();
    if (!text) return;
    return this.processMessage(api, event, text, message);
  }
};
