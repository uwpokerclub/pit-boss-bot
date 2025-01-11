import type { ChatInputCommandInteraction } from "discord.js";
import type BossClient from "../classes/BossClient.js";
import type ISubCommandOptions from "../interfaces/ISubCommandOptions.js";

export default class SubCommand {
    client: BossClient;
    name: string;

    constructor(client: BossClient, options: ISubCommandOptions) {
        this.client = client;
        this.name = options.name;
    }
    
    execute(interaction: ChatInputCommandInteraction): void {
        // each individual subCommand should override this function with their own execute function
        // this is only triggered if the subCommand being called didn't override this function
        interaction.reply({ content: "Functionality not implemented", ephemeral: true });
    }

}