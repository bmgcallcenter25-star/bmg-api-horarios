const sql = require('mssql');

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

  // 3. Traduz o nome da cidade enviado pela IA para o ID numérico correspondente
  const cidadeNormalizada = normalizar(cidade);
  const idClinica = MAPA_CLINICAS[cidadeNormalizada];

  if (!idClinica) {
    return res.status(400).json({ error: `Clínica/Cidade "${cidade}" não encontrada no mapeamento interno.` });
  }

  try {
    // 4. Conecta ao banco de dados utilizando a string de ambiente
    await sql.connect(process.env.DB_CONNECTION_STRING);

    // 5. Query aplicando as regras de negócio:
    // - clinica = idClinica
    // - fechatur = data desejada
    // - id_cliente = 0 (horários livres)
    let queryStr = `
      SELECT hora, fechatur, fk_tipotur 
      FROM sua_tabela_de_horarios 
      WHERE clinica = @clinica 
        AND fechatur = @data 
        AND id_cliente = 0
    `;

    const request = new sql.Request();
    request.input('clinica', sql.Int, idClinica);
    request.input('data', sql.Date, data);

    // Se a IA enviar o tipo de tour (ex: 1 para primeira vez), filtra também
    if (tipo_tour) {
      queryStr += ` AND fk_tipotur = @tipoTour`;
      request.input('tipoTour', sql.Int, tipo_tour);
    }

    queryStr += ` ORDER BY hora ASC`;

    const resultado = await request.query(queryStr);

    // 6. Retorna o JSON limpo para a empresa de IA consumir
    return res.status(200).json({
      success: true,
      cidade: cidade,
      clinica_id: idClinica,
      data_consultada: data,
      total_disponiveis: resultado.recordset.length,
      horarios: resultado.recordset.map(row => row.hora)
    });

  } catch (error) {
    console.error("Erro na consulta ao banco:", error);
    return res.status(500).json({ error: 'Erro interno ao consultar disponibilidade no banco de dados.' });
  }
};