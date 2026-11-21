"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import {
  registroAutorizacaoMenorSchema,
  type AutorizacaoMenor,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr, hojeBr, idade } from "@/lib/formato";

// "12 anos", "1 ano".
const anos = (n: number) => (n === 1 ? "1 ano" : `${n} anos`);

// Mensagem do primeiro erro de validação devolvido pela API (400).
function mensagemDaApi(erro: ErroApi): string | null {
  const lista = erro.corpo?.message;
  if (!Array.isArray(lista)) return null;
  const primeiro = (lista as { message?: string }[])[0];
  return primeiro?.message ?? null;
}

// Bloco "Autorização para acompanhamento de criança ou adolescente" da ficha da
// secretaria (RF45, prancha 8-3). Só aparece para paciente menor de idade: a
// entrega da autorização, assinada presencialmente, é registrada aqui, com a data,
// e é esse registro que libera a declaração para o responsável legal. É uma
// proposta da equipe, pendente de validação com a FBr. Só a secretaria registra e
// consulta; a coordenação e os demais perfis recebem 403, e o bloco não aparece.
export function AutorizacaoMenorDaFicha({
  casoId,
  nome,
  dataNascimento,
}: {
  casoId: string;
  nome: string;
  dataNascimento: string;
}) {
  const chave = ["pacientes", casoId, "autorizacao-menor"];
  const cliente = useQueryClient();
  const titulo = useId();
  const [registradoAgora, setRegistradoAgora] = useState(false);
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () =>
      api<AutorizacaoMenor>(`/pacientes/${casoId}/autorizacao-menor`),
    retry: false,
  });

  if (consulta.isPending) return null;
  if (consulta.isError) {
    // Sem acesso ou caso que não existe: o bloco não se aplica a este perfil.
    if (
      consulta.error instanceof ErroApi &&
      [403, 404].includes(consulta.error.status)
    )
      return null;
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível carregar a autorização de menor."
      >
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </Aviso>
    );
  }
  const situacao = consulta.data;
  if (!situacao.menor) return null;

  const resumo = [
    `${nome}, ${anos(idade(dataNascimento))}`,
    situacao.responsavelLegal &&
      `responsável legal: ${situacao.responsavelLegal}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby={titulo} className="ui-cartao gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={titulo} className="ui-h2">
          Autorização para acompanhamento de criança ou adolescente
        </h2>
        <p className="ui-dica m-0">{resumo}</p>
      </div>
      {registradoAgora && (
        <Aviso tipo="sucesso" focar titulo="Autorização registrada.">
          O responsável legal já pode emitir a declaração de comparecimento.
        </Aviso>
      )}
      <FormularioAutorizacao
        // Recomeça com os dados salvos depois de cada registro.
        key={situacao.autorizacao?.registradoEm ?? "sem-registro"}
        casoId={casoId}
        situacao={situacao}
        aoRegistrar={(dados) => {
          cliente.setQueryData(chave, dados);
          setRegistradoAgora(true);
        }}
        aoComecar={() => setRegistradoAgora(false)}
      />
    </section>
  );
}

function FormularioAutorizacao({
  casoId,
  situacao,
  aoRegistrar,
  aoComecar,
}: {
  casoId: string;
  situacao: AutorizacaoMenor;
  aoRegistrar: (dados: AutorizacaoMenor) => void;
  aoComecar: () => void;
}) {
  const id = useId();
  const registrada = situacao.autorizacao;
  const [entregue, setEntregue] = useState(Boolean(registrada));
  const [data, setData] = useState(registrada?.entregueEm ?? hojeBr());
  const [erroEntrega, setErroEntrega] = useState<string>();
  const [erroData, setErroData] = useState<string>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const envio = useMutation({
    mutationFn: (entregueEm: string) =>
      api<AutorizacaoMenor>(`/pacientes/${casoId}/autorizacao-menor`, {
        method: "PUT",
        body: JSON.stringify({ entregueEm }),
      }),
    onSuccess: aoRegistrar,
    onError: (erro) => {
      if (erro instanceof ErroApi && erro.status === 400) {
        const mensagem = mensagemDaApi(erro);
        if (mensagem) {
          setErroData(mensagem);
          document.getElementById(`${id}-data`)?.focus();
          return;
        }
      }
      setErroGeral(
        erro instanceof ErroApi && erro.status === 409
          ? erro.message
          : "Tente de novo. Se o problema continuar, avise a coordenação.",
      );
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    aoComecar();
    setErroGeral(null);
    setErroEntrega(undefined);
    setErroData(undefined);
    if (!entregue) {
      setErroEntrega("Marque que a autorização foi entregue à clínica.");
      document.getElementById(`${id}-entregue`)?.focus();
      return;
    }
    const resultado = registroAutorizacaoMenorSchema.safeParse({
      entregueEm: data,
    });
    if (!resultado.success) {
      setErroData(resultado.error.issues[0]?.message);
      document.getElementById(`${id}-data`)?.focus();
      return;
    }
    envio.mutate(resultado.data.entregueEm);
  }

  const idErroEntrega = `${id}-entregue-erro`;
  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {erroGeral && (
        <Aviso
          tipo="erro"
          focar
          titulo="Não foi possível registrar a autorização."
        >
          {erroGeral}
        </Aviso>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[15px]">
          <input
            id={`${id}-entregue`}
            type="checkbox"
            // Sem rota para desfazer: o registro só se corrige pela data.
            disabled={Boolean(registrada)}
            checked={entregue}
            aria-describedby={erroEntrega ? idErroEntrega : undefined}
            aria-invalid={erroEntrega ? true : undefined}
            onChange={(e) => {
              setEntregue(e.target.checked);
              setErroEntrega(undefined);
            }}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          A autorização assinada presencialmente foi entregue à clínica
        </label>
        {erroEntrega && (
          <p
            id={idErroEntrega}
            className="m-0 text-sm leading-[1.4] font-semibold text-destructive"
          >
            {erroEntrega}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo
          id={`${id}-data`}
          rotulo="Data da entrega"
          erro={erroData}
          className="sm:max-w-[240px]"
        >
          {(props) => (
            <input
              {...props}
              type="date"
              // O calendário não oferece dias que ainda não chegaram.
              max={hojeBr()}
              className={classeEntrada}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setErroData(undefined);
              }}
            />
          )}
        </Campo>
        <Button
          type="submit"
          disabled={envio.isPending}
          className="max-sm:w-full"
        >
          {envio.isPending ? "Registrando…" : "Registrar"}
        </Button>
      </div>
      <p className="ui-dica m-0">
        {registrada
          ? `Registrada por ${registrada.registradoPor} em ${dataHoraBr(registrada.registradoEm).replace(", ", ", às ")}. Com o registro, o responsável legal pode emitir a declaração.`
          : "Ainda não registrada. Sem o registro, o responsável legal não pode emitir a declaração."}
      </p>
    </form>
  );
}
