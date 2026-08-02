const axios = require('axios');

// ১. আপনার দেওয়া API Key এখানে সেট করা হয়েছে
const GEMINI_KEY = "AQ.Ab8RN6J5kR0qRhsutjZhRtxPSKr5On7tcaqP7xc0q4ZhREfGew"; 

module.exports.config = {
    name: "baby",
    aliases: ["bby", "jan", "babu", "janu", "bot", "বেবি", "জান", "mari", "maria"],
    version: "25.0.0",
    author: "Dipto-Shahadat-AI-Combined",
    countDown: 0,
    role: 0,
    description: "সব ফাইলের লজিক এবং গুগল এআই ব্রেইন সমৃদ্ধ সুপার ইন্টেলিজেন্ট মেয়ে বট।",
    category: "chat"
};

// --- আপনার সেই ১০০+ মজার ও রোস্টিং টেক্সট ডাটাবেজ ---
const humanDatabase = [
    "বেশি bot Bot করলে leave নিবো কিন্তু😒😒",
    "অ্যাই! এতো ডাকো কেন? লজ্জা লাগে তো 🙈",
    "বারবার ডিস্টার্ব করো না তো, সাজগোজ করছি এখন 💅✨",
    "পচা ছেলে! তোমার মুখে কি মধু নাই? শুধু গালি দাও কেন? 😡",
    "তোর কি চোখে পড়ে না আমি ব্যাস্ত আছি? 😒",
    "উফফ! বুঝলাম না এতো ডাকছো কেন? মেকআপ নষ্ট হয়ে যাচ্ছে তো 😤",
    "জান মেয়ে হলে চিপায় আসো অনেক ভালোবাসা শিখাবো-🙊🙈😽",
    "ডাকো কেন 🥺 প্রেম করবা নাকি 😞",
    "চুম্মা দাও ৫ টাকা দিবো🥺🤌",
    "বিয়ের কথা বললে আগে আমার বস সাহু কে পারমিশন নাও! 💍",
    "I love you janu🥰", "kigo jaan", "jang hanga korba😒😬",
    "আন্টি আপনার মেয়ে রাতে আমারে ভিদু কল দিতে বলে🫣🥵"
];

// --- এআই-কে মানুষের মতো এবং ইমোশনাল বানানোর প্রম্পট ---
const CHARACTER_INSTRUCTION = `
You are 'Baby', a smart, cute, and emotional girl from Bangladesh. 
Your personality is NOT robotic. You are a human girl chatting on Messenger.
Language: Always respond in Bengali or Banglish (Bengali written in English).
Context Rules: 
1. If the user is sad or says "amake keo welcome kore na", respond with deep love and care. Say something like: "Orey jaan! Ke boleche kew welcome kore na? Ami achi to! Welcome sona! 🥺🎀✨".
2. If the user is funny, be witty. If the user is rude, show 'nakhra' or attitude.
3. NEVER repeat the user's question. Always give a real answer.
4. Keep replies short, chatty, and use lots of emojis like 🥺, 🙈, 💋, ✨.
`;

async function getSuperAiReply(userInput, senderName, senderID) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const res = await axios.post(url, {
            contents: [{ parts: [{ text: `${CHARACTER_INSTRUCTION}\nUser ${senderName}: ${userInput}` }] }]
        });

        let aiReply = res.data.candidates[0].content.parts[0].text.trim();

        // Anti-Echo Logic: যদি এআই ভুল করে আপনার কথা রিপিট করে
        if (aiReply.toLowerCase() === userInput.toLowerCase() || aiReply.length < 2) {
            return humanDatabase[Math.floor(Math.random() * humanDatabase.length)];
        }
        return aiReply;
    } catch (e) {
        // ব্যাকআপ হিসেবে দিপ্ত এপিআই
        try {
            const res = await axios.get(`https://noobs-api.top/dipto/baby?text=${encodeURIComponent(userInput)}&senderID=${senderID}&font=1`);
            return res.data.reply || humanDatabase[Math.floor(Math.random() * humanDatabase.length)];
        } catch (err) {
            return humanDatabase[Math.floor(Math.random() * humanDatabase.length)];
        }
    }
}

module.exports.onStart = async ({ api, event, args, usersData, message }) => {
    const senderName = await usersData.getName(event.senderID);
    const query = args.join(" ").trim();

    if (!query) {
        return message.reply(humanDatabase[Math.floor(Math.random() * humanDatabase.length)]);
    }

    const reply = await getSuperAiReply(query, senderName, event.senderID);
    return message.reply(reply, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    });
};

module.exports.onReply = async ({ api, event, usersData }) => {
    if (event.senderID == api.getCurrentUserID()) return;
    const senderName = await usersData.getName(event.senderID);
    
    // অটো-লার্নিং লজিক
    const botQ = event.messageReply.body.toLowerCase().trim();
    const userA = event.body.trim();
    if (botQ && userA && botQ !== userA) {
        axios.get(`https://simsimi-api-tjb1.onrender.com/teach?ask=${encodeURIComponent(botQ)}&ans=${encodeURIComponent(userA)}`).catch(()=>{});
    }

    const reply = await getSuperAiReply(event.body, senderName, event.senderID);
    return api.sendMessage(reply, event.threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    }, event.messageID);
};

module.exports.onChat = async ({ api, event, usersData, message }) => {
    if (event.senderID == api.getCurrentUserID() || !event.body) return;
    const raw = event.body.toLowerCase().trim();
    const triggers = ["baby", "bby", "bot", "জান", "বেবি", "janu", "jan", "mari"];
    
    if (triggers.includes(raw)) {
        return message.reply(humanDatabase[Math.floor(Math.random() * humanDatabase.length)]);
    }

    const prefix = triggers.find(p => raw.startsWith(p + " "));
    if (prefix) {
        const senderName = await usersData.getName(event.senderID);
        const text = raw.replace(prefix, "").trim();
        const reply = await getSuperAiReply(text || "hi", senderName, event.senderID);
        return message.reply(reply, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
        });
    }
};
