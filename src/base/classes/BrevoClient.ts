import { SendSmtpEmail, TransactionalEmailsApi } from "@getbrevo/brevo";
import type BossClient from "./BossClient.js";

export default class BrevoClient extends TransactionalEmailsApi {
    client: BossClient;

    constructor(client: BossClient) {
        super();
        this.client = client;
    }

    
    init(): void {
        let apiKey = this.authentications['apiKey'];
        apiKey.apiKey = this.client.config.brevo.brevoKey;
    }


    sendVerificationEmail(emailAddress: string, verificationCode: string): void {
        const sendSmtpEmail = new SendSmtpEmail();

        sendSmtpEmail.subject = "UWPSC discord interface verification code";
        sendSmtpEmail.htmlContent = 
        `<html><body><p>Please click on the "Enter verification code" button in the discord reply and enter this code</p><br>
        <h3>{{ params.verificationCode }}</h3><br> 
        <p>Do NOT share this code with anyone else.</p></body></html>`;
        sendSmtpEmail.sender = { "email": this.client.config.brevo.authEmailAddress };
        sendSmtpEmail.to = [{ "email": emailAddress }];
        sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
        sendSmtpEmail.params = { "verificationCode": verificationCode };


        this.sendTransacEmail(sendSmtpEmail);
    }
}