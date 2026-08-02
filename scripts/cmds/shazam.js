const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "shazam",
    version: "2.1",
    author: "Tenzo (Fixed by AI)",
    countDown: 10,
    role: 0,
    shortDescription: "Audio/video reply করে গান চেনায়",
    longDescription: "যেকোনো অডিও বা ভিডিও মেসেজে রিপ্লাই দিয়ে এই কমান্ড ব্যবহার করলে এটি স্বয়ংক্রিয়ভাবে গানটি শনাক্ত করে তার নাম ও তথ্য জানিয়ে দেয়।",
    category: "media",
    guide: "{pn}",
    envConfig: {
      deltaNext: 10
    }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;

    if (event.type !== "message_reply")
      return message.reply("🎵 একটি অডিও বা ভিডিও মেসেজ reply করে shazam লিখুন।");

    const attachment = event.messageReply?.attachments?.[0];
    if (!attachment)
      return message.reply("❌ Reply করা মেসেজে কোনো attachment নেই।");

    if (!["audio", "video"].includes(attachment.type))
      return message.reply("❌ শুধুমাত্র audio বা video ফাইল সাপোর্ট করা হয়।");

    api.setMessageReaction("🎧", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const tempAudioPath = path.join(cacheDir, `shazam_audio_${Date.now()}.mp3`);
    let tempImagePath = null;

    try {
      // অডিও ডাউনলোড করা হচ্ছে
      const audioRes = await axios.get(attachment.url, {
        responseType: "arraybuffer",
        timeout: 30000
      });
      await fs.writeFile(tempAudioPath, Buffer.from(audioRes.data));

      // ফর্মে ডাটা যুক্ত করা হচ্ছে
      const form = new FormData();
      form.append("file", fs.createReadStream(tempAudioPath));
      form.append("return", "apple_music,spotify");
      
      // আপনার দেওয়া পার্সোনাল API Token যুক্ত করা হয়েছে
      form.append("api_token", "53c289983af42c1b7edd44daecb3e29b"); 

      // সঠিক API লিংকে POST রিকোয়েস্ট (https://api.audd.io/)
      const shazamRes = await axios.post("https://api.audd.io/", form, {
        headers: form.getHeaders(),
        timeout: 30000
      });

      const data = shazamRes.data;

      // API যদি কোনো Error দেয়
      if (data.status === "error") {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ API Error: ${data.error.error_message}`);
      }

      // গান খুঁজে না পেলে
      if (!data.result) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("🔍 গানটি চেনা যায়নি। অডিওটি হয়তো পরিষ্কার নয় বা ডাটাবেজে নেই।");
      }

      const result = data.result;

      let replyText =
        `🎵 গান খুঁজে পাওয়া গেছে!\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `🎼 Title: ${result.title || "Unknown"}\n` +
        `🎤 Artist: ${result.artist || "Unknown"}\n` +
        `💿 Album: ${result.album || "N/A"}\n` +
        `📅 Release: ${result.release_date || "N/A"}\n`;

      if (result.song_link) replyText += `🔗 Link: ${result.song_link}\n`;

      const thumbnail =
        result.apple_music?.artwork?.url?.replace("{w}", "500").replace("{h}", "500") ||
        result.spotify?.album?.images?.[0]?.url ||
        null;

      if (thumbnail) {
        try {
          tempImagePath = path.join(cacheDir, `shazam_thumb_${Date.now()}.jpg`);
          const imgRes = await axios({ method: "get", url: thumbnail, responseType: "stream", timeout: 15000 });
          const writer = fs.createWriteStream(tempImagePath);
          imgRes.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
          
          api.sendMessage(
            { body: replyText, attachment: fs.createReadStream(tempImagePath) },
            threadID,
            () => { api.setMessageReaction("✅", messageID, () => {}, true); },
            messageID
          );
        } catch (_) {
          api.sendMessage(replyText, threadID, () => {
            api.setMessageReaction("✅", messageID, () => {}, true);
          }, messageID);
        }
      } else {
        api.sendMessage(replyText, threadID, () => {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }, messageID);
      }

    } catch (error) {
      console.log(error); // Console এ error দেখার জন্য
      api.setMessageReaction("❌", messageID, () => {}, true);
      const msg = error.code === "ETIMEDOUT"
        ? "⏱️ Timeout হয়েছে। আবার চেষ্টা করুন।"
        : "❌ সমস্যা হয়েছে। Bot এর console চেক করুন।";
      return message.reply(msg);
    } finally {
      setTimeout(async () => {
        try { if (tempAudioPath && await fs.pathExists(tempAudioPath)) await fs.unlink(tempAudioPath); } catch (_) {}
        try { if (tempImagePath && await fs.pathExists(tempImagePath)) await fs.unlink(tempImagePath); } catch (_) {}
      }, 5000);
    }
  }
};
