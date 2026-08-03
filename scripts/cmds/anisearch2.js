const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// সাম্প্রতিক পাঠানো ভিডিও ট্র্যাক করার জন্য (ডুপ্লিকেট কমাতে)
const recentVideos = new Map(); // threadID -> Set of videoUrls

async function downloadVideo(url, filePath) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 20000,
  });
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function fetchTikTokVideos(query) {
  try {
    const response = await axios.get(
      `https://lyric-search-neon.vercel.app/kshitiz?keyword=${encodeURIComponent(query)}`,
      { timeout: 15000 }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("fetchTikTokVideos error:", error.message);
    return null;
  }
}

function pickVideo(videos, threadID) {
  if (!recentVideos.has(threadID)) recentVideos.set(threadID, new Set());
  const seen = recentVideos.get(threadID);

  // যেগুলো সাম্প্রতিক পাঠানো হয়নি সেগুলো থেকে আগে চেষ্টা
  const fresh = videos.filter(v => v.videoUrl && !seen.has(v.videoUrl));
  const pool = fresh.length > 0 ? fresh : videos;

  const selected = pool[Math.floor(Math.random() * pool.length)];

  seen.add(selected.videoUrl);
  // হিস্ট্রি বেশি বড় হয়ে গেলে পুরনোগুলো ক্লিয়ার করে দাও
  if (seen.size > 30) seen.clear();

  return selected;
}

module.exports = {
  config: {
    name: "anisearch2",
    aliases: [],
    author: "Vex_kshitiz",
    version: "2.0",
    shortDescription: { en: "get anime edit" },
    longDescription: { en: "search for anime edits video" },
    category: "fun",
    guide: { en: "{p}{n} [anime name]\nExample: {p}{n} naruto" },
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(' ').trim();

    if (!query) {
      return api.sendMessage(
        `❗ অ্যানিমের নাম লিখুন।\nউদাহরণ: ${this.config?.guide?.en || "{p}anisearch2 naruto"}`,
        event.threadID,
        event.messageID
      );
    }

    api.setMessageReaction("✨", event.messageID, () => {}, true);

    const modifiedQuery = `${query} anime edit`;
    const videos = await fetchTikTokVideos(modifiedQuery);

    if (videos === null) {
      return api.sendMessage(
        "⚠️ সার্ভারে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।",
        event.threadID,
        event.messageID
      );
    }

    const validVideos = videos.filter(v => v && v.videoUrl);
    if (validVideos.length === 0) {
      return api.sendMessage(`"${query}" এর কোনো ভিডিও পাওয়া যায়নি।`, event.threadID, event.messageID);
    }

    const selectedVideo = pickVideo(validVideos, event.threadID);
    const videoUrl = selectedVideo.videoUrl;

    const tempPath = path.join(os.tmpdir(), `anisearch2_${Date.now()}_${event.threadID}.mp4`);

    try {
      await downloadVideo(videoUrl, tempPath);

      await api.sendMessage(
        {
          body: `🎬 ${query} — অ্যানিমে এডিট`,
          attachment: fs.createReadStream(tempPath),
        },
        event.threadID,
        event.messageID
      );
    } catch (error) {
      console.error("Video send error:", error.message);
      api.sendMessage(
        "❌ ভিডিও পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        event.threadID,
        event.messageID
      );
    } finally {
      // টেম্প ফাইল ক্লিন আপ
      fs.unlink(tempPath, () => {});
    }
  },
};
