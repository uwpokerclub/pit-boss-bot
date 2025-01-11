import { REST, Routes } from "discord.js";
import config from "../../config.json" with { type: "json" };
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

// Array to hold all slash command data
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

// Get path to the commands folder
const dirname = path.dirname(fileURLToPath(import.meta.url));
const foldersPath = path.join(dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

// Load command data into commands array
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    commands.push(command.default.data.toJSON());
  }
}
const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${(data as Record<string, unknown>[]).length} application commands.`
    );
  } catch (err) {
    console.error(err);
  }
})();
