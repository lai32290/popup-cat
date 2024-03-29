import { Request, Response } from "express";

const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const geoip = require("geoip-lite");
const { LRUCache } = require("lru-cache");
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Config } from "./config/s3";

const TTL = 1000;
const MAX_COUNT = 200;
const INTERVAL_TO_SAVE = 1000 * 60 * 10; // 10 minutos

const app = express();
const port = 3000;

const s3 = new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const cache = new LRUCache({
  max: 5000,
  ttl: TTL,
});

interface State {
  countryScores: { [key: string]: number };
  prevScores: { [key: string]: number };
}
// Para armazenar os scores de cada país
const state: State = {
  countryScores: {},
  prevScores: {},
};

app.use(bodyParser.json());

app.use(cors());

async function saveToS3(result: any) {
  const params = {
    Bucket: s3Config.bucket,
    Key: s3Config.key,
    Body: JSON.stringify(result),
  };

  try {
    await s3.send(new PutObjectCommand(params));
    state.prevScores = { ...result };
    console.log("Salvo no S3");
  } catch (err) {
    console.error(err);
  }
}

async function loadScoreFromS3() {
  try {
    const data = await s3.send(
      new GetObjectCommand({ Bucket: "popup-cat", Key: "result.json" })
    );
    const value = (await data.Body?.transformToString()) ?? "{}";
    state.countryScores = JSON.parse(value);
    state.prevScores = { ...state.countryScores };
    console.log("Carregado do S3");
  } catch (err) {
    console.error(err);
  }
}

setInterval(() => {
  console.log("Nothing changed to save", {
    countryScores: state.countryScores,
    prevScores: state.prevScores,
  });

  if (
    JSON.stringify(state.countryScores) === JSON.stringify(state.prevScores)
  ) {
    return;
  }

  saveToS3(state.countryScores);
}, 1000);

// Endpoint para registro
app.post("/register", (req: Request, res: Response) => {
  const { count } = req.body;
  // Usa o endereço IP do remetente da requisição para encontrar a localização geográfica
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log(Date.now() - cache.get(ip));
  if (cache.get(ip) && Date.now() - cache.get(ip) < TTL) {
    res.send("ok");
    return;
  }

  if (count < 1 || count > MAX_COUNT) {
    res.send("ok");
    return;
  }

  cache.set(ip, Date.now());

  const geo = geoip.lookup(ip);

  if (geo && geo.country) {
    const country = geo.country;

    // Incrementa o score do país com o valor recebido ou inicializa se não existir
    if (state.countryScores[country]) {
      state.countryScores[country] += count;
    } else {
      state.countryScores[country] = count;
    }

    res.send("ok");
  } else {
    res.status(400).send("Não foi possível determinar o país do IP");
  }
});

// Endpoint para rank
app.get("/rank", (req: Request, res: Response) => {
  res.json({ priorityRank: state.countryScores });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  loadScoreFromS3();
});
