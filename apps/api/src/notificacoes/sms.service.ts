import { Injectable, Logger } from '@nestjs/common';

// Provisório: só escreve no log. O provedor real de SMS depende de decisão com a FBr (custo).
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async enviar(telefone: string, mensagem: string) {
    this.logger.log(`[SMS simulado] para ${telefone}: ${mensagem}`);
  }
}
