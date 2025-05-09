import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";

import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";

export default class Ping extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "ping",
            description: "Replies with pong!",
            category: Category.Admin,
            syntax: "/ping",
            helpDescription: "Test the bot's responsiveness.",
            defaultMemberPerm: PermissionFlagsBits.ModerateMembers,
            dmPerm: false,
            coolDown: 3,
            global: false,
            options: [],
        })
    }

    override execute(interaction: ChatInputCommandInteraction): void {
        interaction.reply({ content: "Pong!"})
    }
}