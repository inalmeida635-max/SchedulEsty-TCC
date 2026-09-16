/**
 * migrar.js
 * ----------------------------------------------------------------
 * Importa os dados de teste do banco MySQL antigo (dados-antigos.json)
 * para o Firestore, recriando os relacionamentos com os novos IDs
 * (UID do Firebase Authentication) no lugar dos IDs numéricos antigos.
 *
 * COMO USAR:
 *   1. npm install
 *   2. Coloque o arquivo da conta de serviço (baixado no Console do
 *      Firebase) na mesma pasta com o nome "service-account.json".
 *      (Configurações do projeto > Contas de serviço > Gerar nova chave privada)
 *   3. node migrar.js
 *
 * O QUE ELE FAZ:
 *   - Para cada usuário antigo, cria um usuário no Firebase Authentication
 *     (senha temporária: definida em SENHA_TEMPORARIA abaixo) e um
 *     documento em usuarios/{uid} juntando os dados de usuarios+clientes
 *     ou usuarios+profissionais em um único lugar.
 *   - Copia categorias, servicos, disponibilidade, agendamentos e
 *     feedbacks, trocando os IDs numéricos antigos pelos novos UIDs.
 *   - Cria um documento inicial de configuração do programa de fidelidade
 *     para cada profissional migrado.
 *
 * IMPORTANTE: os e-mails aqui são reais (da sua equipe). Este script
 * NÃO envia nenhum e-mail sozinho — ele só cria a conta com uma senha
 * temporária. Avise cada pessoa da senha temporária, ou peça pra elas
 * usarem "Esqueci minha senha" na tela de login pra definir a própria.
 */

const admin = require("firebase-admin");
const dados = require("./dados-antigos.json");

const SENHA_TEMPORARIA = "Trocar@123";

admin.initializeApp({
  credential: admin.credential.cert(require("./service-account.json")),
});

const auth = admin.auth();
const db = admin.firestore();

async function criarOuBuscarUsuario(email, nomeExibicao) {
  try {
    const existente = await auth.getUserByEmail(email);
    return existente.uid;
  } catch (e) {
    const novo = await auth.createUser({
      email,
      password: SENHA_TEMPORARIA,
      displayName: nomeExibicao,
    });
    return novo.uid;
  }
}

