import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, Message, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, Role, TextChannel, TextInputBuilder, TextInputStyle} from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";
import { ClientEmail } from "../../base/db/models/ClientEmail.js";
import { ClientCode } from "../../base/db/models/ClientCode.js";
import { sendVerificationEmail } from "../../base/utility/BrevoClient.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";


const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/



export default class UserLoginPersistent extends Command {
    verifiedRoleId: string;


    constructor(client: BossClient) {
        super(client, {
            name: "login_persist",
            description: "Provides a permanent user login interface",
            category: Category.Authentication,
            syntax: "/login_persist",
            helpDescription: "provides a permanent user login interface, allows members to register their discord accounts into the system, gives registered members access to ranking commands",
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
        .setCustomId(`logInWithEmail-${interaction.id}`)
        .setLabel('Log in with email')
        .setStyle(ButtonStyle.Primary);

        const verificationButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`verification-${interaction.id}`)
        .setLabel('Enter verification code')
        .setStyle(ButtonStyle.Primary);

        const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
        buttonRow.addComponents(loginWithEmailButton, verificationButton);


        interaction.reply({ content: `Persistent login interaction message sent`, ephemeral: true })
        const message: Message = await (interaction.channel as TextChannel).send({ content: `Please log in with the email address you used to registered with the club.`, components: [buttonRow] });


        const collector = message.createMessageComponentCollector();
        collector.on("collect", async (buttonInteraction) => {
            if (!(buttonInteraction instanceof ButtonInteraction)) {
                return;
            }
            if (verifiedRole.members.has(buttonInteraction.user.id)) {
                buttonInteraction.reply({ content: "Your account is already linked to an email in our system. To link your discord account to another email address, call `/logout` first.", ephemeral: true });
                return;
            }


            if (buttonInteraction.customId == `logInWithEmail-${interaction.id}`) {
                const modalInputEmail: string = await this.displayLogInWithEmailModal(buttonInteraction);
                if (await this.isExistingEmail(modalInputEmail)) {
                    this.distributeCode(buttonInteraction.user.id, modalInputEmail);
                    buttonInteraction.followUp({ content: `Please check ${modalInputEmail} for the verification code we just sent you.`, ephemeral: true })
                } else {
                    buttonInteraction.followUp({ content: "**We couldn't find the email address in our system. Please try again.**", ephemeral: true });
                }
            } 
            
            else if (buttonInteraction.customId == `verification-${interaction.id}`) {
                //FIXME: rework how client email db table works, 
                const modalInputEmail: string | undefined = await this.getUserEmail(buttonInteraction.user.id);
                if (!modalInputEmail) {
                    buttonInteraction.reply({ content: "**Please input your email using the button to the left first before verifying.**", ephemeral: true });
                    return;
                }

                const modalInputVerificationCode: string = await this.displayVerificationModal(buttonInteraction);
                if (await this.verifyCode(buttonInteraction.user.id, modalInputVerificationCode)) {
                    await ClientEmail.destroy({where: {discord_client_id: buttonInteraction.user.id}});
                    await ClientCode.destroy({where: {discord_client_id: buttonInteraction.user.id}});
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
        .setCustomId(`login-${interaction.id}`)
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
        const filter = (ModalSubmitInteraction: ModalSubmitInteraction) => ModalSubmitInteraction.customId == `login-${interaction.id}`;
        let modalInputEmail: string = "Uninitialized email input";
        await interaction.awaitModalSubmit({filter: filter, time: 600000})
        .then(async (modalInteraction) => {
            modalInputEmail = modalInteraction.fields.getTextInputValue("emailInput");
            await modalInteraction.deferReply();
            modalInteraction.deleteReply();
        })
        .catch((err) => {
            console.log(err);
            return;
        });

        return modalInputEmail;
        
    }
    

    private async displayVerificationModal(interaction: ButtonInteraction): Promise<string> {
        const verificationModal: ModalBuilder = new ModalBuilder()
        .setCustomId(`verification-${interaction.id}`)
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
        const filter = (ModalSubmitInteraction: ModalSubmitInteraction) => ModalSubmitInteraction.customId == `verification-${interaction.id}`;
        let modalInputVerificationCode: string = "Uninitialized code input";
        await interaction.awaitModalSubmit({filter: filter, time: 600000})
        .then(async (modalInteraction) => {
            modalInputVerificationCode = modalInteraction.fields.getTextInputValue("verificationCodeInput");
            await modalInteraction.deferReply();
            modalInteraction.deleteReply();
        })
        .catch((err) => {
            console.log(err);
            return;
        });   
        
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

        await ClientEmail.destroy({where: {discord_client_id: clientId}});
        await ClientEmail.create({ discord_client_id: clientId, email: modalInputEmail});
        await ClientCode.destroy({where: {discord_client_id: clientId}});
        await ClientCode.create({ discord_client_id: clientId, code: generatedCode.toString()});
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
        const code = (await ClientCode.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.code;

        return modalInputVerificationCode == code;
    }


    private async getUserEmail(clientId: string): Promise<string | undefined > {
        const email = (await ClientEmail.findAll({
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