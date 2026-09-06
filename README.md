# Clínica Escola FBr

Sistema web responsivo para digitalização e gestão da **Clínica Escola de Psicologia da Faculdade Brasília (FBr)**.

---

## Sobre o Projeto

A Clínica Escola de Psicologia da Faculdade Brasília oferta aproximadamente **100 vagas por semestre** de atendimento psicológico gratuito à comunidade de Santa Maria/DF e entorno. Atualmente, toda a operação é realizada de forma manual e presencial (fichas em papel + planilha Excel), o que gera:

- Demora na confirmação de atendimentos
- Faltas e cancelamentos sem aviso
- Horários ociosos de estagiários
- Baixa visibilidade da fila de espera
- Dificuldade de geração de indicadores
- Riscos no tratamento de dados sensíveis

O **Clínica Escola FBr** é a solução proposta para digitalizar as etapas permitidas pela regulação (inscrição, triagem, agendamento, confirmação de presença, registro clínico e emissão de documentos), **sem alterar o caráter presencial do atendimento psicológico**, conforme exigido pelo Conselho Regional de Psicologia.

---

## Estrutura do Repositório

```
├── docs/ # Documentação do projeto (MkDocs)
│ ├── unidade-1/ # Conteúdo e registros da Unidade 1
│ │ ├── gestao/ # Cronograma, equipe e comunicação
│ │ ├── estudos/ # Estudo de FDD
│ │ ├── reunioes.md
│ │ ├── licoes-aprendidas.md
│ │ ├── referencias.md
│ │ ├── cenario-atual.md
│ │ ├── solucao-proposta.md
│ │ ├── intervencao-social.md
│ │ ├── estrategia-esw.md
│ │ └── engenharia-requisitos.md
│ ├── requisitos/ # Requisitos funcionais, não-funcionais, DoR, DoD e Backlog
│ └── index.md
├── src/ # Código-fonte da aplicação (sistema do cliente)
├── mkdocs.yml # Configuração do site de documentação
└── README.md # Este arquivo
```

## Documentação

A documentação completa do projeto está disponível no **GitHub Pages**:

> [Link do site de documentação](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/)

Nela você encontra:

- Visão e Cenário (problema, Rich Picture, stakeholders)
- Solução Proposta (objetivos, características de produto, análise de mercado)
- Estratégias de Engenharia de Software
- Engenharia de Requisitos
- Gestão (cronograma, equipe e comunicação)
- [Boas práticas de utilização do GitHub](docs/unidade-1/gestao/boas-praticas-github.md)
- Lições Aprendidas da Unidade 1
- Referências utilizadas na Unidade 1

Os requisitos funcionais, não funcionais, DoR, DoD e backlog serão organizados e publicados na Unidade 2, quando tiverem conteúdo validado.

---

## Aplicação (Sistema do Cliente)

O sistema em desenvolvimento (`src/`) será uma **aplicação web responsiva** voltada para:

- **Pacientes / Responsáveis**: inscrição online, consulta de posição na fila, confirmação de presença
- **Secretaria**: gestão de inscrições, triagem e fila de espera
- **Estagiários**: agendamento, registro de evolução e prontuário
- **Supervisores**: acompanhamento dos casos e supervisão
- **Coordenação**: indicadores, relatórios e gestão geral da clínica

> O MVP prioriza: inscrição, triagem, fila de espera, agendamento, confirmação de presença, controle de faltas, segurança e acessibilidade.

---

## Tecnologias

> TypeScript, Next.js, NestJS e PostgreSQL, conforme a seção 2.4 da documentação.

---

## Equipe

| Membro            | Papel / Responsabilidade |
| ----------------- | ------------------------ |
| Gabriel Barbaceli | —                        |
| Jônatas Farias    | —                        |
| Luís Henrique     | —                        |
| Joaquim José      | —                        |
| Nicolas Costa     | —                        |
| Maria Clara       | —                        |

> papéis à serem atualizados conforme a definição da equipe.

---

## Como rodar a documentação localmente

```bash
# Instalar dependências
pip install mkdocs mkdocs-material

# Servir localmente
mkdocs serve
Acesse: http://localhost:8000
```
