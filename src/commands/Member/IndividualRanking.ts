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
            global: false,
            options: [],
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

        const currentSemesterName = currentSemesterConfigRes.dataValues.current_semester_name;
        const position: string = rankingRes.data.position;
        const points: string = rankingRes.data.points;
        let color: ColorResolvable;
        if (parseInt(position) <= 100) {
            color = [10, 149, 72];
        } else if (parseInt(position) <= 120) {
            color = [229,162,103];
        } else {
            color = [163, 0, 0];
        }

        const avatarUrl: string = interaction.user.displayAvatarURL();
        const memberProfileEmbed = new EmbedBuilder()
            .setTitle(`${currentSemesterName} Performance`)
            .setAuthor({ name: `${interaction.user.displayName}`, iconURL: `${avatarUrl}`})
            .setColor(color)
            .setThumbnail(this.client.config.misc.logoUrl)
            .addFields(
                { name: "Position", value: `${position}`, inline: true },
                { name: "Points", value: `${points}`, inline: true },
            );

        interaction.reply({ embeds: [memberProfileEmbed], flags: MessageFlags.Ephemeral });
    }
}