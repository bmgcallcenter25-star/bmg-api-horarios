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

const normalizar = (texto) => {
  if (!texto) return "";
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

module.exports = async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.TOKEN_SECRETO_API_HORARIOS) {
    return res.status(401).json({ error: 'Acesso negado. Token inválido ou ausente.' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use GET ou POST.' });
  }

  const params = req.method === 'GET' ? req.query : req.body;
  const { cidade, data, tipo_tour } = params;

  if (!cidade || !data) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes: informe "cidade" e "data".' });
  }

  const cidadeNormalizada = normalizar(cidade);
  const idClinica = MAPA_CLINICAS[cidadeNormalizada];

  if (!idClinica) {
    return res.status(400).json({ error: `Clínica/Cidade "${cidade}" não encontrada no mapeamento interno.` });
  }

  try {
    // Aponta para a variável de ambiente do Cloudflare Tunnel configurada na Vercel
    let gatewayUrl = `${process.env.GATEWAY_URL}/api/horarios?cidade=${encodeURIComponent(cidade)}&data=${encodeURIComponent(data)}`;
    
    if (tipo_tour) {
      gatewayUrl += `&tipo_tour=${encodeURIComponent(tipo_tour)}`;
    }

    const response = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.TOKEN_SECRETO_API_HORARIOS,
        'Content-Type': 'application/json'
      }
    });

    const dataResult = await response.json();
    return res.status(response.status).json(dataResult);

  } catch (error) {
    console.error("Erro ao comunicar com o Gateway HTTP:", error);
    return res.status(500).json({ error: 'Erro interno de comunicação com o gateway de dados.', detalhe: error.message });
  }
};