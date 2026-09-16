# SchedulEsty — versão Firebase

Este pacote troca o back-end antigo (PHP + MySQL) por **Firebase** (Authentication + Firestore + Storage).
O app inteiro — login, área do cliente, área do profissional, mensagens, campanhas e fidelidade — roda em
**um único arquivo: `index.html`**. Não existe mais PHP, nem `config/conexao.php`, nem múltiplas páginas soltas.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `index.html` | **O sistema inteiro.** Abra num navegador (ou hospede) depois de configurar o Firebase. |
| `firestore.rules` | Regras de segurança do banco (quem pode ler/escrever o quê). |
| `storage.rules` | Regras de segurança para fotos de perfil e de serviços. |
| `migrar-dados/` | Script único para importar os dados de teste do MySQL antigo para o Firestore. |

## Passo 1 — Criar o projeto no Firebase

1. Acesse **console.firebase.google.com** e clique em **Adicionar projeto**.
2. Dê um nome (ex: `schedulesty`) e siga o assistente (pode desativar o Google Analytics, não é necessário).
3. Dentro do projeto, vá em **Compilação > Authentication** → **Começar** → aba **Sign-in method** → ative o provedor **E-mail/senha**.
4. Vá em **Compilação > Firestore Database** → **Criar banco de dados** → escolha o modo **produção** e a região mais próxima (ex: `southamerica-east1`).
5. Vá em **Compilação > Storage** → **Começar** → mantenha as opções padrão.
6. Volte para **Visão geral do projeto** (ícone de casinha) → clique no ícone **`</>`** (Web) para registrar um app → dê um apelido (ex: `schedulesty-web`) → **não** marque Firebase Hosting por enquanto → **Registrar app**.
7. O Firebase mostra um bloco `firebaseConfig = {...}`. **Copie esse objeto inteiro.**

## Passo 2 — Colar a configuração no `index.html`

Abra o `index.html` num editor de texto, procure por (perto do topo do `<script type="module">`):

```js
const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxx"
};
```

Substitua pelos valores que você copiou no Passo 1.6. Salve o arquivo.

## Passo 3 — Publicar as regras de segurança

As regras (`firestore.rules` e `storage.rules`) **precisam** ser publicadas no Console, senão o app roda
mas ninguém consegue ler ou escrever nada.

> ⚠️ **Se vocês já tinham publicado as regras antes**: o `firestore.rules` deste pacote mudou de novo (agora
> permite que a profissional cadastre um "cliente avulso" sem conta/login). **Publiquem o arquivo atualizado
> de novo no Console**, senão o botão de "Novo cliente" na tela Clientes vai dar erro de permissão.

**Opção simples (colar no Console):**
1. Firestore Database → aba **Regras** → apague o conteúdo → cole o conteúdo de `firestore.rules` → **Publicar**.
2. Storage → aba **Regras** → apague o conteúdo → cole o conteúdo de `storage.rules` → **Publicar**.

**Opção com Firebase CLI** (se preferir linha de comando):
```
npm install -g firebase-tools
firebase login
firebase init firestore storage    # aponte para o projeto criado no passo 1
firebase deploy --only firestore:rules,storage:rules
```

## Passo 4 — Abrir o sistema

Basta abrir o `index.html` direto no navegador (duplo clique) **ou** hospedar como preferir:
- **Firebase Hosting**: `firebase init hosting` → aponte a pasta pública para onde está o `index.html` → `firebase deploy`.
- Qualquer outro host estático (Netlify, GitHub Pages, etc.) também funciona, já que é um único arquivo.

> Importante: o domínio onde o `index.html` for aberto precisa estar na lista de **domínios autorizados**
> do Authentication (Authentication → Settings → Authorized domains). `localhost` já vem autorizado por padrão.

## Passo 5 — Importar os dados de teste (opcional)

Se quiser trazer os clientes, profissionais, serviços e agendamentos que já existiam no banco MySQL:

