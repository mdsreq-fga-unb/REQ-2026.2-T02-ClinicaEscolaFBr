import { configure } from "@testing-library/react";

// No CI, os arquivos de teste rodam em paralelo e a primeira renderização de uma
// tela com consultas à API pode passar de 1 segundo, o padrão do findBy.
configure({ asyncUtilTimeout: 5000 });
