---
render_macros: true
---

# Features e backlog

Esta é a lista única das features do produto e do backlog de construção, com o ciclo em que cada feature é construída e o seu Líder de Feature. O detalhamento fica nas unidades:

- a declaração de cada feature, com o RF, os critérios de aceitação e a rastreabilidade, está em [Requisitos Funcionais (8.1)](../unidade-2/requisitos/funcionais.md);
- os RNFs que restringem as features estão em [Requisitos Não Funcionais (8.2)](../unidade-2/requisitos/nao-funcionais.md) e na [classificação dos RNFs para o MVP (10.2.3.1)](../unidade-2/requisitos/backlog.md#10231-classificacao-dos-requisitos-nao-funcionais-para-o-mvp);
- o motivo de cada feature estar ou não no MVP está na [priorização e recorte do MVP (10.2)](../unidade-2/requisitos/backlog.md#102-priorizacao-e-recorte-do-mvp), validada com a Clínica Escola FBr, e as decisões posteriores, no [Registro de Decisões com a FBr](../unidade-2/requisitos/decisoes-fbr.md);
- as datas e o status de cada ciclo estão no [Cronograma geral](cronograma.md).

**Status de cada feature:** é acompanhado na issue da feature e no [Project do repositório](https://github.com/orgs/mdsreq-fga-unb/projects/124), atualizado a cada marco do FDD, e copiado para o [catálogo de requisitos](../unidade-2/requisitos/backlog.md#catalogo-de-requisitos) na PR que muda o estado da feature, de onde aparece na linha "Entrega e situação" de cada RF. As tabelas desta página são geradas do catálogo, a cada publicação do site.

_Última atualização do status dos ciclos: 07/11/2026._

## Situação por ciclo

{{ tabela_situacao_ciclos() }}

O RF19 (áreas de especialidade) foi removido em 24/10/2026, por decisão da FBr ([DF26](../unidade-2/requisitos/decisoes-fbr.md#df26)), e não entra nas contagens.

## Como ler o backlog

O backlog segue o processo **Planejar por Feature** do FDD:

- **Feature (RF):** cada feature declara um requisito funcional e leva à sua declaração completa.
- **Ordem:** ordem de construção, ciclo a ciclo, respeitando as dependências declaradas na rastreabilidade de cada RF. Os itens que servem de base para os demais (acesso, inscrição, triagem, distribuição de casos e agendamento) vêm primeiro.
- **Depende de:** lista só as dependências obrigatórias, sempre pelo RF necessário; integrações e apoios opcionais ficam na rastreabilidade de cada RF ([como ler a rastreabilidade](../unidade-2/requisitos/funcionais.md#como-ler-a-rastreabilidade)).
- **Ciclo:** ciclo em que a feature passa pelos processos **Projetar por Feature** e **Construir por Feature**. A carga de cada Líder de Feature foi distribuída pelas horas estimadas na [escala de esforço](../unidade-2/requisitos/backlog.md#10212-escalas-adotadas), e cada CP do MVP tem ao menos um incremento construído até a entrega da Unidade 3, em 17/11. A construção do MVP termina no Ciclo 6, como combinado com a FBr; o Ciclo 7 fica reservado à demonstração integrada, ao aceite da FBr e à entrega da Unidade 4, em 10/12.
- **Líder de Feature:** integrante que conduz o projeto, a construção e a demonstração da feature, conforme a [composição da equipe](../unidade-1/gestao/equipe-comunicacao.md#71-composicao-da-equipe). Cada feature tem ainda a revisão cruzada de outro integrante nas inspeções de design e de código.
- **Issue:** issue do GitHub em que a feature é acompanhada e em que as avaliações do [DoR e do DoD](../unidade-2/requisitos/dor-dod.md) são registradas, quando já criada.

## Backlog do MVP por ciclo

### Ciclo 3 (14/10 a 27/10) · {{ ciclos[3].status }} { #ciclo-3 }

O resultado de cada feature está no [fechamento do Ciclo 3](cronograma.md#ciclo-3-fechado-em-27102026).

Antes das features, Gabriel preparou a base técnica do projeto (repositório, banco de dados, autenticação base, integração contínua, envio de e-mail e geração de PDF), da qual todas dependem. Ela foi concluída em 21/10/2026, no [PR #82](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/82). O DoR e o [projeto das features do Ciclo 3](../unidade-3/projeto-features-ciclo-3.md) estão registrados nas issues.

{{ tabela_ciclo(3) }}

### Ciclo 4 (28/10 a 10/11) · {{ ciclos[4].status }} { #ciclo-4 }

{{ tabela_ciclo(4) }}

### Ciclo 5 (11/11 a 17/11) · {{ ciclos[5].status }} { #ciclo-5 }

Ao fim deste ciclo, em 17/11, acontece a entrega da Unidade 3: todas as CPs do MVP com ao menos um incremento construído.

{{ tabela_ciclo(5) }}

### Ciclo 6 (18/11 a 01/12) · {{ ciclos[6].status }} { #ciclo-6 }

{{ tabela_ciclo(6) }}

### Ciclo 7 (02/12 a 10/12) · {{ ciclos[7].status }} { #ciclo-7 }

Sem novas features: demonstração integrada do MVP, aceite da FBr, correções apontadas e entrega da Unidade 4, em 10/12.

## Versões posteriores { #versoes-posteriores }

Estas features ficam fora do recorte do MVP e voltam a ser avaliadas ao fim da Unidade 4. O motivo de cada uma está na [definição do MVP](../unidade-2/requisitos/backlog.md#1023-definicao-do-mvp); as condições combinadas com a FBr para o período em que não estão construídas estão na [validação do MVP com o cliente](../unidade-2/requisitos/backlog.md#1024-validacao-do-mvp-com-o-cliente) e no próprio RF.

{{ tabela_posteriores() }}

## Features por área e conjunto (FDD) { #features-por-area-e-conjunto }

A lista de features do FDD organiza as features por área e por conjunto de features. A tabela mostra o Líder de Feature de cada conjunto e o ciclo em que o conjunto fica concluído no MVP.

{{ tabela_conjuntos() }}
