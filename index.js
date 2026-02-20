import WebSocket from 'ws';
class TrianguletBot {
    constructor(token, username) {
        this.token = this.formatToken(token);
        this.username = username;
        this.socket = null;
        this.init();
    }

    formatToken(t) {
        let cleanToken = String(t).replace(/^"|"$/g, '').trim();
        return `triangulet ${cleanToken}`;
    }

    init() {
        console.log(`[${this.username}] 🔄 Connecting...`);
        this.socket = new WebSocket("wss://tri.pengpowers.xyz/socket.io/?EIO=4&transport=websocket");

        this.socket.on('message', (data) => {
            const message = data.toString();

            if (message.startsWith("0")) {
                const authObject = { token: this.token };
                const handshake = `40${JSON.stringify(authObject)}`;
                
                console.log(`[${this.username}] 🔑 Sending Auth: ${this.token.slice(0, 22)}...`);
                this.socket.send(handshake);
            }

            if (message === "2") this.socket.send("3");

            if (message.startsWith("40")) {
                console.log(`[${this.username}] 🟢 AUTH SUCCESS`);
            }
            
            if (message.startsWith("44")) {
                console.error(`[${this.username}] ❌ AUTH REJECTED: ${message}`);
            }
        });

        this.socket.on('close', (code) => console.log(`[${this.username}] 🔴 Closed (${code})`));
        this.socket.on('error', (err) => console.error(`[${this.username}] ⚠️ Error: ${err.message}`));
    }

    send(msg) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            const payload = `42${JSON.stringify(["chat", String(msg).trim()])}`;
            this.socket.send(payload);
        }
    }
}

class CommandBot {
    constructor() {
    this.id = Math.floor(1000 + Math.random() * 9000);
    this.username = `Blob_bot_${this.id}`;
    this.token = null;
    this.socket = null;
    this.prefix = "!";
    this.startTime = Date.now();
    this.dataBase = "https://tri.pengpowers.xyz/api"; 
    
    this.msgHistory = {}; 
    this.cooldowns = {};    
    this.spamLimit = 5;    
    this.spamWindow = 5000;
    this.lockoutDuration = 10000; 
    this.manualMutes = new Set();
    this.owner = "Blob_raccoon";
    this.admins = ["mathboy2alt", "phoenixthedemon", "monkeys"];
    this.minions = [];  
    this.activePoll = null;
    this.manualMutes.add("YWR123");
}
    formatToken(t) {
        let cleanToken = String(t).replace(/^"|"$/g, '').trim();
        return `triangulet ${cleanToken}`;
    }

    async register() {
        const apiUrl = `${this.dataBase}/register`;
        try {
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: this.username, password: "password123" })
            });
            const data = await res.json();
            const rawToken = data.token || data.tokenraw;
            this.token = this.formatToken(rawToken);
            console.log(`✅ Registered as ${this.username}`);
        } catch (e) {
            console.error("❌ Registration failed:", e.message);
        }
    }

    connect() {
        this.socket = new WebSocket("wss://tri.pengpowers.xyz/socket.io/?EIO=4&transport=websocket");

        this.socket.on('message', (data) => {
            const raw = data.toString();
            
            if (raw === "2") { this.socket.send("3"); this.send("BLOB BOT IS ACTIVE FOR USE, USE !help TO GET STARTED 🟢"); return; }
            if (raw.startsWith("0")) { 
                this.socket.send(`40${JSON.stringify({ token: this.token })}`); 
            }

            if (raw.startsWith("40")) {
                console.log(`[${this.username}] 🟢 ONLINE AND READY`);
                this.send("BLOB BOT IS ACTIVE FOR USE, USE !help TO GET STARTED 🟢");
            }

            if (raw.startsWith("42")) {
                this.handleChat(raw);
            }
        });

        this.socket.on('close', () => {
            console.log("🔴 Connection lost. Reconnecting...");
            setTimeout(() => this.connect(), 3000);
        });

        this.socket.on('error', (err) => {
            console.error("⚠️ Socket Error:", err.message);
            this.socket.terminate();
        });
    }
    

    handleChat(raw) {
        try {
            const parsed = JSON.parse(raw.slice(2));
            if (parsed[0] === "chat" && parsed[1].message) {
                const user = parsed[1].user.username;
                const text = parsed[1].message.trim();

                if (user === this.username) return;

                if (text.startsWith(this.prefix)) {
                    if (this.isSpamming(user)) return; 

                    const args = text.slice(this.prefix.length).split(" ");
                    const command = args.shift().toLowerCase();
                    this.executeCommand(command, args, user);
                }
            }
        } catch (e) {
            console.log(e)
        }
    }

    detectSpam(user) {
        const now = Date.now();
        if (!this.msgHistory[user]) this.msgHistory[user] = [];

        this.msgHistory[user] = this.msgHistory[user].filter(time => now - time < this.spamWindow);
        this.msgHistory[user].push(now);

        if (this.msgHistory[user].length >= this.spamLimit) {
            this.send(`${user} stop spamming!`);
            return true;
        }
        return false;
    }
