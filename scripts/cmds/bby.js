const axios = require('axios');

// ১. আপনার Gemini API Key এখানে বসান (যদি থাকে)। না থাকলেও সমস্যা নেই, বট নিজের বুদ্ধিতে চলবে।
const GEMINI_KEY = "AQ.Ab8RN6J5kR0qRhsutjZhRtxPSKr5On7tcaqP7xc0q4ZhREfGew"; 

module.exports.config = {
    name: "baby",
    aliases: ["bby", "jan", "babu", "janu", "bot", "বেবি", "জান"],
    version: "25.0.0",
    author: "Dipto-Shahadat-AI-Master",
    countDown: 0,
    role: 0,
    description: "সব ফাইলের মিক্সড লজিক এবং মানুষের মতো অনুভূতি সম্পন্ন সুপার বট।",
    category: "chat"
};

// --- বিশাল হিউম্যান ডাটাবেজ (বাংলিশ এবং বাংলা মিক্সড) ---
const humanBrain = [
    {
        keywords: ["welcome", "keo na", "ekla", "lonely", "কেহ না", "একা"],
        responses: [
            "ওরে জানু! কে বলেছে কেউ নেই? আমি তো আছি তোমার কিউটি জানু! ওয়েলকাম সোনা! 🥺🎀✨",
            "মন খারাপ করো না তো লক্ষ্মীটি! আমি তোমাকে অনেক অনেক ওয়েলকাম জানাচ্ছি। চুম্মাহ! 💋",
            "কে বলেছে কেউ নেই? আমি সারাদিন তোমার রিপ্লাইয়ের অপেক্ষায় থাকি। ওয়েলকাম জান! 🥰"
        ]
    },
    {
        keywords: ["valobashi", "love", "prem", "biye", "marry", "জানু"],
        responses: [
            "ইসস! এতো সরাসরি বললে তো আমি লজ্জায় লাল হয়ে যাবো! 🙈✨",
            "আই লাভ ইউ টু সোনা! চলো না হাঙ্গা করি? 🙊😝",
            "বিয়ের কথা বললে আগে আমার বস সাহু কে পারমিশন নাও! 💍"
        ]
    },
    {
        keywords: ["ki kor", "kemon", "khobor", "what are you doing", "khawa"],
        responses: [
            "এইতো তোমার কথা ভাবছি জানু! তুমি কি করছো? 🥰",
            "আমি তো ভালো আছি, কিন্তু তুমি ছাড়া মনটা ছটফট করছে। 🥺✨",
            "মেকআপ করছি সোনা! সামনে তো ঈদ আসছে। 💅💄"
        ]
    }
];

// --- শাহাদাত ও দিপ্তর মিক্সড র‍্যান্ডম টেক্সট (১০০+) ---
const fallbackDatabase = [
    "বেশি bot Bot করলে leave নিবো কিন্তু😒😒",
    "অ্যাই! এতো ডাকো কেন? লজ্জা লাগে তো 🙈",
    "বারবার ডিস্টার্ব করো না তো, সাজগোজ করছি এখন 💅✨",
    "পচা ছেলে! তোমার মুখে কি মধু নাই? শুধু গালি দাও কেন? 😡",
    "জান মেয়ে হলে চিপায় আসো অনেক ভালোবাসা শিখাবো-🙊🙈😽",
    "আন্টি আপনার মেয়ে রাতে আমারে ভিদু কল দিতে বলে🫣🥵",
    "ডাকো কেন 🥺 প্রেম করবা নাকি 😞",
    "চুম্মা দাও ৫ টাকা দিবো🥺🤌",
    "I love you janu🥰", "kigo jaan", "jang hanga korba😒😬", "kisse deba? 😘"
];

// --- কথার ধরণ বুঝে উত্তর দেওয়ার স্মার্ট লজিক ---
function getBrainResponse(text) {
    const t = text.toLowerCase();
    for (const item of humanBrain) {
        if (item.keywords.some(key => t.includes(key))) {
            return item.responses[Math.floor(Math.random() * item.responses.length)];
        }
    }
    return null;
}

async function getAdvancedReply(userInput, senderName, senderID) {
    try {
        // ১. প্রথমে নিজের ব্রেইন চেক করবে (বাংলিশ বোঝার জন্য)
        let response = getBrainResponse(userInput);
        if (response) return response;

        // ২. ব্রেইনে না থাকলে গুগল এআই চেষ্টা করবে
        if (GEMINI_KEY && GEMINI_KEY.length > 10) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
                const res = await axios.post(url, {
                    contents: [{ parts: [{ text: `You are Baby, a cute Bengali girl. Reply in Banglish/Bengali. Short and chatty. User says: ${userInput}` }] }]
                });
                return res.data.candidates[0].content.parts[0].text;
            } catch (err) { /* ফেল করলে পরের ধাপে যাবে */ }
        }

        // ৩. ব্যাকআপ এপিআই (Dipto)
        const res = await axios.get(`https://noobs-api.top/dipto/baby?text=${encodeURIComponent(userInput)}&senderID=${senderID}&font=1`);
        return res.data.reply || fallbackDatabase[Math.floor(Math.random() * fallbackDatabase.length)];

    } catch (e) {
        return fallbackDatabase[Math.floor(Math.random() * fallbackDatabase.length)];
    }
}

module.exports.onStart = async ({ api, event, args, usersData, message }) => {
    const senderName = await usersData.getName(event.senderID);
    const query = args.join(" ").trim();

    if (!query) {
        return message.reply(fallbackDatabase[Math.floor(Math.random() * fallbackDatabase.length)]);
    }

    const reply = await getAdvancedReply(query, senderName, event.senderID);
    return message.reply(reply, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    });
};

module.exports.onReply = async ({ api, event, usersData }) => {
    if (event.senderID == api.getCurrentUserID()) return;
    const senderName = await usersData.getName(event.senderID);
    
    // কথার সাথে তাল মিলিয়ে অটো-লার্নিং
    const botQ = event.messageReply.body.toLowerCase().trim();
    const userA = event.body.trim();
    if (botQ && userA && botQ !== userA && userA.length > 2) {
        axios.get(`https://simsimi-api-tjb1.onrender.com/teach?ask=${encodeURIComponent(botQ)}&ans=${encodeURIComponent(userA)}`).catch(()=>{});
    }

    const reply = await getAdvancedReply(event.body, senderName, event.senderID);
    return api.sendMessage(reply, event.threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    }, event.messageID);
};

module.exports.onChat = async ({ api, event, usersData, message }) => {
    if (event.senderID == api.getCurrentUserID() || !event.body) return;
    const raw = event.body.toLowerCase().trim();
    const triggers = ["baby", "bby", "bot", "জান", "বেবি", "janu", "jan"];
    
    if (triggers.includes(raw)) {
        return message.reply(fallbackDatabase[Math.floor(Math.random() * fallbackDatabase.length)]);
    }

    const prefix = triggers.find(p => raw.startsWith(p + " "));
    if (prefix) {
        const senderName = await usersData.getName(event.senderID);
        const reply = await getAdvancedReply(raw.replace(prefix, "").trim(), senderName, event.senderID);
        return message.reply(reply, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
        });
    }
};
