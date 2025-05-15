import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";
import ButtonManager from "../../base/classes/ButtonManager.js";





export default class Verifier extends Command {
    
    constructor(client: BossClient) {
        super(client, {
            name: "verifier",
            description: "Sends the member verification interface.",
            category: Category.Admin,
            syntax: "/verifier",
            helpDescription: "Sends the member verification interface that allow members to link their discord account with their registered email.",
            defaultMemberPerm: PermissionFlagsBits.ModerateMembers,   // users with "timeout members" perms in the guild have access to this command
            dmPerm: false,
            coolDown: 3,
            global: true,
            options: [],   
        });
    }


    override async execute(interaction: ChatInputCommandInteraction) {
        const loginWithEmailButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`${[this.name, interaction.id, "verifyEmailButton"].join(ButtonManager.interactionDelimiter)}`)
        .setLabel('Verify email')
        .setStyle(ButtonStyle.Primary);

        const verificationButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`${[this.name, interaction.id, "verifyCodeButton"].join(ButtonManager.interactionDelimiter)}`)
        .setLabel('Enter verification code')
        .setStyle(ButtonStyle.Primary);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(loginWithEmailButton, verificationButton);


        await interaction.deferReply();
        await interaction.deleteReply();
        await (interaction.channel as TextChannel).send({ content: `Please log in with the email address you used to registered with the club.`, components: [buttonRow] });      
    }
}