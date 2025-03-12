import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Events, GuildMember, GuildMemberRoleManager, MessageFlags, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, Role, TextChannel, TextInputBuilder, TextInputStyle} from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Category from "../../base/enums/Category.js";
import Command from "../../base/classes/Command.js";
import { Members } from "../../base/db/models/Members.js";
import { VerificationCodes } from "../../base/db/models/VerificationCodes.js";
import { VerificationAttempts } from "../../base/db/models/VerificationAttempts.js";
import { sendVerificationEmail } from "../../base/utility/BrevoClient.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Configs } from "../../base/db/models/Configs.js";


const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const defaultFailedAttemptLimit = 5;


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
        await (interaction.channel as TextChannel).send({ content: `Please log in with the email address you used to registered with the club.`, components: [buttonRow] });



        this.client.on(Events.InteractionCreate, async (buttonInteraction) => {
            if (!(buttonInteraction instanceof ButtonInteraction)) {
                return;
            }

            if (buttonInteraction.customId != `verifyEmailButton-${interaction.id}` && buttonInteraction.customId != `verifyCodeButton-${interaction.id}`) {
                return;
            }

            if (verifiedRole.members.has(buttonInteraction.user.id)) {
                buttonInteraction.reply({ content: "Your account is already linked to an email in our system. To link your discord account to another email address, use the `/logout` command first.", flags: MessageFlags.Ephemeral });
                return;
            }

            // verification limit check
            let remainingAttempts: number = (await VerificationAttempts.findAll({
                where: {
                    discord_client_id: buttonInteraction.user.id,
                },
            }))[0]?.dataValues.remaining_failed_attempts;
            remainingAttempts = remainingAttempts == undefined ? defaultFailedAttemptLimit : remainingAttempts;

            if (remainingAttempts <= 0) {
                buttonInteraction.reply({ content: "Verification attempt limit exceeded. Please contact an administrator for help.", flags: MessageFlags.Ephemeral });
                return;
            }


            if (buttonInteraction.customId == `verifyEmailButton-${interaction.id}`) {
                const modalInputEmail: string = await this.displayLogInWithEmailModal(buttonInteraction);
                if (await this.isExistingEmail(modalInputEmail)) {
                    this.distributeCode(buttonInteraction.user.id, modalInputEmail);
                } else {
                    this.invalidEmailHandling(buttonInteraction.user.id, modalInputEmail);
                }
                buttonInteraction.followUp({ content: `A verification code was sent to ${modalInputEmail}. Please ensure to check your spam folders if you do not see the code in your inbox. **Please note that you must verify with the email address you used to register with the club**. If you did not receive a code please contact an administrator.`, flags: MessageFlags.Ephemeral });
            } 
            
            else if (buttonInteraction.customId == `verifyCodeButton-${interaction.id}`) {

                const modalInputEmail: string | undefined = await this.getUserEmail(buttonInteraction.user.id);
                if (modalInputEmail == undefined) {
                    buttonInteraction.reply({ content: "**Please input your email using the button to the left first before verifying.**", flags: MessageFlags.Ephemeral });
                    return;
                };
                const modalInputVerificationCode: string = await this.displayVerificationModal(buttonInteraction);
                if (await this.verifyCode(buttonInteraction.user.id, modalInputVerificationCode)) {
                    this.processSuccessfulVerification(buttonInteraction);
                } else {
                    buttonInteraction.followUp({ content: `**Verification failed**. Please try entering the email or the verification code again.`, flags: MessageFlags.Ephemeral });
                }
            }
        });
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


        const userEmailEntry: Members | undefined = (await Members.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0];

        if (userEmailEntry == undefined) {
            await Members.create({ discord_client_id: clientId, email: modalInputEmail});
        } else {
            await Members.update(
                { email: modalInputEmail },
                { where: { discord_client_id: clientId } },
            );
        }


        const userCodeEntry: VerificationCodes | undefined = (await VerificationCodes.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0];

        if (userCodeEntry == undefined) {
            await VerificationCodes.create({ discord_client_id: clientId, code: generatedCode.toString()});
        } else {
            await VerificationCodes.update(
                { code: generatedCode.toString() },
                { where: { discord_client_id: clientId } },
            );
        }
    }

    private async invalidEmailHandling(clientId: string, email: string) {
        // even if email does not exists in the system, insert this entry in the db to allow the user to proceed to verify codes.
        // note that they will not receive a code (since the email is invalid), and the code verification will always fail.
        // this is just to prevent users abusing the system by brute force checking if a specific email address is valid in the system or not.
        const userEmailEntry: Members | undefined = (await Members.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0];

        if (userEmailEntry == undefined) {
            await Members.create({ discord_client_id: clientId, email: email});
        } else {
            await Members.update(
                { email: email },
                { where: { discord_client_id: clientId } },
            );
        }

        
        // set code in db to null so that user cannot successfully verify their account if given an invalid email address
        const userCodeEntry: VerificationCodes | undefined = (await VerificationCodes.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0];

        if (userCodeEntry == undefined) {
            await VerificationCodes.create({ discord_client_id: clientId, code: null});
        } else {
            await VerificationCodes.update(
                { code: null },
                { where: { discord_client_id: clientId } },
            );
        }


        let remainingAttempts: number | undefined = (await VerificationAttempts.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.remaining_failed_attempts;

        if (remainingAttempts == undefined) {
            await VerificationAttempts.create({ discord_client_id: clientId, remaining_failed_attempts: defaultFailedAttemptLimit });
            remainingAttempts = defaultFailedAttemptLimit;
        } 
        await VerificationAttempts.update(
            { remaining_failed_attempts: remainingAttempts - 1},
            { where: { discord_client_id: clientId } },
        );


        
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
        const code = (await VerificationCodes.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.code;

        return modalInputVerificationCode == code;
    }


    private async getUserEmail(clientId: string): Promise<string | undefined > {
        const email = (await Members.findAll({
            where: {
                discord_client_id: clientId,
            },
        }))[0]?.dataValues.email;

        return email;
    }


    private async assignVerifiedRole(interaction: ButtonInteraction) {
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        const member: GuildMember = (await interaction.guild?.members.fetch(interaction.user.id))!;
        (member.roles as GuildMemberRoleManager).add(verifiedRole);
    }


    private async processSuccessfulVerification(buttonInteraction: ButtonInteraction) {
        await VerificationCodes.destroy({where: {discord_client_id: buttonInteraction.user.id}});

        const email: string = (await this.getUserEmail(buttonInteraction.user.id))!;

        const userId: number = (await uwpscApiAxios.get("/users", {
            params: {email: email}
        })).data[0].id;


        await this.currentSemesterRegistration(buttonInteraction, userId);

        await Members.update(
            { user_id: userId },
            { where: { discord_client_id: buttonInteraction.user.id } },
        );

        this.assignVerifiedRole(buttonInteraction);
        buttonInteraction.followUp({ content: `**Verification successful**. Your discord account is now linked to ${email}!`, flags: MessageFlags.Ephemeral });
    }

    private async currentSemesterRegistration(buttonInteraction: ButtonInteraction, userId: number) {

        const currentSemesterConfigRes = (await Configs.findAll())[0];
        if (!currentSemesterConfigRes) {
            buttonInteraction.followUp({ content: "Cannot register to the current semester at the moment. Please use `\register` later.", flags: MessageFlags.Ephemeral });
            return;
        }

        const currentSemesterId = currentSemesterConfigRes.dataValues.current_semester_id;
        const currentSemesterName = currentSemesterConfigRes.dataValues.current_semester_name;

        const existingMembership = (await uwpscApiAxios.get("/memberships", {
            params: {userId: userId, semesterId: currentSemesterId}
        })).data[0];

        let membershipId: string;
        if (existingMembership == undefined) {
            const newMembership = (await uwpscApiAxios.post("/memberships", {
                userId: userId, semesterId: currentSemesterId
            }));
            membershipId = newMembership.data.id;
        } else {
            membershipId = existingMembership.id;
        }
        
        
        await Members.update(
            { membership_id: membershipId },
            { where: { discord_client_id: buttonInteraction.user.id } },
        );
        await buttonInteraction.followUp({ content: `You are registered to the current semester, ${currentSemesterName}.`, flags: MessageFlags.Ephemeral });
        
    }
}