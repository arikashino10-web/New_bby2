module.exports = {
    config: {
        name: "out",
        version: "1.0.1",
        hasPermssion: 2,
        credits: "𝐂𝐘𝐁𝐄𝐑 ☢️_𖣘 -𝐁𝐎𝐓 ⚠️ 𝑻𝑬𝑨𝑴_ ☢️",
        description: "Bot leaves the current group or a specific group by ID",
        commandCategory: "Admin",
        usages: "out [Group ID]",
        cooldowns: 10
    },

    onStart: async function({ api, event, args }) {
        const { threadID, messageID } = event;

        // যদি কোনো আইডি না দেওয়া হয়, তবে বট বর্তমান গ্রুপ থেকে লিভ নেবে
        if (!args[0]) {
            return api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        }

        // যদি একটি নির্দিষ্ট গ্রুপ আইডি দেওয়া হয়, তবে বট সেই গ্রুপ থেকে লিভ নেবে
        const targetID = args[0];
        if (!isNaN(targetID)) {
            return api.removeUserFromGroup(api.getCurrentUserID(), targetID, (err) => {
                if (err) return api.sendMessage(`❌ আইডি ${targetID} গ্রুপটি থেকে লিভ নেওয়া সম্ভব হয়নি।`, threadID, messageID);
                return api.sendMessage(`✅ আইডি ${targetID} গ্রুপটি থেকে সফলভাবে লিভ নেওয়া হয়েছে।`, threadID, messageID);
            });
        } else {
            return api.sendMessage("❌ অনুগ্রহ করে একটি সঠিক গ্রুপ আইডি (Numeric ID) প্রদান করুন।", threadID, messageID);
        }
    }
};
