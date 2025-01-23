export default interface IConfig {
    discord: {
        token: string;
        clientId: string;
        guildId: string;
        verifiedRoleId: string;
    };
    brevo: {
        brevoKey: string, 
        verification_email_template_id: string
    };
    uwpsc: {
        apiUrl: string;
        cookieName: string;
        username: string;
        password: string;
    };
}