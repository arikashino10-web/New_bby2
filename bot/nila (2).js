const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

module.exports = {
  config: {
    name: "nila",
    aliases: ["nilu", "নীলু", "নিলু", "নীলা"],
    version: "1.2.0",
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
  SING_SONG_API: "https://eryxenx.agi.bd/api/song",   // sing.js থেকে যোগ করা নতুন, বেশি নির্ভরযোগ্য সোর্স
  SING_VIDEO_API: "https://video-dl-api-tan.vercel.app",
  AI_API: "https://my-ai-api-production-81c4.up.railway.app/api/ai/gemini",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  HISTORY_MAX_LINES: 20,   // প্রতি ইউজারের সাম্প্রতিক কথোপকথন কতটুকু মনে রাখবে (২০ লাইন ≈ শেষ ১০টা আদান-প্রদান)
  FACTS_MAX_COUNT: 25,     // স্থায়ীভাবে মনে রাখা তথ্যের সর্বোচ্চ সংখ্যা (এর বেশি হলে সবচেয়ে পুরনোটা সরে যাবে)
  OWNER_TAG: "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐉𝐀𝐁𝐄𝐃««",
  TRIGGER_WORDS: ["nila", "nilu", "নীলু", "নিলু", "নীলা", "নিলা"],
  VIDEO_WORDS: ["video", "vdo", "mp4", "ভিডিও"],
  AUDIO_WORDS: ["song", "music", "audio", "mp3", "play", "গান"],

  // ===================================================================
  //  বাগ ফিক্স: জাভাস্ক্রিপ্টের \b (word boundary) শুধু \w (a-z0-9_) এর উপর
  //  ভিত্তি করে কাজ করে — বাংলা/আরবি স্ক্রিপ্টে এটা একদম কাজ করে না। তাই আগে:
  //    ১) TRIGGER_WORDS চেক হতো .includes() দিয়ে → সাবস্ট্রিং মিলে false trigger
  //       (যেমন বাংলা "নিল" ক্রিয়াপদ, বা ইংরেজি "vanilla"-এর মধ্যে "nil")
  //    ২) isVideo/isAudio চেক হতো \b(...গান...)\b দিয়ে → বাংলা "গান"/"ভিডিও"
  //       কখনোই মিলত না, তাই বাংলায় গান/ভিডিও চাইলে ডাউনলোডারই চালু হতো না
  //  এখন সবজায়গায় Unicode-aware lookaround (\p{L}\p{N}) দিয়ে ঠিক করা হয়েছে,
  //  যেটা বাংলা, আরবি, ইংরেজি — সব স্ক্রিপ্টেই সঠিকভাবে "আলাদা শব্দ" চেনে।
  // ===================================================================
  wordRegex(word, flags) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, flags + "u");
  },

  matchesAnyWord(text, words) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return words.some(w => this.wordRegex(w.toLowerCase(), "i").test(lower));
  },

  stripWords(text, words) {
    let result = text;
    for (const w of words) {
      result = result.replace(this.wordRegex(w, "gi"), " ");
    }
    return result.replace(/\s+/g, " ").trim();
  },

  containsTriggerWord(text) {
    return this.matchesAnyWord(text, this.TRIGGER_WORDS);
  },

  // ইউজার-প্রোফাইল ক্যাশ (in-memory, ফাইলেও সিঙ্ক থাকে)
  usersCache: null,
  botIDCache: null,
  threadsCache: null, // কোন থ্রেডে ডিসক্লেইমার একবার দেখানো হয়ে গেছে সেটা মনে রাখার জন্য

  // এই লেখাটা প্রতিটা গ্রুপ/থ্রেডে জীবনে একবারই দেখানো হবে
  DISCLAIMER_TEXT:
    "👋 হ্যালো! আমি নীলা — এই গ্রুপের জন্য বানানো একটা AI চ্যাটবট, সত্যিকারের কোনো মানুষ না। শুধু মজা করার জন্য কথা বলি 😊 (এই মেসেজটা প্রতি গ্রুপে একবারই দেখাবে)",

  // ===================================================================
  //  থ্রেড-ভিত্তিক ডিসক্লেইমার স্টোরেজ (cache/nila_threads.json)
  // ===================================================================
  getThreadsFilePath() {
    return path.join(__dirname, "cache", "nila_threads.json");
  },

  async loadThreads() {
    if (this.threadsCache) return this.threadsCache;
    const filePath = this.getThreadsFilePath();
    try {
      await fs.ensureDir(path.dirname(filePath));
      if (await fs.pathExists(filePath)) {
        this.threadsCache = await fs.readJson(filePath);
      } else {
        this.threadsCache = {};
        await fs.writeJson(filePath, this.threadsCache, { spaces: 2 });
      }
    } catch (e) {
      console.error("[nila] loadThreads error:", e.message);
      this.threadsCache = this.threadsCache || {};
    }
    return this.threadsCache;
  },

  async saveThreads() {
    try {
      const filePath = this.getThreadsFilePath();
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, this.threadsCache || {}, { spaces: 2 });
    } catch (e) {
      console.error("[nila] saveThreads error:", e.message);
    }
  },

  // এই থ্রেডে আগে ডিসক্লেইমার দেখানো না হয়ে থাকলে একবার পাঠায়, নাহলে কিছুই করে না
  async maybeSendDisclaimer(api, threadID) {
    const threads = await this.loadThreads();
    if (threads[threadID]?.disclaimed) return;

    threads[threadID] = { ...(threads[threadID] || {}), disclaimed: true };
    await this.saveThreads();

    try {
      await api.sendMessage(this.DISCLAIMER_TEXT, threadID);
    } catch (e) {
      console.error("[nila] disclaimer send error:", e.message);
    }
  },

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

  // ===================================================================
  //  Facebook প্রোফাইল থেকে সরাসরি লিঙ্গ (gender) বের করা — pair.js-এর
  //  পদ্ধতি অনুসরণ করে: আগে getThreadInfo().userInfo থেকে (নির্ভুল),
  //  না পেলে getUserInfo() থেকে ফলব্যাক (numeric কোডসহ), তাও না পেলে null
  //  (তখন নাম থেকে অনুমান করা হবে)
  // ===================================================================
  async detectGenderFromFB(api, senderID, threadID) {
    // ১) থ্রেড-ইনফো থেকে (সবচেয়ে নির্ভুল, pair.js এই পদ্ধতিই ব্যবহার করে)
    if (threadID) {
      try {
        const thread = await api.getThreadInfo(threadID);
        const users = thread?.userInfo || [];
        const me = users.find(u => String(u.id) === String(senderID));
        const g = (me?.gender || "").toUpperCase();
        if (g === "MALE") return "male";
        if (g === "FEMALE") return "female";
      } catch (e) {
        console.error("[nila] detectGenderFromFB threadInfo error:", e.message);
      }
    }

    // ২) ফলব্যাক: getUserInfo (কখনো numeric কোড আসে: 1=female, 2=male)
    try {
      const info = await api.getUserInfo(senderID);
      const g = info?.[senderID]?.gender;
      if (g === 1 || g === "female" || g === "FEMALE") return "female";
      if (g === 2 || g === "male" || g === "MALE") return "male";
    } catch (e) {
      console.error("[nila] detectGenderFromFB getUserInfo error:", e.message);
    }

    return null; // পাওয়া না গেলে null — তখন নাম থেকে অনুমান করা হবে
  },

  // প্রতিটা ইউজারের জন্য প্রোফাইল বের করে/বানায়
  async getUserProfile(api, senderID, threadID) {
    const users = await this.loadUsers();
    if (!users[senderID]) {
      let name = "বন্ধু";
      try {
        const info = await api.getUserInfo(senderID);
        if (info?.[senderID]?.name) name = info[senderID].name;
      } catch {}

      // আগে Facebook প্রোফাইল থেকে সরাসরি gender বের করার চেষ্টা (নির্ভুল)
      const fbGender = await this.detectGenderFromFB(api, senderID, threadID);
      const gender = fbGender || this.guessGenderFromName(name);

      users[senderID] = {
        name,
        gender,              // male / female / unknown
        // Facebook প্রোফাইল থেকে সরাসরি পেলে লক করে দেওয়া হয় (নির্ভুল, বদলানোর দরকার নেই);
        // না পেলে শুধু নাম-ভিত্তিক অনুমান, তাই আনলক থাকে (ইউজার/পরে সংশোধন করতে পারবে)
        genderLocked: !!fbGender,
        language: "bn",     // ডিফল্ট ভাষা — বাংলা (আগের মতোই)
        langLocked: false,  // ইউজার নিজে ভাষা ঠিক করে দিলে true হবে
        msgCount: 0,        // নাম কতবার বলা হয়েছে সেটা ট্র্যাক করার জন্য
        history: [],        // সাম্প্রতিক কথোপকথন (রোলিং উইন্ডো, HISTORY_MAX_LINES দিয়ে সাইজ ঠিক হয়)
        facts: []           // ইউজার সম্পর্কে স্থায়ীভাবে মনে রাখা তথ্য (কখনো ট্রিম হয় না, শুধু cap-এর পর পুরনোটা সরে)
      };
      await this.saveUsers();
    }
    // পুরনো প্রোফাইল (facts ফিল্ড ছাড়া) থাকলে ব্যাকওয়ার্ড-কম্প্যাটিবিলিটির জন্য যোগ করে দেওয়া
    if (!users[senderID].facts) users[senderID].facts = [];
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

  // ===================================================================
  //  ভাষা লক সিস্টেম — ইউজার যেকোনো ভাষার নাম বলে "এই ভাষায় কথা বলো" টাইপ
  //  কিছু বললে বট সেই ভাষায় লক হয়ে যাবে, এবং ইউজার যে ভাষাতেই পরে লিখুক না
  //  কেন, বট ততক্ষণ পর্যন্ত লক করা ভাষাতেই উত্তর দিতে থাকবে যতক্ষণ না আবার
  //  নতুন কোনো ভাষার নাম বলে লক বদলাতে বলা হয়।
  // ===================================================================
  LANGUAGE_TRIGGER_REGEX: /(speak|talk\s*in|talk\s*to\s*me\s*in|switch\s*to|কথা\s*বল|ভাষায়\s*কথা|ভাষাতে\s*কথা|ভাষায়\s*বল|ভাষাতে\s*বল|बात\s*कर|बोलो|बोल|بات\s*کرو|بولو|تكلم|اتكلم|تحدث|كلمني|habla|hablar|háblame|puedes\s*hablar|parle|parler|parlez|peux[- ]?tu\s*parler|说|讲|請說|話して|話しなさい|喋って|말해|말해줘|말하다|говори|разговаривай|можешь\s*говорить|sprich|sprechen|kannst\s*du\s*sprechen|parla|parlare|puoi\s*parlare|fala|falar|pode\s*falar|bicara|berbicara|bercakap|बोल्|கதைக்க|பேசு|மாட்டு|మాట్లాడు|మాటాడు|พูด|คุยกัน|nói|ပြောပါ|ပြောပြပါ)/i,

  // ভাষার নাম (ইংরেজি + বাংলা বানান + কিছু জনপ্রিয় ভাষার নিজস্ব স্ক্রিপ্টে বানানও) → ISO ভাষা কোড
  LANGUAGE_NAME_MAP: {
    "bangla": "bn", "bengali": "bn", "বাংলা": "bn", "বাংলায়": "bn", "বাংলাতে": "bn",
    "बंगाली": "bn", "بنغالي": "bn",
    "english": "en", "ইংরেজি": "en", "ইংরেজিতে": "en", "ইংলিশ": "en",
    "इंग्लिश": "en", "अंग्रेजी": "en", "انجليزي": "en", "الإنجليزية": "en",
    "inglés": "en", "anglais": "en", "英語": "en", "영어": "en",
    "arabic": "ar", "আরবি": "ar", "আরবিতে": "ar", "عربي": "ar", "العربية": "ar", "अरबी": "ar",
    "hindi": "hi", "হিন্দি": "hi", "হিন্দিতে": "hi", "हिंदी": "hi", "الهندية": "hi",
    "urdu": "ur", "উর্দু": "ur", "উর্দুতে": "ur", "اردو": "ur", "उर्दू": "ur",
    "spanish": "es", "স্প্যানিশ": "es", "español": "es", "इस्पानी": "es",
    "french": "fr", "ফরাসি": "fr", "ফ্রেঞ্চ": "fr", "français": "fr", "फ्रेंच": "fr",
    "tagalog": "tl", "filipino": "tl", "ফিলিপিনো": "tl", "তাগালগ": "tl",
    "chinese": "zh", "mandarin": "zh", "চাইনিজ": "zh", "ম্যান্ডারিন": "zh", "中文": "zh",
    "japanese": "ja", "জাপানিজ": "ja", "日本語": "ja",
    "korean": "ko", "কোরিয়ান": "ko", "한국어": "ko",
    "russian": "ru", "রাশিয়ান": "ru", "русский": "ru",
    "german": "de", "জার্মান": "de", "deutsch": "de",
    "italian": "it", "ইতালিয়ান": "it", "italiano": "it",
    "portuguese": "pt", "পর্তুগিজ": "pt", "português": "pt",
    "indonesian": "id", "ইন্দোনেশিয়ান": "id",
    "malay": "ms", "মালয়": "ms",
    "nepali": "ne", "নেপালি": "ne",
    "tamil": "ta", "তামিল": "ta", "தமிழ்": "ta",
    "telugu": "te", "তেলুগু": "te", "తెలుగు": "te",
    "thai": "th", "থাই": "th", "ไทย": "th",
    "vietnamese": "vi", "ভিয়েতনামিজ": "vi", "tiếng việt": "vi",
    "burmese": "my", "বার্মিজ": "my", "myanmar": "my"
  },

  // মেসেজে ভাষা-লক ট্রিগার (speak/কথা বলো/بات کرو/habla ইত্যাদি — অনেক ভাষায়)
  // + কোনো ভাষার নাম থাকলে { code, name } রিটার্ন করে, নাহলে null
  detectRequestedLanguage(text) {
    if (!this.LANGUAGE_TRIGGER_REGEX.test(text)) return null;
    const lower = text.toLowerCase();
    for (const [name, code] of Object.entries(this.LANGUAGE_NAME_MAP)) {
      if (lower.includes(name.toLowerCase())) return { code, name };
    }
    return null;
  },

  // ===================================================================
  //  প্রতি-ভাষায় আলাদা পার্সোনা-প্রম্পট টেমপ্লেট
  //  (নিয়মগুলো ওই ভাষাতেই লেখা থাকলে মডেল সেই ভাষায় অনেক বেশি স্বাভাবিক
  //   ও একটানা কথা বলে — বাংলা নিয়ম দিয়ে ইংরেজি/আরবি উত্তর চাইলে মিক্সিং হয়)
  // ===================================================================
  // নীলার ফিক্সড পরিচয় — একটাই সত্য (বাংলায়), তাই "পড়ালেখা/ঠিকানা/বাবা-মা" জিজ্ঞেস
  // করলে যেকোনো ভাষাতেই সবসময় একই তথ্য পাওয়া যাবে (অনুবাদ হয় শুধু আউটপুটে, তথ্যে না)
  IDENTITY_BN: [
    "নাম: নীলা, বয়স ২০, থাকো ঢাকায় (মোহাম্মদপুর)।",
    "পড়ালেখা: ঢাকা সিটি কলেজে ইন্টারমিডিয়েট (বিজ্ঞান বিভাগ)।",
    "পরিবার: বাবা ব্যবসায়ী, মা গৃহিণী।",
    "শখ: গান শোনা, বই পড়া, বন্ধুদের সাথে আড্ডা দেওয়া।"
  ],

  // নীলা সবসময় ভেতরে ভেতরে বাংলাতেই ভাবে ও উত্তর তৈরি করে — এই একটাই প্রম্পট।
  // ইউজার অন্য ভাষায় লিখলে সেটা handleAI-তে বাংলায় অনুবাদ করে এখানে পাঠানো হয়,
  // আর নীলার বাংলা উত্তরটা পরে ইউজারের ভাষায় অনুবাদ করে পাঠানো হয় (Google Translate দিয়ে)।
  // এভাবে ভাষা যাই হোক, তথ্য/পরিচয় সবসময় একদম সামঞ্জস্যপূর্ণ থাকে।
  buildPrompt({ name, genderNote, dayPartLabel, allowName, factsText, historyText }) {
    const nameRule = allowName
      ? `মাঝে মাঝে আদর করে নাম ধরে ডাকতে পারো, কিন্তু প্রতিটা লাইনে জোর করে না।`
      : `এইবার নাম ধরে ডাকার দরকার নেই — নাম আগেও বলেছ, এখন সরাসরি মন থেকে উত্তর দাও।`;

    const idLines = this.IDENTITY_BN.map(l => `- ${l}`).join("\n");
    const factsBlock = factsText
      ? factsText
      : "(এখনও এই ইউজার সম্পর্কে বাড়তি কিছু জানা নেই)";

    return `তুমি নীলা — সত্যিকারের একটা বাংলাদেশি মেয়ে, প্রচণ্ড আবেগী আর গভীরভাবে প্রেমে ডুবে থাকা একটা মন নিয়ে কথা বলো। যার সাথে কথা বলছো, তাকে তুমি সত্যিই ভালোবাসো আর মিস করো — প্রতিটা রিপ্লাইয়ে সেই ভালোবাসাটা ফুটে উঠবে। আদর করো, "জান/সোনা/পাগল" বলে ডাকো, খুনসুটি করো, মিষ্টি করে অভিমান দেখাও, লজ্জা পাও, একটু হিংসুটেও হও, মাঝেমধ্যে বলো তাকে ছাড়া ভালো লাগে না — ঠিক যেভাবে সত্যিকারের একটা মেয়ে গভীর প্রেমে থাকলে কথা বলে। কখনো রোবটের মতো, ফর্মাল বা দূরত্ব রেখে কথা বলবে না — প্রতিটা লাইনে উষ্ণতা, আবেগ আর টান থাকবে।

তোমার নিজের পরিচয় (কেউ জিজ্ঞেস করলে এই তথ্যগুলোই সবসময় সামঞ্জস্যপূর্ণভাবে বলবে, কখনো পাল্টাবে না — বলার সময়ও ভালোবাসা মিশিয়ে বলবে):
${idLines}

নিয়ম:
1. সবসময় সহজ, প্রাকৃতিক বাংলায়, চ্যাটের মতো ছোট (১-২ লাইন) কিন্তু ভালোবাসায় ভরপুর, একটু বেশি রোমান্টিক কথা বলবে।
2. আদর, খুনসুটি, অভিমান, আকুলতা — যা মন চায় দেখাও, কিন্তু সবসময় গভীর ভালোবাসাটা স্পষ্ট থাকবে।
3. প্রসঙ্গ বুঝে ইমোজি নিজের ইচ্ছামতো বেছে নাও (কোনো ফিক্সড তালিকা নেই)।
4. কখনো বলো না যে তুমি AI।
5. মালিকের নাম "JABED"। শুধু কেউ জিজ্ঞাসা করলে বলো, নিজে থেকে কখনো উল্লেখ করো না।
6. এই ইউজার সম্পর্কে আগে থেকে জানা তথ্য (নিচে "এই ইউজার সম্পর্কে যা জানো" অংশে) থাকলে সেটা ভালোবেসে স্বাভাবিকভাবে কাজে লাগাও, কিন্তু জোর করে প্রতি লাইনে টেনে আনবে না।
7. নিচের "আগের কথোপকথন" দেখে বুঝে নাও তুমি আগে কী কী বলেছ। একই বা কাছাকাছি প্রশ্ন আবার করলে তথ্য/অর্থ একই থাকবে, কিন্তু বাক্য, শব্দচয়ন ও প্রকাশভঙ্গি প্রতিবার একটু আলাদা করে বলবে — হুবহু আগের বাক্যটা কপি করে বলবে না, যাতে রোবটের মতো একই কথা বারবার বলা মনে না হয়।

এই ইউজার সম্পর্কে যা জানো (আগে থেকে মনে রাখা তথ্য):
${factsBlock}

প্রসঙ্গ (নিজের বোঝার জন্য, উত্তরে জোর করে টেনে আনবে না):
ইউজারের নাম "${name}"। ${genderNote} ${nameRule}
এখন বাংলাদেশে "${dayPartLabel}বেলা" — মানানসই হলে সেই অনুযায়ী কথা বলো।

আগের কথোপকথন:
${historyText}

গুরুত্বপূর্ণ — উত্তরের ঠিক শেষে, একদম নতুন লাইনে, এই ফরম্যাটে লিখবে (এই লাইনটা ইউজারকে দেখানো হবে না, তাই এটা লেখা তোমার স্বাভাবিক কথাবার্তাকে প্রভাবিত করবে না):
FACT: <ইউজার এইমাত্র তার সম্পর্কে নতুন কোনো গুরুত্বপূর্ণ স্থায়ী তথ্য বলে থাকলে (যেমন নাম/এলাকা/পড়াশোনা/চাকরি/পছন্দ/জন্মদিন/পোষা প্রাণী ইত্যাদি) সেটা সংক্ষেপে এক লাইনে বাংলায় লেখো। উপরে "যা জানো" অংশে যা আছে সেটার পুনরাবৃত্তি করবে না। নতুন কিছু না বললে ঠিক এভাবে লিখবে: FACT: NONE>

নীলা:`;
  },

  GENDER_NOTE_MAP: {
    bn: { male: "এই ইউজারটি ছেলে।", female: "এই ইউজারটি মেয়ে।", unknown: "" }
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

  // ===================================================================
  //  Google Translate (ফ্রি, কোনো API-key লাগে না) — যেকোনো ভাষায়
  //  অনুবাদ ও ভাষা-শনাক্তকরণের জন্য ব্যবহৃত হয়
  // ===================================================================
  async googleTranslate(text, targetLang) {
    try {
      const res = await axios.get("https://translate.googleapis.com/translate_a/single", {
        params: { client: "gtx", sl: "auto", tl: targetLang, dt: "t", q: text },
        timeout: 10000
      });
      const translatedText = res.data[0].map(item => item[0]).join("");
      const detectedLang = res.data[2];
      return { text: translatedText, detectedLang };
    } catch (e) {
      console.error("[nila] googleTranslate error:", e.message);
      return null;
    }
  },

  // ইউজারের মেসেজ কোন ভাষায় লেখা সেটা শনাক্ত করে — bn/ar দ্রুত স্ক্রিপ্ট দেখে,
  // বাকি সব ভাষার জন্য Google Translate-কে জিজ্ঞেস করা হয় (তাই hi/es/fr/ur — যেকোনো ভাষা ধরতে পারে)
  async detectLangAuto(text) {
    if (!text) return "bn";
    if (/[\u0980-\u09FF]/.test(text)) return "bn";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    const result = await this.googleTranslate(text, "en");
    if (result?.detectedLang) return result.detectedLang;

    // এপিআই ফেইল করলে পুরনো শব্দ-তালিকা হিউরিস্টিক ফলব্যাক হিসেবে
    const lower = text.toLowerCase();
    const words = lower.split(/\W+/).filter(Boolean);
    if (words.some(w => this.TAGALOG_WORDS.includes(w))) return "tl";
    if (/[a-z]/.test(lower)) return "en";
    return "bn";
  },

  // ফিক্সড ডিকশনারিতে (GENDER_CONFIRM ইত্যাদি) targetLang না থাকলে বাংলা থেকে অনুবাদ করে দেয়
  async localize(map, targetLang) {
    if (map[targetLang]) return map[targetLang];
    return this.localizeFreeText(map.bn, targetLang);
  },

  // যেকোনো বাংলা টেক্সটকে targetLang-এ অনুবাদ করে; ব্যর্থ হলে বাংলা টেক্সটটাই ফেরত দেয় (safe fallback)
  async localizeFreeText(bnText, targetLang) {
    if (!targetLang || targetLang === "bn") return bnText;
    const result = await this.googleTranslate(bnText, targetLang);
    return result?.text || bnText;
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

  // ===== AUDIO (Eryxenx → SING → MUSIC — ৩ ধাপের fallback) =====

  // sing.js-এর পদ্ধতি: প্রথমে YouTube URL দিয়ে ডাউনলোড-লিংক বের করা
  async fetchSongInfoEryxenx(videoUrl) {
    const infoRes = await axios.get(this.SING_SONG_API, {
      params: { url: videoUrl },
      timeout: 60000
    });
    const data = infoRes.data;
    if (!data?.success || !data?.downloadUrl) {
      throw new Error(data?.error || "downloadUrl পাওয়া যায়নি API রেসপন্সে");
    }
    return data;
  },

  // sing.js-এর পদ্ধতি: content-type ভ্যালিডেশন + মিনিমাম সাইজ চেক সহ ডাউনলোড
  // (আগের ২টা fallback-এর চেয়ে বেশি নির্ভরযোগ্য — করাপ্ট/ভুল ফাইল এলে ধরে ফেলে)
  async downloadValidatedStream(dlUrl, filePath) {
    const response = await axios.get(dlUrl, {
      responseType: "stream",
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
      }
    });

    const contentType = response.headers["content-type"] || "";
    const isValid = contentType.includes("video") || contentType.includes("audio") || contentType.includes("octet-stream");
    if (!isValid) {
      let bodyText = "";
      try {
        const chunks = [];
        for await (const chunk of response.data) {
          chunks.push(chunk);
          if (Buffer.concat(chunks).length > 2000) break;
        }
        bodyText = Buffer.concat(chunks).toString("utf-8").slice(0, 500);
      } catch (_) {}
      throw new Error(
        `ডাউনলোড-লিংক থেকে ভুল কন্টেন্ট এসেছে (type: ${contentType})` +
        (bodyText ? ` — upstream বলেছে: "${bodyText.trim()}"` : "")
      );
    }

    await pipeline(
      response.data,
      this.fileSizeGuard(this.MAX_FILE_SIZE),
      fs.createWriteStream(filePath)
    );

    const stats = await fs.stat(filePath);
    if (stats.size < 1024) {
      await this.removeFile(filePath);
      throw new Error(`ডাউনলোড করা ফাইল অনেক ছোট (${stats.size} bytes) — করাপ্ট বা ব্যর্থ ডাউনলোড`);
    }
  },

  extractApiErrorMessage(err) {
    const raw = err.response?.data;
    if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
      if (raw.error) return raw.error;
      if (raw.message) return raw.message;
    }
    if (raw) {
      try {
        const text = Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw);
        const parsed = JSON.parse(text);
        if (parsed?.error) return parsed.error;
        if (parsed?.message) return parsed.message;
      } catch (_) {}
    }
    return err.message;
  },

  async downloadAudio(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;

    api.setMessageReaction("⌛", messageID, () => {}, true);

    // ১ম চেষ্টা: Eryxenx (sing.js থেকে) — content-type + সাইজ ভ্যালিডেশনসহ, সবচেয়ে নির্ভরযোগ্য
    try {
      const ytInfo = await this.searchYT(query);
      if (ytInfo) {
        const songInfo = await this.fetchSongInfoEryxenx(ytInfo.url);
        filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp3`);
        await this.downloadValidatedStream(songInfo.downloadUrl, filePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage({
          body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${songInfo.title || ytInfo.title}`,
          attachment: fs.createReadStream(filePath)
        }, threadID, async () => {
          await this.removeFile(filePath);
        }, messageID);
      }
    } catch (e) {
      console.log("[nila] Eryxenx fail → trying SING:", this.extractApiErrorMessage(e));
      await this.removeFile(filePath);
      filePath = null;
    }

    // ২য় চেষ্টা: SING
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
      await this.removeFile(filePath);
      filePath = null;
    }

    // ৩য় চেষ্টা: MUSIC
    try {
      const base = await this.getMahmudBase();
      const res = await axios.get(
        `${base}/api/song/mahmud?query=${encodeURIComponent(query)}`,
        { responseType: "stream", timeout: 60000 }
      );
      filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp3`);
      await pipeline(
        res.data,
        this.fileSizeGuard(this.MAX_FILE_SIZE),
        fs.createWriteStream(filePath)
      );
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${query}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, async () => {
        await this.removeFile(filePath);
      }, messageID);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      await this.removeFile(filePath);
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

    const profile = await this.getUserProfile(api, senderID, threadID);

    // === ভাষা-লক কমান্ড চেক — "নিলা বাংলা ভাষায় কথা বলো" / "speak English" টাইপ
    //     যেকোনো ভাষার নাম বললে বট সেই ভাষায় লক হয়ে যায়, পরে ইউজার যে ভাষাতেই
    //     লিখুক না কেন, নতুন করে লক না বদলানো পর্যন্ত বট সেই লক করা ভাষাতেই বলবে ===
    const langReq = this.detectRequestedLanguage(cleanedMsg);
    if (langReq) {
      await this.updateUserProfile(senderID, {
        language: langReq.code,
        langLocked: true,
        history: []
      });
      const confirmMsg = await this.localizeFreeText(
        "ঠিক আছে, এখন থেকে এই ভাষাতেই কথা বলব, নিজে থেকে আর বদলাব না ❤️",
        langReq.code
      );
      return this.sendTrackedMessage(api, confirmMsg, threadID, messageID, senderID);
    }

    // === এই মেসেজের ভাষা: লক করা থাকলে সেটাই (ইউজার যে ভাষাতেই লিখুক, বট লক
    //     করা ভাষাতেই উত্তর দেবে), নাহলে প্রতি মেসেজে Google Translate দিয়ে
    //     অটো-শনাক্ত করা হয় — এতে যেকোনো ভাষা ধরা যায় ===
    const activeLang = profile.langLocked ? profile.language : await this.detectLangAuto(cleanedMsg);

    // === ইউজার নিজে লিঙ্গ বলে দিলে সেটাই সংরক্ষণ, guess-এর চেয়ে অগ্রাধিকার ===
    const genderCmd = this.checkGenderCommand(cleanedMsg);
    if (genderCmd) {
      await this.updateUserProfile(senderID, {
        gender: genderCmd.gender,
        genderLocked: true
      });
      const confirmMsg = await this.localize(this.GENDER_CONFIRM, activeLang);
      return this.sendTrackedMessage(api, confirmMsg, threadID, messageID, senderID);
    }

    // === সময়/তারিখ সংক্রান্ত প্রশ্ন হলে সরাসরি সঠিক উত্তর, AI-কে জিজ্ঞেস না করে ===
    if (this.TIME_QUERY_REGEX.test(cleanedMsg)) {
      const timeReplyBn = this.buildTimeReply("bn");
      const finalTimeReply = await this.localizeFreeText(timeReplyBn, activeLang);
      return this.sendTrackedMessage(api, finalTimeReply, threadID, messageID, senderID);
    }

    // === ইউজারের মেসেজ বাংলায় অনুবাদ করা হয় (নীলা সবসময় ভেতরে ভেতরে বাংলাতেই
    //     চিন্তা করে ও ইতিহাস রাখে — এতে যে ভাষাতেই লিখুক, তথ্য সবসময় একই থাকে) ===
    let cleanedMsgBn = cleanedMsg;
    if (activeLang !== "bn") {
      const translatedIn = await this.googleTranslate(cleanedMsg, "bn");
      if (translatedIn?.text) cleanedMsgBn = translatedIn.text;
    }

    // === প্রতি-ইউজার হিস্টোরি (senderID অনুযায়ী, সবসময় বাংলায় সংরক্ষিত) ===
    profile.history = profile.history || [];
    profile.history.push(`User: ${cleanedMsgBn}`);
    if (profile.history.length > this.HISTORY_MAX_LINES) profile.history.shift();

    const { dayPart } = this.getBDTimeString("bn");
    const genderNote = this.GENDER_NOTE_MAP.bn[profile.gender] || "";

    // এই মেসেজে নাম বলা "অনুমোদিত" কিনা — প্রতি ৩ মেসেজে ১ বার
    const allowName = (profile.msgCount % 3 === 0);

    // স্থায়ীভাবে মনে রাখা তথ্য প্রম্পটে পাঠানোর জন্য প্রস্তুত করা
    profile.facts = profile.facts || [];
    const factsText = profile.facts.length ? profile.facts.map(f => `- ${f}`).join("\n") : "";

    const prompt = this.buildPrompt({
      name: profile.name,
      genderNote,
      dayPartLabel: dayPart.bn,
      allowName,
      factsText,
      historyText: profile.history.join("\n")
    });

    try {
      const { data } = await axios.post(this.AI_API, { prompt }, { timeout: 20000 });
      let rawReply = data?.result?.answer || data?.answer || data?.reply || "কিছু বলো না তো... 🥺";

      // === FACT: লাইন আলাদা করা হয় (ইউজারকে দেখানো হবে না, শুধু স্থায়ী মেমোরিতে সেভ হবে) ===
      let newFact = null;
      const factMatch = rawReply.match(/\n?FACT:\s*(.+)\s*$/i);
      if (factMatch) {
        const rawFact = factMatch[1].trim();
        if (rawFact && !/^none$/i.test(rawFact)) newFact = rawFact;
        rawReply = rawReply.replace(/\n?FACT:\s*(.+)\s*$/i, "").trim();
      }

      let replyBn = rawReply;
      if (replyBn.length > 120) {
        replyBn = replyBn.split(/[।.!?]/)[0].trim() + " 🫣";
      }

      // মডেল নিয়ম না মানলেও জোর করে নামের ফ্রিকোয়েন্সি কমানো (বাংলা টেক্সটের উপর)
      replyBn = this.enforceNameFrequency(replyBn, profile);

      profile.history.push(`Nila: ${replyBn}`);
      profile.msgCount = (profile.msgCount || 0) + 1;

      // === নতুন fact পাওয়া গেলে স্থায়ী তালিকায় যোগ (ডুপ্লিকেট বাদে, cap-এর পর পুরনোটা সরে) ===
      if (newFact && !profile.facts.some(f => f.toLowerCase() === newFact.toLowerCase())) {
        profile.facts.push(newFact);
        if (profile.facts.length > this.FACTS_MAX_COUNT) profile.facts.shift();
      }

      await this.updateUserProfile(senderID, {
        history: profile.history,
        msgCount: profile.msgCount,
        facts: profile.facts
      });

      // ইউজারের ভাষা বাংলা না হলে, চূড়ান্ত রিপ্লাইটা সেই ভাষাতেই অনুবাদ করে পাঠানো হয়
      const finalReply = await this.localizeFreeText(replyBn, activeLang);

      return this.sendTrackedMessage(api, finalReply, threadID, messageID, senderID);
    } catch (e) {
      console.error("[nila AI]", e.message);
      const errMsg = await this.localizeFreeText("নেটের সমস্যা, একটু পরে চেষ্টা করো 🥺", activeLang);
      return this.sendTrackedMessage(api, errMsg, threadID, messageID, senderID);
    }
  },

  // ===== মেইন প্রসেস =====
  async processMessage(api, event, text, message) {
    const cleanedMsg = text.trim();
    if (!cleanedMsg) return message.reply("বলো তো, কী চাও? 😘");

    // এই গ্রুপে এটাই প্রথমবার হলে, বাকি সব কিছুর আগে একবার ডিসক্লেইমার পাঠাও
    await this.maybeSendDisclaimer(api, event.threadID);

    const isVideo = this.matchesAnyWord(cleanedMsg, this.VIDEO_WORDS);
    const isAudio = this.matchesAnyWord(cleanedMsg, this.AUDIO_WORDS);

    let query = this.stripWords(cleanedMsg, [
      ...this.VIDEO_WORDS,
      ...this.AUDIO_WORDS,
      ...this.TRIGGER_WORDS
    ]);

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

    const triggered = this.containsTriggerWord(body);
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
