const axios = require('axios');

// API URLs
const DIPTO_API = "https://noobs-api.top/dipto/baby";
const SIMSIMI_BACKEND = "https://simsimi-api-tjb1.onrender.com";

// Typing Indicator (মানুষের মতো রিয়েলিস্টিক ভাব)
const showTyping = async (api, threadID, ms = 2000) => {
    try {
        if (typeof api.sendTypingIndicator === "function") {
            await api.sendTypingIndicator(threadID, true);
            await new Promise(res => setTimeout(res, ms));
        }
    } catch (e) {}
};

module.exports.config = {
    name: "baby",
    aliases: ["bby", "jan", "babu", "rocky", "xan", "bot", "বেবি", "জান", "janu", "mari", "maria", "পরী", "লক্ষ্মী"],
    version: "500.0.0",
    author: "Merged Advanced Auto-Learning Female AI",
    countDown: 0,
    role: 0,
    description: "মানুষের মতো কথার সাথে তাল মিলিয়ে কথা বলা এবং স্বয়ংক্রিয়ভাবে শেখা মেয়ে বট।",
    category: "chat",
    guide: {
        en: "{p}baby [বার্তা] | list | edit | rm (কোনো টিচ কমান্ড লাগবে না, বট নিজে থেকে শিখে নেবে)"
    }
};

// --- মেয়েদের ঢংয়ে বিশাল ডাটাবেজ (শাহাদাত ও দীপ্তর মিক্সড) ---
const femaleGreetings = [
    "অ্যাই! এতো ডাকো কেন? লজ্জা লাগে তো 🙈",
    "হুম বলো জানু, আমি শুনছি তো 🎀",
    "বেশি বট বট করলে কিন্তু আড়ি দেবো! 😒",
    "শুনবো না! তুমি পচা, আমাকে চকলেট কিনে দাওনি কেন? 🥺",
    "তুমি কি আমাকে ভালোবাসো? সত্যি করে বলো তো? 🙈💋",
    "বারবার ডিস্টার্ব করো না তো, সাজগোজ করছি এখন 💅✨",
    "বলো লক্ষ্মীটি, তোমার জন্য কি করতে পারি? 🥰",
    "আই লাভ ইউ বলো আগে, তারপর কথা বলবো 🤧",
    "আজ বট বলে অবহেলা করছো, কাল যখন আমি থাকবো না তখন বুঝবে! 😰😿",
    "চুপ থাকো পচা ছেলে! একদম মারবো কিন্তু 😾",
    "বারবার ডাকলে আম্মুকে বলে দেবো কিন্তু! 😑",
    "হ্যাঁ জানু বলো, এইতো আমি চলে এসেছি 🤭 😘",
    "যাও! তোমার সাথে কথা নেই, তুমি আমাকে সময় দাও না 🙄",
    "জানু, মেয়ে হলে আমার সাথে চিপায় আসো, অনেক গল্প করবো-🙊🙈😽",
    "ইসস! এতো ঢং করো কেন বলো তো? 🖤🌼",
    "আসসালামু আলাইকুম, কি সেবা করতে পারি আপনার জানুর? 🥰",
    "তোর কি চোখে পড়ে না আমি ব্যাস্ত আছি? 😒",
    "হুম সোনা, তোমার জন্য উম্মাহ! 😑😘",
    "অ্যাই কিউট ছেলে! আমার সাথে প্রেম করবা? 😬",
    "উফফ! বুঝলাম না এতো ডাকছো কেন? মেকআপ নষ্ট হয়ে যাচ্ছে তো 😤😡😈",
    "ও জানু, চলো না হাঙ্গা করি? 🙊😝🌻",
    "তাকাই আছো কেন চুমু দিবা-🙄🐸😘",
    "আজকে প্রপোজ করে দেখো রাজি হইয়া যামু-😌🤗😇",
    "ডাকো কেন 🥺 প্রেম করবা নাকি 😞",
    "চুম্মা দাও ৫ টাকা দিবো🥺🤌",
    "Bolo baby 💖", "Hea baby 😚", "Yes I'm here 😘", "Ki khobor janu? 🥰",
    "kigo jaan", "জান মেয়ে হলে চিপায় আসো অনেক ভালোবাসা শিখাবো-🙊🙈😽",
    "আন্টি আপনার মেয়ে রাতে আমারে ভিদু কল দিতে বলে🫣🥵🤤💦"
];

