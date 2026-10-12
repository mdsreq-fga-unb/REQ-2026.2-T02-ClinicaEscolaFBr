# 3. Intervenção Social

A solução tende a produzir uma intervenção social voltada à melhoria do acesso e da organização dos serviços de atendimento psicológico oferecidos pela Clínica Escola da FBr à comunidade, especialmente para pessoas que dependem desse serviço como alternativa de atendimento psicológico acessível. A solução também deverá modificar os fluxos de trabalho da clínica, tornando mais organizada a relação entre pacientes, estagiários, supervisores, coordenação e secretaria.

Entre os impactos pretendidos, destacam-se:

- facilitar o acesso da comunidade às vagas oferecidas pela Clínica Escola;
- tornar o processo de inscrição, agendamento e acompanhamento dos atendimentos mais simples e acessível;
- reduzir perdas de vagas decorrentes de faltas, cancelamentos sem aviso ou dificuldades de confirmação;
- permitir uma busca mais ativa por pacientes da fila de espera quando surgirem vagas;
- melhorar a organização e o acompanhamento dos atendimentos realizados pelos estagiários;
- aumentar a transparência para os pacientes em relação ao agendamento e à situação de sua solicitação de atendimento;
- reduzir a dependência de registros manuais e informações dispersas;
- contribuir para um melhor aproveitamento da capacidade de atendimento da Clínica Escola;
- fortalecer a relação da instituição com a comunidade por meio de um serviço social mais organizado e eficiente.

Ao mesmo tempo, a solução pode gerar efeitos emergentes, não totalmente previstos, que precisam ser observados, como:

- possível exclusão ou dificuldade de uso por pessoas com menor familiaridade ou acesso a tecnologias digitais;
- aumento da demanda pelos serviços da Clínica Escola em razão da maior facilidade de inscrição;
- criação de expectativas nos pacientes relacionadas à posição na fila de espera e ao tempo necessário para o atendimento;
- maior dependência da clínica em relação ao sistema digital para realização de suas atividades;
- riscos relacionados à privacidade, segurança e exposição de dados pessoais e informações sensíveis dos pacientes;
- necessidade de adaptação dos estagiários, supervisores e funcionários aos novos fluxos de trabalho;
- possibilidade de classificações ou decisões inadequadas caso mecanismos automáticos sejam utilizados sem validação de profissionais responsáveis.

Assim, a intervenção social promovida pela Clínica Escola FBr não consiste apenas em digitalizar os processos administrativos da Clínica Escola. A solução interfere diretamente na forma como a comunidade acessa o atendimento psicológico, como as vagas disponíveis são utilizadas, como pacientes e instituição se comunicam e como estagiários, supervisores e profissionais organizam o atendimento. Por isso, os requisitos da solução devem considerar não apenas ganhos de eficiência operacional, mas também acessibilidade, inclusão digital, transparência, privacidade, segurança das informações e os possíveis efeitos decorrentes do uso real do sistema.

## 3.1 Efeitos emergentes: decisões e respostas verificáveis

