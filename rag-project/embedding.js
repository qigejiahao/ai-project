import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

// 计算余弦相似度
function cosine(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function getEmbedding(text) {
  const response = await client.embeddings.create({
    model: 'text-embedding-v3',
    input: text,
    dimensions: 1024
  })
  return response.data[0].embedding
}

async function main() {
  const docs = ['苹果是一种水果，富含维生素C', '苹果公司发布了最新款iPhone手机', '深圳今天天气晴朗，适合出行']

  console.log('📄 正在向量化三条文档...\n')
  const docVectors = await Promise.all(docs.map((d) => getEmbedding(d)))
  console.log('✅ 向量化完成！向量维度:', docVectors[0].length, '\n')

  // 文档之间的相似度
  console.log('📊 文档之间的相似度：')
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const sim = cosine(docVectors[i], docVectors[j])
      console.log(` "${docs[i].slice(0, 10)}..." ↔ "${docs[j].slice(0, 10)}..." → ${(sim * 100).toFixed(1)}%`)
    }
  }
  console.log('')

  // 用问题去检索最相关的文档
  const questions = ['手机最新产品资讯', '水果的营养价值', '深圳的天气情况']

  console.log('🔍 用问题检索最相关文档：')
  for (const q of questions) {
    const qVec = await getEmbedding(q)
    let bestIdx = 0,
      bestSim = 0
    for (let i = 0; i < docs.length; i++) {
      const sim = cosine(qVec, docVectors[i])
      if (sim > bestSim) {
        bestSim = sim
        bestIdx = i
      }
    }
    console.log(` ❓ "${q}"`)
    console.log(` ✅ → "${docs[bestIdx]}"（相似度 ${(bestSim * 100).toFixed(1)}%）\n`)
  }
}

main().catch(console.error)
