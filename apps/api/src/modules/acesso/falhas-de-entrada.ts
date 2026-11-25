import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Entradas com erro aceitas por endereço de origem numa janela de 10 minutos
// (RNF49). O limite vem de LIMITE_ENTRADAS_POR_ORIGEM (padrão de 30).
export const LIMITE_ENTRADAS_PADRAO = 30;
export const JANELA_ENTRADAS_MINUTOS = 10;
// Limite de endereços guardados em memória.
const MAX_ORIGENS = 10_000;

// O bloqueio de 15 minutos na 3ª senha errada vale por conta (DF25). Sem um
// limite por origem, quem testa senhas de muitas contas a partir do mesmo
// endereço bloquearia todas elas. Só as senhas erradas contam: a entrada certa e
// a tentativa numa conta já bloqueada não gastam o limite. Ainda assim, 30
// senhas erradas da mesma rede (a clínica sai por um endereço só) barram a rede
// por até 10 minutos; o limite pode subir com LIMITE_ENTRADAS_POR_ORIGEM.
// A contagem fica na memória, como nos limites da inscrição (RF1) e da
// verificação (RF52): zera quando a API reinicia e basta enquanto a API roda
// numa instância só. Atrás de proxy, SALTOS_DE_PROXY faz a origem ser o visitante.
@Injectable()
export class FalhasDeEntrada {
  private readonly falhas = new Map<string, number[]>();
  private readonly limite: number;

  constructor(config: ConfigService) {
    this.limite =
      Number(config.get('LIMITE_ENTRADAS_POR_ORIGEM')) ||
      LIMITE_ENTRADAS_PADRAO;
  }

  // Recusa com 429, antes de conferir a senha, a origem que chegou ao limite.
  exigirAbaixoDoLimite(origem: string) {
    if (this.recentes(origem).length >= this.limite) {
      throw new HttpException(
        'Muitas tentativas de entrada deste local em pouco tempo. Tente de novo em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registrar(origem: string) {
    const recentes = this.recentes(origem);
    recentes.push(Date.now());
    this.falhas.delete(origem);
    this.falhas.set(origem, recentes);
    if (this.falhas.size > MAX_ORIGENS) {
      const maisAntiga = this.falhas.keys().next().value;
      if (maisAntiga !== undefined) this.falhas.delete(maisAntiga);
    }
  }

  private recentes(origem: string) {
    const desde = Date.now() - JANELA_ENTRADAS_MINUTOS * 60_000;
    return (this.falhas.get(origem) ?? []).filter((em) => em > desde);
  }
}
