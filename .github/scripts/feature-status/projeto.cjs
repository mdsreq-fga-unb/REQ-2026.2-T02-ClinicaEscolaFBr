// Acesso ao Project da organização (Projects v2) pela API GraphQL.

const ORGANIZACAO = "mdsreq-fga-unb";
const NUMERO_PROJETO = 124;

async function carregarProjeto(github) {
  const { organization } = await github.graphql(
    `query ($org: String!, $numero: Int!) {
      organization(login: $org) {
        projectV2(number: $numero) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }`,
    { org: ORGANIZACAO, numero: NUMERO_PROJETO },
  );
  const projeto = organization.projectV2;
  const campos = Object.fromEntries(
    projeto.fields.nodes.filter((c) => c.name).map((c) => [c.name, c]),
  );
  return { id: projeto.id, campos };
}

// Item da issue no Project, com o valor atual de cada campo de seleção.
async function itemDaIssue(github, projeto, issueNodeId) {
  const { node } = await github.graphql(
    `query ($id: ID!) {
      node(id: $id) {
        ... on Issue {
          projectItems(first: 20) {
            nodes {
              id
              project { id }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { id: issueNodeId },
  );
  const item = node.projectItems.nodes.find((i) => i.project.id === projeto.id);
  if (!item) return null;
  const valores = Object.fromEntries(
    item.fieldValues.nodes
      .filter((v) => v.field)
      .map((v) => [v.field.name, v.name]),
  );
  return { id: item.id, valores };
}

async function adicionarIssue(github, projeto, issueNodeId) {
  const { addProjectV2ItemById } = await github.graphql(
    `mutation ($projeto: ID!, $conteudo: ID!) {
      addProjectV2ItemById(input: { projectId: $projeto, contentId: $conteudo }) {
        item { id }
      }
    }`,
    { projeto: projeto.id, conteudo: issueNodeId },
  );
  return { id: addProjectV2ItemById.item.id, valores: {} };
}

// Escolhe a opção de um campo pelo nome exato ou pelo começo do nome.
function opcao(campo, nome) {
  return (
    campo?.options.find((o) => o.name === nome) ??
    campo?.options.find((o) => o.name.startsWith(nome)) ??
    null
  );
}

async function definirCampo(github, projeto, itemId, nomeCampo, nomeOpcao) {
  const campo = projeto.campos[nomeCampo];
  const escolhida = opcao(campo, nomeOpcao);
  if (!escolhida) return false;
  await github.graphql(
    `mutation ($projeto: ID!, $item: ID!, $campo: ID!, $opcao: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projeto, itemId: $item, fieldId: $campo,
        value: { singleSelectOptionId: $opcao }
      }) { projectV2Item { id } }
    }`,
    { projeto: projeto.id, item: itemId, campo: campo.id, opcao: escolhida.id },
  );
  return true;
}

module.exports = {
  carregarProjeto,
  itemDaIssue,
  adicionarIssue,
  definirCampo,
  opcao,
};
