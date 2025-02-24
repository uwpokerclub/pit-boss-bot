import type { ChatInputCommandInteraction } from "discord.js";
import type BossClient from "../classes/BossClient.js";
import type ISubCommandOptions from "../interfaces/ISubCommandOptions.js";

export default abstract class SubCommand {
    client: BossClient;
    name: string;

    constructor(client: BossClient, options: ISubCommandOptions) {
        this.client = client;
        this.name = options.name;
    }
    
    abstract execute(interaction: ChatInputCommandInteraction): void;
}