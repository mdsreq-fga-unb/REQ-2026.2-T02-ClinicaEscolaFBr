import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

const REMETENTE_PADRAO = 'Clínica Escola FBr <nao-responda@clinica.local>';

// Cabeçalho e rodapé com a identidade da FBr, só com texto e estilo simples:
// sem imagem nem bloco carregado, para o e-mail não cair no spam.
const comIdentidade = (
  conteudo: string,
) => `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2933;max-width:560px">
<p style="font-size:16px;font-weight:bold;margin:0 0 16px">Clínica Escola de Psicologia da FBr</p>
${conteudo}
<p style="font-size:13px;color:#52606d;border-top:1px solid #d9e2ec;margin-top:24px;padding-top:12px">Clínica Escola de Psicologia da FBr. Esta é uma mensagem automática: não responda a este e-mail. Em caso de dúvida, procure a secretaria da clínica.</p>
</div>`;

// Percorre caractere a caractere: uma marcação aninhada (<scr<script>ipt>) não
// sobra no resultado, o que uma única substituição por expressão regular deixaria.
const semMarcacao = (html: string) => {
  let texto = '';
  let dentroDeMarcacao = false;
  for (const caractere of html) {
    if (caractere === '<') dentroDeMarcacao = true;
    else if (caractere === '>' && dentroDeMarcacao) dentroDeMarcacao = false;
    else if (!dentroDeMarcacao) texto += caractere;
  }
  return texto;
};

const somenteTexto = (html: string) =>
  semMarcacao(
    html
      .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/g, '\n')
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2: $1'),
  )
    // Quem monta o e-mail escapa os dados como &#39;; no texto puro, volta ao caractere.
    .replace(/&#(\d+);/g, (_, codigo: string) =>
      String.fromCharCode(Number(codigo)),
    )
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

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
      html: comIdentidade(html),
      text: somenteTexto(comIdentidade(html)),
    });
  }
}
