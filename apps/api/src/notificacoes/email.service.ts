import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

const REMETENTE_PADRAO = 'Clínica Escola FBr <nao-responda@clinica.local>';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly remetente: string;

  constructor(config: ConfigService) {
    const port = Number(config.getOrThrow('SMTP_PORT'));
    const user = config.get<string>('SMTP_USER');
    // No desenvolvimento, o Mailpit aceita sem usuário. Na implantação, o relay
    // SMTP do Google Workspace da FBr autoriza pelo IP do servidor e pede que a
    // conexão se apresente com o domínio (SMTP_EHLO); com uma conta própria, o
    // Google pede usuário e senha de app. TLS direto na 465 e STARTTLS
    // obrigatório na 587: sem ele, quem estiver no caminho poderia tirar o TLS e
    // ler os convites e os códigos. O Mailpit (1025) fica sem TLS.
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      requireTLS: port === 587,
      name: config.get<string>('SMTP_EHLO') || undefined,
      auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
    });
    this.remetente = config.get<string>('SMTP_FROM') || REMETENTE_PADRAO;
  }

  enviar(para: string, assunto: string, html: string) {
    return this.transporter.sendMail({
      from: this.remetente,
      to: para,
      subject: assunto,
      html,
    });
  }
}
