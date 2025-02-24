import path from "node:path";
import fs from "node:fs";
import type Command from "../base/classes/Command.js";
import type SubCommand from "../base/classes/SubCommand.js";
import BossClient from "../base/classes/BossClient.js";
import { REST, Routes } from "discord.js";
import { fileURLToPath } from 'url';


const dirname = path.dirname(fileURLToPath(import.meta.url));
let foldersPath: string = "/";
for (let segment of dirname.split(path.sep)) {
    if (segment == path.basename(dirname)) {
        foldersPath = path.join(foldersPath, "commands");
        break;
    }
    foldersPath = path.join(foldersPath, segment);
}

const commandFolders = fs.readdirSync(foldersPath);


const dummyClient: BossClient = new BossClient()
const { token, clientId, guildId } = dummyClient.config.discord;

const commands: object[] = [];
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: Command | SubCommand = new (await import(filePath)).default(dummyClient);

    if (!command.name) {
      console.log(`${file.split("/").pop()} does not have a name.`);   
      continue;
    }
    
    // filters out all the subCommands
    if (!(file.split("/").pop()?.split(".")[2])) {
      commands.push(getJson(command as Command));
    }
  }
}

const rest: REST = new REST().setToken(token);
const setCommands: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands
});

console.log(`Successfully set ${setCommands.length} commands`);


function getJson(command: Command): object {
  return {
    name: command.name,
    description: command.description,
    options: command.options,
    default_member_permissions: command.defaultMemberPerm.toString(),
    dm_permission: command.dmPerm,
  };
}