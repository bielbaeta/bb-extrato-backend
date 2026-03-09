const fs = require("fs");
const https = require("https");
const axios = require("axios");

console.log("Iniciando teste...");

const pfx = fs.readFileSync("./certificado.pfx");

const agent = new https.Agent({
  pfx: pfx,
  passphrase: "Moedense2026",
  minVersion: "TLSv1.2",
});

const CLIENT_ID = "eyJpZCI6ImNlMDEyM2EtYjU4YS00YzM4LWIzZWQtZGMiLCJjb2RpZ29QdWJsaWNhZG9yIjowLCJjb2RpZ29Tb2Z0d2FyZSI6MTQ4OTIzLCJzZXF1ZW5jaWFsSW5zdGFsYWNhbyI6MX0";
const CLIENT_SECRET = "eyJpZCI6Ijg3NDk3MjgtNDczYS00ZDdkLThhIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE0ODkyMywic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6InByb2R1Y2FvIiwiaWF0IjoxNzcyNzIyNzk2NzA4fQ";
const APP_KEY = "e0bd3d0585d84d58a09d6106ff048a3d";

const AGENCIA = "4068";
const CONTA = "4816";

async function testarExtrato() {
  try {
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
    console.log("Token gerado com sucesso.");

    const url = `https://api-extratos.bb.com.br/extratos/v1/conta-corrente/agencia/${AGENCIA}/conta/${CONTA}`;

    const extratoResponse = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        "gw-dev-app-key": APP_KEY,
        numeroPaginaSolicitacao: 1,
        quantidadeRegistroPaginaSolicitacao: 50,
      },
      timeout: 30000,
    });

    console.log("Extrato retornado com sucesso.");
    console.log(JSON.stringify(extratoResponse.data, null, 2));
  } catch (error) {
    console.log("Erro na consulta do extrato:");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Body:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Mensagem:", error.message);
    }
  }
}

testarExtrato();