// Gemini Embeddings Generator for Pinecone
// Usage: node scripts/generate-embeddings-gemini.mjs
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import 'dotenv/config';
import pkg from '@pinecone-database/pinecone';
const { createClient } = pkg;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCq7hjWOmLdUnGvT2ZiXC5ogedYDO594hQ';
const GEMINI_PROJECT = process.env.GEMINI_PROJECT || '636166299208';
const GEMINI_LOCATION = process.env.GEMINI_LOCATION || 'us-central1';
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'textembedding-gecko@003';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'mushaf-verses';
const PINECONE_ENV = process.env.PINECONE_ENV || 'us-east-1-aws';

if (!GEMINI_API_KEY || !GEMINI_PROJECT || !PINECONE_API_KEY) {
  console.error('Missing Gemini or Pinecone API keys in .env.local');
  process.exit(1);
}

const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'topics_master.json');
if (!fs.existsSync(DATA_PATH)) {
  console.error('topics_master.json not found in public/data');
  process.exit(1);
}

const verses = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
console.log('Loaded', verses.length, 'verses');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getGeminiEmbeddings(texts) {
  const url = `https://${GEMINI_LOCATION}-aiplatform.googleapis.com/v1/projects/${GEMINI_PROJECT}/locations/${GEMINI_LOCATION}/publishers/google/models/${GEMINI_EMBEDDING_MODEL}:predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      instances: texts.map(text => ({ content: text })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Gemini API error ' + res.status + ': ' + err);
  }
  const data = await res.json();
  return data.predictions.map(e => e.embeddings.values);
}

async function main() {
  // Pinecone client
  const pinecone = createClient({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENV,
  });
  let index;
  try {
    index = pinecone.Index(PINECONE_INDEX);
    await index.describeIndexStats();
  } catch (e) {
    console.log('Index not found, creating...');
    await pinecone.createIndex({
      name: PINECONE_INDEX,
      dimension: 768, // Gemini gecko@003 returns 768 dims
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    });
    console.log('Index created. Waiting 30s for it to be ready...');
    await sleep(30000);
    index = pinecone.Index(PINECONE_INDEX);
  }

  // Batch upsert
  const BATCH = 50;
  for (let i = 0; i < verses.length; i += BATCH) {
    const batch = verses.slice(i, i + BATCH);
    const texts = batch.map(v => v.text);
    let embeddings;
    try {
      embeddings = await getGeminiEmbeddings(texts);
    } catch (e) {
      console.error('Embedding error:', e);
      await sleep(5000);
      continue;
    }
    const vectors = batch.map((v, j) => ({
      id: `${v.surah}:${v.ayah}`,
      values: embeddings[j],
      metadata: {
        surah: v.surah,
        ayah: v.ayah,
        page: v.page,
        surah_name: v.surah_name,
        topic_color: v.topic_color,
        topic_name: v.topic_name,
        text: v.text,
      },
    }));
    await index.upsert({ vectors });
    console.log(`Upserted ${i + batch.length} / ${verses.length}`);
    await sleep(200);
  }
  console.log('All embeddings uploaded!');
}

main().catch(e => { console.error(e); process.exit(1); });
