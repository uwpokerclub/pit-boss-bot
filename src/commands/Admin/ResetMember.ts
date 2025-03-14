import { ApplicationCommandOptionType, ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, MessageFlags, PermissionFlagsBits, Role } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { VerificationAttempts } from "../../base/db/models/VerificationAttempts.js";
import { Members } from "../../base/db/models/Members.js";
import { VerificationCodes } from "../../base/db/models/VerificationCodes.js";

export default class ResetMember extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "reset_member",
            description: "Reset the member's account information, including their remaining failed verification count.",
            category: Category.Admin,
            syntax: "/reset_member @member (hard)",
            helpDescription: "Reset the member's remaining failed verification count. If the optional parameter hard is True, all of member's data will be destroyed and the member will be un-verified.",
            defaultMemberPerm: PermissionFlagsBits.Administrator,
            dmPerm: false,
            coolDown: 3,
            options: [
                {
                    name: "target_user",
                    description: "The user to be reset",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "hard",
                    description: "Hard reset target user. Cleans all data and un-verify",
                    type: ApplicationCommandOptionType.Boolean,
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

        const hardResetParam = interaction.options.get("hard");
        if (hardResetParam && hardResetParam.value) {
            await Members.destroy({where: {discord_client_id: targetUserId}});
            await VerificationCodes.destroy({where: {discord_client_id: targetUserId}});
            const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.client.config.discord.verifiedRoleId))!;
            const member: GuildMember = (await interaction.guild?.members.fetch(interaction.user.id))!;
            (member.roles as GuildMemberRoleManager).remove(verifiedRole);
        }

        interaction.reply({ content: `${targetUserParam.user?.username}'s account has been ${hardResetParam && hardResetParam.value ? "HARD " : "" }reset.`, flags: MessageFlags.Ephemeral });
    }

}