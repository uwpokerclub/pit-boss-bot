import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";

export default class SetCurrentSemester extends Command {
    constructor(client: BossClient) {
        super(client, {
            name: "set_current_semester",
            description: "Set the current semester as the last semester created",
            category: Category.Utility,
            syntax: "/set_current_semester",
            helpDescription: "Set the current semester as the last semester created",
            defaultMemberPerm: PermissionFlagsBits.Administrator,
            dmPerm: false,
            coolDown: 3,
            options: []
        });
    }

    override async execute(interaction: ChatInputCommandInteraction) {
        const data = (await uwpscApiAxios.get("/semesters")).data;
        const currentSemester = data[0];
        if (!currentSemester) {
            // should never happen, unless the main db is dropped
            interaction.reply({ content: `Cannot set current semester right now.`, flags: MessageFlags.Ephemeral });
            return;
        }
        
        const config: Configs | undefined = (await Configs.findAll())[0];
        if (config == undefined) {
            await Configs.create({ current_semester_id: currentSemester.id });
        } else {
            config.current_semester_id = currentSemester.id;
            config.save();
        }

        interaction.reply({ content: `The current semester is set to ${currentSemester.name}`, flags: MessageFlags.Ephemeral });
    }

}