async function migrar() {
  console.log("Iniciando migração...\n");

  // Mapas de ID antigo -> UID novo
  const uidPorIdUsuario = new Map();
  const uidPorIdCliente = new Map();
  const uidPorIdProfissional = new Map();

  // 1) USUÁRIOS (base)
  for (const u of dados.usuarios) {
    const uid = await criarOuBuscarUsuario(u.email, u.nome);
    uidPorIdUsuario.set(u.id_usuario, uid);
    console.log(`Usuário criado: ${u.nome} <${u.email}> -> ${uid}`);
  }

  // 2) CLIENTES (mescla com o usuário base)
  for (const c of dados.clientes) {
    const uid = uidPorIdUsuario.get(c.id_usuario);
    if (!uid) continue;
    uidPorIdCliente.set(c.id_cliente, uid);

    const base = dados.usuarios.find((u) => u.id_usuario === c.id_usuario);

    await db.collection("usuarios").doc(uid).set(
      {
        nome: base.nome,
        email: base.email,
        tipo: "cliente",
        telefone: c.telefone,
        dataNascimento: c.data_nascimento,
        cpf: c.cpf,
        foto: c.foto || null,
        pontosFidelidade: 0,
        dataCadastro: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 3) PROFISSIONAIS (mescla com o usuário base)
  for (const p of dados.profissionais) {
    const uid = uidPorIdUsuario.get(p.id_usuario);
    if (!uid) continue;
    uidPorIdProfissional.set(p.id_profissional, uid);

    await db.collection("usuarios").doc(uid).set(
      {
        nome: p.nome,
        email: p.email,
        tipo: "admin",
        especialidade: p.especialidade,
        telefone: p.telefone,
        foto: p.foto || null,
        ativo: true,
        dataCadastro: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Configuração padrão do programa de fidelidade para este profissional
    await db.collection("fidelidadeConfig").doc(uid).set({
      pontosPorReal: 1,
      niveis: [
        { nome: "Bronze",   pontosMin: 0,    pontosMax: 299,  beneficio: "5% de desconto" },
        { nome: "Prata",    pontosMin: 300,  pontosMax: 699,  beneficio: "10% de desconto + brinde" },
        { nome: "Ouro",     pontosMin: 700,  pontosMax: 1499, beneficio: "15% + serviço grátis" },
        { nome: "Diamante", pontosMin: 1500, pontosMax: 9999, beneficio: "20% + prioridade + mimo" },
      ],
    });
  }

  // 4) Qualquer usuário admin sem registro em "profissionais" no banco
  //    antigo (ex: id_usuario 7) ainda precisa da config de fidelidade.
  for (const u of dados.usuarios) {
    const uid = uidPorIdUsuario.get(u.id_usuario);
    if (u.tipo !== "admin") continue;
    const jaTem = [...uidPorIdProfissional.values()].includes(uid);
    if (!jaTem) {
      await db.collection("fidelidadeConfig").doc(uid).set({
        pontosPorReal: 1,
        niveis: [
          { nome: "Bronze",   pontosMin: 0,    pontosMax: 299,  beneficio: "5% de desconto" },
          { nome: "Prata",    pontosMin: 300,  pontosMax: 699,  beneficio: "10% de desconto + brinde" },
          { nome: "Ouro",     pontosMin: 700,  pontosMax: 1499, beneficio: "15% + serviço grátis" },
          { nome: "Diamante", pontosMin: 1500, pontosMax: 9999, beneficio: "20% + prioridade + mimo" },
        ],
      });
    }
  }

  // 5) CATEGORIAS
  const uidPorIdCategoria = new Map();
  for (const cat of dados.categorias) {
    const ref = await db.collection("categorias").add({ nome: cat.nome });
    uidPorIdCategoria.set(cat.id_categoria, ref.id);
  }
  console.log("\nCategorias migradas.");

  // 6) SERVIÇOS
  const uidPorIdServico = new Map();
  for (const s of dados.servicos) {
    const idProfissional = uidPorIdProfissional.get(s.id_profissional);
    if (!idProfissional) continue;
    const ref = await db.collection("servicos").add({
      idProfissional,
      idCategoria: uidPorIdCategoria.get(s.id_categoria) || null,
      nome: s.nome,
      descricao: s.descricao,
      preco: s.preco,
      duracao: s.duracao,
      imagem: s.imagem || "",
      ativo: !!s.ativo,
    });
    uidPorIdServico.set(s.id_servico, ref.id);
  }
  console.log("Serviços migrados.");

  // 7) DISPONIBILIDADE
  for (const d of dados.disponibilidade) {
    const idProfissional = uidPorIdProfissional.get(d.id_profissional);
    if (!idProfissional) continue;
    await db.collection("disponibilidade").add({
      idProfissional,
      diaSemana: d.dia_semana,
      horarioInicio: d.horario_inicio,
      horarioFim: d.horario_fim,
      ativo: !!d.ativo,
    });
  }
  console.log("Disponibilidade migrada.");

  // 8) AGENDAMENTOS
  const uidPorIdAgendamento = new Map();
  for (const a of dados.agendamentos) {
    const idCliente = uidPorIdCliente.get(a.id_cliente);
    const idProfissional = uidPorIdProfissional.get(a.id_profissional);
    const idServico = uidPorIdServico.get(a.id_servico);
    if (!idCliente || !idProfissional || !idServico) continue;

    const ref = await db.collection("agendamentos").add({
      idCliente,
      idProfissional,
      idServico,
      data: a.data,
      horario: a.horario,
      status: a.status,
      observacoes: a.observacoes || null,
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    });
    uidPorIdAgendamento.set(a.id_agendamento, ref.id);
  }
  console.log("Agendamentos migrados.");

  // 9) FEEDBACKS
  for (const f of dados.feedbacks) {
    const idAgendamento = uidPorIdAgendamento.get(f.id_agendamento);
    const idCliente = uidPorIdCliente.get(f.id_cliente);
    const idProfissional = uidPorIdProfissional.get(f.id_profissional);
    if (!idAgendamento || !idCliente || !idProfissional) continue;

    await db.collection("feedbacks").add({
      idAgendamento,
      idCliente,
      idProfissional,
      nota: f.nota,
      comentario: f.comentario,
      dataCriacao: admin.firestore.Timestamp.fromDate(new Date(f.data_criacao.replace(" ", "T"))),
    });
  }
  console.log("Feedbacks migrados.");

  console.log("\nMigração concluída com sucesso!");
  console.log(`Senha temporária de todas as contas migradas: ${SENHA_TEMPORARIA}`);
  console.log("Peça para cada pessoa trocar a senha pela tela de login (\"Esqueci minha senha\").");
}

migrar().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
