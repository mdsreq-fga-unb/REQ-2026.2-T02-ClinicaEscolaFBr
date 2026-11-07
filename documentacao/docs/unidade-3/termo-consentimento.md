# Termo de consentimento — versão 0.1 (provisória)

Texto do termo que a pessoa lê e aceita na etapa 3 da inscrição ([RF57](../unidade-2/requisitos/funcionais.md#rf57)). A FBr não tinha termo próprio, e a equipe redigiu esta versão para a FBr revisar e aprovar ([DF44](../unidade-2/requisitos/decisoes-fbr.md#df44)). Ela entra no sistema como a versão `0.1`, marcada como provisória, e nenhum paciente real se inscreve pelo site antes de haver uma versão aprovada. O projeto da feature está no [Projeto das features](projeto-features.md#rf57-registrar-consentimento-para-tratamento-de-dados-52).

!!! note "O que ainda depende da FBr"
    O texto entre colchetes, como [E-MAIL PARA PEDIDOS SOBRE DADOS], é para a FBr preencher. A base legal está escrita como consentimento (Lei nº 13.709/2018, art. 11, I), a opção mais restritiva; a outra é a tutela da saúde (art. 11, II, "f"), em que o atendimento não depende do aceite e o termo vira um aviso de privacidade. A escolha está nas [pendências de validação com a FBr](../unidade-2/requisitos/analise-feedback.md#pendencias-de-validacao-com-a-fbr).

Na tela, o termo abre com o título e a introdução, seguidos dos cinco tópicos do protótipo, que a pessoa abre para ler. Cada tópico é um item do campo `topicos` da `VersaoTermo`, com o título e o corpo.

**Termo de consentimento para o tratamento de dados pessoais — Clínica Escola de Psicologia da Faculdade Brasília (versão 0.1, provisória)**

Ao se inscrever, você nos passa dados pessoais e dados sobre a sua saúde. A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) chama estes últimos de dados sensíveis. Este termo explica quais dados são esses, para que servem, quem pode vê-los e como você pode desistir.

## 1. O que coletamos

A Faculdade Brasília (FBr), [CNPJ], [ENDEREÇO], é a responsável pelos seus dados. O sistema da Clínica Escola funciona nos servidores da própria FBr.

- **Identificação:** nome, data de nascimento, CPF, RG, estado civil e, se você quiser informar, sexo, profissão e escolaridade.
- **Endereço e contato:** endereço, bairro, cidade, CEP, celular, WhatsApp, e-mail e o canal por onde prefere receber nosso contato.
- **Contato de emergência, se você quiser informar:** nome, grau de parentesco e telefone.
- **Responsável legal, para menores de 18 anos:** nome, CPF e o documento que comprova a responsabilidade.
- **Sobre a sua saúde:** o motivo da busca pelo atendimento, como você percebe a urgência e o histórico que quiser contar.

Se você for atendido, o prontuário passa a guardar também a anamnese, os registros de cada sessão e o relatório final.

## 2. Para que usamos

- Fazer a triagem e definir a prioridade do atendimento.
- Organizar a fila de espera e avisar quando houver vaga.
- Agendar as sessões, confirmar a presença e emitir declarações de comparecimento.
- Fazer e guardar o prontuário, como exigem as normas do Conselho Federal de Psicologia.
- Falar com você, ou com o seu contato de emergência se for preciso, pelo canal que você escolheu.

Usamos seus dados de saúde com o seu consentimento, dado de forma específica e destacada neste termo (Lei nº 13.709/2018, art. 11, I). Sem esse aceite, não conseguimos registrar a inscrição pelo site, e você pode procurar a secretaria da clínica. Não usamos seus dados para propaganda nem os vendemos ou repassamos a empresas. O uso dos atendimentos em pesquisa depende de outro termo, que você pode aceitar ou não ao assinar o contrato na primeira sessão.

## 3. Quem pode ver

Cada pessoa da equipe vê só o que precisa para o seu trabalho:

- a secretaria vê seus dados de cadastro e de agendamento, mas não o conteúdo clínico;
- os supervisores e a coordenação veem as respostas da inscrição para fazer a triagem;
- o prontuário só pode ser aberto pelo estagiário responsável pelo seu atendimento, pelo supervisor dele e pela coordenação.

Todo acesso ao prontuário fica registrado, com quem acessou e quando. Seus dados só são passados a outras pessoas ou órgãos quando a lei ou uma ordem judicial obrigar.

**Como protegemos:**

- As informações sobre a sua saúde ficam guardadas cifradas, isto é, embaralhadas de um jeito que só o sistema consegue ler.
- O acesso ao sistema exige login de cada pessoa da equipe, e o prontuário fica restrito a quem cuida do seu atendimento.
- Todo o tráfego entre o seu aparelho e o sistema é protegido (HTTPS).
- O sistema faz uma cópia de segurança cifrada dos dados por dia, guardada pela FBr fora do servidor principal.
- A equipe segue o sigilo profissional do Código de Ética do Psicólogo.

## 4. Por quanto tempo guardamos

- Se você for atendido, o prontuário e os registros do atendimento são guardados por pelo menos 5 anos depois do fim do acompanhamento, como exigem as Resoluções nº 1/2009 e nº 5/2025 do Conselho Federal de Psicologia ([RF65](../unidade-2/requisitos/funcionais.md#rf65)). Depois desse prazo, os dados só são eliminados ou tornados anônimos com a autorização do psicólogo responsável técnico.
- Se a sua inscrição não chegar a virar atendimento, os dados ficam guardados por [PRAZO PARA INSCRIÇÕES NÃO ATENDIDAS] e depois são eliminados.

## 5. Seus direitos e como desistir

Você pode pedir, a qualquer momento e sem custo:

- a confirmação de que tratamos seus dados e o acesso a eles;
- a correção de dados incompletos, errados ou desatualizados;
- a informação sobre com quem seus dados foram compartilhados;
- a revogação deste consentimento.

**Como desistir (revogar o consentimento).** Peça na secretaria da Clínica Escola, pessoalmente com um documento, ou pelo [E-MAIL PARA PEDIDOS SOBRE DADOS]. Antes de registrar o pedido, confirmamos que é você, ou o seu responsável legal, quem está pedindo.

**O que acontece depois:**

- Se você ainda estiver na fila de espera, a sua inscrição sai da fila.
- Se você estiver em atendimento, não marcamos novas sessões, e o seu supervisor e a coordenação combinam com você o encerramento do acompanhamento.
- Em qualquer caso, paramos de enviar lembretes e avisos e não usamos mais seus dados para nada novo.
- O que já foi registrado, como a inscrição e o prontuário, não é apagado: a lei obriga a guardar esses registros pelo prazo mínimo de 5 anos (Lei nº 13.709/2018, art. 16, I, e Resolução CFP nº 1/2009), com o mesmo acesso restrito.
- Se quiser voltar a ser atendido depois, é preciso fazer uma nova inscrição e aceitar o termo de novo.

**Contato.** Dúvidas sobre seus dados: [E-MAIL PARA PEDIDOS SOBRE DADOS] ou a secretaria da Clínica Escola, [TELEFONE DA CLÍNICA]. [SE HOUVER: Encarregado de dados da FBr: NOME E E-MAIL.]

## Aceite

**Crianças e adolescentes.** Para quem tem menos de 18 anos, quem lê e aceita este termo é o responsável legal, em nome da criança ou do adolescente (Lei nº 13.709/2018, art. 14). Esse aceite on-line não substitui a autorização e o termo de responsabilidade que o responsável assina na clínica antes do primeiro atendimento.

A caixa de concordância vem desmarcada e é obrigatória:

> ☐ Li este termo e concordo com o tratamento dos meus dados pessoais e de saúde pela Clínica Escola da FBr, para as finalidades descritas.

Para menores de 18 anos:

> ☐ Sou o responsável legal de [NOME DO INSCRITO], li este termo e concordo com o tratamento dos dados pessoais e de saúde dele pela Clínica Escola da FBr, para as finalidades descritas.

O sistema guarda a versão do termo aceita e a data e a hora do aceite. O comprovante da inscrição não repete o conteúdo do termo, mas o termo fica disponível para consulta na página da inscrição.
