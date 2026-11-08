import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail: jest.fn() })) },
}));

const criarTransporte = nodemailer.createTransport as jest.Mock;

describe('Envio de e-mail', () => {
  beforeEach(() => criarTransporte.mockClear());

  it('no desenvolvimento, usa o Mailpit sem usuário e o remetente padrão', async () => {
    const servico = new EmailService(
      new ConfigService({ SMTP_HOST: 'localhost', SMTP_PORT: '1025' }),
    );
    expect(criarTransporte).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      secure: false,
      requireTLS: false,
      auth: undefined,
    });
    await servico.enviar('ana@fbr.edu.br', 'Assunto', '<p>Oi</p>');
    const transporte = criarTransporte.mock.results[0].value as {
      sendMail: jest.Mock;
    };
    expect(transporte.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Clínica Escola FBr <nao-responda@clinica.local>',
      }),
    );
  });

  it('todo e-mail sai com o cabeçalho e o rodapé da clínica, sem imagem, e com a versão em texto', async () => {
    const servico = new EmailService(
      new ConfigService({ SMTP_HOST: 'localhost', SMTP_PORT: '1025' }),
    );
    await servico.enviar(
      'ana@fbr.edu.br',
      'Assunto',
      '<p>Confirme pelo <a href="https://exemplo/x">link</a>.</p>',
    );
    const transporte = criarTransporte.mock.results[0].value as {
      sendMail: jest.Mock;
    };
    const { html, text } = transporte.sendMail.mock.calls[0][0] as {
      html: string;
      text: string;
    };
    expect(html).toContain('Clínica Escola de Psicologia da FBr');
    expect(html).toContain('<p>Confirme pelo');
    expect(html).toContain('mensagem automática');
    expect(html).not.toMatch(/<img/);
    expect(text).toContain('link: https://exemplo/x');
    expect(text).not.toMatch(/<[a-z]/);
  });

  it('na implantação, usa o relay do Google Workspace, sem usuário e com o domínio no EHLO', async () => {
    const servico = new EmailService(
      new ConfigService({
        SMTP_HOST: 'smtp-relay.gmail.com',
        SMTP_PORT: '587',
        SMTP_EHLO: 'fbr.edu.br',
        SMTP_FROM: 'Clínica Escola FBr <nao-responda@fbr.edu.br>',
      }),
    );
    expect(criarTransporte).toHaveBeenCalledWith({
      host: 'smtp-relay.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      name: 'fbr.edu.br',
      auth: undefined,
    });
    await servico.enviar('ana@fbr.edu.br', 'Assunto', '<p>Oi</p>');
    const transporte = criarTransporte.mock.results[0].value as {
      sendMail: jest.Mock;
    };
    expect(transporte.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Clínica Escola FBr <nao-responda@fbr.edu.br>',
      }),
    );
  });

  it('com uma conta própria do Google, usa usuário, senha de app e TLS na porta 465', async () => {
    const servico = new EmailService(
      new ConfigService({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '465',
        SMTP_USER: 'clinica@fbr.edu.br',
        SMTP_PASS: 'senha-de-app',
        SMTP_FROM: 'Clínica Escola FBr <clinica@fbr.edu.br>',
      }),
    );
    expect(criarTransporte).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      requireTLS: false,
      auth: { user: 'clinica@fbr.edu.br', pass: 'senha-de-app' },
    });
    await servico.enviar('ana@fbr.edu.br', 'Assunto', '<p>Oi</p>');
    const transporte = criarTransporte.mock.results[0].value as {
      sendMail: jest.Mock;
    };
    expect(transporte.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Clínica Escola FBr <clinica@fbr.edu.br>',
      }),
    );
  });
});
