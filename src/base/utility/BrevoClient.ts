import { SendSmtpEmail, TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import type IConfig from "../interfaces/IConfig.js";


const brevoClient: TransactionalEmailsApi = new TransactionalEmailsApi();


export function brevoInit(config: IConfig): void {
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, config.brevo.brevoKey); 
}


export function sendVerificationEmail(config: IConfig, emailAddress: string, verificationCode: string): void {
    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = "UWPSC discord interface verification code";
    sendSmtpEmail.htmlContent = 
        `<html><body><p>Please click on the "Enter verification code" button in the discord reply and enter this code.</p><br>
        <h3>{{ params.verificationCode }}</h3><br> 
        <p>Do NOT share this code with anyone else.</p></body></html>`;
    sendSmtpEmail.sender = { "email": config.brevo.authEmailAddress };
    sendSmtpEmail.to = [{ "email": emailAddress }];
    sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
    sendSmtpEmail.params = { "verificationCode": verificationCode };

    brevoClient.sendTransacEmail(sendSmtpEmail);
}