isSpamming(user) {
    const now = Date.now();

    // 1. Check if the user is manually muted (permanent until unmuted)
    if (this.manualMutes.has(user)) {
        return true; 
    }

    // 2. Check if the user is currently in the 10-second spam lockout
    if (this.cooldowns[user] && now < this.cooldowns[user]) {
        return true; 
    }

    // 3. Initialize message history for new users
    if (!this.msgHistory[user]) {
        this.msgHistory[user] = [];
    }
    
    // 4. Filter out messages older than the spam window (e.g., 5 seconds)
    this.msgHistory[user] = this.msgHistory[user].filter(time => now - time < this.spamWindow);
    
    // 5. Add the current command timestamp to the history
    this.msgHistory[user].push(now);

    // 6. If they exceed the limit, trigger the 10-second lockout
    if (this.msgHistory[user].length >= this.spamLimit) {
        this.cooldowns[user] = now + this.lockoutDuration; 
        this.send(`🚫 ${user}, stop spamming! You are locked out of commands for 10 seconds.`);
        return true;
    }
    
    return false;
}
    async sendLongMessage(text) {
    const limit = 1000;
    if (text.length <= limit) {
        this.send(text);
        return;
    }

    // Split text into chunks of 1000 chars
    const chunks = text.match(new RegExp(`.{1,${limit}}`, 'gs')) || [];

    for (const chunk of chunks) {
        this.send(chunk);
        // Wait 500ms before sending the next chunk
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
   async executeCommand(cmd, args, user) {
       const isAuthorized = 
    user.toLowerCase() === this.owner.toLowerCase() || 
    this.admins.includes(user.toLowerCase());


        switch (cmd) {
            case "help":
    const helpMsg = [
        "🎰 **Gambling:** slots, roulette, crash, blackjack, coin, dice, roll",
        "🔮 **Fun:** 8ball, rate, ship, choose, reverse, echo, penguinpowers, blob_raccoon",
        "🛠️ **Utils:** stats, trians, ping, uptime, math, time, credits",
        "📦 **Auto-Open:** open [pack], stopopen",
        "👑 **Admin:** addadmin, removeadmin, mute, unmute, spam, stopspam, make, credits, poll"
    ].join(" | ");

    this.send(helpMsg);
    break;

            case "slots":
                const icons = ["🍒", "💎", "🍋", "🔔", "7️⃣"];
                const r1 = icons[Math.floor(Math.random() * icons.length)];
                const r2 = icons[Math.floor(Math.random() * icons.length)];
                const r3 = icons[Math.floor(Math.random() * icons.length)];
                const isWin = (r1 === r2 && r2 === r3);
                this.send(`🎰 [ ${r1} | ${r2} | ${r3} ] ${isWin ? "💰 BIG WIN!" : "❌ Try again"}`);
                break;
                case "make":
    if (!isAuthorized) return this.send("❌ Only authorized users can generate accounts.");

    const uPrefix = args[0];
    const amount = parseInt(args[1]);

    if (!uPrefix || isNaN(amount)) {
        return this.send("❓ Usage: !make [prefix] [amount]");
    }

    if (amount > 100) return this.send("❌ Limit: Max 100 accounts per command.");

    this.send(`Generating ${amount} accounts with prefix "${uPrefix}"...`);

    let accountList = [];
    for (let i = 1; i <= amount; i++) {
        const generatedUser = `${uPrefix}_${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedPass = Math.random().toString(36).slice(-10);

        try {
            const res = await fetch(`${this.dataBase}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: generatedUser, password: generatedPass })
            });

            if (res.ok) {
                accountList.push(`${generatedUser}:${generatedPass}`);
            }
        } catch (e) {
            console.error(`Error creating account ${i}`);
        }
    }

    if (accountList.length === 0) {
        this.send("❌ Error: API rejected account creation.");
    } else {
        const fullText = `✅ Accounts Created (User:Pass):\n${accountList.join("\n")}`;
        // 2. Uses the 1000-char chunking helper
        await this.sendLongMessage(fullText);
    }
    break;

                case "credits":
                this.send('Owner/creator: Blob_Raccoon (I also made a bunch of chat spams and bypass) | admins: "Mathboy2Alt", "phoenixthedemon", "monkeys" | og admin: "Mathboy2Alt"');
                break;
                 case "penguinpowers":
                this.send('penguin powers is a little rusty at coding');
                break;
                case "blob_raccoon":
                this.send('"penguin powers is a little rusty at coding" blob raccoon is the maker of blob bot (yes i am writing this rn)');
                break;
                case "spam":
            if (!isAuthorized) return this.send("❌ Access Denied.");
            if (this.spamInterval) return this.send("⚠️ Spam is already running!");

            const spamMessage = args.join(" ");
            if (!spamMessage) return this.send("❓ Usage: !spam {message}");

            this.send(`🚀 Initializing 40 accounts... please wait.`);

            for (let i = 0; i < 40; i++) {
                const tempUser = "Blob_" + Math.random().toString(36).slice(2, 7);
                try {
                    const res = await fetch(`${this.dataBase}/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: tempUser, password: "password123" })
                    });
                    const data = await res.json();
                    const token = data.token || data.tokenraw;

                    if (token) {
                        const bot = new TrianguletBot(token, tempUser);
                        this.minions.push(bot);
                    }
                } catch (e) { console.error("Minion failed to register"); }
            }

            setTimeout(() => {
                this.send(`🔥 All accounts active. Spamming: "${spamMessage}"`);
                this.spamInterval = setInterval(() => {
                    this.minions.forEach(bot => {
                        if (bot.socket?.readyState === WebSocket.OPEN) {
                            bot.send(spamMessage);
                        }
                    });
                    // Also make the main bot spam
                    this.send(spamMessage);
                }, 300);
            }, 3000);
            break;

        case "stopspam":
            if (!isAuthorized) return this.send("❌ Access Denied.");
            if (this.spamInterval) {
                clearInterval(this.spamInterval);
                this.spamInterval = null;

                this.minions.forEach(bot => {
                    if (bot.socket) bot.socket.terminate();
                });
                this.minions = []; 
                
                this.send("🛑 Spam stopped. All minion accounts disconnected.");
            } else {
                this.send("❓ No spam is currently running.");
            }
            break;

case "mute":
                if (!isAuthorized) return this.send("❌ Only authorized users can use this.");
    const targetMute = args[0]?.replace("@", ""); // Remove @ if they tagged someone
    if (!targetMute) return this.send("❓ Usage: !mute username");
    
    this.manualMutes.add(targetMute);
    this.send(`🚫 ${targetMute} has been muted from using commands.`);
    break;
                case "poll":
    if (!isAuthorized) return this.send("❌ Access Denied.");
    if (this.activePoll) return this.send("⚠️ A poll is already running!");

    const timerSeconds = parseInt(args[0]);
    const question = args.slice(1).join(" ");

    if (isNaN(timerSeconds) || !question) {
        return this.send("❓ Usage: !poll [seconds] [question]");
    }

    this.activePoll = {
        question: question,
        yes: 0,
        no: 0,
        voters: new Set() 
    };

    this.send(`📊 𝗡𝗘𝗪 𝗣𝗢𝗟𝗟: ${question} 𝗨𝗦𝗘 !pollyes 𝗢𝗥 !pollno 𝗧𝗢 𝗩𝗢𝗧𝗘`);
    setTimeout(() => {
    this.send(`📝 Vote with **!pollyes** or **!pollno**! Time: ${timerSeconds}s`);
}, 1000);

    setTimeout(() => {
        if (!this.activePoll) return;
        
        const { yes, no, question } = this.activePoll;
        let winner = "It's a Tie! 👔";
        if (yes > no) winner = "YES wins! ✅";
        if (no > yes) winner = "NO wins! ❌";

        this.send(`⌛ **POLL ENDED:** ${question}`);
        setTimeout(() => {
                this.send(winner)
}, 1000);
        this.activePoll = null;
    }, timerSeconds * 1000);
    break;

case "pollyes":
    if (!this.activePoll) return; 
    if (this.activePoll.voters.has(user)) return; 

    this.activePoll.yes++;
    this.activePoll.voters.add(user);
    this.send(`${user} voted YES!`); 
    break;

case "pollno":
    if (!this.activePoll) return;
    if (this.activePoll.voters.has(user)) return;

    this.activePoll.no++;
    this.activePoll.voters.add(user);
     this.send(`${user} voted NO!`);
    break;

case "unmute":
                if (!isAuthorized) return this.send("❌ Only authorized users can use this.");
    const targetUnmute = args[0]?.replace("@", "");
    if (!targetUnmute) return this.send("❓ Usage: !unmute username");

    if (this.manualMutes.delete(targetUnmute)) {
        this.send(`✅ ${targetUnmute} can now use commands again.`);
    } else {
        this.send(`❓ ${targetUnmute} wasn't muted.`);
    }
    break;
            case "roulette":
                const land = Math.floor(Math.random() * 37);
                const color = (land === 0) ? "🟢" : (land % 2 === 0 ? "🔴" : "⚫");
                const guess = args[0]?.toLowerCase();
                let resMsg = `🎰 Landed on: ${color} ${land}.`;
                if ((guess === "red" && color === "🔴") || (guess === "black" && color === "⚫")) resMsg += " ✅ Win!";
                else if (guess) resMsg += " ❌ Loss.";
                this.send(resMsg);
                break;

            case "crash":
                const mult = (Math.random() * (Math.random() > 0.8 ? 10 : 2)).toFixed(2);
                this.send(`🚀 Crash: The rocket flew to **${mult}x** before exploding! 💥`);
                break;

            case "blackjack":
                const pHand = Math.floor(Math.random() * 10) + 12; 
                const dHand = Math.floor(Math.random() * 10) + 12; 
                if (pHand > 21) this.send(`🃏 Your Hand: ${pHand} (BUST) | Dealer: ${dHand}. ❌`);
                else if (dHand > 21 || pHand > dHand) this.send(`🃏 Your Hand: ${pHand} | Dealer: ${dHand}. ✅ WIN!`);
                else if (pHand === dHand) this.send(`🃏 Hand: ${pHand} | Dealer: ${dHand}. 👔 PUSH`);
                else this.send(`🃏 Your Hand: ${pHand} | Dealer: ${dHand}. ❌ LOSE`);
                break;

            case "roll":
            case "dice":
                this.send(`🎲 Dice: ${Math.floor(Math.random() * 6) + 1}`);
                break;

            case "coin":
            case "flip":
                this.send(`🪙 Coin: **${Math.random() > 0.5 ? "HEADS" : "TAILS"}**`);
                break;

            case "8ball":
        const aquestion = args.join(" ").toLowerCase();
        const ownerName = "owner"; 
        const targets = [ownerName, "blob_raccoon", "raccoon", "blob raccoon", "Owner", "Blob", "blob"];
        const negativeWords = ["bad", "suck", "hate", "ugly", "dumb", "stupid", "worst", "terrible", "trash", "fat", "gay", "stinky"];

        const isTargeted = targets.some(t => aquestion.includes(t));
        const isNegative = negativeWords.some(n => aquestion.includes(n));

        if (isTargeted || isNegative) {
            this.send(`🔮 I can't answer that.`);
        } else {
            const ballRes = [
                "Yes.", "No.", "Maybe.", "Ask again later.", "Definitely.", 
                "My sources say no.", "Outlook good.", "Very doubtful.", 
                "Most likely.", "Concentrate and ask again."
            ];
            this.send(`🔮 ${ballRes[Math.floor(Math.random() * ballRes.length)]}`);
        }
        break;
            case "rate":
    const item = args.join(" ") || "you";
    const itemLow = item.toLowerCase();
    
    const specialNames = ["me", "creator", "blob_raccoon", "blob", "owner", "admin", "monkeys", "phoenixthedemon", "mathboy2alt"];

    if (specialNames.includes(itemLow)) {
        this.send(`⭐ I rate **${item}** a 10/10!`);
    } else {
        const randomRating = Math.floor(Math.random() * 11);
        this.send(`⭐ I rate **${item}** a ${randomRating}/10!`);
    }
    break;

            case "ship":
                if (args.length < 2) return this.send("❌ Usage: !ship @user1 @user2");
                this.send(`❤️ **${args[0]}** + **${args[1]}** = ${Math.floor(Math.random() * 101)}% match!`);
                break;

            case "choose":
                const opts = args.join(" ").split(",");
                if (opts.length < 2) return this.send("❌ Use commas: !choose red, blue");
                this.send(`🤔 Choice: **${opts[Math.floor(Math.random() * opts.length)].trim()}**`);
                break;
            case "open":
    if (!isAuthorized) return this.send("❌ Access Denied.");
    if (this.openInterval) return this.send("⚠️ Already opening!");

    const packName = args.join(" ");
    if (!packName) return this.send("❓ Usage: !open [pack name]");

    this.send(`📦 Auto-open started for ${packName}.`);

    this.openInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://tri.pengpowers.xyz/api/open`, {
                method: 'POST',
                headers: {
                    "authorization": this.token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ capsule: packName })
            });
            const r = await res.json();

            if (!r || !r.trian) return;

            if (r.rarity === 'Mystical') {
                this.send(`🔮 MYSTICAL FOUND: ${r.trian}. Stopping.`);
                clearInterval(this.openInterval);
                this.openInterval = null;
            }

        } catch (e) {
        }
    }, 20); 
    break;

