import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, MessageFlags, PermissionFlagsBits, Role } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";
import axios from "axios";


export default class Leaderboard extends Command {
    pageSizeDesktop: number = 20;
    pageSizeMobile: number = 10;
    constructor(client: BossClient) {
        super(client, {
            name: "leaderboard",
            description: "Check the top 100 leaderboard.",
            category: Category.Member,
            syntax: "/leaderboard",
            helpDescription: "Check the top 100 leaderboard.",
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
        const currentSemesterName = currentSemesterConfigRes.dataValues.current_semester_name;

        
        let rankingRes;
        try {
            rankingRes = (await uwpscApiAxios.get(`/semesters/${currentSemesterId}/rankings`));
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // log error.response.status, error.response.data
                } else if (error.request) {
                    // log error.request
                } else {
                    // log error.message
                }
            }
            interaction.reply({ content: "System error. Please try again later.", flags: MessageFlags.Ephemeral });
            return;
        }
        const leaderboardLength: number = Math.min(rankingRes.data.length, 100);

        let pageNumber: number = 1;
        let mobileMode: boolean = true;
        const rankingEmbed = this.getUpdatedRankingEmbed(rankingRes.data, pageNumber, currentSemesterName, leaderboardLength, mobileMode);
        const buttonRow = this.getUpdatedRankingButtonRow(interaction.id, pageNumber, leaderboardLength, mobileMode);

        const response = await interaction.reply({ components: [buttonRow], embeds: [rankingEmbed], flags: MessageFlags.Ephemeral });
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button });
        collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            if (buttonInteraction.customId == `PreviousPageButton-${interaction.id}`) {
                pageNumber--;
            } else if (buttonInteraction.customId == `NextPageButton-${interaction.id}`) {
                pageNumber++;
            } else if (buttonInteraction.customId == `ModeToggleButton-${interaction.id}`){
                mobileMode = !mobileMode;
                pageNumber = 1;
            } else {
                return;
            }

            const rankingEmbed = this.getUpdatedRankingEmbed(rankingRes.data, pageNumber, currentSemesterName, leaderboardLength, mobileMode);
            const buttonRow = this.getUpdatedRankingButtonRow(interaction.id, pageNumber, leaderboardLength, mobileMode);
            await buttonInteraction.update({ components: [buttonRow], embeds: [rankingEmbed] });
        
        });
    }


    private getLeaderboardDesktopPage(data: any, pageNumber: number, leaderboardLength: number): {positions: string, names: string, points: string} {
        let positions: string = "";
        let names: string = "";
        let points: string = "";
        const startIndex = (pageNumber - 1) * this.pageSizeDesktop;
        for (let i=startIndex; i<startIndex + Math.min(leaderboardLength - startIndex, this.pageSizeDesktop); i++) {
            positions += `${i+1}\n`;
            names += `${data[i].firstName} ${data[i].lastName}\n`;
            points += `${data[i].points}\n`;
        }
        return {positions: positions, names: names, points: points};
    }


    private getUpdatedRankingEmbed(data: any, pageNumber: number, currentSemesterName: string, leaderboardLength: number, mobileMode: boolean): EmbedBuilder {
        const easternNowTimeString: string = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
        const now: Date = new Date(easternNowTimeString);
        const calendarDate: string = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} Eastern Time`;

        const rankingEmbed = new EmbedBuilder()
            .setTitle(`${currentSemesterName} Ranking`)
            .setThumbnail(this.client.config.misc.logoUrl)
            .setFooter({ text: `Ranking information up to date as of ${calendarDate}` });

        if (!mobileMode) {
            const {positions, names, points} = this.getLeaderboardDesktopPage(data, pageNumber, leaderboardLength);
            rankingEmbed.addFields(
                { name: "Position", value: `${positions}`, inline: true },
                { name: "Name", value: `${names}`, inline: true },
                { name: "Points", value: `${points}`, inline: true },
            );
        } else {
            const startIndex = (pageNumber - 1) * this.pageSizeMobile;
            for (let i=startIndex; i<startIndex + Math.min(leaderboardLength - startIndex, this.pageSizeMobile); i++) {
                rankingEmbed.addFields({ name: `${i+1}`, value: `${data[i].firstName} ${data[i].lastName} ---- ${data[i].points}`});
            }
        }
        
        return rankingEmbed;
    }

    private getUpdatedRankingButtonRow(interactionId: string, pageNumber: number, leaderboardLength: number, mobileMode: boolean): ActionRowBuilder<ButtonBuilder> {
        const previousPageButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`PreviousPageButton-${interactionId}`)
        .setLabel('Previous Page')
        .setDisabled(pageNumber == 1)
        .setStyle(ButtonStyle.Primary);

        const nextPageButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`NextPageButton-${interactionId}`)
        .setLabel('Next Page')
        .setDisabled(pageNumber == Math.ceil(leaderboardLength / (mobileMode ? this.pageSizeMobile : this.pageSizeDesktop)))
        .setStyle(ButtonStyle.Primary);

        const modeToggleButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`ModeToggleButton-${interactionId}`)
        .setLabel(mobileMode ? `Desktop Mode` : `Mobile Mode`)
        .setStyle(ButtonStyle.Secondary);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(previousPageButton, nextPageButton, modeToggleButton);

        return buttonRow;
    }
}