import { glob } from "glob";
import path from "path";
import type Command from "../base/classes/Command.js";
import type SubCommand from "../base/classes/SubCommand.js";
import BossClient from "../base/classes/BossClient.js";
import { REST, Routes } from "discord.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);


function getJson(command: Command): object {
  return {
    name: command.name,
    description: command.description,
    options: command.options,
    default_member_permissions: command.defaultMemberPerm.toString(),
    dm_permission: command.dmPerm,
  };
}


// FIX: instantiating a client here is probably inefficient
const dummyClient: BossClient = new BossClient();
const commands: object[] = [];
const files = (await glob(`dist/src/commands/**/*.js`)).map((filePath: string) => path.resolve(filePath));

await Promise.all(files.map(async (file: string) => {
  //construct new instance of Command | SubCommand of the file
    const command: Command | SubCommand = new (await import(file)).default(dummyClient);
    
    if (!command.name) {
        return delete require.cache[require.resolve(file)] && console.log(`${file.split("/").pop()} does not have a name.`);
    }
    
    // filters out all the subCommands
    if (!(file.split("/").pop()?.split(".")[2])) {
      commands.push(getJson(command as Command));
    }
    
    return delete require.cache[require.resolve(file)];
  }
));


const rest: REST = new REST().setToken(dummyClient.config.token);
const setCommands: any = await rest.put(Routes.applicationGuildCommands(dummyClient.config.clientId, dummyClient.config.guildId), {
  body: commands
});

console.log(`Successfully set ${setCommands.length} commands`);