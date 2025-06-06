import { ActionRowBuilder, ButtonInteraction, ModalSubmitInteraction, GuildMember, GuildMemberRoleManager, MessageFlags, ModalBuilder, Role, TextInputBuilder, TextInputStyle } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import ButtonManager from "../../base/classes/ButtonManager.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";
import { Members } from "../../base/db/models/Members.js";
import { VerificationCodes } from "../../base/db/models/VerificationCodes.js";
import { VerificationAttempts } from "../../base/db/models/VerificationAttempts.js";
import { Configs } from "../../base/db/models/Configs.js";
import { sendVerificationEmail } from "../../base/utility/BrevoClient.js";


const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const defaultFailedAttemptLimit = 5;


export default class VerifierButtonManager extends ButtonManager {
    verifiedRoleId: string;
    
    constructor(client: BossClient) {
        super(client, {
            name: "verifier"
        });
        this.verifiedRoleId = client.config.discord.verifiedRoleId;
    }

    override async execute(interaction: ButtonInteraction) {

        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        if (verifiedRole.members.has(interaction.user.id)) {
            interaction.reply({ content: "Your account is already linked to an email in our system. To link your discord account to another email address, use the `/logout` command first.", flags: MessageFlags.Ephemeral });
            return;
        }

        // verification limit check
        let remainingAttempts: number = (await VerificationAttempts.findAll({
            where: {
                discord_client_id: interaction.user.id,
            },
        }))[0]?.dataValues.remaining_failed_attempts;
        remainingAttempts = remainingAttempts == undefined ? defaultFailedAttemptLimit : remainingAttempts;

        if (remainingAttempts <= 0) {
            interaction.reply({ content: "Verification attempt limit exceeded. Please contact an administrator for help.", flags: MessageFlags.Ephemeral });
            return;
        }


        const buttonName: string = interaction.customId.split(ButtonManager.interactionDelimiter)[2]!;
        if (buttonName == `verifyEmailButton`) {
            const modalInputEmail: string = await this.displayLogInWithEmailModal(interaction);
            const emailDuplicate: boolean = await this.isDuplicateEmail(modalInputEmail);
            if ((await this.isExistingEmail(modalInputEmail)) && !emailDuplicate) {
                this.distributeCode(interaction.user.id, modalInputEmail);
            } else if (emailDuplicate) {
                this.invalidEmailHandling(interaction.user.id, `${interaction.user.id}_placeholder_email_address`);
            } else {
                this.invalidEmailHandling(interaction.user.id, modalInputEmail);
            }
            interaction.followUp({ content: `A verification code was sent to ${modalInputEmail}. Please ensure to check your spam folders if you do not see the code in your inbox. **Please note that you must verify with the email address you used to register with the club**. If you did not receive a code please contact an administrator.`, flags: MessageFlags.Ephemeral });
        } 
        
        else if (buttonName == `verifyCodeButton`) {

            const modalInputEmail: string | undefined = await this.getUserEmail(interaction.user.id);
            if (modalInputEmail == undefined) {
                interaction.reply({ content: "**Please input your email using the button to the left first before verifying.**", flags: MessageFlags.Ephemeral });
                return;
            };
            const modalInputVerificationCode: string = await this.displayVerificationModal(interaction);
            if (await this.verifyCode(interaction.user.id, modalInputVerificationCode)) {
                this.processSuccessfulVerification(interaction);
            } else {
                interaction.followUp({ content: `**Verification failed**. Please try entering the email or the verification code again.`, flags: MessageFlags.Ephemeral });
            }
        }
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
        let modalInputEmail: string = `${interaction.user.id}_placeholder_email_address`;
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

        if (!(res.data.length != 0)) {
            return false;
        }
        return true;
        

    }

    private async isDuplicateEmail(modalInputEmail: string): Promise<boolean> {
        const memberEntry: Members | undefined = (await Members.findAll({
            where: {
                email: modalInputEmail,
            },
        }))[0];

        if (memberEntry != undefined) {
            return true;
        }
        
        return false;

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

        const targetUser = (await uwpscApiAxios.get("/users", {
            params: {email: email}
        })).data[0];

        await Members.update(
            { 
                user_id: targetUser.id,
            },
            { where: { discord_client_id: buttonInteraction.user.id } },
        );
        
        this.assignVerifiedRole(buttonInteraction);
        buttonInteraction.followUp({ content: `**Verification successful**. Your discord account is now linked to ${email}!`, flags: MessageFlags.Ephemeral });
        
        await this.currentSemesterRegistration(buttonInteraction, targetUser.id);
    }

    private async currentSemesterRegistration(buttonInteraction: ButtonInteraction, userId: number) {
        const currentSemesterConfigRes = (await Configs.findAll())[0];
        if (!currentSemesterConfigRes) {
            buttonInteraction.followUp({ content: "Cannot register to the current semester at the moment. Please use `/register` later.", flags: MessageFlags.Ephemeral });
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
