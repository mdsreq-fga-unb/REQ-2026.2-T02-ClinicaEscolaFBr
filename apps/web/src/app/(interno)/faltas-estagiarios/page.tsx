import { FaltasDosEstagiarios } from "@/components/assiduidade/faltas-dos-estagiarios";

// Faltas dos estagiários, para o supervisor e a coordenação: a contagem do
// semestre (RF40) e a relação por período (RF39).
export default function FaltasDosEstagiariosPage() {
  return <FaltasDosEstagiarios comSemestre />;
}
