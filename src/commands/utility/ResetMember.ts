import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { VerificationAttempts } from "../../base/db/models/VerificationAttempts.js";

export default class ResetMember extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "reset_member",
            description: "Reset the member's account information, including their remaining failed verification count",
            category: Category.Utility,
            syntax: "/reset_member @member",
            helpDescription: "",
            defaultMemberPerm: PermissionFlagsBits.Administrator,
            dmPerm: false,
            coolDown: 3,
            options: [
                {
                    name: "target_user",
                    description: "The user to be reset",
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        });
    }

    override async execute(interaction: ChatInputCommandInteraction) {
        const targetUserParam = interaction.options.get("target_user");
        if (!targetUserParam) {
            interaction.reply({ content: "Invalid user provided", flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUserId: string  = targetUserParam.user!.id;
        await VerificationAttempts.destroy({where: {discord_client_id: targetUserId}});

        interaction.reply({ content: `${targetUserParam.user?.username}'s account has been reset`, flags: MessageFlags.Ephemeral });
    }

}