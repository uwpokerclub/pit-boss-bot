import { Client, Collection } from "discord.js";
import type IConfig from "../interfaces/IConfig.js";
import Command from "./Command.js";
import SubCommand from "./SubCommand.js";
import Handler from "./Handler.js";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);

export default class BossClient extends Client {
    config: IConfig;
    handler: Handler;
    commands: Collection<string, Command>;
    subCommands: Collection<string, SubCommand>;
    coolDowns: Collection<string, Collection<string, number>>;

    constructor() {
        super({ intents: [] });

        this.config = require(path.resolve("./config.json"));
        this.handler = new Handler(this);
        this.commands = new Collection();
        this.subCommands = new Collection();
        this.coolDowns = new Collection();
    }

    init(): void {
        this.loadHandler();
        //TODO: change the log dest 
        this.login(this.config.token)
            .catch((err) => console.log(err));
    }

    loadHandler(): void {
        this.handler.loadEvents();
        this.handler.loadCommands();
    }

}