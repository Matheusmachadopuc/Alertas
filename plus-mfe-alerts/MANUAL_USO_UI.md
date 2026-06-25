# Manual de Uso da Interface de Alertas de Estoque (`plus-mfe-alerts`)

Este guia prático explica como navegar e utilizar a interface de usuário do serviço de **Alertas de Estoque** do sistema **Plus Gestão**.

---

## 1. Visão Geral da Tela

A interface de Alertas de Estoque foi projetada de forma simples e direta, permitindo o acompanhamento rápido de itens que atingiram ou estão abaixo do limite mínimo de estoque configurado.

O sistema exibe o conteúdo de acordo com o nível de acesso (**Administrador** ou **Usuário Comum**) e atualiza as informações automaticamente a cada **60 segundos**.

---

## 2. Níveis de Acesso e Permissões

A interface adapta suas funcionalidades dependendo de quem está logado:

*   **Administrador (Admin):** Possui controle total. Pode visualizar a lista de alertas ativos, gerenciar (criar, editar, desativar e excluir) as configurações de alertas e usar todas as opções de filtragem.
*   **Usuário Comum (Operador):** Possui acesso de leitura. Consegue visualizar a lista de alertas ativos e filtrar os resultados para monitoramento do estoque. Não visualiza a seção de configurações nem pode criar/alterar alertas.

---

## 3. Principais Componentes e Funcionalidades

### 3.1. Cabeçalho e Ações Globais
No topo da página, você encontrará as seguintes informações e botões de ação:
*   **Título:** Identificação da tela (*Alertas de Estoque*).
*   **Identificação do Usuário:** O e-mail do usuário autenticado no momento.
*   **Botão Voltar:** Retorna para a tela principal de gestão (`/`).
*   **Botão Atualizar:** Força uma consulta manual imediata ao servidor para obter os dados de estoque mais recentes.
*   **Botão Sair:** Efetua o logout do usuário de forma segura, limpando a sessão e redirecionando para a tela de Login.

### 3.2. Painel de Filtros (Pesquisa)
Localizado logo abaixo do cabeçalho, permite filtrar dinamicamente os alertas e configurações em tempo real:
*   **Produto:** Filtre informando o ID do produto ou o ID da roupa.
*   **Categoria:** Digite a categoria do produto (ex: *Camisetas*, *Calças*).
*   **Tamanho:** Digite o tamanho específico (ex: *P*, *M*, *G*, *42*).
*   **Cor:** Digite a cor (ex: *Azul*, *Preto*).

*Dica: As tabelas são atualizadas imediatamente conforme você digita em qualquer um dos campos.*

---

## 4. Como Acompanhar os Alertas Ativos

A tabela de **Alertas Ativos** é a seção principal e exibe produtos cujo saldo em estoque está menor ou igual ao limite configurado.

### Colunas da Tabela:
1.  **Produto:** Mostra o nome do produto (em destaque) e o seu ID de cadastro (ID do produto / ID da roupa).
2.  **Categoria:** A categoria à qual o produto pertence.
3.  **Grade:** Combinação de Tamanho e Cor (ex: `M / Azul`).
4.  **Saldo:** A quantidade física atualizada disponível em estoque.
5.  **Limite:** A quantidade mínima definida para que o alerta seja disparado.
6.  **Verificado:** A última data e hora em que o sistema checou o saldo deste item.

*Nota: Um indicador circular colorido (Badge) no topo da tabela mostra o número total de alertas ativos no momento (vermelho se houver alertas, verde se o estoque estiver regular).*

---

## 5. Gerenciando Configurações de Alertas (Apenas Administradores)

Os administradores têm acesso à seção **Configurações**, localizada na parte inferior da tela, onde podem definir as regras de monitoramento.

### 5.1. Criar um Novo Alerta
1.  Clique no botão **`Novo Alerta`** localizado no canto direito da barra de filtros.
2.  Preencha o formulário no pop-up:
    *   **Produto ID (Obrigatório):** O código identificador do produto.
    *   **Roupa ID (Opcional):** O código de uma peça/roupa específica dentro da grade.
    *   **Nome do produto (Opcional):** Nome amigável para facilitar a visualização.
    *   **Categoria (Opcional):** Categoria do produto.
    *   **Tamanho & Cor (Opcional):** Informações de variação (grade) do produto.
    *   **Quantidade Mínima (Obrigatório):** Limite de estoque para ativação do alerta (deve ser maior ou igual a 0).
    *   **Ativo:** Chave seletora para habilitar ou desabilitar temporariamente este monitoramento.
3.  Clique em **`Salvar`**. Uma notificação de sucesso aparecerá no canto inferior direito.

### 5.2. Editar um Alerta Existente
1.  Na tabela de Configurações, localize o alerta desejado.
2.  Na coluna **Ações**, clique no ícone do **Lápis (Editar)**.
3.  Modifique os campos necessários no formulário.
4.  Clique em **`Salvar`** para aplicar as alterações.

### 5.3. Excluir um Alerta
1.  Na tabela de Configurações, clique no ícone da **Lixeira (Excluir)** ao lado do alerta desejado.
2.  Confirme a ação na janela pop-up do navegador clicando em **Ok**.

### 5.4. Entendendo os Status na Tabela de Configurações
Cada configuração exibe uma etiqueta (Badge) indicando a situação do monitoramento:
*   `INATIVO` (Cinza): O alerta está desativado manualmente pelo administrador.
*   `ATIVO` (Vermelho): O saldo atual está menor ou igual ao limite configurado (o alerta está disparado).
*   `OK` (Verde): O estoque está normal (saldo acima do limite).
*   `ERRO` (Laranja): Ocorreu alguma falha ou inconsistência no processamento da verificação do estoque.
