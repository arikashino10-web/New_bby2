module.exports = {
  config: {
    name: "fight1",
    version: "2.0",
    author: "AI",
    countDown: 0,
    role: 1,
    shortDescription: "Heavy spam roasting for 5 minutes with mention",
    longDescription: "গ্রুপ এডমিন ও বট এডমিনদের জন্য টানা ৫ মিনিটের চরম লেভেলের রোস্টিং কমান্ড। যাকে মেনশন করবে শুধু তাকেই বারবার মেনশন করবে।",
    category: "box chat",
    guide: "{pn} [on | off] [@mention বা reply]",
    envConfig: { deltaNext: 0 }
  },

  onStart: async function ({ message, event, args }) {
    if (!global.fight1Status) global.fight1Status = {};
    if (!global.fight1Target) global.fight1Target = {};

    const threadID = event.threadID;
    const subCmd = (args[0] || "").toLowerCase();

    if (!["on", "off"].includes(subCmd)) {
      return message.reply("⚠️ সঠিক অপশন ব্যবহার করুন: {pn} on @mention অথবা {pn} off");
    }

    // --- OFF ---
    if (subCmd === "off") {
      if (!global.fight1Status[threadID]) {
        return message.reply("❌ এই গ্রুপে কোনো fight1 চালু নেই!");
      }
      clearInterval(global.fight1Status[threadID]);
      delete global.fight1Status[threadID];
      delete global.fight1Target[threadID];
      return message.reply("🏳️ Fight-1 সফলভাবে বন্ধ করা হয়েছে! গ্রুপ এখন শান্ত।");
    }

    // --- ON ---
    if (global.fight1Status[threadID]) {
      return message.reply("🔥 এই গ্রুপে অলরেডি fight1 চলছে!");
    }

    // টার্গেট খোঁজা: mention অথবা reply
    let targetUID = null;
    let targetName = "তুই";

    const mentionIDs = Object.keys(event.mentions || {});
    if (mentionIDs.length > 0) {
      targetUID = mentionIDs[0];
      targetName = event.mentions[targetUID].replace("@", "");
    } else if (event.messageReply) {
      targetUID = event.messageReply.senderID;
      targetName = "তুই";
    }

    if (!targetUID) {
      return message.reply("⚠️ কাকে রোস্ট করবে সে জানাও! @mention করো অথবা কারো মেসেজে reply দিয়ে কমান্ড দাও।");
    }

    global.fight1Target[threadID] = { uid: targetUID, name: targetName };

    const hardInsults = [
      "তোর মতো নির্লজ্জ আর বেহায়া মানুষ আমি আমার পুরো লাইফে দ্বিতীয়টি আর একটাও দেখিনি। মানুষের সামনে বড় বড় কথা বলিস অথচ তোর নিজের কোনো পার্সোনালিটি বা আত্মসম্মান বলতে কিছু নেই। গ্রুপে এসে সবাইকে ডিস্টার্ব করা ছাড়া তোর জীবনের আর কোনো বড় উদ্দেশ্য আছে বলে মনে হয় না।",
      "তোর মগজের ভেতরের বুদ্ধি আর রাস্তার ময়লার মধ্যে আসলে তেমন কোনো তফাত বা পার্থক্য নেই। নিজের লিমিট বা সীমানা কতটুকু সেটা ভালো করে জেনে তারপর মানুষের সাথে কথা বলতে আসিস। সারাদিন ফেসবুকে পড়ে থেকে ফালতু আবর্জনা ছড়ানো ছাড়া তুই সমাজ বা পরিবারের কোনো উপকারে আসিস না।",
      "তোর মুখের ভাষা আর স্বভাবের যা করুণ অবস্থা তা দেখে সত্যিই তোকে নিয়ে করুণা হয়। গ্রুপের বাকি সবাই তোকে মনে মনে কতটা অপছন্দ করে সেই আইডিয়া তোর নিজেরও নেই। জ্ঞানহীন মূর্খের মতো এখানে এসে সবাইকে নিজের ফালতু ডমিনেন্স দেখানোর চেষ্টা একদম করবি না।",
      "তোর মতো একটা অকর্মা আর অপদার্থের সাথে তর্ক করা মানে নিজের মূল্যবান সময়ের চরম অপচয় করা। তুই আসলেই একটা জিরো যার নিজস্ব কোনো যোগ্যতা বা মানুষের সাথে চলার মতো নূন্যতম ভদ্রতা জানা নেই। গ্রুপের পরিবেশ নষ্ট করার জন্য তোকে কিক মেরে বের করে দেওয়া উচিত ছিল অনেক আগেই।",
      "তোর আচরণ দেখলে স্পষ্ট বোঝা যায় তোর পারিবারিক শিক্ষা বলতে আদতে কিছু নেই। যেখানেই যাস সেখানেই নিজের এই সস্তা আর নোংরা মানসিকতার পরিচয় দিয়ে আসিস। এখানে এসে নিজেকে অনেক বড় পন্ডিত ভাবার কোনো দরকার নেই তুই আসলে একটা আস্ত মূর্খ।"
    ];

    message.reply("💣 Fight-1 শুরু হলো! টানা ৫ মিনিট @" + targetName + " কে চরম আক্রমণ চলবে... 🔥");

    let duration = 0;

    global.fight1Status[threadID] = setInterval(() => {
      const target = global.fight1Target[threadID];
      if (!target) {
        clearInterval(global.fight1Status[threadID]);
        return;
      }

      const insult = hardInsults[Math.floor(Math.random() * hardInsults.length)];
      const tag = "@" + target.name;
      const body = tag + " " + insult;

      message.reply({
        body: body,
        mentions: [{ tag: tag, id: target.uid, fromIndex: 0 }]
      });

      duration += 4;

      if (duration >= 300) {
        clearInterval(global.fight1Status[threadID]);
        delete global.fight1Status[threadID];
        delete global.fight1Target[threadID];
        message.reply("✅ ৫ মিনিট শেষ! Fight-1 অটোমেটিকভাবে বন্ধ হয়ে গেছে।");
      }
    }, 4000); // 4000ms = 4 seconds
  }
};
