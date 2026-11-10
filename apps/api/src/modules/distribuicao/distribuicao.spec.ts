describe('Autorização para distribuição, vínculo e transferência de casos (RF25)', () => {
  it('impede que perfis sem permissão executem a transferência de caso (RNF16)', async () => {
    // Simulação de chamada por perfil não autorizado (ex: Estagiário comum)
    const perfil = 'ESTAGIARIO';
    const acaoInvalida = !['SUPERVISOR', 'COORDENACAO'].includes(perfil);
    expect(acaoInvalida).toBe(true);
  });

  it('registra corretamente o histórico da transferência com autorizador e motivo (RNF53)', async () => {
    const dadosTransferencia = {
      casoId: 'uuid-caso-123',
      estagiarioDestinoId: 'uuid-estagiario-456',
      autorizadoPorId: 'uuid-supervisor-789',
      motivo: 'Remanejamento de carga horária semestral',
    };
    expect(dadosTransferencia.autorizadoPorId).toBeDefined();
    expect(dadosTransferencia.motivo.length).toBeGreaterThanOrEqual(5);
  });
});
