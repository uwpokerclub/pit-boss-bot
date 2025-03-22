import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, Role, type ColorResolvable } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { Members } from "../../base/db/models/Members.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";


export default class IndividualRanking extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "ranking",
            description: "Check your own ranking.",
            category: Category.Member,
            syntax: "/ranking",
            helpDescription: "Check your own ranking.",
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
            interaction.reply({ content: "You do not have access to this command. Please verify your Discord account first.", flags: MessageFlags.Ephemeral });
            return;
        }


        const currentSemesterConfigRes = (await Configs.findAll())[0];
        if (!currentSemesterConfigRes) {
            interaction.reply({ content: "Cannot perform this action at the moment, please try again later.", flags: MessageFlags.Ephemeral });
            return;
        }
        const currentSemesterId = currentSemesterConfigRes.dataValues.current_semester_id;

        const clientId = interaction.user.id;
        const memberRes = (await Members.findAll({ where: {discord_client_id: clientId} }))[0];
        if (!memberRes) {
            interaction.reply({ content: "Something went wrong. Please `/logout` and re-verify your account again, or contact an admin for help.", flags: MessageFlags.Ephemeral });
            return;
        }
        const membershipId = memberRes.dataValues.membership_id;
        if (!membershipId) {
            interaction.reply({ content: "You have not registered for the current semester. Use `/register` to register.", flags: MessageFlags.Ephemeral });
            return;
        }

        const recordedMembershipSemesterId : string = (await uwpscApiAxios.get(`/memberships/${membershipId}`)).data.semesterId;
        if (recordedMembershipSemesterId != currentSemesterId) {
            interaction.reply({ content: "You have not registered for the current semester. Use `/register` to register.", flags: MessageFlags.Ephemeral });
            return;
        }


        const rankingRes = (await uwpscApiAxios.get(`/semesters/${currentSemesterId}/rankings/${membershipId}`));
        if (rankingRes.status != 200) {
            // This would only run if the player registered for the current semester, but has yet to play an event
            interaction.reply({ content: "No records of your performance this term can be found.", flags: MessageFlags.Ephemeral });
            return;
        }

        const userRegisteredName: string = `${memberRes.dataValues.first_name} ${memberRes.dataValues.last_name}`;
        const userId: number = memberRes.dataValues.user_id;
        const position: string = rankingRes.data.position;
        const points: string = rankingRes.data.points;
        let qualificationStatus: string;
        let color: ColorResolvable;
        if (parseInt(position) <= 100) {
            qualificationStatus = "Qualified";
            color = [10, 149, 72];
        } else if (parseInt(position) <= 120) {
            qualificationStatus = "Waitlisted";
            color = [229,162,103];
        } else {
            qualificationStatus = "Not Qualified";
            color = [163, 0, 0];
        }

        const memberProfileEmbed = new EmbedBuilder()
            .setColor(color)
            .setThumbnail(this.client.config.misc.logoUrl)
            .addFields(
                { name: "Name", value: `${userRegisteredName}`, inline: true },
                { name: "ID", value: `${userId}`, inline: true },
                { name: "\u200b", value: "\u200b" },
                { name: "Position", value: `${position}`, inline: true },
                { name: "Points", value: `${points}`, inline: true },
                { name: "Final tournament status", value: `${qualificationStatus}`, inline: true },
            );

        interaction.reply({ embeds: [memberProfileEmbed], flags: MessageFlags.Ephemeral });
    }
}