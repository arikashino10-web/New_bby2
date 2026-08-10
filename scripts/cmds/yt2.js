const axios = require("axios");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const TMP_DIR = path.join(__dirname, "cache", "yt");
const PER_PAGE = 8;

const REACT = {
	loading: "⏳",
	success: "✅",
	error: "❌",
};

const baseApiUrl = async () => {
	const base = await axios.get(`https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json`, { timeout: 15000 });
	return base.data.mahmud;
};

function truncate(text, maxLen) {
	if (!text) return "Untitled";
	return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

function formatCount(n) {
	n = Number(n);
	if (!n || isNaN(n)) return null;
	if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
	return String(n);
}

function getChannel(v) {
	return v.channel?.name || v.channel || v.author || "Unknown";
}

function getDuration(v) {
	return v.time || v.duration_raw || v.duration || "";
}

function getViews(v) {
	return formatCount(v.views || v.view_count || v.viewCount);
}

const W = 640, HEADER_H = 80, ROW_H = 90, PADDING = 20, THUMB_W = 118, THUMB_H = 66;

function drawYouTubeLogo(ctx, x, y) {
	const rw = 40, rh = 28, r = 8;
	ctx.fillStyle = "#FF0000";
	ctx.beginPath();
	ctx.moveTo(x + r, y); ctx.lineTo(x + rw - r, y);
	ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
	ctx.lineTo(x + rw, y + rh - r);
	ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
	ctx.lineTo(x + r, y + rh);
	ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath(); ctx.fill();

	const cx = x + rw / 2, cy = y + rh / 2;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.moveTo(cx - 5, cy - 8);
	ctx.lineTo(cx - 5, cy + 8);
	ctx.lineTo(cx + 9, cy);
	ctx.closePath(); ctx.fill();
}

async function generateSearchImage(pageResults, query, page, maxPage) {
	const totalH = HEADER_H + pageResults.length * ROW_H + 20;
	const canvas = createCanvas(W, totalH);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#0f0f0f";
	ctx.fillRect(0, 0, W, totalH);
	drawYouTubeLogo(ctx, PADDING, 22);

	ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px sans-serif";
	ctx.fillText("YouTube Results", PADDING + 50, 43);
	ctx.fillStyle = "#aaaaaa"; ctx.font = "13px sans-serif";
	ctx.fillText(`"${truncate(query, 40)}" — Page ${page}/${maxPage}`, PADDING + 50, 62);

	ctx.strokeStyle = "#333333"; ctx.lineWidth = 1;
	ctx.beginPath(); ctx.moveTo(PADDING, HEADER_H - 1); ctx.lineTo(W - PADDING, HEADER_H - 1); ctx.stroke();

	for (let i = 0; i < pageResults.length; i++) {
		const v = pageResults[i];
		const y = HEADER_H + i * ROW_H;
		const mid = y + ROW_H / 2;

		if (i % 2 === 0) { ctx.fillStyle = "#181818"; ctx.fillRect(0, y, W, ROW_H); }

		// Number shown here is the LOCAL position on this page (1..PER_PAGE).
		// This must match how onReply maps the user's choice back to a video.
		ctx.fillStyle = "#666666"; ctx.font = "bold 18px sans-serif";
		ctx.fillText(String(i + 1), PADDING, mid + 7);

		const thumbX = PADDING + 30, thumbY = y + (ROW_H - THUMB_H) / 2;
		ctx.fillStyle = "#333333"; ctx.fillRect(thumbX, thumbY, THUMB_W, THUMB_H);

		try {
			const thumb = v.thumbnail;
			const imgBuf = await axios.get(thumb, {
				responseType: "arraybuffer",
				timeout: 6000,
				headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
			});
			ctx.drawImage(await loadImage(Buffer.from(imgBuf.data)), thumbX, thumbY, THUMB_W, THUMB_H);
		} catch {
			ctx.fillStyle = "#888888"; ctx.font = "11px sans-serif";
			ctx.fillText("No image", thumbX + 28, thumbY + 36);
		}

		ctx.strokeStyle = "#444444"; ctx.lineWidth = 1;
		ctx.strokeRect(thumbX, thumbY, THUMB_W, THUMB_H);

		const dur = getDuration(v);
		if (dur) {
			ctx.fillStyle = "rgba(0,0,0,0.75)";
			ctx.fillRect(thumbX, thumbY + THUMB_H - 16, THUMB_W, 16);
			ctx.fillStyle = "#ffffff"; ctx.font = "10px sans-serif";
			ctx.fillText(dur, thumbX + 4, thumbY + THUMB_H - 5);
		}

		const textX = thumbX + THUMB_W + 14;
		ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px sans-serif";
		ctx.fillText(truncate(v.title, 52), textX, mid - 14);
		ctx.fillStyle = "#FF0000"; ctx.font = "12px sans-serif";
		ctx.fillText(truncate(getChannel(v), 32), textX, mid + 4);

		const views = getViews(v);
		ctx.fillStyle = "#777777"; ctx.font = "12px sans-serif";
		ctx.fillText(views ? `👀 ${views} views` : dur ? `🍒 ${dur}` : "", textX, mid + 20);

		if (i < pageResults.length - 1) {
			ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 1;
			ctx.beginPath(); ctx.moveTo(PADDING + 30, y + ROW_H); ctx.lineTo(W - PADDING, y + ROW_H); ctx.stroke();
		}
	}

	return canvas.toBuffer("image/jpeg", { quality: 0.92 });
}

async function sendPage(api, event, allResults, page, query, type, apiUrl, commandName, getLang) {
	await fs.ensureDir(TMP_DIR);

	const start = (page - 1) * PER_PAGE;
	const end = start + PER_PAGE;
	const pageResults = allResults.slice(start, end);
	const maxPage = Math.ceil(allResults.length / PER_PAGE);

	const imgBuf = await generateSearchImage(pageResults, query, page, maxPage);
	// write into TMP_DIR (already ensured above) instead of os.tmpdir() so all
	// command temp files live in one predictable, cleanable place
	const tmpImg = path.join(TMP_DIR, `search_${Date.now()}.jpg`);
	await fs.writeFile(tmpImg, imgBuf);

	return new Promise((resolve) => {
		api.sendMessage(
			{
				body: getLang("choose", `𝐘𝐨𝐮𝐓𝐮𝐛𝐞 𝐫𝐞𝐬𝐮𝐥𝐭𝐬 𝐟𝐨𝐫 "${query}" — page ${page}/${maxPage}\n`),
				attachment: fs.createReadStream(tmpImg)
			},
			event.threadID,
			(err, info) => {
				setTimeout(() => { fs.unlink(tmpImg).catch(() => {}); }, 20000);

				if (err) {
					console.error("Send page error:", err);
					return resolve();
				}

				global.GoatBot.onReply.set(info.messageID, {
					commandName,
					author: event.senderID,
					results: allResults,
					query,
					page,
					type,
					apiUrl,
					menuMessageID: info.messageID
				});

				resolve();
			},
			event.messageID
		);
	});
}

module.exports = {
	config: {
		name: "yt2",
		aliases: [],
		version: "3.1",
		author: "Arafat (fixed)",
		countDown: 10,
		role: 0,
		description: {
			vi: "Tải video, audio hoặc xem thông tin video trên YouTube",
			en: "Download video, audio or view video information on YouTube"
		},
		category: "media",
		guide: {
			vi: "   {pn} [video|-v] [<tên video>|<link video>]: dùng để tải video từ youtube."
				+ "\n   {pn} [audio|-a] [<tên video>|<link video>]: dùng để tải audio từ youtube"
				+ "\n   {pn} [info|-i] [<tên video>|<link video>]: dùng để xem thông tin video từ youtube"
				+ "\n   Ví dụ:"
				+ "\n    {pn} -v Mood Lo-Fi"
				+ "\n    {pn} -a Mood Lo-Fi"
				+ "\n    {pn} -i Mood Lo-Fi",
			en: "   {pn} [video|-v] [<video name>|<video link>]: use to download video from youtube."
				+ "\n   {pn} [audio|-a] [<video name>|<video link>]: use to download audio from youtube"
				+ "\n   {pn} [info|-i] [<video name>|<video link>]: use to view video information from youtube"
				+ "\n   Example:"
				+ "\n    {pn} -v Mood Lo-Fi"
				+ "\n    {pn} -a Mood Lo-Fi"
				+ "\n    {pn} -i Mood Lo-Fi"
		}
	},

	langs: {
		vi: {
			error: "❌ | Không thể tải xuống: %1",
			noResult: "⭕ | Không có kết quả tìm kiếm nào phù hợp với từ khóa %1",
			choose: "%1",
			video: "video",
			audio: "âm thanh",
			noVideo: "⭕ | Rất tiếc, không tìm thấy video nào hợp lệ",
			noAudio: "⭕ | Rất tiếc, không tìm thấy audio nào hợp lệ",
			noMore: "😿 | Không còn kết quả nào nữa!",
			invalid: "😺 | Reply với số hợp lệ (trong trang hiện tại) hoặc 'next'.",
			info: "💠 | Tiêu đề: %1\n🏪 Channel: %2\n👨‍👩‍👧‍👦 Subscriber: %3\n⏱ Thời gian video: %4\n👀 Lượt xem: %5\n👍 Lượt thích: %6\n🆙 Ngày tải lên: %7\n🔠 ID: %8\n🔗 Link: %9"
		},
		en: {
			error: "❌ | Could not download: %1",
			noResult: "⭕ | No search results match the keyword %1",
			choose: "%1",
			video: "video",
			audio: "audio",
			noVideo: "⭕ | Sorry, no video was found",
			noAudio: "⭕ | Sorry, no audio was found",
			noMore: "😿 | No more results!",
			invalid: "😺 | Reply with a valid number (from the current page) or 'next'.",
			info: "💠 | Title: %1\n🏪 Channel: %2\n👨‍👩‍👧‍👦 Subscriber: %3\n⏱ Video duration: %4\n👀 View count: %5\n👍 Like count: %6\n🆙 Upload date: %7\n🔠 ID: %8\n🔗 Link: %9"
		}
	},

	onStart: async function ({ api, args, message, event, commandName, getLang }) {
		const { threadID, messageID } = event;

		let type;
		switch (args[0]) {
			case "-v":
			case "video":
				type = "video";
				break;
			case "-a":
			case "-s":
			case "audio":
			case "sing":
				type = "audio";
				break;
			case "-i":
			case "info":
				type = "info";
				break;
			default:
				api.setMessageReaction(REACT.error, messageID, () => {}, true);
				return message.SyntaxError();
		}

		const input = args.slice(1).join(" ");
		if (!input) {
			api.setMessageReaction(REACT.error, messageID, () => {}, true);
			return message.SyntaxError();
		}

		let apiUrl;
		try {
			apiUrl = await baseApiUrl();
		} catch (e) {
			console.error("baseApiUrl error:", e);
			api.setMessageReaction(REACT.error, messageID, () => {}, true);
			return api.sendMessage(getLang("error", "API service unreachable"), threadID, messageID);
		}

		const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

		if (checkurl.test(input)) {
			const videoID = input.match(checkurl)[1];
			api.setMessageReaction(REACT.loading, messageID, () => {}, true);
			if (type === 'info') return fetchInfo(api, threadID, messageID, videoID, apiUrl, getLang);
			return handleDownload(api, threadID, messageID, videoID, type, apiUrl, getLang);
		}

		try {
			api.setMessageReaction(REACT.loading, messageID, () => {}, true);
			const res = await axios.get(`${apiUrl}/api/ytb/search?q=${encodeURIComponent(input)}`, { timeout: 20000 });
			const allResults = (res.data.results || []).slice(0, 32);
			if (!allResults.length) {
				api.setMessageReaction(REACT.error, messageID, () => {}, true);
				return api.sendMessage(getLang("noResult", input), threadID, messageID);
			}

			await sendPage(api, event, allResults, 1, input, type, apiUrl, commandName, getLang);
			api.setMessageReaction(REACT.success, messageID, () => {}, true);

		} catch (e) {
			console.error("Search error:", e);
			api.setMessageReaction(REACT.error, messageID, () => {}, true);
			return api.sendMessage(getLang("error", e.message), threadID, messageID);
		}
	},

	onReply: async function ({ event, api, Reply, getLang }) {
		const { results, type, apiUrl, author, menuMessageID, page, query, commandName } = Reply;
		if (event.senderID !== author) return;

		const targetMessageID = menuMessageID || Reply.messageID;
		const body = (event.body || "").trim().toLowerCase();

		api.setMessageReaction(REACT.loading, event.messageID, () => {}, true);

		const maxPage = Math.ceil(results.length / PER_PAGE);

		if (body === "next") {
			const nextPage = page + 1;
			if (nextPage > maxPage) {
				api.setMessageReaction(REACT.error, event.messageID, () => {}, true);
				return api.sendMessage(getLang("noMore"), event.threadID, event.messageID);
			}
			try { api.unsendMessage(targetMessageID); } catch {}
			global.GoatBot.onReply.delete(targetMessageID);
			await sendPage(api, event, results, nextPage, query, type, apiUrl, commandName, getLang);
			api.setMessageReaction(REACT.success, event.messageID, () => {}, true);
			return;
		}

		// The number shown to the user is LOCAL to the current page (1..PER_PAGE),
		// so it must be converted to a global index into the full `results` array
		// using the stored `page`. Using the raw number directly (as in the
		// original code) picked the wrong video on any page after the first.
		const pageStart = (page - 1) * PER_PAGE;
		const itemsOnThisPage = Math.min(PER_PAGE, results.length - pageStart);

		const choice = parseInt(event.body);
		if (isNaN(choice) || choice <= 0 || choice > itemsOnThisPage) {
			api.setMessageReaction(REACT.error, event.messageID, () => {}, true);
			try { api.unsendMessage(targetMessageID); } catch {}
			global.GoatBot.onReply.delete(targetMessageID);
			return api.sendMessage(getLang("invalid"), event.threadID, event.messageID);
		}

		const globalIndex = pageStart + (choice - 1);
		const videoID = results[globalIndex].id;

		try { api.unsendMessage(targetMessageID); } catch {}
		global.GoatBot.onReply.delete(targetMessageID);

		if (type === 'info') return fetchInfo(api, event.threadID, event.messageID, videoID, apiUrl, getLang);
		await handleDownload(api, event.threadID, event.messageID, videoID, type, apiUrl, getLang);
	}
};

async function handleDownload(api, threadID, messageID, videoID, type, apiUrl, getLang) {
	const format = type === 'audio' ? 'mp3' : 'mp4';
	const cacheDir = path.join(__dirname, 'cache');
	await fs.ensureDir(cacheDir);

	const filePath = path.join(cacheDir, `yt_${videoID}_${Date.now()}.${format}`);

	try {
		const res = await axios.get(`${apiUrl}/api/ytb/get?id=${videoID}&type=${type}`, { timeout: 20000 });
		const data = res.data && res.data.data;

		if (!data || !data.downloadLink) {
			api.setMessageReaction(REACT.error, messageID, () => {}, true);
			return api.sendMessage(getLang("error", "No download link returned"), threadID, messageID);
		}

		const { title, downloadLink } = data;

		const response = await axios({ url: downloadLink, method: 'GET', responseType: 'stream', timeout: 30000 });
		const writer = fs.createWriteStream(filePath);
		response.data.pipe(writer);

		writer.on('finish', () => {
			const body = type === "audio"
				? `✅ | 𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐞𝐝 𝐬𝐨𝐧𝐠\n➡️ ${title}`
				: `• ✨𝐓𝐢𝐭𝐥𝐞: ${title}`;
			api.sendMessage({
				body,
				attachment: fs.createReadStream(filePath)
			}, threadID, () => {
				api.setMessageReaction(REACT.success, messageID, () => {}, true);
				fs.unlink(filePath).catch(() => {});
			}, messageID);
		});

		writer.on('error', (err) => {
			console.error("Write stream error:", err);
			api.setMessageReaction(REACT.error, messageID, () => {}, true);
			api.sendMessage(getLang("error", "Download stream failed"), threadID, messageID);
			fs.unlink(filePath).catch(() => {});
		});
	} catch (e) {
		console.error("handleDownload error:", e);
		api.setMessageReaction(REACT.error, messageID, () => {}, true);
		api.sendMessage(getLang("error", e.message || "Download failed"), threadID, messageID);
		fs.unlink(filePath).catch(() => {});
	}
}

async function fetchInfo(api, threadID, messageID, videoID, apiUrl, getLang) {
	const cacheDir = path.join(__dirname, 'cache');
	const thumbPath = path.join(cacheDir, `info_${videoID}_${Date.now()}.jpg`);

	try {
		await fs.ensureDir(cacheDir);
		const res = await axios.get(`${apiUrl}/api/ytb/details?id=${videoID}`, { timeout: 20000 });
		const d = res.data.details;

		const formatNum = (num) => String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

		const msg = getLang("info",
			d.title, d.channel, formatNum(d.subCount || 0), d.duration_raw || d.duration,
			formatNum(d.view_count || 0), formatNum(d.like_count || 0), d.upload_date || 'N/A', videoID, d.webpage_url
		);

		let attachment;
		try {
			const thumbRes = await axios.get(d.thumbnail, { responseType: 'arraybuffer', timeout: 15000 });
			await fs.writeFile(thumbPath, Buffer.from(thumbRes.data));
			attachment = fs.createReadStream(thumbPath);
		} catch (_) {
			attachment = undefined;
		}

		api.sendMessage({ body: msg, attachment },
			threadID, () => {
				api.setMessageReaction(REACT.success, messageID, () => {}, true);
				fs.unlink(thumbPath).catch(() => {});
			}, messageID);
	} catch (e) {
		console.error("fetchInfo error:", e);
		api.setMessageReaction(REACT.error, messageID, () => {}, true);
		api.sendMessage(getLang("error", e.message || "Could not fetch info"), threadID, messageID);
		fs.unlink(thumbPath).catch(() => {});
	}
                       }
