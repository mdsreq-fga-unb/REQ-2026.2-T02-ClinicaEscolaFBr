import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor(config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: Number(config.getOrThrow('SMTP_PORT')),
    });
  }

  enviar(para: string, assunto: string, html: string) {
    return this.transporter.sendMail({
      from: 'Clínica Escola FBr <nao-responda@clinica.local>',
      to: para,
      subject: assunto,
      html,
    });
  }
}
