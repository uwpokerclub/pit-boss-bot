import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";

import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";

export default class Ping extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "ping",
            description: "Replies with pong!",
            category: Category.Utility,
            syntax: "/help",
            helpDescription: "",
            defaultMemberPerm: PermissionFlagsBits.UseApplicationCommands,
            dmPerm: false,
            coolDown: 3,
            options: []
        })
    }

    override execute(interaction: ChatInputCommandInteraction): void {
        interaction.reply({ content: "Pong!"})
    }
}