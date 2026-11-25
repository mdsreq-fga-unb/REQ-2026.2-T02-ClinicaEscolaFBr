import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';

// Evolução de uma sessão específica (RF31): a versão vigente, as versões anteriores
// (RF29), os complementos (RF30) e a situação da validação (RF67), com as ações de
// quem consulta. Reaproveita a leitura do prontuário, filtrada pela sessão, para a
// regra de acesso ser a mesma do RF55 e do RF27.
@Injectable()
export class EvolucaoDaSessaoService {
  constructor(
    private readonly politica: PoliticaProntuario,
    private readonly prontuarios: ProntuariosService,
  ) {}

  async consultar(
    prontuarioId: string,
    sessaoId: string,
    usuario: UsuarioAutenticado,
  ) {
    // A consulta fica no registro de acessos como `consultar_evolucao` (RF56),
    // permitida ou negada, antes de qualquer leitura.
    await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      'consultar_evolucao',
      'leitura',
    );
    const p = await this.prontuarios.consultar(prontuarioId, usuario);
    const sessao = p.sessoes.find((s) => s.id === sessaoId);
    // A sessão de outro prontuário recebe a mesma resposta do acesso negado (RNF25).
    if (!sessao)
      throw new ForbiddenException('Você não tem acesso a este prontuário.');
    const evolucao = sessao.evolucao;
    return {
      prontuarioId: p.id,
      casoId: p.casoId,
      paciente: p.nome,
      supervisor: p.supervisor,
      sessao: {
        id: sessao.id,
        inicio: sessao.inicio,
        status: sessao.status,
        numeroNoCiclo: sessao.numeroNoCiclo,
        estagiarioId: sessao.estagiarioId,
        estagiario: sessao.estagiario,
      },
      evolucao,
      // O que quem consulta pode fazer aqui. A coordenação só lê.
      acoes: {
        registrar:
          !evolucao &&
          sessao.status === 'realizada' &&
          usuario.perfil === 'estagiario' &&
          sessao.estagiarioId === usuario.id,
        corrigir: evolucao?.correcao.permitida ?? false,
        complementar: evolucao?.complemento.permitido ?? false,
        validar: evolucao?.validacao.permitida ?? false,
      },
    };
  }
}
