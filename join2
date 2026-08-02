const chalk = require('chalk');

module.exports = {
  config: {
    name: "join2",
    version: "3.0.0",
    hasPermssion: 2,
    credits: "Shahadat Sahu",
    description: "Join bot groups by replying to the list",
    commandCategory: "system",
    usages: "[reply to list with numbers or 'add all']",
    cooldowns: 5
  },

  onLoad: () => {
    console.log(chalk.bold.hex("#00c300")(" JOIN COMMAND LOADED SUCCESSFULLY✅"));
  },

  // এই ফাংশনটি গ্রুপ লিস্ট দেখাবে
  onStart: async function({ api, event }) {
    const { threadID, messageID } = event;
    
    try {
      const inbox = await api.getThreadList(100, null, ['INBOX']);
      const groupList = inbox.filter(group => group.isSubscribed && group.isGroup);

      if (groupList.length === 0) {
        return api.sendMessage("⭕ বটের ইনবক্সে কোনো গ্রুপ খুঁজে পাওয়া যায়নি।", threadID, messageID);
      }

      let msg = `🔰 𝗝𝗢𝗜𝗡 𝗕𝗢𝗫 𝗟𝗜𝗦𝗧 🔰\n\n`;
      
      groupList.forEach((group, i) => {
        const threadName = group.name || `Unnamed Group (${group.threadID})`;
        msg += `[${i + 1}] ${threadName}\n`;
      });

      msg += `\n✏️ এই মেসেজটিতে রিপ্লাই (Reply) দিয়ে নম্বর লিখুন (যেমন: 1 3 5) অথবা সব গ্রুপে ঢুকতে লিখুন 'add all'`;

      return api.sendMessage(msg, threadID, messageID);

    } catch (error) {
      return api.sendMessage(`❌ গ্রুপ লিস্ট লোড করতে সমস্যা হয়েছে: ${error.message}`, threadID, messageID);
    }
  },

  // এই ফাংশনটি বটের সমস্ত মেসেজ ও রিপ্লাই রিয়েল-টাইমে স্ক্যান করবে
  onChat: async function({ api, event }) {
    const { threadID, messageID, senderID, body, type, messageReply } = event;

    // যদি মেসেজটি কোনো রিপ্লাই না হয় অথবা বটের দেওয়া লিস্টের রিপ্লাই না হয়, তবে ইগনোর করবে
    if (type !== "message_reply" || !messageReply || !messageReply.body) return;
    if (!messageReply.body.includes("𝗝𝗢𝗜𝗡 𝗕𝗢𝗫 𝗟𝗜𝗦𝗧")) return;
    if (!body) return;

    try {
      // আবার গ্রুপ লিস্টটি নিয়ে আসা আইডি ম্যাচ করার জন্য
      const inbox = await api.getThreadList(100, null, ['INBOX']);
      const groupList = inbox.filter(group => group.isSubscribed && group.isGroup);
      const ID = groupList.map(group => group.threadID);

      const input = body.trim().toLowerCase();
      let selectedIndexes = [];

      if (input === "add all") {
        selectedIndexes = ID.map((_, index) => index); 
      } else {
        selectedIndexes = body.split(/\s+/).map(x => parseInt(x.trim()) - 1).filter(i => !isNaN(i) && i >= 0 && i < ID.length);
        if (selectedIndexes.length === 0) {
          return api.sendMessage("⭕ ভুল ইনপুট! দয়া করে সঠিক নম্বর (যেমন: 1 2) অথবা 'add all' লিখে রিপ্লাই দিন।", threadID, messageID);
        }
      }

      let added = 0, skipped = 0, failed = 0;
      api.sendMessage(`⏳ আপনাকে গ্রুপগুলোতে যুক্ত করার প্রসেস শুরু হচ্ছে...`, threadID, messageID);

      for (const i of selectedIndexes) {
        try {
          const threadIDToJoin = ID[i];
          const threadInfo = await api.getThreadInfo(threadIDToJoin);
          const { participantIDs, approvalMode, adminIDs } = threadInfo;

          if (participantIDs.includes(senderID)) {
            skipped++;
            continue;
          }

          await api.addUserToGroup(senderID, threadIDToJoin);

          const threadName = threadInfo.threadName || "Group";
          const hasBotAdmin = adminIDs && adminIDs.some(ad => ad.id == api.getCurrentUserID());
          
          if (approvalMode && !hasBotAdmin) {
            api.sendMessage(`📨 Pending approval in "${threadName}".`, threadID);
          } else {
            api.sendMessage(`✅ Added to "${threadName}".`, threadID);
          }

          added++;
        } catch (err) {
          failed++;
        }
      }

      return api.sendMessage(`📊 Join Report:\n✅ সফলভাবে যুক্ত: ${added}\n⏩ অলরেডি আছেন: ${skipped}\n❌ ব্যর্থ: ${failed}`, threadID, messageID);

    } catch (e) {
      console.log(e);
    }
  }
};
