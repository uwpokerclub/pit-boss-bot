export default interface IConfig {
    token: string;
    clientId: string;
    guildId: string;
    brevo: {
        brevoKey: string, 
        authEmailAddress: string;
    }
}