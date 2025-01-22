export default interface IConfig {
    discord: {
        token: string;
        clientId: string;
        guildId: string;
        verifiedRoleId: string;
    };
    brevo: {
        brevoKey: string, 
        authEmailAddress: string;
    };
    uwpsc: {
        apiUrl: string;
        cookieName: string;
        username: string;
        password: string;
    };
}