module.exports.config = {
    name: "stalk",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Shaon Ahmed",
    description: "5 বারের জন্য ক্রমাগত বন্ধুর ট্যাগ ট্যাগ করুন\nসেই ব্যক্তিকে আত্মা কলিং বলা যেতে পারে",
    commandCategory: "nsfw",
    usages: " please @mention",
    cooldowns: 10,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
}

module.exports.run = async function({ api, args, Users, event}) {
    var mention = Object.keys(event.mentions)[0];
    if(!mention) return api.sendMessage("আপনি কাকে ভালোবাসেন এমন 1 জনকে @ম্যানশন করতে হবে", event.threadID);
 let name =  event.mentions[mention];
    var arraytag = [];
        arraytag.push({id: mention, tag: name});
    var a = function (a) { api.sendMessage(a, event.threadID); }
a("~বস JABED এর ভালোবাসা নাও প্রিয়~");
setTimeout(() => {a({body: "তোমাকে দেখলে আমার এত ভালো লাগে কেন জান আমি কিছুই তো বুঝতে পারি না💚 । 🥰।" + " " + name, mentions: arraytag})}, 3000);
setTimeout(() => {a({body: "‎টমেটো লাল কাঁচা মরিচ ঝাল তোমার বুকের মাঝে চুমু দেবো আমি চিরকাল জান🙈🥀🥰   😍.." + " " + name, mentions: arraytag})}, 5000);
setTimeout(() => {a({body: "‎༉༎༉😽!!লাইন টা তুমার জন্য  ডুবেছি আমি তুমার প্রেমের অনন্ত মায়ায় 🙈 ༅༎•❤️🌸🐰" + " " + name, mentions: arraytag})}, 7000);
setTimeout(() => {a({body: "‎দিন শেষে আমার তোমাকেই লাগবে😽!" + " " + name, mentions: arraytag})}, 9000);
setTimeout(() => {a({body: "~🖤এক আকাশ সমান স্বপ্ন নিয়েতোমাকে ভালোবাসি প্রিয়🐰🦋🥰" + " " + name, mentions: arraytag})}, 12000);
setTimeout(() => {a({body: "ছেড়ে যাওয়ার যুগে সবার একটা থেকে যাওয়ার মানুষ হোক!💖আপনি আমার সে মানুষ🥀🌸 " + " " + name, mentions: arraytag})}, 15000);
setTimeout(() => {a({body: "- সত্যি কারের ভালোবাসা গুলো এমনই হয় 😍🥀- কেউ কাউকে ছেড়ে যায় না শেষ পর্যন্ত থাকে 😊❤️i Love You Jan😘" + " " + name, mentions: arraytag})}, 17000);
setTimeout(() => {a({body: "ডুবেছি আমি তোমার চোখের অন্তত মায়ায় 👀❤️‍🩹 🤟" + " " + name, mentions: arraytag})}, 20000);
setTimeout(() => {a({body: " যেদিন তুমি সবকিছু বুঝতে পারবে - সেদিন আমি সিমান্ত থাকবো না! 🙂🌸 MAHFUJ PROJECT বট🤝" + " " + name, mentions: arraytag})},23000);
setTimeout(() => {a({body: "- খুব জানতে ইচ্ছে করে.😥🌸 - কি লেখা আছে আমার এই জীবনের শেষের পাতায়.!💔😌" + " " + name, mentions: arraytag})},26000);  
setTimeout(() => {a({body: "︵🦋シ-𝐃𝐨𝐧'𝐭 𝐂𝐫𝐲 𝐅𝐨𝐫 𝐒𝐨𝐦𝐞𝐨𝐧𝐞..!😇🙂-  𝘁𝗵𝗶𝘀 𝗮𝗯𝗼𝘂𝘁 𝗹𝗶𝗻𝗲 🐰✨ দিন শেষে আমি আমার  তোমাকেই লাগবে😊🦋︵🦋❤️‍🩹" + " " + name, mentions: arraytag})},29000);
  setTimeout(() => {a({body: "-︵🦋🤍___ღ༎হারিয়ে গেলে কেউ খুজবে না︵ღ۵__🙂 অথচ সবাই বলে তুমি হারিয়ে গেলে খুব Miss করবো___ღ༎🙂🦋🥀" + " " + name, mentions: arraytag})},32000);
  setTimeout(() => {a({body: "∞──🔐✨🦋──∞ 🌺{·(𝙁𝙤𝙧𝙚𝙫𝙚𝙧 𝙛𝙖𝙫𝙤𝙪𝙧𝙞𝙩𝙚 𝙡𝙞𝙣𝙚)·}🌺___বিশ্বাস ছাড়া ভালোবাসা অর্থহীন আর 🙂 অধিকার ছাড়া সম্পর্ক মূল্যহীন-!😌 🥀" + " " + name, mentions: arraytag})},35000);
  setTimeout(() => {a({body: "নীল আকাশে তারার মেলা,,,,, মধ্য রাতে চাদের খেলা। মিষ্টি সকাল শিশির ভেজা,,,,,,,, শুধু দেখো আমার প্রেমে কতোই না মজা।।" + " " + name, mentions: arraytag})},38000);
  setTimeout(() => {a({body: "-মানসিক শান্তি'ই বড় শান্তি..❤️-আর সেই শান্তি শুধুমাত্র তোমার কাছেই  পাওয়া যায়..🥀" + " " + name, mentions: arraytag})},41000);
  setTimeout(() => {a({body: "সমবয়সী রিলেশন গুলো সবসময় সুন্দর ও সুখের হয় যেমন জান তোমার আর আমার 🥰❤️🖤" + " " + name, mentions: arraytag})},44000);
  setTimeout(() => {a({body: "- সৌন্দর্যের আলাদা কোন রং নেই - আল্লাহর সৃষ্টি সব কিছুই সুন্দর যেমন তুমি..! 😊" + " " + name, mentions: arraytag})},47000);
  setTimeout(() => {a({body: "খুব জানতে ইচ্ছে করে.😥🌸 - কি লেখা আছে তোমার আর আমার এই জীবনের শেষের পাতায়.!💔😌" + " " + name, mentions: arraytag})},50000);
  setTimeout(() => {a({body: "∞──🔐✨🦋──∞ 🌺{·(𝙁𝙤𝙧𝙚𝙫𝙚𝙧 𝙛𝙖𝙫𝙤𝙪𝙧𝙞𝙩𝙚 𝙡𝙞𝙣𝙚)·}🌺___বিশ্বাস ছাড়া ভালোবাসা অর্থহীন আর 🙂 অধিকার ছাড়া সম্পর্ক মূল্যহীন-!😌 🥀" + " " + name, mentions: arraytag})},53000);
  setTimeout(() => {a({body: "✨🐰-!<𝙩𝙝𝙞𝙨 𝘼𝙗𝙤𝙪𝙩 𝙡𝙞𝙣𝙚🍒'-🐻- 🦋🖤__তুমি তার রুপের কথা বলছো  আমি তোমার হাসিতে মুগ্ধ! 🖤🌸🤍🌸🥰" + name, mentions: arraytag})},56000);
  setTimeout(() => {a({body: "অনিয়মে কাছে আসা নিয়ম করে দুরত্ব,এটা  যদি নিয়ম হয় ভালোবাসার ঘৃনা জন্মাক ভালোবাসার উপর 😊😢" + name, mentions: arraytag})},59000);
  setTimeout(() => {a({body: "যার জন্য সব কিছু  চেরে  আমি শূন্য 🙂💔🥀আজ সে অন্য কাউকে  নিয়ে পরিপূর্ণ  😔💔🥀" + name, mentions: arraytag})},62000);
  setTimeout(() => {a({body: "✨🐰-!<𝙩𝙝𝙞𝙨 𝘼𝙗𝙤𝙪𝙩 𝙡𝙞𝙣𝙚🍒'-🐻- 🦋🖤আকাশ সুন্দর চন্দ্র তারায়, বাগান সুন্দর ফুলে। আমি সুন্দর তোমার প্রেমে,,, যদি না যাও ভুলে।🖤🌸🤍🌸🥰" + name, mentions: arraytag})},65000);
  setTimeout(() => {a({body: "︵༎ຶ💚🌻❥︎✔︎•____𝗟𝗶𝗳𝗲 𝗶𝘀 𝗕𝗲𝗮𝘂𝘁𝗶𝗳𝘂𝗹𝗹 𝗪𝗵𝗲𝗻 𝗬𝗼𝘂 𝗔𝗿𝗲 𝗥𝗶𝗴𝗵𝘁𝘀 𝗣𝗲𝗿𝘀𝗼𝗻:)🐰🍒___জীবন সুন্দর!! যদি তুমি আমি সিমান্তের   সাথে থাকো -😻✨💛🌸🥰" + name, mentions: arraytag})},68000);
  setTimeout(() => {a({body: "I love u Jan😏😏 দুজনে মিলে বেচবো ডিম🤷‍♂️🤷‍♂️" + name, mentions: arraytag})},71000);
  setTimeout(() => {a({body: "একদিন সব ইচ্ছা পূর্ণতা পাবে ! 🖤 𝐈𝐧 𝐒𝐚𝐡 𝐀𝐥𝐥𝐚𝐡____Jan ☺️🌺" + name, mentions: arraytag})},74000);
  setTimeout(() => {a({body: "সময় থাকতে ভালোবাসার মানুষকে আপন করে নিতে হয়,দেরি হলেই সব শেষ!💔😢" + name, mentions: arraytag})},29000);
  setTimeout(() => {a({body: "অন্যের জন্যে নিজেকে বাঁচিয়ে রেখে নিজেকে নিজে তিলে তিলে শেষ করার নামই হলো ভালোবাসা ।" + name, mentions: arraytag})},77000);
setTimeout(() => {a({body: "ভালোবাসা হলো দুটি হৃদয়ের সমন্বয়, যেখানে একটি ছাড়া অন্যটি অচল।" + name, mentions: arraytag})},80000);
 setTimeout(() => {a({body: "ভালোবাসা যা দেয়, তার চেয়ে বেশি কেড়ে নেয় ।" + name, mentions: arraytag})},83000);
  setTimeout(() => {a({body: "ভালোবাসা বাতাসের মতো,আপনি এটি দেখতে না পারলেও অনুভব করতে পারবেন" + name, mentions: arraytag})},86000);
  setTimeout(() => {a({body: "ভালোবাসা পাওয়ার চাইতে ভালোবাসা দেওয়াতেই বেশী আনন্দ।" + name, mentions: arraytag})},89000);
  setTimeout(() => {a({body: "পৃথিবীতে অনেক ধরনের অত্যাচার আছে । ভালোবাসার অত্যাচার হচ্ছে সবচেয়ে ভয়ানক অত্যাচার। এ অত্যাচারের বিরুদ্ধে কখনো কিছু বলা যায় না, শুধু সহ্য করে নিতে হয়।" + name, mentions: arraytag})},92000);
  setTimeout(() => {a({body: "বাস্তবতা এতই কঠিন যে কখনও কখনও বুকের ভেতর গড়ে তোলা বিন্দু বিন্দু ভালোবাসাও অসহায় হয়ে পড়ে।" + name, mentions: arraytag})},95000);
  setTimeout(() => {a({body: "জীবনে শুধু এবং শুধুমাত্র একটিই সুখ রয়েছে আর তা হলো ভালোবাসা এবং বিনিময়ে তা পাওয়া।" + name, mentions: arraytag})},98000);
  setTimeout(() => {a({body: "ভালোবাসার মধ্যে অবশ্যই কিছু পাগলামি থাকে তবে সেই পাগলামির পিছনেও কিছু কারণ থাকে।" + name, mentions: arraytag})},101000);
  setTimeout(() => {a({body: "যদি তুমি তোমাকে ভালোবাসা না দাও তবে কেউ দিতে আসবে না।" + name, mentions: arraytag})},104000);
  setTimeout(() => {a({body: "ভালোবাসা কখনো এমনি এমনি মারা যায় না ভালোবাসা তখনই মারা যায় যখন আমরা এর খেয়াল নিতে ভুলে যাই।" + name, mentions: arraytag})},107000);
  setTimeout(() => {a({body: "ভালোবাসা অল্প কয়েক দিনের জন্য হলেও ভুলে যাওয়া সময় সাপেক্ষ।" + name, mentions: arraytag})},110000);
  setTimeout(() => {a({body: "যদি তুমি আমাকে মনে রাখো তবে অন্য কেউ ভুলে গেলেও আমার কিছু যায় আসে না।" + name, mentions: arraytag})},113000);
  setTimeout(() => {a({body: "বসন্তের মনোহর গোধূলি বেলাতে,গাছে গাছে কি যে শোভা ফুলের মেলাতে,বয়ে যায় এ লগন এসো মোর প্রিয়া, তোমায় কাছে পেয়ে জুড়াক আমার জান ।" + name, mentions: arraytag})},116000);
  setTimeout(() => {a({body: "কাছে যদি না আসো, গোপন কথা বলি কেমন করে,আমার যত প্রেম পিরিত, রেখেছি তা তোমার তরে ।" + name, mentions: arraytag})},120000);
  setTimeout(() => {a({body: "সবই কিছু বুঝো তুমি, তবু অবুজ হয়ে থাকো,তোমার ছেড়ে আর যে আমি থাকতে পারি নাগো ।" + name, mentions: arraytag})},123000);
  setTimeout(() => {a({body: "হে প্রেয়সী মিষ্টি হাসি, জাগায় প্রানে সাড়া আবার কবে দেখবো তোমায় তাইতো এত তাড়া ।" + name, mentions: arraytag})},126000);
  setTimeout(() => {a({body: "তোমার আমার প্রেম এক জনমের শুধু নয়,এই প্রেম যেন ওগো চিরদিন অন্তরে রয় ।" + name, mentions: arraytag})},129000);
  setTimeout(() => {a({body: "ঝড় উঠেছে এই বুকে, দেখে তোমায় প্রথম বার,না পেলে আপন করে, এ ঝড় থামবে না আর ।" + name, mentions: arraytag})},132000);
  setTimeout(() => {a({body: "কত রাত জেগেছি তোমার কথা ভেবে ভেবে কবে বলো তুমি আমার আপন করে নেবে ।" + name, mentions: arraytag})},135000);
  }
