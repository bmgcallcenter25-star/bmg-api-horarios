// Dicionário de mapeamento das clínicas (De/Para) baseado na sua tabela
const MAPA_CLINICAS = {
  "sao paulo": 1,
  "rio de janeiro": 2,
  "belo horizonte": 3,
  "brasilia": 5,
  "curitiba": 6,
  "salvador": 7,
  "porto alegre": 8,
  "recife": 9,
  "fortaleza": 10,
  "goiania": 11,
  "campinas": 12,
  "vitoria": 13,
  "ribeirao preto": 14,
  "telemedicina": 15,
  "sao jose dos campos": 17,
  "itajai": 18,
  "londrina": 19,
  "manaus": 20,
  "belem": 21,
  "santos": 22,
  "sorocaba": 23,
  "uberlandia": 24,
  "santo andre": 29,
  "adesao remota": 30,
  "florianopolis": 31
};

// Função auxiliar para normalizar textos (remover acentos e deixar minúsculo)
const normalizar = (texto) => {
  if (!texto) return "";
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

module.exports = async (req, res) => {
  // 1. Segurança: Validação de Token de Acesso da IA (Header x-api-key)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.TOKEN_SECRETO_API_HORARIOS) {
    return res.status(401).json({ error: 'Acesso negado. Token inválido ou ausente.' });
  }

  // 2. Garante que apenas métodos GET ou POST sejam aceitos
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use GET ou POST.' });
  }

  const params = req.method === 'GET' ? req.query : req.body;
  const { cidade, data, tipo_tour } = params;

  if (!cidade || !data) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes: informe "cidade" e "data".' });
  }

  // 3. Valida se a cidade enviada existe no mapeamento interno
  const cidadeNormalizada = normalizar(cidade);
  const idClinica = MAPA_CLINICAS[cidadeNormalizada];

  if (!idClinica) {
    return res.status(400).json({ error: `Clínica/Cidade "${cidade}" não encontrada no mapeamento interno.` });
  }

  try {
    // 4. Monta a URL do Gateway HTTP local exposto de forma segura pelo Cloudflare Tunnel
    let gatewayUrl = `https://db-integragao.bmg-br.com.br/api/horarios?cidade=${encodeURIComponent(cidade)}&data=${encodeURIComponent(data)}`;
    
    if (tipo_tour) {
      gatewayUrl += `&tipo_tour=${encodeURIComponent(tipo_tour)}`;
    }

    // 5. Faz a requisição HTTP para o Gateway local utilizando a variável de ambiente para o token interno
    const response = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.TOKEN_SECRETO_API_HORARIOS,
        'Content-Type': 'application/json'
      }
    });

    const textResult = await response.text();

    // Retorna o status HTTP exato e o texto retornado pelo túnel/gateway para diagnóstico
    return res.status(200).json({
      status_gateway: response.status,
      resposta_bruta: textResult
    });

  } catch (error) {
    // Retorna a stack/mensagem detalhada de erro do fetch caso ocorra falha de rede/DNS/conexão
    console.error("Erro ao comunicar com o Gateway HTTP:", error);
    return res.status(500).json({ 
      error_detalhado: error.message,
      cause: error.cause ? error.cause.toString() : null
    });
  }
};