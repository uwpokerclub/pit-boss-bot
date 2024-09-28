import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";

import config from "../config.json" assert { type: "json" };

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize the commands collection
client.commands = new Collection();

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Client is ready! Logged in as ${readyClient.user.tag}`);
});

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

client.on(Events.InteractionCreate, async (interaction) => {
  // If the interaction is not a slash command, ignore it
  if (!interaction.isChatInputCommand()) return;

  // Find the command
  const command = interaction.client.commands.get(interaction.commandName);

  // If no command is found, log an error
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command.",
        ephemeral: true,
      });
    }
  }
});

client.login(config.token);
