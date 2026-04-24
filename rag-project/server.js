// ====== 需要你实现的函数 ======
import OpenAI from 'openai'
import { knowledgeBase } from './knowledge-base.js'
// ====== Express 服务器 ======
import express from 'express'
const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

//通过向量余弦求两个向量的相似度
function cosine(vecA, vecB) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] ** 2
    normB += vecB[i] ** 2
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
//转换向量
async function getEmbedding(text) {
  const response = await client.embeddings.create({
    model: 'text-embedding-v3',
    input: text,
    dimensions: 1024
  })
  return response.data[0].embedding //返回向量数组
}

async function retrieve(query, docs, roughlyNum = 20) {
  const vecQuery = await getEmbedding(query)
  const vecdocs = await Promise.all(docs.map((doc) => getEmbedding(doc)))
  const roughlyRes = vecdocs.map((doc, i) => ({
    doc: docs[i],
    score: cosine(vecQuery, vecdocs[i])
  }))
  const sortedDocs = roughlyRes.sort((a, b) => b.score - a.score).slice(0, roughlyNum)
  if (sortedDocs.length == 0 || sortedDocs[0].score < 0.3) {
    return []
  }
  return rerank(
    query,
    sortedDocs.map((doc) => doc.doc)
  )
}

async function rerank(query, docs, topN = 3) {
  const apiKey = process.env.QWEN_API_KEY
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gte-rerank-v2',
      input: {
        documents: docs,
        query: query
      },
      parameters: {
        return_documents: true,
        top_n: topN
      }
    })
  })
  const data = await response.json()
  const res = data.output.results.map((item) => item.document.text)
  return res
}

async function generate(query, docs, history) {
  // 1. 拼接上下文
  const context = docs.map((doc, i) => `[${i + 1}] ${doc}`).join('\n')
  // 2. 构建消息
  const messages = [
    { role: 'system', content: '你是问答助手，根据上下文回答问题，不要编造。' },
    ...history,
    { role: 'user', content: `上下文：\n${context}\n\n问题：${query}` }
  ]

  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages
  })
  return response.choices[0].message.content
}

//console.log(result)
// 1. 初始化知识库（知识库只初始化一次，不要每次请求都初始化）
function initKnowledgeBase() {
  // 参考 v0.2 的 knowledge-base.js，把初始化逻辑移到这里
  // 返回：chunks（分块数组）、index（向量索引）
}

// 2. RAG 核心函数（改造 messages 支持）
// - 接收 query 和 history
// - 把 history 拼进 messages
// - 走 Embedding → 召回 → Rerank → LLM
function rag(query, history, kb) {
  // 把 history 格式化成 [{role:'user',content:'...'}, {role:'assistant',content:'...'}]
  // messages = [{role:'system',content:prompt+context}, ...history, {role:'user',content:query}]
  // 调用 LLM，返回 answer
}

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// 会话存储
const conversations = new Map()

// 生成 ID
function genId() {
  return 'conv_' + Date.now()
}

app.post('/api/chat', async (req, res) => {
  try {
    const { query, conversationId } = req.body

    // 1. 获取或创建会话
    let convId = conversationId
    if (!convId || !conversations.has(convId)) {
      convId = genId()
      conversations.set(convId, [])
    }
    const history = conversations.get(convId)
    // 2. 构建完整消息（含历史）
    // 3. 发给 LLM
    // 4. 存进 Map
    // 5. 返回
    const docs = await retrieve(query, knowledgeBase)
    const answer = await generate(query, docs, history)
    // ← 存历史要在这里，不在 generate 里
    history.push({ role: 'user', content: query })
    history.push({ role: 'assistant', content: answer })
    res.json({ conversationId: convId, query, docs, answer })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