1. No Console: **Configurações do projeto (engrenagem) → Contas de serviço → Gerar nova chave privada**.
   Isso baixa um arquivo `.json` — renomeie para `service-account.json` e coloque dentro da pasta `migrar-dados/`.
2. Na pasta `migrar-dados/`, rode:
   ```
   npm install
   node migrar.js
   ```
3. O script cria uma conta no Authentication para cada pessoa do banco antigo, com a senha temporária
   `Trocar@123` (definida no topo do `migrar.js`), e copia serviços, disponibilidade, agendamentos e
   feedbacks com os relacionamentos corrigidos.
4. Avise cada pessoa da senha temporária, ou peça para usarem **"Esqueci minha senha"** na tela de login.

## O que mudou em relação ao sistema antigo (e por quê)

- **Sem PHP/MySQL** — tudo roda no navegador, direto contra o Firestore. Isso também resolve de raiz o bug
  antigo de `id_usuario` vs `id_cliente`: agora cada pessoa é um único documento (`usuarios/{uid}`), com o
  mesmo ID usado em todo o app.
- **Dias da semana sem acento** (`segunda`, `sabado`...) internamente, evitando o bug de disponibilidade
  que existia entre `admin/disponibilidade.php` e `cliente/horarios.php`.
- **Recuperação de senha** agora é 100% do Firebase Authentication (não precisa mais de `PHPMailer`,
  senha de app do Gmail, nem tabela `recuperacao_senha`).
- **A partir desta versão, o `index.html` usa como base o protótipo visual que o grupo já está usando/apresentando**
  (o mesmo arquivo compartilhado no grupo), em vez de uma tela redesenhada — só a lógica de fake foi trocada
  por Firebase de verdade. Isso significa que o visual, os nomes das telas e o comportamento dos botões
  seguem o protótipo original o mais fielmente possível.
- **Modelo "1 profissional por conta"**: o protótipo original tinha uma "Equipe" com vários profissionais
  fictícios dentro de uma única conta. Como o sistema de vocês é 1 conta = 1 profissional (como já era antes),
  a tela "Equipe" virou "Meu perfil profissional" (só os dados de quem está logado) e a agenda mostra uma
  coluna só (a do profissional logado), não uma coluna por pessoa da equipe.
- **Mensagens**: chat em tempo real entre cliente e profissional (coleção `conversas` + subcoleção `mensagens`).
- **Campanhas**: o profissional cria campanhas/promoções e acompanha enviadas/abertas/taxa manualmente
  (não há envio automático de WhatsApp/e-mail embutido — isso exigiria uma integração paga à parte).
- **Fidelidade**: cada profissional define pontos por real gasto e os benefícios por nível; pontos são
  creditados automaticamente ao cliente quando um agendamento é marcado como **Concluído**. Como agora um
  cliente pode ter atendimentos com profissionais diferentes, a tela de fidelidade do cliente mostra
  **um cartão de nível por profissional**, com o total de pontos ganho especificamente com aquela pessoa.
- **Avaliações**: voltaram a ser uma tela de verdade — o cliente avalia (1 a 5 estrelas + comentário) um
  atendimento já concluído, e a nota fica salva na coleção `feedbacks`.
- **Agendamento pelo cliente (`agendar`)**: fluxo real de "marketplace" — o cliente escolhe primeiro a
  profissional (entre todas as contas cadastradas como profissional), depois o serviço dela, depois vê os
  horários realmente livres (calculados a partir da disponibilidade cadastrada por ela, menos os horários
  já ocupados) e confirma. O agendamento entra como **pendente** até a profissional confirmar.

## Modelo de dados no Firestore

