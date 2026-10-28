// Acompanhamento automático das issues de feature (FDD): mantém o "Estado da
// feature" da issue e o Status do Project de acordo com o checklist do DoR e do
// DoD, com as PRs que citam a issue, com os comandos dos comentários e com os
// testes da versão integrada (D4.5). Chamado pelo workflow feature-status.yml,
// via actions/github-script.

const { existsSync, readFileSync } = require("node:fs");
const L = require("./logica.cjs");
const P = require("./projeto.cjs");
const R = require("./rnfs.cjs");

const MEMBROS = ["OWNER", "MEMBER", "COLLABORATOR"];
const { ehFeature } = L;

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const evento = context.eventName;
  const carga = context.payload;

  if (process.env.TEM_TOKEN !== "true") {
    core.notice(
      "Segredo PROJECT_TOKEN não configurado: o acompanhamento das features não foi feito.",
    );
    return;
  }

  // Relatório dos testes da main, baixado pelo workflow (coletar-rnfs.cjs).
  const arquivoRnfs = process.env.RELATORIO_RNFS;
  const relatorio =
    arquivoRnfs && existsSync(arquivoRnfs)
      ? JSON.parse(readFileSync(arquivoRnfs, "utf8"))
      : null;

  let projeto;
  const obterProjeto = async () =>
    (projeto ??= await P.carregarProjeto(github));

  const buscarIssue = async (numero) =>
    (await github.rest.issues.get({ owner, repo, issue_number: numero })).data;

  const comentar = (numero, body) =>
    github.rest.issues.createComment({
      owner,
      repo,
      issue_number: numero,
      body: `${body}\n\n${L.MARCA_ROBO}`,
    });

  const marcar = async (issue, codigos) => {
    const novo = L.marcarItens(issue.body ?? "", codigos);
    if (novo === issue.body) return issue;
    const { data } = await github.rest.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      body: novo,
    });
    return data;
  };

  // Alinha o estado escrito na issue e os campos do Project. Nada volta para trás
  // sozinho. Fechar a issue no Concluído e devolvê-la a Em Construção quando é
  // reaberta ficam com os workflows nativos do Project.
  const sincronizar = async (issue, statusMinimo = null) => {
    if (!ehFeature(issue) || issue.state !== "open") return;
    const corpo = issue.body ?? "";

    const atual = L.estadoAtual(corpo);
    const estado = L.maisAvancado(L.ESTADOS, atual, L.estadoDoChecklist(corpo));
    if (atual && estado !== atual) {
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: issue.number,
        body: L.escreverEstado(corpo, estado),
      });
      core.info(`#${issue.number}: estado ${atual} → ${estado}`);
    }

    const ciclo = L.cicloDoMilestone(issue.milestone?.title);
    let alvo = L.STATUS_DO_ESTADO[estado];
    if (estado === "Planejada" && !ciclo) alvo = null;
    alvo = L.maisAvancado(L.STATUS, alvo, statusMinimo);

    const proj = await obterProjeto();
    const item =
      (await P.itemDaIssue(github, proj, issue.node_id)) ??
      (await P.adicionarIssue(github, proj, issue.node_id));
    const final = L.maisAvancado(L.STATUS, item.valores.Status, alvo);
    if (final && final !== item.valores.Status) {
      await P.definirCampo(github, proj, item.id, "Status", final);
      core.info(
        `#${issue.number}: Status ${item.valores.Status ?? "—"} → ${final}`,
      );
    }
    if (ciclo && !item.valores.Ciclo?.startsWith(`Ciclo ${ciclo} `)) {
      await P.definirCampo(github, proj, item.id, "Ciclo", `Ciclo ${ciclo} `);
    }
    const cp = L.cpDoTitulo(issue.title);
    if (cp && !item.valores.CP) {
      await P.definirCampo(github, proj, item.id, "CP", `CP${cp} `);
    }
  };

  // Verificação dos RNFs (D4.5), só depois da integração (D4.3): os testes da main
  // e os registros /rnf viram uma tabela num comentário, que é editado a cada
  // avaliação. Devolve a issue atualizada, ou null se ela não foi avaliada.
  const verificarRnfs = async (issue) => {
    if (!ehFeature(issue) || issue.state !== "open" || !relatorio) return null;
    const corpo = issue.body ?? "";
    const integrada = L.lerChecklist(corpo).some(
      (i) => i.codigo === "D4.3" && i.marcado,
    );
    const rnfs = R.rnfsDaFeature(corpo);
    if (!integrada || rnfs.length === 0) return null;
    const comentarios = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issue.number,
      per_page: 100,
    });
    const linhas = R.avaliarRnfs({
      rnfs,
      rfs: R.rfsDaFeature(issue.title, corpo),
      testes: relatorio.testes,
      registros: R.registrosManuais(comentarios, MEMBROS),
    });
    const texto = R.comentarioRnfs(linhas, process.env.EXECUCAO_RNFS);
    const anterior = comentarios.find((c) =>
      (c.body ?? "").includes(R.MARCA_RNFS),
    );
    if (!anterior) {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: texto,
      });
    } else if (anterior.body !== texto) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: anterior.id,
        body: texto,
      });
    }
    return R.todosVerificados(linhas) ? marcar(issue, ["D4.5"]) : issue;
  };

  const featuresAbertas = async () =>
    (
      await github.paginate(github.rest.issues.listForRepo, {
        owner,
        repo,
        state: "open",
        per_page: 100,
      })
    ).filter(ehFeature);

  // Issues de feature que uma PR declara implementar. Só PRs que mexem no código
  // contam, e só features com o DoR aprovado: sem DoR, o DoD não é avaliado.
  const featuresDaPr = async (pr) => {
    const arquivos = await github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    });
    if (!L.mexeNoCodigo(arquivos.map((a) => a.filename))) return [];
    const issues = [];
    for (const numero of L.issuesCitadas(pr.title, pr.body)) {
      try {
        const issue = await buscarIssue(numero);
        if (!ehFeature(issue)) continue;
        if (L.dorAprovado(issue.body)) issues.push(issue);
        else
          core.warning(
            `#${issue.number} citada na PR #${pr.number}, mas sem o DoR aprovado: o DoD não foi atualizado.`,
          );
      } catch {
        // Número que não é issue deste repositório.
      }
    }
    return issues;
  };

  if (evento === "issues") {
    await sincronizar(carga.issue);
    return;
  }

  if (evento === "issue_comment") {
    const issue = carga.issue;
    const rnf = R.lerComandoRnf(carga.comment.body);
    if (rnf && ehFeature(issue)) {
      if (!MEMBROS.includes(carga.comment.author_association)) return;
      const autor = carga.comment.user.login;
      if (rnf.rnfs.length === 0 || !rnf.link) {
        await comentar(
          issue.number,
          `@${autor}, o comando \`/rnf\` precisa do RNF e do link da evidência, por exemplo \`/rnf RNF53 https://...\` com o link do relatório ou da inspeção.`,
        );
        return;
      }
      const avaliada = await verificarRnfs(issue);
      if (avaliada) {
        await sincronizar(avaliada);
      } else {
        await comentar(
          issue.number,
          `Verificação de ${rnf.rnfs.join(", ")} registrada por @${autor}. O D4.5 é avaliado depois que a feature for integrada na \`main\` (D4.3) e o CI da \`main\` gerar o relatório dos testes.`,
        );
      }
      return;
    }
    const lido = L.lerComando(carga.comment.body);
    if (!lido || !ehFeature(issue)) return;
    const autor = carga.comment.user.login;
    const regra = L.COMANDOS[lido.comando];

    if (!MEMBROS.includes(carga.comment.author_association)) return;
    if (regra.exigeLink && !lido.link) {
      await comentar(
        issue.number,
        `@${autor}, o comando \`/${lido.comando}\` precisa do link da evidência, por exemplo \`/${lido.comando} https://...\` com o link da ata.`,
      );
      return;
    }
    if (lido.comando === "de-acordo") {
      // A confirmação precisa vir de alguém diferente de quem registrou a inspeção.
      const { data: comentarios } = await github.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 100,
      });
      const inspetores = comentarios
        .filter((c) => L.ehInspecao(c.body))
        .map((c) => c.user.login);
      if (inspetores.length === 0) {
        await comentar(
          issue.number,
          `@${autor}, ainda não há o registro da inspeção nesta issue (comentário com o cabeçalho "## Inspeção de design (DoD 1)"). Registre a inspeção antes do \`/de-acordo\`.`,
        );
        return;
      }
      if (inspetores.every((login) => login === autor)) {
        await comentar(
          issue.number,
          `@${autor}, o \`/de-acordo\` precisa vir de outro integrante, e não de quem registrou a inspeção.`,
        );
        return;
      }
    }
    const atualizada = await marcar(issue, regra.codigos);
    await comentar(
      issue.number,
      `${regra.codigos.join(", ")} marcado por @${autor}${lido.link ? `. Evidência: ${lido.link}` : ""}.`,
    );
    await sincronizar(atualizada);
    return;
  }

  if (evento === "pull_request") {
    const pr = carga.pull_request;
    const integrada =
      carga.action === "closed" && pr.merged && pr.base.ref === "main";
    if (carga.action === "closed" && !integrada) return;
    for (const issue of await featuresDaPr(pr)) {
      if (integrada) {
        const atualizada = await marcar(issue, ["D4.3"]);
        await comentar(
          issue.number,
          `D4.3 marcado: a PR #${pr.number} foi mesclada na \`main\`. Testes e build: ${pr.html_url}/checks.`,
        );
        await sincronizar(atualizada, "Em Validação");
      } else {
        await sincronizar(issue, "Em Construção");
      }
    }
    return;
  }

  if (evento === "pull_request_review") {
    if (carga.review.state !== "approved") return;
    const pr = carga.pull_request;
    const revisor = carga.review.user.login;
    if (revisor === pr.user.login) return;
    if (!MEMBROS.includes(carga.review.author_association)) return;
    for (const issue of await featuresDaPr(pr)) {
      const atualizada = await marcar(issue, ["D3.1"]);
      if (atualizada !== issue) {
        await comentar(
          issue.number,
          `D3.1 marcado: a PR #${pr.number} foi aprovada por @${revisor} (${carga.review.html_url}).`,
        );
      }
      await sincronizar(atualizada, "Em Construção");
    }
    return;
  }

  // CI da main concluído: reavalia os RNFs das features integradas.
  if (evento === "workflow_run") {
    if (carga.workflow_run.conclusion !== "success") return;
    for (const issue of await featuresAbertas()) {
      const avaliada = await verificarRnfs(issue);
      if (avaliada) await sincronizar(avaliada);
    }
    return;
  }

  // Execução diária ou manual: alinha todas as issues de feature abertas.
  if (evento === "schedule" || evento === "workflow_dispatch") {
    for (const issue of await featuresAbertas()) {
      await sincronizar((await verificarRnfs(issue)) ?? issue);
    }
  }
};
