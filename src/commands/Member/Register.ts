import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, MessageFlags, PermissionFlagsBits, Role } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";
import { Members } from "../../base/db/models/Members.js";
import axios from "axios";


export default class Register extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "register",
            description: "Registers user to current semester.",
            category: Category.Member,
            syntax: "/register",
            helpDescription: "Registers user to current semester.",
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

        const clientId: string = interaction.user.id;
        const userId = (await Members.findAll({ where: { discord_client_id: clientId } }))[0]?.dataValues.user_id;
        const currentSemesterConfigRes = (await Configs.findAll())[0];
        if (!currentSemesterConfigRes) {
            interaction.reply({ content: "Cannot register at the moment, please try again later.", flags: MessageFlags.Ephemeral });
            return;
        }

        const currentSemesterId = currentSemesterConfigRes.dataValues.current_semester_id;
        const currentSemesterName = currentSemesterConfigRes.dataValues.current_semester_name;


        const confirmRegisterButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`confirmRegisterButton-${interaction.id}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Primary);

        const cancelRegisterButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`cancelRegisterButton-${interaction.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(confirmRegisterButton, cancelRegisterButton);

        const response = await interaction.reply({ content: `Do you want to register to the current semester, ${currentSemesterName}?`, components: [buttonRow], flags: MessageFlags.Ephemeral });
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button });
        collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            await interaction.editReply({ content: `Processing...`, components: [] });
            
            if (buttonInteraction.customId == `confirmRegisterButton-${interaction.id}`) {
                let existingMembershipRes;
                try {
                    existingMembershipRes = await uwpscApiAxios.get("/memberships", {
                        params: {userId: userId, semesterId: currentSemesterId}
                    });
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
                const existingMembership = existingMembershipRes.data[0];

                let membershipId: string;
                if (existingMembership == undefined) {
                    let newMembership;
                    try {
                        newMembership = await uwpscApiAxios.post("/memberships", {
                            userId: userId, semesterId: currentSemesterId
                        });
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
                    membershipId = newMembership.data.id;
                } else {
                    membershipId = existingMembership.id;
                }
                
                
                await Members.update(
                    { membership_id: membershipId },
                    { where: { discord_client_id: clientId } },
                );
                await interaction.editReply({ content: `You are registered to the current semester, ${currentSemesterName}.`, components: [] });
                
            } else if (buttonInteraction.customId == `cancelRegisterButton-${interaction.id}`) {
                await interaction.editReply({ content: `Semester registration canceled.`, components: [] });
                return;
            }
        });
    }
}