---
render_macros: true
---

# Unidade 3 — Construção do MVP

Visão geral da Unidade 3: a construção das primeiras features do MVP nos Ciclos 3, 4 e 5, com a representação, a verificação e a validação de cada feature conduzidas pelo DoR e pelo DoD, até a entrega da unidade em 17/11/2026.

!!! info "Andamento do projeto"
    Esta página é o registro da Unidade 3. A referência vigente (requisitos, backlog e processo) está nas outras partes do menu, explicadas em [Organização e atualização](../organizacao-e-atualizacao.md). O cronograma geral e o backlog, com o status de cada ciclo, ficam na Visão geral do projeto: [Cronograma geral](../visao-geral/cronograma.md) e [Features e backlog](../visao-geral/backlog.md).

## Ciclos da unidade

| Ciclo | Período | Foco |
| --- | --- | --- |
| Ciclo 3 | 14/10 a 27/10/2026 | Base técnica, acesso, inscrição, triagem, distribuição de casos, agendamento e prontuário |
| Ciclo 4 | 28/10 a 10/11/2026 | Continuação dos conjuntos iniciados no Ciclo 3 e novos conjuntos do MVP |
| Ciclo 5 | 11/11 a 17/11/2026 | Consolidação dos incrementos e entrega da Unidade 3 |

Os itens de cada ciclo, com o Líder de Feature e as dependências, estão em [Features e backlog](../visao-geral/backlog.md). Cada feature é acompanhada na sua issue do GitHub, que traz os checklists do [DoR e do DoD](../unidade-2/requisitos/dor-dod.md).

## O que foi realizado

Estado de cada feature dos Ciclos 3 e 4 no marco do FDD que ela alcançou, copiado das issues para o [catálogo de requisitos](../unidade-2/requisitos/backlog.md#catalogo-de-requisitos) (atualizado em {{ catalogo_atualizado_em }}). A partir de "Promovida para a versão integrada", a feature está na `development`, publicada no ambiente de validação da FBr.

{{ tabela_andamento(3, 4) }}

As evidências de cada marco ficam na issue da feature:

- **Inspeção de design e de código:** comentários "Inspeção de design (DoD 1)" e a aprovação da pull request; o resumo está em [Execução do processo](../visao-geral/execucao-do-processo.md#revisoes-do-modelo).
- **Testes:** cada pull request roda os testes unitários, de integração e ponta a ponta no CI, e o merge roda de novo na `development`. Os testes citam o RF e o RNF no nome, e o robô de acompanhamento usa os relatórios para marcar a verificação dos RNFs de cada feature (D4.5), como explicado em [Boas práticas no GitHub](../unidade-1/gestao/boas-praticas-github.md#verificacao-dos-rnfs-d45).
- **Demonstração e aceite:** a demonstração do Ciclo 3 à FBr está na [ata de 06/11/2026](reunioes.md#reuniao-de-validacao-do-ciclo-3-com-a-fbr); o aceite formal é pedido por escrito e registrado com o comando `/aceite` na issue.

## Conteúdo da unidade

### Gestão do projeto

<div class="unit-cards" markdown>

- [:material-calendar-month-outline: **Cronograma e Entregas** Ciclos, atividades e entregas da unidade.](gestao/cronograma.md)
- [:material-forum-outline: **Reuniões** Registros e atas das reuniões da unidade.](reunioes.md)

</div>

### Referências da construção

<div class="unit-cards" markdown>

- [:material-layers-outline: **Arquitetura técnica** Partes do sistema, módulos por CP, caminho de uma requisição e decisões técnicas.](arquitetura.md)
- [:material-sitemap-outline: **Projeto das features** Modelo detalhado, diagramas de cada feature dos Ciclos 3 e 4, por característica de produto, e roteiro da inspeção de design.](projeto-features.md)
- [:material-cellphone-link: **Protótipos** Telas das features dos Ciclos 3 e 4, organizadas pelo fluxo do sistema.](prototipos.md)
- [:material-file-sign: **Termo de consentimento (versão 0.1)** Texto do termo aceito na inscrição, em revisão pela FBr.](termo-consentimento.md)
- [:material-server-network: **Implantação e segurança** Ambientes no Coolify da FBr, como o deploy acontece, HTTPS, usuário da aplicação no banco e troca da chave dos dados (RNF51 e RNF52).](implantacao.md)
- [:material-backup-restore: **Cópia de segurança e restauração** Procedimento do RNF53, com os scripts e o teste de restauração.](copia-de-seguranca.md)
- [:material-speedometer: **Teste de carga** Cenário de referência do RNF12 e do RNF21, com a massa de dois semestres.](teste-de-carga.md)
- [:material-check-decagram-outline: **9. DoR e DoD** Critérios de entrada na construção e de feature pronta.](../unidade-2/requisitos/dor-dod.md)
- [:material-rocket-launch-outline: **Features e backlog** Itens do MVP por ciclo e Líder de Feature.](../visao-geral/backlog.md)

</div>

### Aprendizados

<div class="unit-cards" markdown>

- [:material-school-outline: **Lições Aprendidas** O que a equipe aprendeu na unidade.](licoes-aprendidas.md)

</div>

## Vídeo de Apresentação da Unidade 3

!!! info "Vídeo em produção"
    O vídeo de apresentação da Unidade 3 será publicado aqui junto com a entrega da unidade, prevista para 17/11/2026.

<!--
  Quando o vídeo estiver no YouTube, apague o aviso acima e descomente o bloco
  abaixo, trocando ID_DO_VIDEO pelo código do link (youtu.be/ID_DO_VIDEO).

<div class="video-container">
  <iframe
    src="https://www.youtube.com/embed/ID_DO_VIDEO"
    title="Apresentação da Unidade 3 — Clínica Escola FBr"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen>
  </iframe>
</div>

▶ **[Assistir no YouTube](https://youtu.be/ID_DO_VIDEO)**
-->