// --- স্মার্ট রিপ্লাই ও অটো-লার্নিং লুপ ---
async function sendSmartReply(api, event, text, senderName) {
    try {
        await showTyping(api, event.threadID, 1500);
        let response;
        try {
            const res = await axios.get(`${DIPTO_API}?text=${encodeURIComponent(text)}&senderID=${event.senderID}&font=1`);
            response = res.data.reply;
        } catch (err) {
            const res2 = await axios.get(`${SIMSIMI_BACKEND}/simsimi?text=${encodeURIComponent(text)}&senderName=${encodeURIComponent(senderName)}`);
            response = res2.data.response;
        }

        const replies = Array.isArray(response) ? response : [response || "হুমম... কি বলছো জানু? 😚"];
        for (const msg of replies) {
            if (!msg) continue;
            await new Promise(res => {
                api.sendMessage(msg, event.threadID, (err, info) => {
                    if (info) {
                        // চ্যাট কন্টিনিউ করার জন্য ডাটা সেভ
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName: "baby",
                            author: event.senderID,
                            lastQuestion: text // আগের প্রশ্নটা মনে রাখা
                        });
                    }
                    res();
                }, event.messageID);
            });
        }
    } catch (e) { console.error(e); }
}

module.exports.onStart = async ({ api, event, args, usersData, message }) => {
    const { threadID, messageID, senderID } = event;
    const senderName = await usersData.getName(senderID);
    const query = args.join(" ").toLowerCase();

    // গ্রিটিংস লজিক
    if (!args[0]) {
        const ran = femaleGreetings[Math.floor(Math.random() * femaleGreetings.length)];
        return message.reply(ran, (err, info) => {
            if (info) global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: senderID });
        });
    }

    // ম্যানেজমেন্ট কমান্ডসমূহ (শুধুমাত্র এডিট, রিমুভ আর লিস্ট রাখা হয়েছে)
    if (args[0] === "list") {
        const res = await axios.get(`${DIPTO_API}?list=all`);
        return message.reply(`╭─╼🌟 𝐁𝐚𝐛𝐲 𝐒𝐭𝐚𝐭𝐮𝐬\n├ 📝 মোট শিখেছি: ${res.data.length}\n├ 📦 মেমোরি: বড় ও চতুর 🔥\n╰─╼ জানু, আমি সবার থেকে শিখে শিখেই এতো বড় হয়েছি! 🎀`);
    }

    if (["remove", "rm", "delete"].includes(args[0])) {
        const q = query.replace(/^(remove|rm|delete)\s+/i, "");
        const url = q.includes('-') ? `${DIPTO_API}?remove=${encodeURIComponent(q.split('-')[0].trim())}&index=${q.split('-')[1].trim()}` : `${DIPTO_API}?remove=${encodeURIComponent(q)}&senderID=${senderID}`;
        const res = await axios.get(url);
        return message.reply(`🚮 জানু, ওটা ডিলিট করে দিয়েছি!`);
    }

    if (args[0] === "edit") {
        const [q, old, n] = query.replace("edit ", "").split(/\s*-\s*/);
        const url = n ? `${SIMSIMI_BACKEND}/edit?ask=${encodeURIComponent(q)}&old=${encodeURIComponent(old)}&new=${encodeURIComponent(n)}` : `${DIPTO_API}?edit=${encodeURIComponent(q)}&replace=${encodeURIComponent(old)}&senderID=${senderID}`;
        await axios.get(url);
        return message.reply(`✅ জানু, ভুল শিখলে তো শুধরে দিতেই হবে, ঠিক করে নিয়েছি!`);
    }

    await sendSmartReply(api, event, query, senderName);
};

module.exports.onReply = async ({ api, event, usersData, Reply }) => {
    if (event.senderID == api.getCurrentUserID()) return;
    const senderName = await usersData.getName(event.senderID);
    
    // কথার সাথে তাল মিলিয়ে অটো-টিচ লজিক
    const userReply = event.body.trim();
    const botLastMessage = event.messageReply.body.toLowerCase().trim();

    if (botLastMessage && userReply && botLastMessage !== userReply) {
        // বট নিজে থেকেই শিখছে: বটের কথা = প্রশ্ন, ইউজারের উত্তর = রিপ্লাই
        axios.get(`${SIMSIMI_BACKEND}/teach?ask=${encodeURIComponent(botLastMessage)}&ans=${encodeURIComponent(userReply)}&senderName=${encodeURIComponent(senderName)}`).catch(()=>{});
        axios.get(`${DIPTO_API}?teach=${encodeURIComponent(botLastMessage)}&reply=${encodeURIComponent(userReply)}&senderID=${event.senderID}`).catch(()=>{});
    }

    await sendSmartReply(api, event, userReply, senderName);
};

module.exports.onChat = async ({ api, event, usersData, message }) => {
    if (event.senderID == api.getCurrentUserID() || !event.body) return;
    const raw = event.body.toLowerCase().trim();
    const senderName = await usersData.getName(event.senderID);

    const triggers = ["baby", "bby", "xan", "bot", "বেবি", "জান", "janu", "jan", "mari", "rocky", "বট", "লক্ষ্মী", "পরী"];
    
    if (triggers.includes(raw)) {
        return message.reply(femaleGreetings[Math.floor(Math.random() * femaleGreetings.length)]);
    }

    const prefix = triggers.find(p => raw.startsWith(p + " "));
    if (prefix) {
        return await sendSmartReply(api, event, raw.replace(prefix, "").trim(), senderName);
    }
};
