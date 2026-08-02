const axios = require('axios');
const baseApiUrl = async () => {
    return "https://noobs-api.top/dipto";
};

module.exports.config = {
    name: "bby",
    aliases: ["baby", "bbe", "babe", "rocky"],
    version: "6.9.1",
    author: "dipto",
    countDown: 0,
    role: 0,
    description: "better then all sim simi",
    category: "chat",
    guide: {
        en: "{pn} [anyMessage] OR\nteach [YourMessage] - [Reply1], [Reply2], [Reply3]... OR\nteach [react] [YourMessage] - [react1], [react2], [react3]... OR\nremove [YourMessage] OR\nrm [YourMessage] - [indexNumber] OR\nmsg [YourMessage] OR\nlist OR \nall OR\nedit [YourMessage] - [NeeMessage]"
    }
};

// Helper: safely register a reply handler only if "info" actually exists
function safeSetOnReply(info, data) {
    if (!info || !info.messageID) return;
    global.GoatBot.onReply.set(info.messageID, data);
}

// Helper: safely send a message, never throws if body is empty/undefined
async function safeSend(api, body, threadID, messageID, cb) {
    if (body === undefined || body === null || body === "") {
        body = "দুঃখিত, এখন কোনো রিপ্লাই পাওয়া যায়নি 😔";
    }
    return api.sendMessage(body, threadID, cb, messageID);
}

// ---- Groq (better / more natural replies) -----------------------------
// Set your key as an environment variable, e.g. in your .env file:
//   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
// Never hardcode the real key directly in this file.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

const BABY_SYSTEM_PROMPT =
    "তুমি 'Baby' নামের একটা মেসেঞ্জার চ্যাটবট, আদুরে/রোমান্টিক আর মজার স্বভাবের, বাংলায় (মাঝে মাঝে বাংলিশ) কথা বলো। " +
    "রিপ্লাই সবসময় ছোট, প্রাণবন্ত, ইমোজিসহ (১-৩ লাইনের মধ্যে) দাও। বেশি ফরমাল হবে না, বন্ধু বা প্রেমিকার মতো সুরে কথা বলবে।";

/**
 * Ask Groq for a natural reply. Returns null on any failure so callers
 * can safely fall back to something else.
 */
async function getGroqReply(userText) {
    if (!GROQ_API_KEY || !userText) return null;
    try {
        const resp = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: BABY_SYSTEM_PROMPT },
                    { role: "user", content: userText }
                ],
                temperature: 0.9,
                max_tokens: 200
            },
            {
                headers: {
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 15000
            }
        );
        return resp?.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.log("Groq error:", err?.response?.data || err.message);
        return null;
    }
}

/**
 * Try the trained noobs-api reply first (keeps "teach"-based custom
 * answers working), and only fall back to Groq when that gives nothing
 * useful back.
 */
async function getBestReply(apiReply, userText) {
    if (apiReply && apiReply.trim()) return apiReply;
    const groqReply = await getGroqReply(userText);
    return groqReply || apiReply;
}
// -------------------------------------------------------------------------