```
usuarios/{uid}            -> nome, email, tipo(cliente|admin), telefone, foto, pontosFidelidade,
                              semConta, criadoPor  (os 2 últimos só em clientes "avulsos", sem login,
                              cadastrados manualmente pela profissional)
categorias/{id}           -> nome
servicos/{id}             -> idProfissional, idCategoria, nome, preco, duracao, descricao, ativo
disponibilidade/{id}      -> idProfissional, diaSemana, horarioInicio, horarioFim, ativo
agendamentos/{id}         -> idCliente, idProfissional, idServico, data, horario, status, observacoes,
                              servicoNomeSnapshot, valorSnapshot  (guardam o nome/preço do serviço no
                              momento do agendamento, pra não sumir do histórico se o serviço for editado/excluído)
feedbacks/{id}            -> idAgendamento, idCliente, idProfissional, nota, comentario
conversas/{clienteUid_profissionalUid} -> idCliente, idProfissional, ultimaMensagem, ultimoEnvioEm...
  conversas/{id}/mensagens/{id} -> remetente, texto, ts
campanhas/{id}            -> idProfissional, titulo, descricao, status, enviadas, abertas
fidelidadeConfig/{uidProf}-> pontosPorReal, niveis[{nome,pontosMin,pontosMax,beneficio}]
fidelidadeHistorico/{id}  -> idCliente, idProfissional, idAgendamento, pontos
prontuarios/{clienteUid_profissionalUid} -> anamnese, alergias, observações (LGPD)
  prontuarios/{id}/evolucao/{id} -> data, descricao
```

## Limitações conhecidas (bom ser transparente sobre isso)

- **Campanhas** não enviam WhatsApp/e-mail de verdade — os números de "enviadas/abertas" são inseridos
  manualmente pelo profissional. Uma integração real (WhatsApp Business API, SendGrid, etc.) exigiria uma
  função de back-end (Cloud Functions) e credenciais de terceiros.
- Buscas na tela de agendar/serviços são feitas no navegador (não é uma busca por texto completo do
  Firestore), o que é suficiente para o volume de dados de um TCC, mas não escala para milhares de serviços.
- **Upload de fotos (foto de perfil do cliente, foto de perfil da profissional, fotos de evolução do
  prontuário) está desativado nesta versão** — isso porque enviar arquivos de verdade exige o **Firebase
  Storage no plano pago (Blaze)**, e o projeto atual está no plano gratuito (Spark). Os botões de "Alterar
  foto" continuam na tela, mas mostram um aviso em vez de enviar o arquivo. Dá pra ativar depois bastando
  mudar o plano do projeto no Console e implementar o envio (o `storage.rules` já está pronto para isso).
- **Código de verificação por e-mail (6 dígitos) no cadastro foi removido** — como não existe um serviço
  de e-mail/SMS de verdade conectado, o cadastro vai direto pra escolha de perfil (admin/cliente) depois de
  preencher os dados. A confirmação de identidade continua existindo (login com e-mail/senha do Firebase).
- **Tela de "Nova senha" dentro do app é só visual** — a troca de senha de verdade acontece pelo link que o
  Firebase Authentication manda por e-mail quando a pessoa clica em "Esqueceu a senha?" (fora do app). Isso
  é mais seguro do que implementar uma tela própria de redefinição.
- **"Personalização visual" e "Backup e dados"**, na tela de Configurações do profissional, são só
  pré-visualização/informativo — trocar a cor do tema e "backup" manual não fazem nada, porque os dados já
  são salvos automaticamente no Firebase a cada ação (não existe um botão de backup separado).
- **Estoque, Fornecedores, Financeiro e Relatórios** do protótipo original não têm nenhum botão de menu que
  leve até eles (são páginas "órfãs" no arquivo original, sem link nenhum) — por isso não foram implementadas
  nesta versão. Se vocês quiserem essas telas de verdade, é só pedir que eu adiciono.

## Testes automatizados e CI/CD (GitHub Actions)

O projeto tem testes automatizados (Playwright) que rodam sozinhos toda vez que alguém sobe código
para o GitHub — isso é o CI/CD (Integração Contínua). Não precisa lembrar de rodar os testes na mão:
o GitHub roda pra você e mostra um ✅ ou ❌ direto no repositório.

