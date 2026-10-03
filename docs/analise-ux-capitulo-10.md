# Melhorias de UX a partir do capítulo 10

A análise usa o capítulo **Princípios e Diretrizes para o Design de IHC**, do livro *Interação Humano-Computador e Experiência do Usuário*, de Barbosa et al. (2021), páginas impressas 237–260, fornecido em `ihc-ux Cap. 10.pdf`.

O objeto avaliado é o site de documentação acadêmica, cujo uso principal é ler o projeto, localizar requisitos e conferir decisões. Esta análise por inspeção não substitui uma avaliação com leitores reais, como o próprio capítulo ressalta na seção 10.1.

| Diretriz do capítulo | Problema observado | Melhoria aplicada |
| --- | --- | --- |
| 10.2.2 — Simplicidade nas estruturas das tarefas | Localizar um requisito em páginas longas exige muitos deslocamentos. | Busca na própria página por código, título ou palavra do conteúdo, com links diretos ao texto completo. |
| 10.2.3 — Controle e liberdade | Um destino dentro de um acordeão pode continuar oculto após navegar por um link. | Abertura do requisito e dos ancestrais ao acessar uma âncora; foco no título após navegação. A busca pode ser limpa sem perder o documento. |
| 10.2.5 — Eficiência | Códigos conhecidos não oferecem um caminho suficientemente rápido até o requisito. | Correspondência exata para RF/RNF, inclusive com zeros à esquerda e espaços. A busca por assunto ignora diferenças de maiúsculas e acentos. |
| 10.2.7 — Visibilidade e reconhecimento | O leitor precisa deduzir os resultados da busca e a existência de colunas fora da tela. | Contagem de resultados anunciada a tecnologias assistivas e instrução visível para tabelas que têm rolagem horizontal. |
| 10.2.8 — Conteúdo relevante e expressão adequada | Controles precisam explicar seu alcance e como usá-los. | Rótulo explícito de busca nesta página, exemplos de códigos e orientação sobre o destino dos resultados. |
| 10.2.9 — Projeto para erros | Uma busca sem resultados ou um endereço inexistente pode interromper a leitura. | Mensagem de busca vazia com alternativas de recuperação e página 404 em português com retorno ao início. |
| 10.3 — Padrões de design de IHC | Acordeões reduzem a extensão visível, mas precisam preservar o acesso ao conteúdo. | Preservação dos acordeões nativos e expansão de todos os requisitos durante a impressão, com restauração depois. |

As mudanças são progressivas: sem JavaScript, os textos e índices escritos em Markdown permanecem disponíveis. A busca adicionada não envia termos a serviços externos nem altera o conteúdo dos requisitos.

## Avaliação sugerida com leitores

Peça a leitores que encontrem um requisito pelo código, outro pelo assunto, consultem as últimas colunas de uma tabela no celular e recuperem uma busca sem resultado. Registre conclusão das tarefas, tempo, erros e dúvidas. Compare esses resultados com a versão anterior antes de afirmar ganhos quantitativos de usabilidade.

## Referência

Barbosa, S. D. J.; Silva, B. S. da; Silveira, M. S.; Gasparini, I.; Darin, T.; Barbosa, G. D. J. (2021). *Interação Humano-Computador e Experiência do Usuário*. Autopublicação. ISBN 978-65-00-19677-1. Capítulo 10.