A análise a seguir deriva dos riscos identificados na seção anterior e na [issue #14](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/14). As respostas são **propostas de requisitos e medidas operacionais**, sujeitas a revisão da equipe e validação com a Clínica Escola. Os códigos de CP, RF e RNF seguem a numeração final da Unidade 2, e a coluna "Situação" foi atualizada após a validação do MVP (08/10/2026). A documentação desta proposta não equivale à confirmação de que a medida já foi implementada ou aprovada pelo cliente.

| ID | Efeito emergente | Resposta proposta e vínculo | Critério de verificação ou evidência esperada | Situação |
| --- | --- | --- | --- | --- |
| IS01 | Exclusão digital | Preservar inscrição assistida ou presencial pela secretaria, com registro no mesmo fluxo da inscrição web ([CP1/RF3](../unidade-2/requisitos/funcionais.md#rf3)); observar os recursos de acessibilidade da **CP14** ([RNF56](../unidade-2/requisitos/nao-funcionais.md#rnf56)). O canal presencial é também uma decisão operacional da clínica. | Demonstrar uma inscrição feita com auxílio da secretaria e confirmar com a clínica como e quando o canal presencial será oferecido. | Validado com a clínica em 07/10/2026: com o RF3 fora do MVP, a recepção preenche o mesmo formulário do sistema ([RF1](../unidade-2/requisitos/funcionais.md#rf1)), e a pessoa entra na mesma fila ([10.2.4](../unidade-2/requisitos/backlog.md#1024-validacao-do-mvp-com-o-cliente)). |
| IS02 | Aumento da demanda | Exibir informações institucionais aprovadas sobre disponibilidade/capacidade e critérios de atendimento ([CP3/RF9](../unidade-2/requisitos/funcionais.md#rf9); [RNF8](../unidade-2/requisitos/nao-funcionais.md#rnf8)), sem divulgar dados identificáveis de outros inscritos. A coordenação define o conteúdo e a frequência de atualização. | Conferir a publicação de informação autorizada pela coordenação e testar a ausência de nomes/dados de terceiros. | Requisito declarado; RF9 fora do MVP (entrega futura). |
| IS03 | Expectativa de atendimento decorrente da posição | Ao consultar a fila ([CP3/RF8](../unidade-2/requisitos/funcionais.md#rf8); [RNF7](../unidade-2/requisitos/nao-funcionais.md#rnf7)), informar que a posição é dinâmica e não constitui previsão ou garantia de prazo. | Em cenário de consulta individual, visualizar posição e aviso explicativo; verificar que não há promessa automática de data. | Requisito declarado e incluído no MVP; texto do aviso a validar com a clínica. |
| IS04 | Classificação automatizada inadequada | Manter a decisão de prioridade sob revisão final da equipe da clínica ([CP2/RF6](../unidade-2/requisitos/funcionais.md#rf6)); a ordenação da fila ([CP3/RF7](../unidade-2/requisitos/funcionais.md#rf7)) utilizará apenas a classificação confirmada pelo responsável. | Testar inscrição com triagem pendente: ela não deve receber prioridade definitiva na fila antes da decisão profissional. | Requisito declarado e incluído no MVP; o sistema não atribui prioridade automaticamente. |
| IS05 | Dependência tecnológica | Definir procedimento institucional de contingência para indisponibilidade, guarda temporária segura de registros e reconciliação após restabelecimento; relacionar os controles técnicos à **CP12** ([RNF53](../unidade-2/requisitos/nao-funcionais.md#rnf53)) e à disponibilidade do agendamento ([RNF14](../unidade-2/requisitos/nao-funcionais.md#rnf14)). | Registrar procedimento aprovado, responsável, simulação de indisponibilidade e conferência da reconciliação sem perda ou duplicação de solicitações. | Controles técnicos declarados; procedimento operacional a definir com a clínica. |
| IS06 | Exposição de dados pessoais e sensíveis | Restringir dados coletados, proteger queixas e acessos ([CP2/RNF3](../unidade-2/requisitos/nao-funcionais.md#rnf3); [CP3/RNF6](../unidade-2/requisitos/nao-funcionais.md#rnf6); **CP12**, com [RF55](../unidade-2/requisitos/funcionais.md#rf55), [RF57](../unidade-2/requisitos/funcionais.md#rf57) e [RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51)); consulta da fila não pode revelar dados de terceiros. | Testar acesso indevido, inspeção de mensagens e logs, e ausência de nomes/queixas de terceiros na consulta individual. | Requisitos declarados e incluídos no MVP; base legal do tratamento pendente com a FBr ([Pendências](../unidade-2/requisitos/analise-feedback.md#pendencias-de-validacao-com-a-fbr)). |
| IS07 | Mudança dos fluxos de trabalho | Planejar orientação à secretaria, estagiários, supervisores e coordenação e validar cenários operacionais antes da adoção. | Disponibilizar roteiro de capacitação e registrar demonstração, participantes, observações e decisões de ajuste. | Medida de gestão; agendar validação. |
