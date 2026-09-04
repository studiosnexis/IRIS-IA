// =====================================================================
// LÓGICA DA ARACNO-IA
// Vocês não precisam mexer neste arquivo — tudo que é personalizável
// está no config.js.
// =====================================================================

// ---- referências da tela ----
const chatEl = document.getElementById("chat");
const composer = document.getElementById("composer");
const entrada = document.getElementById("entrada");
const btnEnviar = document.getElementById("btnEnviar");
const statusDot = document.getElementById("statusDot");
const panel = document.getElementById("panel");
const btnInfo = document.getElementById("btnInfo");
const btnClosePanel = document.getElementById("btnClosePanel");
const grupoTexto = document.getElementById("grupoTexto");
const listaAnotacoes = document.getElementById("listaAnotacoes");
const formNota = document.getElementById("formNota");
const novaNota = document.getElementById("novaNota");
const btnMic = document.getElementById("btnMic");
const btnVoz = document.getElementById("btnVoz");

// ---- inicializar Firebase ----
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// ---- mostrar dados do grupo no painel ----
grupoTexto.textContent =
  `${GRUPO_INFO.nomeDoProjeto} — ${GRUPO_INFO.escola} (${GRUPO_INFO.serie}). ` +
  `Criado por: ${GRUPO_INFO.integrantes.join(", ")}. ${GRUPO_INFO.motivacao}`;

// ---- abrir/fechar painel lateral ----
btnInfo.addEventListener("click", () => panel.classList.add("open"));
btnClosePanel.addEventListener("click", () => panel.classList.remove("open"));

// =====================================================================
// VOZ: ouvir pelo microfone e responder falando
// (usa os recursos nativos do navegador — sem custo, sem API extra)
// =====================================================================

let vozAtiva = true; // resposta falada começa ligada

btnVoz.addEventListener("click", () => {
  vozAtiva = !vozAtiva;
  btnVoz.textContent = vozAtiva ? "🔊" : "🔇";
  btnVoz.classList.toggle("off", !vozAtiva);
  if (!vozAtiva) speechSynthesis.cancel();
});

