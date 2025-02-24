import { SendSmtpEmail, TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import type IConfig from "../interfaces/IConfig.js";


const brevoClient: TransactionalEmailsApi = new TransactionalEmailsApi();


export function brevoInit(config: IConfig): void {
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, config.brevo.brevoKey); 
}


export async function sendVerificationEmail(config: IConfig, emailAddress: string, verificationCode: string) {
    const sendSmtpEmail: SendSmtpEmail = {
        to: [{
            email: emailAddress,
        }],
        templateId: parseInt(config.brevo.verification_email_template_id),
        params: {
            verificationCode: verificationCode,
        },
    };

    brevoClient.sendTransacEmail(sendSmtpEmail);
}
