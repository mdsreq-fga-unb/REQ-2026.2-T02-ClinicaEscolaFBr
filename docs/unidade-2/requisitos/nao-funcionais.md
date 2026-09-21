## 8.2 Lista de Requisitos Não Funcionais

<!-- Aqui é somente a parte da CP9 -->
## 8.2 Lista de Requisitos Não Funcionais - CP9

**Característica de Produto:** CP9 - Emissão de declaração de comparecimento.

**Features relacionadas:** RF9.1 a RF9.5 (ver 8.1).

| ID | Categoria | Requisito | Métrica/Meta | Forma de Verificação |
| -- | --------- | --------- | ------------ | -------------------- |
| RNF9.1 | Privacidade (LGPD/CFP) | A declaração deve conter apenas os dados estritamente necessários e nenhum dado clínico (queixa, prioridade, diagnóstico, evolução). | 0 campos clínicos no modelo do documento; conteúdo mínimo aprovado pela FBr. | Revisão do modelo do documento; teste de conteúdo gerado. | RF9.2, RF9.3, RF9.4, RF9.5 |
| RNF9.2 | Segurança | Somente perfis autorizados podem emitir declarações, e o paciente/responsável só acessa as próprias. | 0 acessos indevidos em testes de autorização por perfil (paciente, secretaria, estagiário, supervisor). | Testes de autorização (cenários positivos e negativos). | RF9.1 a RF9.4 |
| RNF9.3 | Auditoria | Toda emissão e reemissão deve ser registrada com usuário, data/hora, sessão e paciente, distinguindo emissão original de reemissão. | 100% das emissões e reemissões com registro de auditoria. | Teste de integração verificando o registro após cada emissão. | RF9.2, RF9.3, RF9.4 |
| RNF9.4 | Desempenho | A geração da declaração deve ser rápida o bastante para o atendimento presencial na secretaria. | Documento disponível em até 5 s em 95% das solicitações, em condições normais de uso. | Teste de desempenho com dados representativos. | RF9.2, RF9.3, RF9.4 |
| RNF9.5 | Usabilidade | A emissão deve ser simples para a secretaria e para pacientes com pouca familiaridade com tecnologia. | Emissão concluída em até 3 interações a partir da tela do paciente; sem necessidade de treinamento prévio. | Teste de usabilidade com usuários representativos. | RF9.1, RF9.2 |
| RNF9.6 | Portabilidade/Uso | O documento gerado deve poder ser impresso e visualizado em celular. | Formato PDF em A4; legível em impressão preto e branco e em tela de celular. | Inspeção do documento em impressão e em dispositivo móvel. | RF9.2, RF9.3, RF9.4 |
| RNF9.7 | Acessibilidade | A tela de emissão e o documento devem ser acessíveis a pessoas com limitações visuais. | Texto pesquisável (não imagem), contraste adequado e navegação por teclado; meta de conformidade a definir junto ao RNF de acessibilidade da CP12. | Verificação com leitor de tela e checklist de acessibilidade. | RF9.1, RF9.2 |
| RNF9.8 | Integridade | O conteúdo da declaração deve refletir fielmente o registro da sessão no momento da emissão, e a reemissão deve manter consistência com o original. | 100% dos campos do documento coincidem com o registro da sessão nos testes. | Teste comparando o documento com os dados de origem. | RF9.2, RF9.3 |
| RNF9.9 | Segurança (consulta) | A verificação de autenticidade por terceiros não deve expor dados pessoais além do necessário. *(A validar, depende de RF9.5)* | A consulta pública retorna apenas confirmação de autenticidade e dados mínimos definidos com a FBr. | Teste da consulta pública e revisão de dados retornados. | RF9.5 |

---

### Observações

- Os RNFs de segurança e privacidade (RNF9.1 a RNF9.3) devem ser alinhados com os requisitos gerais da CP11 (perfis de acesso e sigilo), evitando duplicidade.
- O RNF9.7 deve seguir a meta de acessibilidade definida para a CP12, para manter um único padrão no sistema.
- As metas de desempenho e usabilidade são propostas iniciais e podem ser ajustadas após a validação com a FBr.

---

### Histórico de revisão

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 21/09/2026 | 0.1 | RNFs iniciais relacionados à CP9 | Maria Clara |
