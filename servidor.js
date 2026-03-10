require("dotenv").config();
const express = require("express");
const https = require("https");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pfxBase64Limpo = process.env.BB_PFX_BASE64
  .replace(/-----BEGIN CERTIFICATE-----/g, "")
  .replace(/-----END CERTIFICATE-----/g, "")
  .replace(/\s+/g, "");

const pfx = Buffer.from(pfxBase64Limpo, "base64");

const agent = new https.Agent({
  pfx: pfx,
  passphrase: process.env.BB_CERT_PASSWORD,
  minVersion: "TLSv1.2",
});

const CLIENT_ID = process.env.BB_CLIENT_ID;
const CLIENT_SECRET = process.env.BB_CLIENT_SECRET;
const APP_KEY = process.env.BB_APP_KEY;

app.get("/", (req, res) => {
  res.send("Servidor Node funcionando.");
});

app.post("/extrato", async (req, res) => {
  try {
    const { agencia, conta, dataInicioSolicitacao, dataFimSolicitacao } = req.body;

    const tokenResponse = await axios.post(
      "https://oauth.bb.com.br/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
      {
        httpsAgent: agent,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        },
        timeout: 30000,
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const url = `https://api-extratos.bb.com.br/extratos/v1/conta-corrente/agencia/${agencia}/conta/${conta}`;

    let paginaAtual = 1;
    let todasPaginas = [];
    let numeroPaginaProximo = 0;
    let quantidadeTotalPagina = 1;

    do {
      const params = {
        "gw-dev-app-key": APP_KEY,
        numeroPaginaSolicitacao: paginaAtual,
        quantidadeRegistroPaginaSolicitacao: 200,
      };

      if (dataInicioSolicitacao && dataFimSolicitacao) {
        params.dataInicioSolicitacao = dataInicioSolicitacao;
        params.dataFimSolicitacao = dataFimSolicitacao;
      }

      const extratoResponse = await axios.get(url, {
        httpsAgent: agent,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
        timeout: 30000,
      });

      const dadosPagina = extratoResponse.data;
      const lista = Array.isArray(dadosPagina.listaLancamento)
        ? dadosPagina.listaLancamento
        : [];

      todasPaginas.push(...lista);

      numeroPaginaProximo = dadosPagina.numeroPaginaProximo || 0;
      quantidadeTotalPagina = dadosPagina.quantidadeTotalPagina || paginaAtual;

      if (numeroPaginaProximo > paginaAtual && numeroPaginaProximo <= quantidadeTotalPagina) {
        paginaAtual = numeroPaginaProximo;
      } else {
        break;
      }
    } while (paginaAtual <= quantidadeTotalPagina);

    res.json({
      ok: true,
      dados: {
        numeroPaginaAtual: 1,
        quantidadeRegistroPaginaAtual: todasPaginas.length,
        numeroPaginaAnterior: 0,
        numeroPaginaProximo: 0,
        quantidadeTotalPagina,
        quantidadeTotalRegistro: todasPaginas.length,
        listaLancamento: todasPaginas,
      },
    });
  } catch (error) {
    console.error("ERRO DETALHADO:", error.response ? error.response.data : error.message);

    res.status(500).json({
      ok: false,
      mensagem: "Erro ao consultar extrato no BB",
      erro: error.response ? error.response.data : error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});