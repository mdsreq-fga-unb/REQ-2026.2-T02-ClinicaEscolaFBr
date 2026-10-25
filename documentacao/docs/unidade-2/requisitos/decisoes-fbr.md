# 8.4 Registro de Decisões com a FBr

Este registro é a fonte única das regras de negócio decididas com a Clínica Escola FBr. Cada decisão tem um código (DF), a data, a fonte e os requisitos que ela fundamenta. Os requisitos citam o código na linha de rastreabilidade ("Origem: DFnn"), e a regra fica escrita uma única vez, no requisito. Quando uma decisão substitui outra, a anterior continua na tabela, marcada como substituída.

As fontes são as atas e os registros de reunião publicados no site: a [reunião de levantamento de 26/08/2026](../../unidade-1/reunioes.md), a [validação do MVP de 24/09 a 08/10/2026](../reunioes.md#validacao-do-mvp-com-a-clinica-escola-fbr) e a [reunião de validação do protótipo de 23/10/2026](../../unidade-3/reunioes.md#reuniao-de-validacao-do-prototipo-do-ciclo-3-com-a-fbr).

_Última atualização: 24/10/2026._

## Decisões vigentes e substituídas

| Código | Data e fonte | Decisão | Requisitos |
| --- | --- | --- | --- |
| DF01 | 26/08/2026, reunião de levantamento | O atendimento psicológico do estágio é exclusivamente presencial. | CP4, [RF10](funcionais.md#rf10), [RF14](funcionais.md#rf14) |
| DF02 | 26/08/2026, reunião de levantamento | Campos obrigatórios da inscrição: nome completo, data de nascimento, CPF, RG, endereço, estado civil e queixa; para menor de idade, também o responsável legal. | [RF1](funcionais.md#rf1) |
| DF03 | 26/08/2026, reunião de levantamento | Referência da prioridade clínica: vermelha (quadro caracterizado), amarela (sofrimento pontual) e verde (desenvolvimento pessoal, atendido só com vaga sobrando). | [RF6](funcionais.md#rf6) |
| DF04 | 26/08/2026, reunião de levantamento | O relatório final aprovado é entregue impresso ao paciente pela secretaria. | [RF33](funcionais.md#rf33), [RNF31](nao-funcionais.md#rnf31) |
| DF05 | 26/08/2026, reunião de levantamento | A contribuição social é de R$ 35,00. | [RF41](funcionais.md#rf41) |
| DF06 | 02/10/2026, validação do MVP | O RF15 e o RF25 entram no MVP; o RF5, o RF13, o RF24 e o RF26 podem ficar para depois. | [Backlog 10.2](backlog.md#102-priorizacao-e-recorte-do-mvp) |
| DF07 | 02/10/2026, validação do MVP | O formulário de inscrição exibe um aviso fixo com os contatos do CVV (188) e do SAMU (192). | [RF1](funcionais.md#rf1) |
| DF08 | 02/10/2026, validação do MVP | A transferência de caso registra quem passou o caso, para quem, quando e por quê. | [RF25](funcionais.md#rf25) |
| DF09 | 02/10/2026, validação do MVP | A continuidade entre semestres é tratada caso a caso, pela transferência de caso. | [RF25](funcionais.md#rf25), RF58 a RF60 |
| DF10 | 07/10/2026, validação do MVP | O cancelamento para remarcar não conta falta do paciente nem do estagiário. | [RF15](funcionais.md#rf15), [RF16](funcionais.md#rf16) |
| DF11 | 07/10/2026, validação do MVP | A correção de evolução guarda a versão original. | [RF29](funcionais.md#rf29) |
| DF12 | 07/10/2026, validação do MVP | O relatório final e a reprovação do estagiário ficam prontos antes do fim do semestre. | [RF33](funcionais.md#rf33), [RF63](funcionais.md#rf63), [RF64](funcionais.md#rf64) |
| DF13 | 07/10/2026, validação do MVP | O apoio manual à inscrição é a recepção preenchendo o mesmo formulário do sistema. | [RF3](funcionais.md#rf3) |
| DF14 | 07/10/2026, validação do MVP | **Substituída pela DF19.** O prazo da triagem seria um parâmetro definido pela coordenação. | [RF4](funcionais.md#rf4) |
| DF15 | 23/10/2026, validação do protótipo | O paciente tem 10 dias para pagar a contribuição social, contados do vínculo com o estagiário; sem pagamento, perde a vaga e volta para a fila. O início da contagem foi esclarecido pela equipe em 24/10/2026. | [RF41](funcionais.md#rf41), [RF43](funcionais.md#rf43) |
| DF16 | 23/10/2026, validação do protótipo | Na mesma prioridade clínica, o desempate é pela data de inscrição, da mais antiga para a mais recente. | [RF7](funcionais.md#rf7), [RF18](funcionais.md#rf18) |
| DF17 | 23/10/2026, validação do protótipo | Cada supervisor acompanha até 50 casos; o estagiário não tem limite fixo de casos. | [RF20](funcionais.md#rf20), [RF21](funcionais.md#rf21) |
| DF18 | 23/10/2026, validação do protótipo | A sessão tem 50 minutos de atendimento, seguidos de 10 minutos para anotações. | [RF10](funcionais.md#rf10) |
| DF19 | 23/10/2026, validação do protótipo | A clínica não tem prazo de triagem: a inscrição aguarda conforme as vagas, e só é chamada quando alguém sai. | [RF4](funcionais.md#rf4) |
| DF20 | 23/10/2026, validação do protótipo | O paciente pode cancelar até 1 hora antes da sessão, com justificativa. O desligamento continua com 2 faltas no ciclo, consecutivas ou não, como esclarecido pela equipe em 24/10/2026. | [RF15](funcionais.md#rf15), [RF35](funcionais.md#rf35) |
| DF21 | 23/10/2026, validação do protótipo | O lembrete de sessão é enviado com 24 horas de antecedência. | [RF13](funcionais.md#rf13) |
| DF22 | 23/10/2026, validação do protótipo | O pico de uso estimado é de 30 usuários simultâneos. | [RNF12](nao-funcionais.md#rnf12), [RNF21](nao-funcionais.md#rnf21), [RNF29](nao-funcionais.md#rnf29) |
| DF23 | 23/10/2026, validação do protótipo | A evolução tem como campos obrigatórios a data, a evolução da queixa (até 10 linhas) e o planejamento da próxima sessão, com um fechamento avaliativo a cada 10 sessões. | [RF28](funcionais.md#rf28), [RF33](funcionais.md#rf33) |
| DF24 | 23/10/2026, validação do protótipo | O contato com o paciente é por e-mail, WhatsApp ou ligação; o SMS foi descartado. Quem escolhe e-mail recebe as mensagens automáticas; quem escolhe celular é contatado pela secretaria, por WhatsApp ou ligação. A ata em PDF registra também o e-mail como descartado, mas a gravação da reunião mostra que a escolha entre e-mail e celular foi mantida; a correção foi registrada pela equipe em 24/10/2026. | [RF1](funcionais.md#rf1), [RF10](funcionais.md#rf10), [RF13](funcionais.md#rf13), [RF14](funcionais.md#rf14), [RF17](funcionais.md#rf17), [RF52](funcionais.md#rf52) |
| DF25 | 23/10/2026, validação do protótipo | O acesso é bloqueado por 15 minutos depois de 3 tentativas de login incorretas. | [RF50](funcionais.md#rf50), [RNF49](nao-funcionais.md#rnf49) |
| DF26 | 23/10/2026, validação do protótipo | Não há divisão por área de especialidade: todo atendimento é de psicologia clínica geral. | [RF6](funcionais.md#rf6), [RF19](funcionais.md#rf19) (removido), [RF20](funcionais.md#rf20), [RNF23](nao-funcionais.md#rnf23) |
| DF27 | 23/10/2026, validação do protótipo | Cada caso tem um estagiário responsável; os estagiários de apoio do semestre básico só observam as sessões. | [RF21](funcionais.md#rf21) |
| DF28 | 23/10/2026, validação do protótipo | Um caso pode ser transferido entre supervisores. | [RF25](funcionais.md#rf25) |
| DF29 | 23/10/2026, validação do protótipo | A coordenação consulta as tentativas de acesso negado ao prontuário. | [RF56](funcionais.md#rf56) |
| DF30 | 23/10/2026, validação do protótipo | O convite de ativação da conta vale 72 horas. | [RF53](funcionais.md#rf53) |
| DF31 | 23/10/2026, validação do protótipo | Os protótipos das features do Ciclo 3 foram aprovados, com a remoção da área de especialidade e o ajuste dos canais de contato. | [Protótipos do Ciclo 3](../../unidade-3/prototipos-ciclo-3.md) |
| DF32 | 23/10/2026, validação do protótipo | A coordenação consulta o conteúdo clínico de todos os prontuários, sem precisar de vínculo com o caso. A consulta é só de leitura e fica no registro de acessos. O ponto não consta da ata em PDF e foi registrado pela equipe em 24/10/2026. | [RF27](funcionais.md#rf27), [RF31](funcionais.md#rf31), [RF32](funcionais.md#rf32), [RF55](funcionais.md#rf55), [RNF25](nao-funcionais.md#rnf25), CP12 |
| DF33 | 23/10/2026, validação do protótipo | Quem perde a vaga por falta de pagamento volta para a fila com a mesma prioridade clínica, mas com a data em que voltou para a fila, e não com a da inscrição original. Enquanto os 10 dias correm, continua bloqueado o agendamento da 2ª sessão em diante. O ponto não consta da ata em PDF e foi registrado pela equipe em 24/10/2026. | [RF7](funcionais.md#rf7), [RF43](funcionais.md#rf43) |
