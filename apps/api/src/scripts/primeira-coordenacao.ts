import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsuariosService } from '../modules/acesso/usuarios.service';

// Primeira conta da coordenação de um ambiente novo (implantação). Rode uma vez,
// no terminal do contêiner da API, depois do build:
//   NOME="Nome da coordenadora" EMAIL=coordenacao@fbr.edu.br \
//   node dist/scripts/primeira-coordenacao.js
// A pessoa recebe o convite por e-mail e cria a própria senha; os demais
// usuários são cadastrados por ela (RF53).
async function principal() {
  const nome = process.env.NOME?.trim();
  const email = process.env.EMAIL?.trim().toLowerCase();
  if (!nome || !email) throw new Error('Informe NOME e EMAIL.');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const resultado = await app
      .get(UsuariosService)
      .cadastrarPrimeiraCoordenacao({ nome, email });
    console.log(
      resultado.conviteEnviado
        ? `Convite enviado para ${email}.`
        : `O e-mail não saiu. Repasse este link a ${email}, que vale uma vez só: ${resultado.link}`,
    );
  } finally {
    await app.close();
  }
}

// O pool do banco não fecha com o contexto: o processo sai explicitamente.
principal().then(
  () => process.exit(0),
  (erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  },
);
