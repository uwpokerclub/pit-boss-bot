import type { ChatInputCommandInteraction } from "discord.js";
import type Category from "../enums/Category.js";
import type BossClient from "./BossClient.js";
import type ICommandOptions from "../interfaces/ICommandOptions.js"

export default abstract class Command {
    client: BossClient;
    name: string;
    description: string;
    category: Category;
    helpDescription: string;
    options: object;
    defaultMemberPerm: bigint;
    dmPerm: boolean;
    coolDown: number;
    global: boolean;

    constructor(client: BossClient, options: ICommandOptions) {
        this.client = client;
        this.name = options.name;
        this.description = options.description;
        this.category = options.category;
        this.helpDescription = options.helpDescription;
        this.options = options.options;
        this.defaultMemberPerm = options.defaultMemberPerm;
        this.dmPerm = options.dmPerm;
        this.coolDown = options.coolDown;
        this.global = options.global;
    }

    abstract execute(interaction: ChatInputCommandInteraction): void;
}