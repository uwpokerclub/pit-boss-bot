import { ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, PermissionFlagsBits, Role } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { ClientEmail } from "../../base/db/models/ClientEmail.js";
import { ClientCode } from "../../base/db/models/ClientCode.js";


export default class UserLogout extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "logout",
            description: "Logs user out, removes user's access to other bot commands",
            category: Category.Authentication,
            syntax: "/logout",
            helpDescription: "unlink your discord account to the current email address, removes your access to ranking commands",
            defaultMemberPerm: PermissionFlagsBits.UseApplicationCommands,
            dmPerm: false,
            coolDown: 3,
            options: []
        });
    }

    override async execute(interaction: ChatInputCommandInteraction) {
        const { verifiedRoleId } = this.client.config.discord;
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(verifiedRoleId))!;
        if (!verifiedRole.members.has(interaction.user.id)) {
            interaction.reply({ content: "Unable to log you out since you are not logged in right now.", ephemeral: true });
            return;
        }



        interaction.reply({ content: `Log out successful. You account is now unlinked your registered email.`, ephemeral: true })
        await ClientEmail.destroy({ where: {discord_client_id: interaction.user.id}});
        await ClientCode.destroy({ where: {discord_client_id: interaction.user.id}});
        
        
        const member: GuildMember = (await interaction.guild?.members.fetch(interaction.user.id))!;
        (member.roles as GuildMemberRoleManager).remove(verifiedRole);
    }

}