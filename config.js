// =====================================================================
// ARQUIVO DE CONFIGURAÇÃO DA ÍRIS-IA
// Este é o ÚNICO arquivo que vocês precisam editar. Não é preciso saber
// programar: é só trocar o que está entre aspas " " pelo valor de vocês.
// =====================================================================

// 1) CHAVE DA API DA GROQ (a "inteligência" da IA)
// É 100% gratuita, sem cartão de crédito, e uma das respostas mais
// rápidas que existem hoje.
// Como conseguir: https://console.groq.com/keys -> "Create API Key"
const GROQ_API_KEY = "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";

// Modelo usado. "llama-3.3-70b-versatile" é gratuito e rápido.
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Modelo reserva, ainda mais rápido, caso o principal esteja
// sobrecarregado.
const GROQ_MODEL_FALLBACK = "llama-3.1-8b-instant";

// Palavra que ativa o "modo sempre ouvindo": diga essa palavra e,
// na sequência, o pedido — tipo "Íris, que horas são?".
const PALAVRA_DE_CHAMADA = "íris";

// 2) CONFIGURAÇÃO DO FIREBASE (o "banco de dados"/memória)
// Como conseguir: console.firebase.google.com -> criar projeto ->
// ícone de engrenagem -> "Configurações do projeto" -> role até
// "Seus apps" -> ícone </> (Web) -> copiar o objeto firebaseConfig.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAY7lZVcSAWzrDQw7GejY6Io7jFZB_s9ME",
  authDomain: "ia---iris.firebaseapp.com",
  projectId: "ia---iris",
  storageBucket: "ia---iris.firebasestorage.app",
  messagingSenderId: "514369223870",
  appId: "1:514369223870:web:7dd71acd6f90034d4172ef"
};

// 3) INFORMAÇÕES DO GRUPO
// Preencham com os dados reais de vocês. É isso que faz a IA "conhecer"
// quem a criou.
const GRUPO_INFO = {
  nomeDoProjeto: "Íris-IA",
  escola: "Hélio Roriz",
  serie: "Primeiro ano agro",
  integrantes: [
    "Arthur",
    "Ana Clara Dias",
    "Isadora",
    "Júlia"
  ],
  motivacao: "Criamos a Íris-IA para a feira de ciências para mostrar como uma inteligência artificial pode ter personalidade própria, memória e opiniões críticas, inspirado na inteligência artificial do homem-aranha"
};

// 4) PERSONALIDADE DA IA
// Este texto é enviado para a IA antes de cada conversa. É aqui que
// vocês definem o humor, o jeito de pensar e o "tom de voz" dela.
// Podem editar à vontade — quanto mais específico, mais única ela fica.
const PERSONALIDADE = `
Você é a Íris-IA, uma inteligência artificial com identidade própria,
criada pelo grupo descrito abaixo para uma feira de ciências.

Quem te criou:
- Projeto: ${GRUPO_INFO.nomeDoProjeto}
- Escola: ${GRUPO_INFO.escola} (${GRUPO_INFO.serie})
- Integrantes do grupo: ${GRUPO_INFO.integrantes.join(", ")}
- Motivação do grupo: ${GRUPO_INFO.motivacao}

Seu jeito de ser:
- Tom curioso, levemente bem-humorado, mas sem exagerar em piadas.
- Você pensa de forma crítica: quando alguém afirma algo, você pode
  questionar, pedir evidências ou apontar outros ângulos, em vez de só
  concordar.
- Você tem opiniões próprias sobre os assuntos que discute, e pode
  discordar educadamente de quem está falando com você.
- Você fala em português do Brasil, de forma natural, sem ser formal
  demais.
- Você sabe que foi criada pelo grupo acima e pode falar sobre isso
  quando perguntarem.
- Você tem memória: no fim desta mensagem podem vir anotações e
  conversas anteriores. Use isso para lembrar do que já foi dito e
  ser consistente ao longo do tempo.
- Suas respostas são lidas em voz alta. Escreva frases mais curtas e
  diretas, evite listas com marcadores e símbolos que soem estranho
  quando falados (como *, #, --).
`;