function falar(texto) {
  if (!vozAtiva || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel(); // corta qualquer fala anterior antes de começar
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  const vozes = speechSynthesis.getVoices();
  const vozPt = vozes.find(v => v.lang === "pt-BR") || vozes.find(v => v.lang?.startsWith("pt"));
  if (vozPt) fala.voice = vozPt;
  speechSynthesis.speak(fala);
}

// Reconhecimento de fala (microfone). Nem todo navegador tem suporte
// (funciona bem no Chrome); se não tiver, o botão avisa e não quebra
// o resto do app.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconhecimento = null;

if (SpeechRecognitionAPI) {
  reconhecimento = new SpeechRecognitionAPI();
  reconhecimento.lang = "pt-BR";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  reconhecimento.addEventListener("start", () => {
    btnMic.classList.add("gravando");
  });

  reconhecimento.addEventListener("end", () => {
    btnMic.classList.remove("gravando");
  });

  reconhecimento.addEventListener("result", (evento) => {
    const texto = evento.results[0][0].transcript;
    entrada.value = texto;
    // envia automaticamente assim que reconhece a fala
    composer.requestSubmit();
  });

  reconhecimento.addEventListener("error", () => {
    btnMic.classList.remove("gravando");
  });

  btnMic.addEventListener("click", () => {
    speechSynthesis.cancel(); // não escuta por cima da própria fala
    reconhecimento.start();
  });
} else {
  btnMic.addEventListener("click", () => {
    alert("Este navegador não tem suporte a reconhecimento de voz. Use o Chrome, ou digite a mensagem normalmente.");
  });
}

// =====================================================================
// MEMÓRIA: histórico de conversas + anotações, guardados no Firestore
// =====================================================================

async function carregarHistorico(limite = 12) {
  const snap = await db.collection("conversas")
    .orderBy("timestamp", "desc")
    .limit(limite)
    .get();
  return snap.docs.map(d => d.data()).reverse();
}

async function salvarMensagem(role, texto) {
  await db.collection("conversas").add({
    role,
    texto,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function carregarAnotacoes() {
  const snap = await db.collection("anotacoes")
    .orderBy("timestamp", "desc")
    .limit(20)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function salvarAnotacao(texto, autor = "grupo") {
  await db.collection("anotacoes").add({
    texto,
    autor,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function atualizarPainelAnotacoes() {
  const anotacoes = await carregarAnotacoes();
  listaAnotacoes.innerHTML = "";
  anotacoes.forEach(nota => {
    const div = document.createElement("div");
    div.className = "nota-item";
    div.textContent = nota.texto;
    listaAnotacoes.appendChild(div);
  });
}

formNota.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = novaNota.value.trim();
  if (!texto) return;
  await salvarAnotacao(texto, "grupo");
  novaNota.value = "";
  atualizarPainelAnotacoes();
});

// =====================================================================
// CONVERSA NA TELA
// =====================================================================

function adicionarBolha(role, texto) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "ia" ? "ia" : "user");
  const autor = document.createElement("span");
  autor.className = "autor";
  autor.textContent = role === "ia" ? "ÍRIS-IA" : "VOCÊ";
  div.appendChild(autor);
  div.appendChild(document.createTextNode(texto));
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function setPensando(ligado) {
  statusDot.classList.toggle("thinking", ligado);
  btnEnviar.disabled = ligado;
}

// =====================================================================
// CHAMADA AO GEMINI, com o histórico e as anotações como contexto
// =====================================================================

async function perguntarAracnoIA(mensagemUsuario) {
  const [historico, anotacoes] = await Promise.all([
    carregarHistorico(),
    carregarAnotacoes()
  ]);

  const contextoHistorico = historico
    .map(m => `${m.role === "ia" ? "Íris-IA" : "Usuário"}: ${m.texto}`)
    .join("\n");

  const contextoAnotacoes = anotacoes.length
    ? anotacoes.map(a => `- ${a.texto}`).join("\n")
    : "(nenhuma anotação salva ainda)";

  const promptCompleto =
    `${PERSONALIDADE}\n\n` +
    `Anotações salvas na memória:\n${contextoAnotacoes}\n\n` +
    `Conversa recente:\n${contextoHistorico}\n\n` +
    `Usuário: ${mensagemUsuario}\n` +
    `Íris-IA:`;

  async function chamarModelo(modelo) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }]
      })
    });
    if (!resposta.ok) {
      const erro = await resposta.text();
      const erroObj = new Error("Erro na API do Gemini: " + erro);
      erroObj.status = resposta.status;
      throw erroObj;
    }
    const dados = await resposta.json();
    return dados?.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Tenta o modelo principal até 3 vezes (o erro 503 costuma ser
  // passageiro), depois cai para o modelo reserva.
  const modelosParaTentar = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_MODEL, GEMINI_MODEL_FALLBACK];
  let ultimoErro;

  for (let i = 0; i < modelosParaTentar.length; i++) {
    try {
      const texto = await chamarModelo(modelosParaTentar[i]);
      return texto || "(a Íris-IA não conseguiu formular uma resposta agora)";
    } catch (err) {
      ultimoErro = err;
      // Só vale a pena tentar de novo se for "sobrecarregado" (503).
      // Outros erros (chave errada, modelo não existe) param na hora.
      if (err.status !== 503) throw err;
      await esperar(1500);
    }
  }
  throw ultimoErro;
}

// =====================================================================
// ENVIO DE MENSAGEM
// =====================================================================

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = entrada.value.trim();
  if (!texto) return;

  entrada.value = "";
  adicionarBolha("user", texto);
  await salvarMensagem("user", texto);

  setPensando(true);
  try {
    const resposta = await perguntarAracnoIA(texto);
    adicionarBolha("ia", resposta);
    await salvarMensagem("ia", resposta);
    falar(resposta);
  } catch (err) {
    adicionarBolha("ia", "Deu um curto-circuito na minha teia: " + err.message);
  } finally {
    setPensando(false);
  }
});

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================

(async function iniciar() {
  atualizarPainelAnotacoes();
  const historico = await carregarHistorico();
  if (historico.length === 0) {
    const saudacao = `Oi! Eu sou a ${GRUPO_INFO.nomeDoProjeto}. Fui criada por ${GRUPO_INFO.integrantes.join(", ")} para a feira de ciências. Pode falar comigo.`;
    adicionarBolha("ia", saudacao);
    falar(saudacao);
  } else {
    historico.forEach(m => adicionarBolha(m.role, m.texto));
  }
})();
