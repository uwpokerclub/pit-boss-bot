import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, GuildMember, GuildMemberRoleManager, InteractionResponse, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, Role, TextInputBuilder, TextInputStyle} from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";
import { ClientEmail } from "../../base/db/models/ClientEmail.js";
import { ClientCode } from "../../base/db/models/ClientCode.js";
import { sendVerificationEmail } from "../../base/utility/BrevoClient.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";


const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/



export default class UserLogin extends Command {
    modalInputEmail: string;
    modalInputVerificationCode: string;
    verifiedRoleId: string;


    constructor(client: BossClient) {
        super(client, {
            name: "login",
            description: "Logs user in, provides user with access to other bot commands",
            category: Category.Authentication,
            syntax: "/login",
            helpDescription: "registers your discord account into the system, gives you access to ranking commands",
            defaultMemberPerm: PermissionFlagsBits.UseApplicationCommands,
            dmPerm: false,
            coolDown: 3,
            options: []
        });
        this.modalInputEmail = "";
        this.modalInputVerificationCode = "";
        this.verifiedRoleId = client.config.discord.verifiedRoleId;
    }


    override async execute(interaction: ChatInputCommandInteraction) {
        
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        if (verifiedRole.members.has(interaction.user.id)) {
            interaction.reply({ content: "Your account is already linked to an email in our system. To link your discord account to another email address, call `/logout` first.", ephemeral: true });
            return;
        }


        const loginWithEmailButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId('logInWithEmail')
        .setLabel('Log in with email')
        .setStyle(ButtonStyle.Primary);

        const verificationButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId('verification')
        .setLabel('Enter verification code')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(loginWithEmailButton, verificationButton);
        //TODO: change this to the proper message
        const response: InteractionResponse<boolean> = await interaction.reply({ content: `welcome and description text placeholder`, components: [buttonRow], ephemeral: true });
        
        // client has 10 minutes to complete the login process
        const validTime: number = 600000;
        setTimeout(() => {interaction.editReply({ content: `Command timed out`})}, validTime);
        const collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: validTime});
        collector.on("collect", async (buttonInteraction) => {

            if (buttonInteraction.customId == "logInWithEmail") {
                await this.displayLogInWithEmailModal(buttonInteraction);
                if (await this.isExistingEmail()) {
                    // enable the verification button
                    buttonRow.components[1]?.setDisabled(false);
                    this.distributeCode(buttonInteraction.user.id);
                    interaction.editReply({ content: `Please check ${this.modalInputEmail} for the verification code we just sent you.`, components: [buttonRow] });
                } else {
                    buttonRow.components[1]?.setDisabled(true);
                    interaction.editReply({ content: "**We couldn't find the email address in our system. Please try again.**", components: [buttonRow] });
                }
            } 
            
            else if (buttonInteraction.customId == "verification") {
                await this.displayVerificationModal(buttonInteraction);
                if (await this.verifyCode(buttonInteraction.user.id)) {
                    await ClientEmail.create({ discord_client_id: buttonInteraction.user.id, email: this.modalInputEmail});
                    await ClientCode.destroy({where: {discord_client_id: buttonInteraction.user.id}});
                    this.assignVerifiedRole(interaction);
                    interaction.editReply({ content: `**Verification successful**. Your discord account is now linked to ${this.modalInputEmail}!`, components: []});
                } else {
                    interaction.editReply({ content: `**Verification failed**. Please try entering the email or the verification code again.`, components: [buttonRow]});
                }
            }
        })
    }



    private async displayLogInWithEmailModal(interaction: ButtonInteraction) {
        const emailModal: ModalBuilder = new ModalBuilder()
        .setCustomId(`Login-${interaction.user.id}`)
        .setTitle("Log in");

        const emailInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId("emailInput")
        .setLabel("Please enter the registered email address.")
        .setValue("E.G. f100lastname@uwaterloo.ca")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

        const emailActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput);

        emailModal.addComponents(emailActionRow);

        interaction.showModal(emailModal);


        // wait for the modal submission
        const filter = (interaction: ModalSubmitInteraction) => interaction.customId == `Login-${interaction.user.id}`;
        await interaction.awaitModalSubmit({filter: filter, time: 600000})
        .then(async (modalInteraction) => {
            this.modalInputEmail = modalInteraction.fields.getTextInputValue("emailInput");
            await modalInteraction.reply({content: `.`, ephemeral: true});
            modalInteraction.deleteReply();
        })
        .catch((err) => {
            console.log(err);
            return;
        });
        
    }
    

    private async displayVerificationModal(interaction: ButtonInteraction) {
        const verificationModal: ModalBuilder = new ModalBuilder()
        .setCustomId(`verification-${interaction.user.id}`)
        .setTitle("Log in");

        const emailInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId("verificationCodeInput")
        .setLabel("Please enter the verification code")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

        const verificationCodeActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput);

        verificationModal.addComponents(verificationCodeActionRow);
        interaction.showModal(verificationModal);


        // wait for the modal submission
        const filter = (interaction: ModalSubmitInteraction) => interaction.customId == `verification-${interaction.user.id}`;
        await interaction.awaitModalSubmit({filter: filter, time: 600000})
        .then(async (modalInteraction) => {
            this.modalInputVerificationCode = modalInteraction.fields.getTextInputValue("verificationCodeInput");
            await modalInteraction.reply({content: `.`, ephemeral: true});
            modalInteraction.deleteReply();
        })
        .catch((err) => {
            console.log(err);
            return;
        });    
    }


    private async distributeCode(clientId: string) {
        // generate 6-digit code from 100000 to 999999
        const generatedCode: number = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
        //TODO: try-catch send email to prevent invalid email address
        try {
            sendVerificationEmail(this.client.config, this.modalInputEmail, generatedCode.toString());
        } catch (err) {
            console.log(err);
        }
        
        await ClientCode.destroy({where: {discord_client_id: clientId}});
        await ClientCode.create({ discord_client_id: clientId, code: generatedCode.toString()});
    }


    private async isExistingEmail(): Promise<boolean> {
        // Regex match first to validate email address
        if (!emailRegExp.test(this.modalInputEmail)) {
            return false;
        }
        
        const res = await uwpscApiAxios.get("/users", {
            params: {email: this.modalInputEmail}
        });
        return res.data.length != 0;
    }


    private async verifyCode(clientId: string): Promise<boolean> {
        const code = (await ClientCode.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.code;

        return this.modalInputVerificationCode == code;
    }


    private async assignVerifiedRole(interaction: ChatInputCommandInteraction) {
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        const member: GuildMember = (await interaction.guild?.members.fetch(interaction.user.id))!;
        (member.roles as GuildMemberRoleManager).add(verifiedRole);
    }
}