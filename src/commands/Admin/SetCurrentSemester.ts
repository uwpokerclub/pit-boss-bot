import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js"; import Category from "../../base/enums/Category.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";
import axios from "axios";

export default class SetCurrentSemester extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "set_current_semester",
            description: "Set the current semester as the last semester created.",
            category: Category.Admin,
            syntax: "/set_current_semester",
            helpDescription: "Set the current semester as the last semester created.",
            defaultMemberPerm: PermissionFlagsBits.ModerateMembers,
            dmPerm: false,
            coolDown: 3,
            global: false,
            options: [],
        });
    }

    override async execute(interaction: ChatInputCommandInteraction) {
        let semesters = null;
        try {
            semesters = await uwpscApiAxios.get("/semesters");
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
            interaction.reply({ content: `System error. Cannot set current semester right now.`, flags: MessageFlags.Ephemeral });
            return;
        }


        const currentSemester = semesters.data[0];
        if (!currentSemester) {
            // should never happen, unless the main db is dropped
            interaction.reply({ content: `System error. Cannot set current semester right now.`, flags: MessageFlags.Ephemeral });
            return;
        }
        
        const config: Configs | undefined = (await Configs.findAll())[0];
        if (config == undefined) {
            await Configs.create({ 
                current_semester_id: currentSemester.id,
                current_semester_name: currentSemester.name
             });
        } else {
            config.current_semester_id = currentSemester.id;
            config.current_semester_name = currentSemester.name
            config.save();
        }

        interaction.reply({ content: `The current semester is set to ${currentSemester.name}`, flags: MessageFlags.Ephemeral });

        const { verifiedRoleId } = this.client.config.discord;
        await (interaction.channel as TextChannel).send({ content: `<@&${verifiedRoleId}> New semester ${currentSemester.name} started!! To access up-to-date information, please register to the new semester using \`/register\`.` });
    }

}