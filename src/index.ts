import { Client, Events, GatewayIntentBits } from "discord.js";
import config from "../config.json" assert { type: "json" };

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Client is ready! Logged in as ${readyClient.user.tag}`);
});

client.login(config.token);