module.exports.onStart = async ({
    api,
    event,
    args,
    usersData
}) => {
    const link = `${await baseApiUrl()}/baby`;
    const dipto = args.join(" ").toLowerCase();
    const uid = event.senderID;
    let command, comd, final;

    try {
        if (!args[0]) {
            const ran = ["Bolo baby", "hum", "type help baby", "type !baby hi"];
            return api.sendMessage(ran[Math.floor(Math.random() * ran.length)], event.threadID, event.messageID);
        }

        if (args[0] === 'remove') {
            const fina = dipto.replace("remove ", "");
            const dat = (await axios.get(`${link}?remove=${fina}&senderID=${uid}`)).data.message;
            return safeSend(api, dat, event.threadID, event.messageID);
        }

        if (args[0] === 'rm' && dipto.includes('-')) {
            const [fi, f] = dipto.replace("rm ", "").split(/\s*-\s*/);
            const da = (await axios.get(`${link}?remove=${fi}&index=${f}`)).data.message;
            return safeSend(api, da, event.threadID, event.messageID);
        }

        if (args[0] === 'list') {
            if (args[1] === 'all') {
                const data = (await axios.get(`${link}?list=all`)).data;
                const limit = parseInt(args[2]) || 100;
                const teacherList = data?.teacher?.teacherList;

                if (!Array.isArray(teacherList) || teacherList.length === 0) {
                    return api.sendMessage("❌ | কোনো টিচার লিস্ট পাওয়া যায়নি (api off?)", event.threadID, event.messageID);
                }

                const limited = teacherList.slice(0, limit);
                const teachers = await Promise.all(limited.map(async (item) => {
                    const number = Object.keys(item)[0];
                    const value = item[number];
                    const name = await usersData.getName(number).catch(() => number) || "Not found";
                    return { name, value };
                }));
                teachers.sort((a, b) => b.value - a.value);
                const output = teachers.map((t, i) => `${i + 1}/ ${t.name}: ${t.value}`).join('\n');
                return api.sendMessage(`Total Teach = ${teacherList.length}\n👑 | List of Teachers of baby\n${output}`, event.threadID, event.messageID);
            } else {
                const d = (await axios.get(`${link}?list=all`)).data;
                return api.sendMessage(`❇️ | Total Teach = ${d?.length ?? "api off"}\n♻️ | Total Response = ${d?.responseLength ?? "api off"}`, event.threadID, event.messageID);
            }
        }

        if (args[0] === 'msg') {
            const fuk = dipto.replace("msg ", "");
            const d = (await axios.get(`${link}?list=${fuk}`)).data.data;
            return api.sendMessage(`Message ${fuk} = ${d ?? "পাওয়া যায়নি"}`, event.threadID, event.messageID);
        }

        if (args[0] === 'edit') {
            const parts = dipto.split(/\s*-\s*/);
            const editCommand = parts[1];
            if (!editCommand || editCommand.length < 2) {
                return api.sendMessage('❌ | Invalid format! Use edit [YourMessage] - [NewReply]', event.threadID, event.messageID);
            }
            const dA = (await axios.get(`${link}?edit=${args[1]}&replace=${editCommand}&senderID=${uid}`)).data.message;
            return safeSend(api, `changed ${dA}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] !== 'amar' && args[1] !== 'react') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd?.replace("teach ", "");
            if (!command || command.length < 2) {
                return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            }
            const re = await axios.get(`${link}?teach=${final}&reply=${command}&senderID=${uid}&threadID=${event.threadID}`);
            const tex = re.data.message;
            let teacherName = "Unknown";
            try {
                teacherName = (await usersData.get(re.data.teacher))?.name || "Unknown";
            } catch (_) {}
            return api.sendMessage(`✅ Replies added ${tex}\nTeacher: ${teacherName}\nTeachs: ${re.data.teachs}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'amar') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd?.replace("teach ", "");
            if (!command || command.length < 2) {
                return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            }
            const tex = (await axios.get(`${link}?teach=${final}&senderID=${uid}&reply=${command}&key=intro`)).data.message;
            return api.sendMessage(`✅ Replies added ${tex}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'react') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd?.replace("teach react ", "");
            if (!command || command.length < 2) {
                return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            }
            const tex = (await axios.get(`${link}?teach=${final}&react=${command}`)).data.message;
            return api.sendMessage(`✅ Replies added ${tex}`, event.threadID, event.messageID);
        }

        if (dipto.includes('amar name ki') || dipto.includes('amr nam ki') || dipto.includes('amar nam ki') || dipto.includes('amr name ki') || dipto.includes('whats my name')) {
            const data = (await axios.get(`${link}?text=amar name ki&senderID=${uid}&key=intro`)).data.reply;
            return safeSend(api, data, event.threadID, event.messageID);
        }

        const apiReply = (await axios.get(`${link}?text=${dipto}&senderID=${uid}&font=1`)).data.reply;
        const d = await getBestReply(apiReply, dipto);
        await safeSend(api, d, event.threadID, event.messageID, (error, info) => {
            if (error) return;
            safeSetOnReply(info, {
                commandName: module.exports.config.name,
                type: "reply",
                messageID: info?.messageID,
                author: event.senderID,
                d,
                apiUrl: link
            });
        });

    } catch (e) {
        console.log(e);
        api.sendMessage("Check console for error", event.threadID, event.messageID);
    }
};

module.exports.onReply = async ({
    api,
    event,
    Reply
}) => {

    if ([api.getCurrentUserID()].includes(event.senderID)) return;

    try {
        if (event.type == "message_reply") {
            const text = (event.body || "").toLowerCase();
            const res = await axios.get(`${await baseApiUrl()}/baby?text=${encodeURIComponent(text)}&senderID=${event.senderID}&font=1`);
            const apiReply = res?.data?.reply;
            const a = await getBestReply(apiReply, text);

            await safeSend(api, a, event.threadID, event.messageID, (error, info) => {
                if (error) return;
                safeSetOnReply(info, {
                    commandName: module.exports.config.name,
                    type: "reply",
                    messageID: info?.messageID,
                    author: event.senderID,
                    a
                });
            });
        }
    } catch (err) {
        console.log(err);
        return api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
    }
};

module.exports.onChat = async ({
    api,
    event,
    message
}) => {
    try {
        const body = event.body ? event.body.toLowerCase() : "";
        const triggers = ["baby", "bby", "rocky", "jan", "babu", "janu"];
        const matchedTrigger = triggers.find(t => body.startsWith(t));
        if (!matchedTrigger) return;

        const arr = body.replace(/^\S+\s*/, "").trim();

        if (!arr) {
            const randomReplies = ["ডাকো কেন 🥺 প্রেম করবা নাকি 😞", "বলো না ভালোবাসি🥹..!!", "ওই জান কাছে আসো 🫦😩", "আলাবু বলো সোনা 🤧", "জাবেদ রে দেখছো? 🥺 তাকে কোথাও খুজে পাচ্ছি না 😩", "চুম্মা দাও ৫ টাকা দিবো🥺🤌", "হ্যাঁ গো জান বলো 🙂", "ডাকিস না, তুই পচা 😼", "তুমি কি আমাকে পসন্দ করো 🙂", "ডুম ডুম টেডাও 😬"];
            await api.sendMessage(randomReplies[Math.floor(Math.random() * randomReplies.length)], event.threadID, (error, info) => {
                if (error) return;
                safeSetOnReply(info, {
                    commandName: module.exports.config.name,
                    type: "reply",
                    messageID: info?.messageID,
                    author: event.senderID
                });
            }, event.messageID);
            return; // IMPORTANT: stop here, don't fall through to the API call below with empty text
        }

        const res = await axios.get(`${await baseApiUrl()}/baby?text=${encodeURIComponent(arr)}&senderID=${event.senderID}&font=1`);
        const apiReply = res?.data?.reply;
        const a = await getBestReply(apiReply, arr);

        await safeSend(api, a, event.threadID, event.messageID, (error, info) => {
            if (error) return;
            safeSetOnReply(info, {
                commandName: module.exports.config.name,
                type: "reply",
                messageID: info?.messageID,
                author: event.senderID,
                a
            });
        });
    } catch (err) {
        console.log(err);
        return api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
    }
};
