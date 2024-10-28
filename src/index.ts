import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "../config.json" assert { type: "json" };

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize the commands collection
client.commands = new Collection();

// Load all commands from the commands folder into the commands collection
const dirname = path.dirname(fileURLToPath(import.meta.url));
const foldersPath = path.join(dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath)
    client.commands.set(command.default.data.name, command.default);
  }
}

// Load all events from the events folder and register them with the client
const eventsPath = path.join(dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = await import(filePath);
	if (event.once) {
		client.once(event.default.name, (...args) => event.default.execute(...args));
	} else {
		client.on(event.default.name, (...args) => event.default.execute(...args));
	}
}

client.login(config.token);
