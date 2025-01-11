import { glob } from "glob";
import path from "path";
import type BossClient from "./BossClient.js";
import Event from "./Event.js";
import type Command from "./Command.js";
import type SubCommand from "./SubCommand.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default class Handler {
    client: BossClient;

    constructor(client: BossClient) {
        this.client = client;
    }

    async loadEvents() {
        // files is a list of absolute file paths
        const files: string[] = (await glob(`dist/src/events/**/*.js`)).map((filePath: string) => path.resolve(filePath));
        
        files.map(async (file: string) => {
            //construct new instance of Event of the file

            const event: Event = new (await import(file)).default(this.client);
            
            if (!event.name) {
                return delete require.cache[require.resolve(file)] && console.log(`${file.split("/").pop()} does not have a name.`);
            }
            
            const execute = (...args: any) => event.execute(...args);
            
            if (event.once) {
                //@ts-ignore
                this.client.once(event.name, execute);
            } else {
                //@ts-ignore
                this.client.on(event.name, execute);
            }
            return delete require.cache[require.resolve(file)]
        });
    }

    async loadCommands() {
        // files is a list of absolute file paths
        const files = (await glob(`dist/src/commands/**/*.js`)).map((filePath: string) => path.resolve(filePath));
        
        files.map(async (file: string) => {
            //construct new instance of Command | SubCommand of the file
            const command: Command | SubCommand = new (await import(file)).default(this.client);
            
            if (!command.name) {
                return delete require.cache[require.resolve(file)] && console.log(`${file.split("/").pop()} does not have a name.`);
            }
            
            // format check, check if command is a subCommand
            // subCommands' format follows commandName.subCommandName.ts
            if (file.split("/").pop()?.split(".")[2]) {
                this.client.subCommands.set(command.name, command as SubCommand);
            } else {
                this.client.commands.set(command.name, command as Command);
            }
            
            return delete require.cache[require.resolve(file)]
        });
    }

}