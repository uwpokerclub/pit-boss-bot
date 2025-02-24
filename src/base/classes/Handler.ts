import path from "path";
import fs from "node:fs";
import type BossClient from "./BossClient.js";
import Event from "./Event.js";
import type Command from "./Command.js";
import type SubCommand from "./SubCommand.js";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);

export default class Handler {
    client: BossClient;

    constructor(client: BossClient) {
        this.client = client;
    }

    async loadEvents() {
        const dirname = path.dirname(fileURLToPath(import.meta.url));
        let foldersPath: string = "/";
        for (let segment of dirname.split(path.sep)) {
            if (segment == "base") {
                foldersPath = path.join(foldersPath, "events");
                break;
            }
            foldersPath = path.join(foldersPath, segment);
        }


        // files is a list of absolute file paths
        const files: string[] = this.getFiles(foldersPath);
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
        const dirname = path.dirname(fileURLToPath(import.meta.url));
        let foldersPath: string = "/";
        for (let segment of dirname.split(path.sep)) {
            if (segment == "base") {
                foldersPath = path.join(foldersPath, "commands");
                break;
            }
            foldersPath = path.join(foldersPath, segment);
        }


        // files is a list of absolute file paths
        const files: string[] = this.getFiles(foldersPath);
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


    //baseDirName must the name of a sub dir under src
    private getFiles(directory: string): string[] {
        const files: string[] = [];
        
        fs.readdirSync(directory).forEach(file => {
            const absolute = path.join(directory, file);
            if (fs.statSync(absolute).isDirectory()) {
                this.getFiles(absolute).forEach(subFile => {
                    files.push(subFile);
                });
                return;
            }
            else if (file.endsWith(".js")) {
                files.push(absolute);
                return;
            }
        });
        return files;
    }

}