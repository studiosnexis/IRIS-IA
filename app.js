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
const btnEscuta = document.getElementById("btnEscuta");
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
let modoSempreOuvindo = false;
let falandoAgora = false;

btnVoz.addEventListener("click", () => {
  vozAtiva = !vozAtiva;
  btnVoz.textContent = vozAtiva ? "🔊" : "🔇";
  btnVoz.classList.toggle("off", !vozAtiva);
  if (!vozAtiva) speechSynthesis.cancel();
});

function falar(texto) {
  if (!vozAtiva || !("speechSynthesis" in window)) return;
  falandoAgora = true;
  if (modoSempreOuvindo && reconhecimentoContinuo) {
    try { reconhecimentoContinuo.stop(); } catch (e) {}
  }
  speechSynthesis.cancel(); // corta qualquer fala anterior antes de começar
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  const vozes = speechSynthesis.getVoices();
  const vozPt = vozes.find(v => v.lang === "pt-BR") || vozes.find(v => v.lang?.startsWith("pt"));
  if (vozPt) fala.voice = vozPt;
  fala.addEventListener("end", () => {
    falandoAgora = false;
    if (modoSempreOuvindo && reconhecimentoContinuo) {
      try { reconhecimentoContinuo.start(); } catch (e) {}
    }
  });
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

  reconhecimento.addEventListener("error", (evento) => {
    btnMic.classList.remove("gravando");
    if (evento.error === "not-allowed") {
      alert("O microfone foi bloqueado. Permita o acesso ao microfone nas configurações do site e tente de novo.");
    } else if (evento.error === "no-speech") {
      // ninguém falou nada — não precisa alarmar, só ignora
    } else {
      alert("Não consegui usar o microfone (" + evento.error + "). Isso costuma acontecer em navegadores como Opera, Firefox ou Safari — use o Google Chrome oficial.");
    }
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

// ---- modo "sempre ouvindo": diga a palavra de chamada + o pedido ----

function normalizar(txt) {
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// tira a palavra de chamada do início da frase e devolve só o pedido,
// ou null se a palavra de chamada não foi dita
function extrairPedido(transcript) {
  const norm = normalizar(transcript);
  const palavra = normalizar(PALAVRA_DE_CHAMADA);
  const posicao = norm.indexOf(palavra);
  if (posicao === -1) return null;
  return transcript
    .slice(posicao + palavra.length)
    .trim()
    .replace(/^[,:.\-\s]+/, "");
}

let reconhecimentoContinuo = null;
let aguardandoPedido = false; // true logo depois de ouvir só a palavra de chamada

if (SpeechRecognitionAPI) {
  reconhecimentoContinuo = new SpeechRecognitionAPI();
  reconhecimentoContinuo.lang = "pt-BR";
  reconhecimentoContinuo.continuous = true;
  reconhecimentoContinuo.interimResults = false;

  reconhecimentoContinuo.addEventListener("result", (evento) => {
    const ultimo = evento.results[evento.results.length - 1];
    const transcript = ultimo[0].transcript;

    if (aguardandoPedido) {
      aguardandoPedido = false;
      entrada.value = transcript.trim();
      composer.requestSubmit();
      return;
    }

    const pedido = extrairPedido(transcript);
    if (pedido === null) return; // não chamaram pelo nome, ignora

    if (pedido.length > 0) {
      // ela ouviu tudo numa frase só: "Íris, que horas são?"
      entrada.value = pedido;
      composer.requestSubmit();
    } else {
      // só disseram o nome: espera a próxima frase ser o pedido
      aguardandoPedido = true;
      setTimeout(() => { aguardandoPedido = false; }, 6000);
    }
  });

  reconhecimentoContinuo.addEventListener("end", () => {
    // o navegador desliga sozinho depois de um tempo; religa se o
    // modo ainda estiver ativo e a Íris não estiver falando
    if (modoSempreOuvindo && !falandoAgora) {
      try { reconhecimentoContinuo.start(); } catch (e) {}
    }
  });

  reconhecimentoContinuo.addEventListener("error", (evento) => {
    if (evento.error === "not-allowed") {
      modoSempreOuvindo = false;
      btnEscuta.classList.remove("ligado");
      alert("Permissão de microfone negada — não dá pra manter o modo 'sempre ouvindo'.");
    }
  });

  btnEscuta.addEventListener("click", () => {
    modoSempreOuvindo = !modoSempreOuvindo;
    btnEscuta.classList.toggle("ligado", modoSempreOuvindo);
    if (modoSempreOuvindo) {
      try { reconhecimentoContinuo.start(); } catch (e) {}
    } else {
      try { reconhecimentoContinuo.stop(); } catch (e) {}
    }
  });
} else {
  btnEscuta.addEventListener("click", () => {
    alert("Este navegador não tem suporte a reconhecimento de voz contínuo. Use o Google Chrome.");
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

  const contextoAnotacoes = anotacoes.length
    ? anotacoes.map(a => `- ${a.texto}`).join("\n")
    : "(nenhuma anotação salva ainda)";

  const mensagemSistema = `${PERSONALIDADE}\n\nAnotações salvas na memória:\n${contextoAnotacoes}`;

  const mensagens = [
    { role: "system", content: mensagemSistema },
    ...historico.map(m => ({
      role: m.role === "ia" ? "assistant" : "user",
      content: m.texto
    })),
    { role: "user", content: mensagemUsuario }
  ];

  async function chamarModelo(modelo) {
    const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: modelo,
        messages: mensagens
      })
    });
    if (!resposta.ok) {
      const erro = await resposta.text();
      const erroObj = new Error("Erro na API da Íris-IA: " + erro);
      erroObj.status = resposta.status;
      throw erroObj;
    }
    const dados = await resposta.json();
    return dados?.choices?.[0]?.message?.content;
  }

  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Tenta o modelo principal, e se estiver sobrecarregado (429/503)
  // cai para o modelo reserva, que é ainda mais rápido.
  const modelosParaTentar = [GROQ_MODEL, GROQ_MODEL, GROQ_MODEL_FALLBACK];
  let ultimoErro;

  for (let i = 0; i < modelosParaTentar.length; i++) {
    try {
      const texto = await chamarModelo(modelosParaTentar[i]);
      return texto || "(a Íris-IA não conseguiu formular uma resposta agora)";
    } catch (err) {
      ultimoErro = err;
      if (err.status !== 503 && err.status !== 429 && err.status !== 404) throw err;
      await esperar(1000);
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
