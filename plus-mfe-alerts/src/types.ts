export interface AuthUser {
  user_id?: number | string;
  email: string;
  role: string | { name: string };
}

export interface AlertaEstoque {
  id: string;
  produtoId: string;
  roupaId?: string;
  produtoNome?: string;
  categoria?: string;
  tamanho?: string;
  cor?: string;
  quantidadeMinima: number;
  ativo: boolean;
  status: "OK" | "ATIVO" | "ERRO";
  ultimoSaldo?: number | null;
  mensagem?: string;
  ultimaVerificacaoEm?: string | null;
  notificadoEm?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AlertaFormValues {
  produtoId: string;
  roupaId: string;
  produtoNome: string;
  categoria: string;
  tamanho: string;
  cor: string;
  quantidadeMinima: string;
  ativo: boolean;
}

export interface AlertasFilters {
  produtoId: string;
  categoria: string;
  tamanho: string;
  cor: string;
}
