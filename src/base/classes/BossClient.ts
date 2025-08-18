import { Client, Collection, GatewayIntentBits } from "discord.js";
import type IConfig from "../interfaces/IConfig.js";
import Command from "./Command.js";
import SubCommand from "./SubCommand.js";
import Handler from "./Handler.js";
import { createRequire } from "node:module";
import path from "node:path";
import { brevoInit } from "../utility/BrevoClient.js";
import { sqliteDBInit } from "../db/sqliteDB.js";
import { axiosInit } from "../utility/Axios.js";
import type ButtonManager from "./ButtonManager.js";
const require = createRequire(import.meta.url);


export default class BossClient extends Client {
    config: IConfig;
    handler: Handler;
    commands: Collection<string, Command>;
    subCommands: Collection<string, SubCommand>;
    coolDowns: Collection<string, Collection<string, number>>;
    buttonManagers: Collection<string, ButtonManager>;

    constructor() {
        super({ intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
        ] });

        this.config = require(path.resolve("./config.json"));
        this.handler = new Handler(this);
        this.commands = new Collection();
        this.subCommands = new Collection();
        this.coolDowns = new Collection();
        this.buttonManagers = new Collection();
    }

    async init() {
        sqliteDBInit();
        brevoInit(this.config);
        await axiosInit();
        this.loadHandler();
        //TODO: change the log dest 
        this.login(this.config.discord.token)
            .catch((err) => console.log(err));
    }

    loadHandler(): void {
        this.handler.loadEvents();
        this.handler.loadCommands();
        this.handler.loadButtonManagers();
    }

}