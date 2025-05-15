import { ApplicationCommandOptionType, ChatInputCommandInteraction, GuildMember, GuildMemberRoleManager, MessageFlags, PermissionFlagsBits, Role } from "discord.js";
import type BossClient from "../../base/classes/BossClient.js";
import Command from "../../base/classes/Command.js";
import Category from "../../base/enums/Category.js";
import { VerificationAttempts } from "../../base/db/models/VerificationAttempts.js";
import { Members } from "../../base/db/models/Members.js";
import { VerificationCodes } from "../../base/db/models/VerificationCodes.js";
import { uwpscApiAxios } from "../../base/utility/Axios.js";



const emailRegExp: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/


export default class VerifyMember extends Command {
    verifiedRoleId: string;

    constructor(client: BossClient) {
        super(client, {
            name: "verify_member",
            description: "Verify target member's account",
            category: Category.Admin,
            syntax: "/verify_member @member email",
            helpDescription: "Verify target member's account",
            defaultMemberPerm: PermissionFlagsBits.ModerateMembers,
            dmPerm: false,
            coolDown: 3,
            global: false,
            options: [
                {
                    name: "target_user",
                    description: "The user to be verified",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "email",
                    description: "target user's email",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ],
        });
        this.verifiedRoleId = client.config.discord.verifiedRoleId;

    }
    

    override async execute(interaction: ChatInputCommandInteraction) {
        const targetUserParam = interaction.options.get("target_user");
        const emailParam: string = interaction.options.getString("email") ?? "";

        if (!targetUserParam) {
            interaction.reply({ content: "Invalid user provided.", flags: MessageFlags.Ephemeral });
            return;
        }

        if (!(await this.isExistingEmail(emailParam))) {
            interaction.reply({ content: "Invalid email provided.", flags: MessageFlags.Ephemeral });
            return;
        }
        
        const targetUserClientId: string  = targetUserParam.user!.id;
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        if (verifiedRole.members.has(targetUserClientId)) {
            interaction.reply({ content: "Verification failed. The target user's account is already verified.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (await this.isDuplicateEmail(emailParam)) {
            interaction.reply({ content: "Verification failed. The given email has already been used by another member to verify their account." })
        }

        await this.processSuccessfulVerification(interaction, targetUserClientId, emailParam);

        interaction.reply({ content: `**Verification successful**. ${targetUserParam.user?.username} account is now linked to ${emailParam}!`, flags: MessageFlags.Ephemeral });
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


    private async isDuplicateEmail(modalInputEmail: string): Promise<boolean> {
        const memberEntry: Members | undefined = (await Members.findAll({
            where: {
                email: modalInputEmail,
            },
        }))[0];

        return memberEntry != undefined;
    }

    
    private async processSuccessfulVerification(interaction: ChatInputCommandInteraction, targetMemberClientId: string, targetMemberEmail: string) {
        await VerificationCodes.destroy({where: {discord_client_id: targetMemberClientId}});
        await VerificationAttempts.destroy({where: {discord_client_id: targetMemberClientId}});


        const targetUser = (await uwpscApiAxios.get("/users", {
            params: {email: targetMemberEmail}
        })).data[0];

        const memberEntry: Members | undefined = (await Members.findAll({
            where: {
                discord_client_id: targetMemberClientId,
            },
        }))[0];

        if (memberEntry == undefined) {
            await Members.create(
                {
                    discord_client_id: targetMemberClientId, 
                    email: targetMemberEmail,
                    user_id: targetUser.id 
                }
            );
        } else {
            await Members.update(
                { 
                    email: targetMemberEmail,
                    user_id: targetUser.id
                },
                { where: { discord_client_id: targetMemberClientId } },
            );
        }

        await this.assignVerifiedRole(targetMemberClientId, interaction);
    }


    private async assignVerifiedRole(targetMemberClientId: string, interaction: ChatInputCommandInteraction) {
        const verifiedRole: Role = (await interaction.guild?.roles.fetch(this.verifiedRoleId))!;
        const member: GuildMember = (await interaction.guild?.members.fetch(targetMemberClientId))!;
        (member.roles as GuildMemberRoleManager).add(verifiedRole);
    }

}