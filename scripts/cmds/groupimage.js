const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "groupimage",
    aliases: ["groupimg", "grouppic"],
    version: "1.2.0",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    shortDescription: "Change group photo",
    longDescription: "Set a replied image as the group profile photo.",
    category: "box",
    guide: {
      en: "{pn} (reply to an image)"
    }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, type, messageReply } = event;

    if (type !== "message_reply") {
      return message.reply("Reply to an image to set it as the group photo.");
    }

    const photo = messageReply.attachments?.find(att => att.type === "photo");
    if (!photo) {
      return message.reply("The replied message has no image.");
    }

    const filePath = `${__dirname}/cache/groupimage_${threadID}.jpg`;

    try {
      const { data } = await axios.get(photo.url, { responseType: "arraybuffer" });
      await fs.outputFile(filePath, Buffer.from(data));
      await api.changeGroupImage(fs.createReadStream(filePath), threadID);
      message.reply("Group photo changed successfully.");
    } catch (error) {
      console.error("[groupimage]", error);
      const reason = error?.error || error?.errorDescription || error?.errorSummary || error?.message || JSON.stringify(error);
      message.reply(`Failed to change the group photo.\nReason: ${reason}`);
    } finally {
      fs.remove(filePath).catch(() => {});
    }
  }
};
