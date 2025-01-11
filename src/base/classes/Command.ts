import type { ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import type Category from "../enums/Category.js";
import type BossClient from "./BossClient.js";
import type ICommandOptions from "../interfaces/ICommandOptions.js"

export default class Command {
    client: BossClient;
    name: string;
    description: string;
    category: Category;
    helpDescription: string;
    options: object;
    defaultMemberPerm: bigint;
    dmPerm: boolean;
    coolDown: number;

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
    }

    execute(interaction: ChatInputCommandInteraction): void {
        // each individual command should override this function with their own execute function
        // this only triggers if the command being called didn't override this function
        interaction.reply({ content: "Functionality not implemented", ephemeral: true });
    }
    
    autoComplete(_interaction: AutocompleteInteraction): void {
        
    }

}