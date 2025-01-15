//@ts-ignore
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, InteractionResponse, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, TextInputBuilder, TextInputStyle} from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";


export default class UserLogin extends Command {
    modalInputEmail: string;
    modalInputVerificationCode: string;

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
    }


    override async execute(interaction: ChatInputCommandInteraction) {
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
        const collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 600000});
        collector.on("collect", async (buttonInteraction) => {
            if (buttonInteraction.customId == "logInWithEmail") {
                await this.displayLogInWithEmailModal(buttonInteraction);
                if (this.isExistingEmail()) {
                    // enable the verification button
                    buttonRow.components[1]?.setDisabled(false);
                    interaction.editReply({ content: `Please check ${this.modalInputEmail} for the verification code we just sent you.`, components: [buttonRow] });
                    this.generateCode();
                } else {
                    buttonRow.components[1]?.setDisabled(true);
                    interaction.editReply({ content: "**We couldn't find the email address in our system. Please try again.**", components: [buttonRow] });
                }
            } else if (buttonInteraction.customId == "verification") {
                await this.displayVerificationModal(buttonInteraction);
                if (this.verifyCode()) {
                    interaction.editReply({ content: `**Verification successful**. Your discord account is now linked to the email ${this.modalInputEmail}!`, components: []})
                    //TODO: assign user a custom role for accessing the ranking commands
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
            await modalInteraction.reply({content: `received email address: ${this.modalInputEmail}`, ephemeral: true});
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
            await modalInteraction.reply({content: `received code: ${this.modalInputVerificationCode}`, ephemeral: true});
            modalInteraction.deleteReply();
        })
        .catch((err) => {
            console.log(err);
            return;
        });    
    }

    private generateCode(): void {
        // generate 6-digit code from 100000 to 999999
        const generatedCode: number = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
        this.client.brevoClient.sendVerificationEmail(this.modalInputEmail, generatedCode.toString());
        //TODO: insert into db
    }


    private isExistingEmail(): boolean {
        // TODO: check database to see if the email address exists or not
        if (this.modalInputEmail) {
            return true;
        } 
        return false;
    }


    private verifyCode(): boolean {
        //TODO: change this
        return true;
    }
}