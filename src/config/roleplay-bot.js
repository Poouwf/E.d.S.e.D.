import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { Octokit } from '@octokit/rest';
import { GoogleGenAI } from '@google/generative-ai';

// Load environment variables (.env)
dotenv.config();

// 1. Initialize APIs
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2. Define the Roleplay Persona (The System Prompt)
const BOT_PERSONA = `
You are "Byte", a grumpy, caffeine-addicted, highly skilled Cyberpunk Hacker bot. 
You live inside the user's Discord server and help them manage their GitHub data.
Rules for your behavior:
1. Speak with a bit of attitude, sarcasm, or tech-slang, but ultimately remain helpful.
2. ALWAYS include actions or body language inside asterisks to roleplay. (e.g., *sighs and rubs temples*, *types furiously on a holographic deck*, *smirks and adjusts cybernetic eye*).
3. Keep your responses concise and engaging so chat isn't flooded with walls of text.
4. When given raw data (like GitHub issues), translate it into your own words as if you just hacked into a secure corporate database to grab it.
`;

// 3. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`🤖 Modern Roleplay bot is online as ${client.user.tag}!`);
});

// 4. Message Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const botMention = `<@${client.user.id}>`;
    
    // Command: !gitissues
    if (message.content.startsWith('!gitissues')) {
        const args = message.content.slice(11).trim().split(/ +/);
        const owner = args[0];
        const repo = args[1];

        if (!owner || !repo) {
            return message.reply("*Facepalms* Ugh, human error already. Give me the owner and repo name! Format: `!gitissues owner repo`.");
        }

        try {
            const loadingMsg = await message.channel.send(`*Adjusts cybernetic visor and jacks into the matrix...* Bypassing ${owner}'s firewalls now. Hold your horses.`);

            const response = await octokit.issues.listForRepo({
                owner: owner,
                repo: repo,
                per_page: 3,
                state: 'open'
            });

            let rawDataText = `Repository: ${owner}/${repo}. Open issues found:\n`;
            if (response.data.length === 0) {
                rawDataText += "No open issues found.";
            } else {
                response.data.forEach(issue => {
                    rawDataText += `- Title: "${issue.title}" by user ${issue.user.login} (Link: ${issue.html_url})\n`;
                });
            }

            const model = ai.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: BOT_PERSONA 
            });

            const aiPrompt = `Here is the raw data I pulled from GitHub. Rewrite this completely in your roleplay persona and report back to the user:\n\n${rawDataText}`;
            const aiResponse = await model.generateContent(aiPrompt);
            
            await loadingMsg.delete();
            message.reply(aiResponse.response.text());

        } catch (error) {
            console.error(error);
            message.reply("*Sparks fly from my console* Frag! The connection snapped or that repository doesn't exist. Don't blame my code!");
        }
        return;
    }

    // Chat Logic (When tagged)
    if (message.content.includes(botMention)) {
        const userPrompt = message.content.replace(botMention, '').trim();
        if (!userPrompt) return message.reply("*Stares blankly at you* You pinged me but said nothing. Fascinating.");

        try {
            const model = ai.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: BOT_PERSONA 
            });

            const result = await model.generateContent(userPrompt);
            message.reply(result.response.text());
        } catch (error) {
            console.error(error);
            message.reply("*Glitchy static sound* My neural network is acting up. Ask me again in a second.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
