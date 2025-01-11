import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";

export default class Test extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "test",
            description: "Tests bot's responsiveness",
            category: Category.Utility,
            helpDescription: "",
            defaultMemberPerm: PermissionFlagsBits.UseApplicationCommands,
            dmPerm: false,
            coolDown: 3,
            options: []
        })
    }

    override execute(interaction: ChatInputCommandInteraction): void {
        interaction.reply({ content: "Help! This lunatic is holding me hostage!!", ephemeral: false })
    }
}