case "stopopen":
    if (!isAuthorized) return this.send("❌ Access Denied.");
    if (this.openInterval) {
        clearInterval(this.openInterval);
        this.openInterval = null;
        this.send("🛑 Auto-open stopped.");
    } else {
        this.send("❓ Not currently opening.");
    }
    break;
            case "ping":
                this.send(`🏓 Pong! | Bot: ${this.username}`);
                break;

            case "math":
                try {
                    const res = eval(args.join("").replace(/[^0-9+\-*/().]/g, ''));
                    this.send(`🧮 Result: ${res}`);
                } catch { this.send("❌ Math error."); }
                break;

           case "stats": 
    try {
        const targetUser = args[0]?.replace("@", "");
        if (!targetUser) return this.send("❓ Usage: !stats username");

        const res = await fetch(`https://tri.pengpowers.xyz/api/finduser`, {
            method: "POST",
            headers: { 
                "authorization": this.token,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ username: targetUser }) 
        });

        const d = await res.json();

        if (d.error || !d.username) {
            return this.send("❌ User not found.");
        }

        this.send(`👤 ${d.username} | 💰 Tokens: ${d.tokens.toLocaleString()} | Rank: #${d.role} | Id : #${d.id}`);
    } catch (e) { 
        this.send("❌ Data error."); 
        console.error(e);
    }
    break;   
          case "trians":
    try {
        const targetUser = args[0]?.replace("@", "") || this.username;

        const res = await fetch(`https://tri.pengpowers.xyz/api/finduser`, {
            method: "POST",
            headers: { 
                "authorization": this.token,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ username: targetUser })
        });

        const d = await res.json();

        if (d.error || !d.username) {
            return this.send("❌ User not found.");
        }

        let inventoryText = "";
        if (d.trians && Array.isArray(d.trians)) {
            const counts = {};
            
            d.trians.forEach(trian => {
                const name = trian.name || trian.trian || "Unknown";
                counts[name] = (counts[name] || 0) + 1;
            });
            
            inventoryText = Object.entries(counts)
                .map(([name, count]) => `${name}${count > 1 ? ` (x${count})` : ""}`)
                .join(", ");
        } else {
            inventoryText = "Empty";
        }

        const header = `👤 ${d.username} | 💰 ${d.tokens?.toLocaleString() || 0} | 🎖️ Role: ${d.role || "User"}`;
        const body = `📂 Inventory: ${inventoryText}`;
        
        await this.sendLongMessage(`${header}\n${body}`);

    } catch (e) { 
        this.send("❌ Data error."); 
        console.error("Trians Error:", e);
    }
    break;
            case "uptime":
                this.send(`⏱️ Online: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
                break;

            case "time":
                this.send(`🕒 Time: ${new Date().toLocaleTimeString()}`);
                break;

            case "reverse":
                this.send(`🔁 ${args.join(" ").split("").reverse().join("")}`);
                break;

            case "echo":
                this.send(`📢 ${args.join(" ")}`);
                break;
            case "addadmin":
    const sender = user.toLowerCase();
    if (sender !== "blob_raccoon" && sender !== "mathboy2alt") {
        return this.send("❌ Only the Bot Owners can promote admins.");
    }

    const newAdmin = args[0]?.replace("@", "").toLowerCase();
    if (!newAdmin) return this.send("❓ Usage: !addadmin [username]");

    if (this.admins.includes(newAdmin)) {
        return this.send(`⚠️ ${newAdmin} is already an admin.`);
    }

    this.admins.push(newAdmin);
    this.send(`👑 ${newAdmin} has been promoted to Admin!`);
    break;

case "removeadmin":
    if (user.toLowerCase() !== "blob_raccoon" && user.toLowerCase() !== "mathboy2alt") {
        return this.send("❌ Access Denied.");
    }

    const target = args[0]?.replace("@", "").toLowerCase();
    if (this.admins.includes(target)) {
        this.admins = this.admins.filter(a => a !== target);
        this.send(`🗑️ ${target} has been removed from admins.`);
    } else {
        this.send("❓ That user isn't an admin.");
    }
    break;

            default:
                if (cmd) this.send(`❓ Unknown command: "${cmd}". Try !help`);
                break;
        }
    }

    send(msg) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(`42${JSON.stringify(["chat", String(msg)])}`);
        }
    }
}

(async () => {
    const bot = new CommandBot();
    await bot.register();
    bot.connect();
})();
