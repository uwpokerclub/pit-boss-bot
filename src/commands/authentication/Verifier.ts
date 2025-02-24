import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, Message, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, Role, TextChannel, TextInputBuilder, TextInputStyle} from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";
import { Member } from "../../base/db/models/Member.js";
import { VerificationCode } from "../../base/db/models/VerificationCode.js";
import { sendVerificationEmail } from "../../base/utility/BrevoClient.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";


const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/



export default class Verifier extends Command {
    verifiedRoleId: string;


    constructor(client: BossClient) {
        super(client, {
            name: "verifier",
            description: "Displays the verification form.",
            category: Category.Authentication,
            syntax: "/login_persist",
            helpDescription: "Displays a account verification form that will allow members to link their discord account with their account on the website.",
            defaultMemberPerm: PermissionFlagsBits.Administrator,   // users with administrative access in the guild have access to this command
            dmPerm: false,
            coolDown: 3,
            options: []      
        });
        this.verifiedRoleId = client.config.discord.verifiedRoleId;
    }


    override async execute(interaction: ChatInputCommandInteraction) {
        
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;

        const loginWithEmailButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`verifyEmailButton-${interaction.id}`)
        .setLabel('Verify email')
        .setStyle(ButtonStyle.Primary);

        const verificationButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`verifyCodeButton-${interaction.id}`)
        .setLabel('Enter verification code')
        .setStyle(ButtonStyle.Primary);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(loginWithEmailButton, verificationButton);


        await interaction.deferReply();
        await interaction.deleteReply();
        const message: Message = await (interaction.channel as TextChannel).send({ content: `Please log in with the email address you used to registered with the club.`, components: [buttonRow] });


        const collector = message.createMessageComponentCollector();
        collector.on("collect", async (buttonInteraction) => {
            if (!(buttonInteraction instanceof ButtonInteraction)) {
                return;
            }
            if (verifiedRole.members.has(buttonInteraction.user.id)) {
                buttonInteraction.reply({ content: "Your account is already linked to an email in our system. To link your discord account to another email address, use the `/logout` command first.", ephemeral: true });
                return;
            }


            if (buttonInteraction.customId == `verifyEmailButton-${interaction.id}`) {
                const modalInputEmail: string = await this.displayLogInWithEmailModal(buttonInteraction);
                if (await this.isExistingEmail(modalInputEmail)) {
                    this.distributeCode(buttonInteraction.user.id, modalInputEmail);
                } 
                buttonInteraction.followUp({ content: `A verification code was sent to ${modalInputEmail}. Please ensure to check your spam folders if you do not see the code in your inbox. If you did not receive a code please contact an administrator.`, ephemeral: true });
            } 
            
            else if (buttonInteraction.customId == `verifyCodeButton-${interaction.id}`) {

                const modalInputEmail: string | undefined = await this.getUserEmail(buttonInteraction.user.id);
                if (!modalInputEmail) {
                    buttonInteraction.reply({ content: "**Please input your email using the button to the left first before verifying.**", ephemeral: true });
                    return;
                };
                const modalInputVerificationCode: string = await this.displayVerificationModal(buttonInteraction);
                if (await this.verifyCode(buttonInteraction.user.id, modalInputVerificationCode)) {
                    await VerificationCode.destroy({where: {discord_client_id: buttonInteraction.user.id}});
                    this.assignVerifiedRole(interaction);
                    buttonInteraction.followUp({ content: `**Verification successful**. Your discord account is now linked to ${modalInputEmail}!`, ephemeral: true });
                } else {
                    buttonInteraction.followUp({ content: `**Verification failed**. Please try entering the email or the verification code again.`, ephemeral: true });
                }
            }
        })
    }



    private async displayLogInWithEmailModal(interaction: ButtonInteraction): Promise<string> {
        const emailModal: ModalBuilder = new ModalBuilder()
        .setCustomId(`verifyEmailModal-${interaction.id}`)
        .setTitle("Verify your email");

        const emailInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId("emailModalInput")
        .setLabel("Please enter your email.")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

        const emailActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput);

        emailModal.addComponents(emailActionRow);

        interaction.showModal(emailModal);


        // wait for the modal submission
        const filter = (ModalSubmitInteraction: ModalSubmitInteraction) => ModalSubmitInteraction.customId == `verifyEmailModal-${interaction.id}`;
        let modalInputEmail: string = "";
        try {
            const modalInteraction: ModalSubmitInteraction = await interaction.awaitModalSubmit({filter: filter, time: 600000});
            modalInputEmail = modalInteraction.fields.getTextInputValue("emailModalInput");
            await modalInteraction.deferReply();
            modalInteraction.deleteReply();
        } catch (err) {
            console.log(err);
        }

        return modalInputEmail;
        
    }
    

    private async displayVerificationModal(interaction: ButtonInteraction): Promise<string> {
        const verificationModal: ModalBuilder = new ModalBuilder()
        .setCustomId(`verifyCodeModal-${interaction.id}`)
        .setTitle("Code verification");

        const emailInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId("codeModalInput")
        .setLabel("Please enter the verification code")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

        const verificationCodeActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput);

        verificationModal.addComponents(verificationCodeActionRow);


        interaction.showModal(verificationModal);




        // wait for the modal submission
        const filter = (ModalSubmitInteraction: ModalSubmitInteraction) => ModalSubmitInteraction.customId == `verifyCodeModal-${interaction.id}`;
        let modalInputVerificationCode: string = "";
        try {
            const modalInteraction: ModalSubmitInteraction = await interaction.awaitModalSubmit({filter: filter, time: 600000})
            modalInputVerificationCode = modalInteraction.fields.getTextInputValue("codeModalInput");
            await modalInteraction.deferReply();
            modalInteraction.deleteReply();
        } catch (err) {
            console.log(err);
        }   
        
        return modalInputVerificationCode;
    }


    private async distributeCode(clientId: string, modalInputEmail: string) {
        // generate 6-digit code from 100000 to 999999
        const generatedCode: number = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
        try {
            sendVerificationEmail(this.client.config, modalInputEmail, generatedCode.toString());
        } catch (err) {
            console.log(err);
        }

        await Member.destroy({where: {discord_client_id: clientId}});
        await Member.create({ discord_client_id: clientId, email: modalInputEmail});
        await VerificationCode.destroy({where: {discord_client_id: clientId}});
        await VerificationCode.create({ discord_client_id: clientId, code: generatedCode.toString()});
    }


    private async isExistingEmail(modalInputEmail: string): Promise<boolean> {
        // Regex match first to validate email address
        if (!emailRegExp.test(modalInputEmail)) {
            return false;
        }
        
        const res = await uwpscApiAxios.get("/users", {
            params: {email: modalInputEmail}
        });
        return res.data.length != 0;
    }


    private async verifyCode(clientId: string, modalInputVerificationCode: string): Promise<boolean> {
        const code = (await VerificationCode.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.code;

        return modalInputVerificationCode == code;
    }


    private async getUserEmail(clientId: string): Promise<string | undefined > {
        const email = (await Member.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.email;

        // FIXME: this may be a problem, reading dataValue of undefined
        return email;
    }


    private async assignVerifiedRole(interaction: ChatInputCommandInteraction) {
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        const member: GuildMember = (await interaction.guild?.members.fetch(interaction.user.id))!;
        (member.roles as GuildMemberRoleManager).add(verifiedRole);
    }
}