### Pré-requisitos

- **Node.js** instalado (versão 18 ou mais nova) — para rodar os testes na sua máquina, se quiser.
- O repositório do projeto já criado no GitHub (neste caso, `SchedulEsty-TCC`).
- Nada de instalação extra é necessária para o CI/CD em si: o GitHub Actions já vem pronto em
  qualquer repositório, só falta o arquivo de configuração (que já está incluído aqui, veja abaixo).

### Passo a passo — rodando os testes localmente (opcional)

1. Na pasta do projeto, instale as dependências:
   ```
   npm install
   ```
2. Baixe o navegador usado pelos testes (só precisa fazer isso uma vez):
   ```
   npx playwright install --with-deps chromium
   ```
3. Rode os testes:
   ```
   npm test
   ```
   Isso roda os testes de **interface** (`tests/smoke.spec.js`), que abrem o `index.html` e conferem
   se as telas, os links e os formulários estão corretos — sem precisar de internet nem de Firebase de
   verdade (o SDK é substituído por uma versão falsa só para esses testes, veja `tests/helpers/mock-firebase.js`).
4. Para rodar também os testes de **login de verdade** (`tests/auth.spec.js`), que testam o Firebase
   Authentication de verdade, crie duas variáveis de ambiente com um usuário de teste já existente no
   projeto (por exemplo, um dos e-mails migrados com a senha temporária `Trocar@123`):
   ```
   set TEST_CLIENTE_EMAIL=email-de-teste@exemplo.com
   set TEST_CLIENTE_SENHA=Trocar@123
   npm test
   ```
   Sem essas variáveis, esses dois testes são pulados automaticamente (não quebram nada).

### Configurando o CI/CD (GitHub Actions)

O arquivo que faz a mágica acontecer já está pronto em `.github/workflows/tests.yml`. Ele diz ao GitHub:
"toda vez que alguém der `push` (ou abrir um Pull Request) na branch `main`, monte um computador limpo
com Ubuntu, instale o Node.js, instale as dependências e rode `npx playwright test`".

Para os testes de login de verdade também rodarem no GitHub (e não só localmente), cadastre os mesmos
dois valores como **segredos** do repositório (assim a senha não fica exposta no código):

1. No GitHub, entre no repositório → **Settings** → **Secrets and variables** → **Actions**.
2. Clique em **New repository secret** e crie:
   - `TEST_CLIENTE_EMAIL` → o e-mail de uma conta de teste (cliente) já existente no Firebase.
   - `TEST_CLIENTE_SENHA` → a senha dessa conta.
3. Pronto — o workflow já está configurado para ler esses dois segredos automaticamente.

### Como ver o resultado

Depois de um `git push`, abra a aba **Actions** no GitHub. Vai aparecer uma execução chamada
"Testes automatizados (SchedulEsty)" com uma bolinha amarela (rodando), depois ✅ verde (passou) ou
❌ vermelha (algum teste falhou). Clicando na execução dá pra ver o log completo de cada teste, e se
algum falhar, um relatório do Playwright fica disponível para download na própria página da execução
(seção "Artifacts" → `playwright-report`).

### Arquivos relacionados aos testes

| Arquivo | Para que serve |
|---|---|
| `tests/smoke.spec.js` | Testes de interface (telas, links, formulários) — sem rede. |
| `tests/auth.spec.js` | Testes de login/erro de login usando o Firebase de verdade. |
| `tests/helpers/mock-firebase.js` + `tests/stubs/*.js` | Versão falsa do SDK do Firebase usada só pelos testes de interface. |
| `playwright.config.js` | Configuração do Playwright (navegador, relatórios, etc.). |
| `.github/workflows/tests.yml` | Configuração do GitHub Actions — o "CI/CD" em si. |
| `.gitignore` | Lista de arquivos que **não** devem ir para o GitHub (ex.: `service-account.json`, `node_modules/`). |
