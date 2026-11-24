# RF65 — revogação do consentimento

Referência: [issue #281](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/281), [projeto da feature](projeto-features.md) e [protótipo 1-1](prototipos.md#rf65).

Base: `development` em `aa41b9b`. Implementação local para revisão, sem publicação nem alteração de aceite institucional.

## Fluxo

A secretaria abre o cartão de consentimento na ficha do paciente e registra quem solicita e como a identidade foi confirmada. Documento com foto exige a descrição do documento conferido; o sistema cifra essa descrição e não a inclui na auditoria ou na resposta. A opção RF52 exige um token válido, não encerrado e pertencente à mesma inscrição; marcar a opção não basta. Para menores, exige o responsável legal cadastrado.

O registro guarda a versão efetivamente aceita, data/hora e usuário. O aceite original permanece intacto. A API responde 409 à repetição e restringe o registro à secretaria. Supervisor e coordenação recebem a indicação de revogação na ficha; o supervisor também a vê em Meus casos.

Inscrições que aguardam distribuição, vínculo ou vaga passam a `cancelado_por_revogacao`, saem da fila e têm as posições recalculadas pelo RF7. Inscrições ainda sem triagem deixam de entrar nas listas pendentes e não podem ser classificadas depois da revogação. Em atendimento, os vínculos, sessões e prontuário são preservados; o encerramento depende da condução do supervisor e da coordenação.

Novos agendamentos são recusados e as comunicações de agendamento/cancelamento e as listas de contato RF14/RF17 respeitam a revogação. O envio automatizado e a revogação são serializados pela trava do caso: uma revogação aguarda um envio que já começou e impede novos envios após sua conclusão. Mensagens que já foram entregues ou abertas em aplicativo externo não podem ser recolhidas pelo sistema. RF13 permanece fora do MVP; uma implementação futura deverá reutilizar a verificação de consentimento.

## Banco e revisão

Migration nova `0022_rf65_revogacao_consentimento.sql`, posterior à `0021`, com journal e snapshot próprios. Acrescenta a situação e o registro de revogação com unicidade por inscrição e gatilho que impede UPDATE/DELETE. Migrations anteriores não foram alteradas. Se outra feature ocupar a numeração antes do merge, regenerar esta migration sobre a development atualizada.

O termo 0.1 continua provisório. Mantido o bloqueio em produção, inclusive na rota de revogação com essa versão. A implementação não conclui R4.3/R4.4 e não autoriza uso com pacientes reais. A retenção e as bases legais devem receber a aprovação formal prevista no projeto; não há exclusão automática de registros clínicos.

Revisão independente, validação institucional e inspeção manual com leitores de tela permanecem etapas de entrega, além dos testes automatizados do código.

## Inspeção de design de 23/11 e abertura da PR

A verificação RF52 é conferida no servidor e vinculada à mesma inscrição. Na alternativa por documento, guarda-se apenas a descrição cifrada do documento conferido, sem upload de imagem e sem expor essa descrição na auditoria. O registro de auditoria inclui a ação e a mudança de situação do caso. Inscrições legadas sem aceite registrado recebem 422, sem aceite presumido; casos já encerrados mantêm a situação existente.

Até a definição formal da FBr, o comportamento implementado usa o aceite registrado e os efeitos de revogação previstos no requisito, somente no ambiente de validação com dados fictícios. R4.3 e R4.4 continuam pendentes; a ata de aceite do Ciclo 5 não aprova o termo nem os protótipos do Ciclo 6. O líder ainda precisa conferir os ajustes e registrar sua inspeção na issue.

A PR pode ser aberta em **rascunho para development**. Na consulta de 24/11, a base ainda termina na migration 0021, mas outras PRs abertas também reservam 0022. A numeração definitiva deve ser resolvida sobre a base efetivamente integrada antes do merge, sem alterar migrations já publicadas.
