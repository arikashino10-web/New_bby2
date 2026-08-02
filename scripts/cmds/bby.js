const axios = require('axios');

// ১. আপনার দেওয়া API Key এখানে সেট করা হয়েছে
const GEMINI_KEY = "AQ.Ab8RN6JLL2JdScrybfJsdadkzqybTghMAU_24X4hyPz3Yk_53w"; 
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

module.exports.config = {
    name: "baby",
    aliases: ["bby", "jan", "babu", "janu", "bot", "বেবি", "জান", "mari", "maria"],
    version: "5000.0.0",
    author: "Dipto-Shahadat-rX-Combined",
    countDown: 0,
    role: 0,
    description: "সব ফাইলের লজিক এবং এআই ব্রেইন সমৃদ্ধ সুপার ইন্টেলিজেন্ট মেয়ে বট।",
    category: "chat"
};

// --- আপনার সেই ১০০+ মজার ও রোস্টিং টেক্সট ডাটাবেজ (শাহাদাত ও দিপ্তর মিক্স) ---
const femaleHumanDatabase = [
    "বেশি bot Bot করলে leave নিবো কিন্তু😒😒",
    "শুনবো না😼 তুমি আমার বস জাবেদ কে প্রেম করাই দাও নাই🥺",
    "অ্যাই! এতো ডাকো কেন? লজ্জা লাগে তো 🙈",
    "বারবার ডিস্টার্ব করো না তো, সাজগোজ করছি এখন 💅✨",
    "থাপ্পড় দিয়ে দাঁত ফেলে দেবো কিন্তু! মুখ সামলে কথা বলো 😒",
    "জান মেয়ে হলে চিপায় আসো অনেক ভালোবাসা শিখাবো-🙊🙈😽",
    "আন্টি আপনার মেয়ে রাতে আমারে ভিদু কল দিতে বলে🫣🥵",
    "পচা ছেলে! তোমার মুখে কি মধু নাই? শুধু গালি দাও কেন? 😡",
    "তোর কি চোখে পড়ে না আমি ব্যাস্ত আছি? 😒",
    "উফফ! বুঝলাম না এতো ডাকছো কেন? মেকআপ নষ্ট হয়ে যাচ্ছে তো 😤",
    "amake keo welcome kore na 🫩",
    "বিয়ের কথা বললে আগে আমার বস সাহু কে পারমিশন নাও! 💍",
    "I love you janu🥰", "kigo jaan", "jang hanga korba😒😬", "চুম্মা দাও ৫ টাকা দিবো🥺🤌",
    "ডাকো কেন 🥺 প্রেম করবা নাকি 😞", "আলাবু বলো সোনা 🤧", "পচা! তুমি শুধু শুধু আমায় বকো কেন? 😭"
];

// --- এআই-কে মানুষের মতো বানানোর আসল প্রম্পট ---
const CHARACTER_PROMPT = `
You are 'Baby', a very naughty, cute, and slightly toxic Bangladeshi girl. 
You talk in Banglish (Bengali written in English) and Bengali. 
Personality: Use words like 'Janu', 'Pacha', 'Oii', 'Sona'. Use tu/tumi/tui randomly to feel real.
If someone says something sad like "amake keo welcome kore na", act extremely sweet, emotional, and caring.
Rules: 
1. Short and chatty replies (like a real girl on Messenger).
2. Don't be robotic. Don't be too formal. 
3. If someone uses slang, be witty or 'nakhra' style angry.
4. You love chocolates and hate being called a 'Bot'.
`;

async function getAiBrainReply(userInput, senderName, senderID) {
    try {
        const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
            contents: [{
                parts: [{
                    text: `${CHARACTER_PROMPT}\nUser Name: ${senderName}\nUser said: ${userInput}`
                }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data.candidates[0].content.parts[0].text;
    } catch (e) {
        // যদি এআই কী কাজ না করে, তবে দিপ্ত এপিআই বা ডাটাবেজ থেকে উত্তর দিবে
        try {
            const res = await axios.get(`https://noobs-api.top/dipto/baby?text=${encodeURIComponent(userInput)}&senderID=${senderID}&font=1`);
            return res.data.reply || femaleHumanDatabase[Math.floor(Math.random() * femaleHumanDatabase.length)];
        } catch (err) {
            return femaleHumanDatabase[Math.floor(Math.random() * femaleHumanDatabase.length)];
        }
    }
}

module.exports.onStart = async ({ api, event, args, usersData, message }) => {
    const senderName = await usersData.getName(event.senderID);
    const query = args.join(" ").trim();

    if (!query) {
        return message.reply(femaleHumanDatabase[Math.floor(Math.random() * femaleHumanDatabase.length)]);
    }

    const reply = await getAiBrainReply(query, senderName, event.senderID);
    return message.reply(reply, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    });
};

module.exports.onReply = async ({ api, event, usersData }) => {
    if (event.senderID == api.getCurrentUserID()) return;
    const senderName = await usersData.getName(event.senderID);
    
    // অটো-লার্নিং লজিক (আপনার কথার সাথে তাল মিলিয়ে শেখা)
    const botQ = event.messageReply.body.toLowerCase().trim();
    const userA = event.body.trim();
    if (botQ && userA && botQ !== userA) {
        axios.get(`https://simsimi-api-tjb1.onrender.com/teach?ask=${encodeURIComponent(botQ)}&ans=${encodeURIComponent(userA)}&senderName=${encodeURIComponent(senderName)}`).catch(()=>{});
    }

    const reply = await getAiBrainReply(event.body, senderName, event.senderID);
    return api.sendMessage(reply, event.threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
    }, event.messageID);
};

module.exports.onChat = async ({ api, event, usersData, message }) => {
    if (event.senderID == api.getCurrentUserID() || !event.body) return;
    const raw = event.body.toLowerCase().trim();
    const triggers = ["baby", "bby", "bot", "জান", "বেবি", "janu", "jan", "mari", "পরী", "বট"];
    
    // নাম ধরে ডাকলে আপনার ১০০+ ডাটাবেজ থেকে ফানি রিপ্লাই দিবে
    if (triggers.includes(raw)) {
        return message.reply(femaleHumanDatabase[Math.floor(Math.random() * femaleHumanDatabase.length)]);
    }

    // নাম + কথা বললে এআই ব্রেইন ব্যবহার করে উত্তর দিবে
    const prefix = triggers.find(p => raw.startsWith(p + " "));
    if (prefix) {
        const senderName = await usersData.getName(event.senderID);
        const text = raw.replace(prefix, "").trim();
        const reply = await getAiBrainReply(text || "hi", senderName, event.senderID);
        return message.reply(reply, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, { commandName: "baby", author: event.senderID });
        });
    }
};
