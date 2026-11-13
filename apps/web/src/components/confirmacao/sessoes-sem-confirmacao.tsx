"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  SessaoSemConfirmacao,
  SessoesSemConfirmacao as Lista,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, diaDaSemanaBr, horaBr } from "@/lib/formato";

const CHAVE = ["sessoes", "sem-confirmacao"];

const comInicialMaiuscula = (texto: string) =>
  `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

const horario = (s: SessaoSemConfirmacao) =>
  `${horaBr(new Date(s.inicio))} às ${horaBr(new Date(s.termino))}`;

// A situação com ícone e texto, sem depender só da cor (RNF1).
function SeloSemConfirmacao() {
  return (
    <span className="ui-selo whitespace-nowrap border-[#f0cf9f] bg-alerta-fundo text-[#a85400]">
      <AlertTriangle aria-hidden className="size-3.5" />
      Sem confirmação
    </span>
  );
}

function Acoes({
  sessao,
  aoRegistrar,
}: {
  sessao: SessaoSemConfirmacao;
  aoRegistrar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 max-xl:mt-1 xl:items-end">
      <Link
        href={`/pacientes/${sessao.casoId}`}
        aria-label={`Ver contatos do paciente ${sessao.paciente}`}
        className="text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
      >
        Ver contatos do paciente
      </Link>
      <Button
        type="button"
        variant="outline"
        aria-label={`Registrar confirmação de ${sessao.paciente}`}
        onClick={aoRegistrar}
      >
        Registrar confirmação
      </Button>
    </div>
  );
}

function DialogoRegistrar({
  sessao,
  aoFechar,
  aoConcluir,
}: {
  sessao: SessaoSemConfirmacao;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const cache = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function registrar() {
    setErro(null);
    setSalvando(true);
    try {
      await api(`/sessoes/${sessao.id}/confirmacao`, { method: "POST" });
      await cache.invalidateQueries({ queryKey: CHAVE });
      aoConcluir();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível registrar a confirmação.",
      );
      setSalvando(false);
      // A sessão mudou desde que a lista abriu: a lista atualiza por trás do diálogo.
      if (falha instanceof ErroApi && [404, 409, 422].includes(falha.status)) {
        void cache.invalidateQueries({ queryKey: CHAVE });
      }
    }
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Registrar confirmação"
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Voltar
          </Button>
          <Button
            type="button"
            data-principal
            disabled={salvando}
            onClick={() => void registrar()}
          >
            Registrar confirmação
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {erro && <Aviso tipo="erro" titulo={erro} />}
        <dl className="ui-resumo-caso">
          <div>
            <dt>Paciente</dt>
            <dd>{sessao.paciente}</dd>
          </div>
          <div>
            <dt>Estagiário</dt>
            <dd>{sessao.estagiario}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{comInicialMaiuscula(diaDaSemanaBr(sessao.inicio))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>{horario(sessao)}</dd>
          </div>
        </dl>
        <p className="text-[15px]">
          Registre depois de o paciente confirmar a presença por telefone. A
          sessão passa para “Confirmada”.
        </p>
      </div>
    </Dialogo>
  );
}

function SemSessoes() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-sucesso-fundo text-sucesso"
      >
        <Check className="size-6" />
      </span>
      <p className="font-bold text-marca">Nenhuma sessão sem confirmação.</p>
      <p className="text-[15px] text-muted-foreground">
        Todas as sessões com prazo encerrado foram confirmadas.
      </p>
    </div>
  );
}

// Sessões cujo prazo de confirmação terminou sem resposta do paciente, para o contato
// ativo da secretaria (RF14). Telefone e e-mail ficam na ficha do paciente (RNF13).
export function SessoesSemConfirmacao() {
  const [registrando, setRegistrando] = useState<SessaoSemConfirmacao | null>(
    null,
  );
  const [registrada, setRegistrada] = useState<SessaoSemConfirmacao | null>(
    null,
  );
  const consulta = useQuery({
    queryKey: CHAVE,
    queryFn: () => api<Lista>("/sessoes/sem-confirmacao"),
  });

  if (consulta.isPending) {
    return <p role="status">Carregando sessões sem confirmação…</p>;
  }
  if (consulta.isError) {
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível carregar as sessões sem confirmação."
      />
    );
  }

  const { prazoHoras, sessoes } = consulta.data;
  const total = `${sessoes.length} ${sessoes.length === 1 ? "sessão" : "sessões"}`;
  return (
    <div className="flex flex-col gap-4">
      {registrada && (
        <Aviso tipo="sucesso" titulo="Confirmação registrada." focar>
          {`A sessão de ${registrada.paciente} em ${dataBr(registrada.inicio)}, às ${horaBr(new Date(registrada.inicio))}, passou para “Confirmada”.`}
        </Aviso>
      )}
      <section
        aria-labelledby="titulo-sem-confirmacao"
        className="ui-painel max-xl:border-0 max-xl:bg-transparent"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 max-xl:px-0">
          <h2
            id="titulo-sem-confirmacao"
            className="flex flex-wrap items-center gap-2.5 text-lg font-bold text-marca"
          >
            <AlertTriangle aria-hidden className="size-5 text-[#a85400]" />
            Sessões sem confirmação
            <span className="ui-selo border-[#f0cf9f] bg-alerta-fundo font-semibold text-[#a85400]">
              {total}
            </span>
          </h2>
          {sessoes.length > 0 && (
            <>
              <p className="text-[15px] text-muted-foreground">
                O prazo de confirmação (até {prazoHoras} horas antes da sessão)
                terminou e o paciente não confirmou a presença. Entre em contato
                pelo e-mail ou pelo celular do paciente, que ficam na ficha.
              </p>
              <Aviso
                tipo="info"
                titulo="Sessão sem confirmação não é falta. A falta só é registrada se o paciente não comparecer."
              />
            </>
          )}
        </div>
        {sessoes.length === 0 ? (
          <SemSessoes />
        ) : (
          <>
            <table className="ui-tabela max-xl:hidden [&_td]:px-4 [&_th]:px-4">
              <caption className="sr-only">Sessões sem confirmação</caption>
              <thead>
                <tr>
                  <th scope="col">Paciente</th>
                  <th scope="col">Sessão</th>
                  <th scope="col">Estagiário</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => (
                  <tr key={s.id}>
                    <td className="min-w-32 [overflow-wrap:anywhere]">
                      <span className="font-bold">{s.paciente}</span>
                      {s.responsavelLegal && (
                        <span className="ui-dica block">
                          Responsável legal: {s.responsavelLegal}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {dataBr(s.inicio)}
                      <span className="ui-dica block">{horario(s)}</span>
                    </td>
                    <td className="min-w-28 [overflow-wrap:anywhere]">
                      {s.estagiario}
                    </td>
                    <td>
                      <SeloSemConfirmacao />
                    </td>
                    <td>
                      <Acoes
                        sessao={s}
                        aoRegistrar={() => {
                          setRegistrada(null);
                          setRegistrando(s);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="ui-lista-celular xl:hidden">
              {sessoes.map((s) => (
                <li key={s.id} className="ui-item-celular">
                  <span className="font-bold">{s.paciente}</span>
                  {s.responsavelLegal && (
                    <span className="ui-dica">
                      Responsável legal: {s.responsavelLegal}
                    </span>
                  )}
                  <span>
                    {dataBr(s.inicio)} · {horario(s)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.estagiario}
                  </span>
                  <div>
                    <SeloSemConfirmacao />
                  </div>
                  <Acoes
                    sessao={s}
                    aoRegistrar={() => {
                      setRegistrada(null);
                      setRegistrando(s);
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {registrando && (
        <DialogoRegistrar
          sessao={registrando}
          aoFechar={() => setRegistrando(null)}
          aoConcluir={() => {
            setRegistrada(registrando);
            setRegistrando(null);
          }}
        />
      )}
    </div>
  );
}
