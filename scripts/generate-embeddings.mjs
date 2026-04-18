// Quran Embeddings Generator for Pinecone
// Usage: node scripts/generate-embeddings.mjs
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import pkg from '@pinecone-database/pinecone';
const { createClient } = pkg;
import fetch from 'node-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'mushaf-verses';
const PINECONE_ENV = process.env.PINECONE_ENV || 'us-east-1-aws';
const PINECONE_HOST = process.env.PINECONE_HOST || '';

if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
  console.error('Missing OPENAI_API_KEY or PINECONE_API_KEY in .env.local');
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

async function getEmbeddings(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI API error ' + res.status + ': ' + err);
  }
  const data = await res.json();
  return data.data.map(e => e.embedding);
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
      dimension: 1536,
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
      embeddings = await getEmbeddings(texts);
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
