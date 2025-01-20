export default interface IConfig {
    token: string;
    clientId: string;
    guildId: string;
    verifiedRoleId: string;
    brevo: {
        brevoKey: string, 
        authEmailAddress: string;
    }
}