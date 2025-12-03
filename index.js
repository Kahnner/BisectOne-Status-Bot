import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

async function getBisectInfo() {
  try {
    const res = await axios.get(
      `https://panel.bisecthosting.com/api/client/servers/${process.env.SERVER_ID}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.BISECT_API}`,
          "Accept": "application/json"
        }
      }
    );

    return res.data.data;
  } catch (err) {
    console.log("Bisect API error:", err.response?.data || err);
    return null;
  }
}

async function updateStatus() {
  const data = await getBisectInfo();
  if (!data) return;

  const status = data.status;
  const game = data.relationships?.game?.attributes?.name || "Unknown";
  const cpu = data.resources?.cpu_absolute || "N/A";
  const ram = data.resources?.memory_bytes
    ? (data.resources.memory_bytes / (1024*1024*1024)).toFixed(2) + " GB"
    : "N/A";
  const created = new Date(data.created_at);
  const uptime = Math.floor((Date.now() - created.getTime()) / 1000 / 60) + " mins";

  const embed = new EmbedBuilder()
    .setTitle("🖥️ Bisect Server Status")
    .setColor(status === "running" ? "Green" : "Red")
    .addFields(
      { name: "Status", value: status === "running" ? "🟢 Online" : "🔴 Offline" },
      { name: "Game", value: game },
      { name: "CPU Usage", value: cpu + "%" },
      { name: "RAM Usage", value: ram },
      { name: "Uptime", value: uptime },
      { name: "Server ID", value: process.env.SERVER_ID }
    )
    .setTimestamp();

  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  const msg = await channel.messages.fetch(process.env.MESSAGE_ID);

  await msg.edit({ embeds: [embed] });
}

client.once("ready", async () => {
  console.log("Bot is online!");

  cron.schedule("*/1 * * * *", updateStatus); // update every 1 minute
});

client.login(process.env.BOT_TOKEN);
