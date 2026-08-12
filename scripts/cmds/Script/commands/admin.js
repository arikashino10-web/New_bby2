const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "admin",
    version: "1.9",
    author: "NTKhang & Arafat",
    countDown: 5,
    role: 0,
    description: {
      vi: "Thêm, xóa, sửa quyền admin",
      en: "Add, remove, edit admin role"
    },
    category: "box chat",
    guide: {
      vi: '   {pn} [add | -a] <uid | @tag | name>: Thêm quyền admin' +
        '\n	  {pn} [remove | -r] <uid | @tag | name>: Xóa quyền admin' +
        '\n	  {pn} [list | -l]: Xem danh sách admin',
      en: '   {pn} [add | -a] <uid | @tag | name>: Add admin role' +
        '\n	  {pn} [remove | -r] <uid | @tag | name>: Remove admin role' +
        '\n	  {pn} [list | -l]: List all admins'
    }
  },

  langs: {
    vi: {
      added: "✅ | Đã thêm quyền admin cho %1 người dùng",
      missingIdAdd: "⚠️ | Vui lòng reply, tag hoặc nhập tên người dùng muốn thêm admin",
      removed: "✅ | Đã xóa quyền admin của %1 người dùng",
      missingIdRemove: "⚠️ | Vui lòng reply, tag hoặc nhập tên người dùng muốn xóa admin",
      listAdmin: "👑 | 𝐋𝐢𝐬𝐭 𝐨𝐟 𝐀𝐝𝐦𝐢𝐧𝐬: %1\n\n%2",
      noPerm: "❌ | 𝐁𝐚𝐛𝐲, 𝐨𝐧𝐥𝐲 𝐦𝐲 𝐚𝐝𝐦𝐢𝐧 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝!"
    },
    en: {
      added: "✅ | Added admin role for %1 users",
      missingIdAdd: "⚠️ | Please reply, tag, or type the name to add admin",
      removed: "✅ | Removed admin role of %1 users",
      missingIdRemove: "⚠️ | Please reply, tag, or type the name to remove admin",
      listAdmin: "👑 | 𝐋𝐢𝐬𝐭 𝐨𝐟 𝐀𝐝𝐦𝐢𝐧𝐬: %1\n\n%2",
      noPerm: "❌ | 𝐁𝐚𝐛𝐲, 𝐨𝐧𝐥𝐲 𝐦𝐲 𝐚𝐝𝐦𝐢𝐧 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝!"
    }
  },

  onStart: async function ({ message, args, usersData, event, getLang, api }) {
    const isAdmin = config.adminBot.includes(event.senderID);

    const focusText = (text) => {
      const charMap = {
        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
        'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
        '.': '.', ':': ':', "'": "'"
      };
      return String(text).split('').map(char => charMap[char] || char).join('');
    };

    // Helper function to extract UIDs using your uid.js logic
    const getUids = async () => {
      let uids = [];
      if (event.messageReply) {
        uids.push(event.messageReply.senderID);
      } else if (Object.keys(event.mentions).length > 0) {
        uids = Object.keys(event.mentions);
      } else if (args[1]) {
        if (!isNaN(args[1])) {
          uids.push(args[1]);
        } else {
          // Name search logic from uid.js
          const query = args.slice(1).join(" ").toLowerCase().replace("@", "");
          const threadInfo = await api.getThreadInfo(event.threadID);
          const ids = threadInfo.participantIDs || [];
          for (const id of ids) {
            try {
              const name = (await usersData.getName(id)).toLowerCase();
              if (name.includes(query)) uids.push(id);
            } catch (e) {}
          }
        }
      }
      return [...new Set(uids)]; // Remove duplicates
    };

    switch (args[0]) {
      case "add":
      case "-a": {
        if (!isAdmin) return message.reply(getLang("noPerm"));
        const uids = await getUids();
        if (uids.length == 0) return message.reply(getLang("missingIdAdd"));

        const notAdminIds = uids.filter(uid => !config.adminBot.includes(uid));
        if (notAdminIds.length > 0) {
          config.adminBot.push(...notAdminIds);
          writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        }
        return message.reply(getLang("added", uids.length));
      }
      case "remove":
      case "-r": {
        if (!isAdmin) return message.reply(getLang("noPerm"));
        const uids = await getUids();
        if (uids.length == 0) return message.reply(getLang("missingIdRemove"));

        const adminIds = uids.filter(uid => config.adminBot.includes(uid));
        adminIds.forEach(uid => {
          const index = config.adminBot.indexOf(uid);
          if (index > -1) config.adminBot.splice(index, 1);
        });

        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(getLang("removed", adminIds.length));
      }
      case "list":
      case "-l": {
        const list = [];
        const total = config.adminBot.length;
        let i = 1;
        for (const uid of config.adminBot) {
          const name = await usersData.getName(uid);
          list.push(`╭‣ ${focusText(i + ". " + name)}\n╰‣ ${focusText("𝐔𝐈𝐃: " + uid)}`);
          i++;
        }
        return message.reply(getLang("listAdmin", focusText(total), list.join("\n")));
      }
      default:
        return message.SyntaxError();
    }
  }
};
