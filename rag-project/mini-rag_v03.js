import OpenAI from 'openai'
import dotenv from 'dotenv'
import { knowledgeBase } from './knowledge-base.js'
dotenv.config()

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

// ===== 1. getEmbedding =====
async function getEmbedding(text) {
  //字符串参数
  // TODO: 调用 Qwen embedding API，返回向量数组
  // 提示：参考 embedding.js 里怎么写的
  const response = await client.embeddings.create({
    model: 'text-embedding-v3',
    input: text,
    dimensions: 1024
  })
  return response.data[0].embedding //返回向量数组
}

const a = [1, 2, 3, 4]
const b = [2, 3, 4, 5]

// ===== 2. cosine =====
function cosine(vecA, vecB) {
  // TODO: 计算两个向量的余弦相似度
  // 点积/开根号(A数组各元素平方)*开根号(B数组各元素平方)
  // 提示：返回 0~1 之间的数值
  let dotProduct = 0 // 点积
  let normA = 0 // 向量A的模的平方（先不算根号）
  let normB = 0 // 向量B的模的平方
  // 求点积方法，通过循环遍历传入的A数组和B数组，将两个数组中对应位置的元素相乘然后累积相加求和
  //
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] ** 2
    normB += vecB[i] ** 2
    //求平方的三种方法
    // vec[i]*vec[i]
    //Math.pow(vecA[i],2),第一个参数为底数，第二个参数为指数
    // vec[i] ** 2,ES6中双乘号语法 "X ** 2"
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) //Math.sqrt()开根号函数
}

// ===== 3. retrieve =====
async function retrieve(query, docs, topK = 20) {
  // TODO:
  // 1. 把 query 转成向量 一维数组
  // 2. 把每条 doc 转成向量 二维数组
  // 3. 用 cosine() 计算 query向量 和 每条文档向量 的相似度，
  // 4. 相似度排序，返回分数最高的 topK 条
  // 5. 【关键】如果没有匹配的文档（相似度太低），返回空数组，不要返回错误的答案
  const queryVec = await getEmbedding(query)
  const docVecs = await Promise.all(docs.map((doc) => getEmbedding(doc)))
  //   for (let i = 0; i < docs.length; i++) {
  //     docsVec.push(await getEmbedding(docs[i]))
  //   }
  //将query的一维数组与docs源文档的二维数组中每个独立的数组元素求相似度
  const scored = docs.map((doc, i) => ({
    doc: doc,
    score: cosine(queryVec, docVecs[i])
  }))
  //使用[].sort()对相似度进行排序，给sort()函数的传参为回调函数，并且是两值相减，因为sort()函数的
  //返回值规则，返回值是负数，a 排在 b 前面；返回值是正数，b 排在 a 前面；返回值为0，位置不变
  scored.sort((a, b) => b.score - a.score) // 从高到低排序
  // 这里加空数组判断
  if (scored.length === 0 || scored[0].score < 0.3) {
    return []
  }
  const roughlyResult = scored.slice(0, topK)
  return rerank(
    query,
    roughlyResult.map((item) => item.doc)
  )
  // return scored.slice(0, topK) // 取前 topK 条
}

async function rerank(query, documents, top_n = 3) {
  // 调用 Qwen Rerank API
  // 传入：问题 + 候选文档列表
  // 返回：重新排序后的文档（按相关性从高到低）
  const apiKey = process.env.QWEN_API_KEY
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gte-rerank-v2',
      input: {
        query,
        documents
      },
      parameters: {
        return_documents: true,
        top_n: 3
      }
    })
  })
  const res = await response.json()
  // return res.output.results
  // ⬇️ 关键：提取文本内容
  return res.output.results.map((r) => ({
    text: r.document.text,
    score: r.relevance_score
  }))
}

// ===== 4. generate =====
async function generate(query, contextDocs) {
  // TODO:
  // 1. 把 contextDocs 组装进一个 system prompt，格式类似：
  // "根据以下参考资料回答用户问题：\n[文档1]\n[文档2]\n[文档3]"
  // 2. 发送给 qwen-plus（model: 'qwen-plus'），messages 包含 system 和 user
  // 3. 【关键】如果 contextDocs 是空数组，告诉 LLM "我不知道"，不要让它编造
  // 4. 返回 LLM 的回答文字
  if (contextDocs.length == 0) return '抱歉，根据现有知识库无法回答这个问题。'
  // 将文档片段进行拼接
  const contextText = contextDocs.map((c) => c.text).join('\n')
  // 构造prompt
  const prompt = `根据以下参考资料回答用户问题。如果信息不足，直接说「我不知道」，不要编造。
  参考资料：${contextText}`
  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: query }
    ]
  })
  return response.choices[0].message.content
}

// ===== 5. rag =====
async function rag(query) {
  // TODO:
  // 1. 调用 retrieve() 拿到相关文档
  // 2. 调用 generate() 传入 query 和相关文档
  // 3. 返回最终回答
  const fragment = await retrieve(query, knowledgeBase)
  console.log('📄 检索结果：', fragment.map((f) => `${(f.score * 100).toFixed(1)}% → ${f.text}`).join('\n'))
  const finalAnswer = await generate(query, fragment)
  return finalAnswer
}

// ===== 主函数 =====
async function main() {
  const questions = [
    '阿斑的项目管理经验怎么样？',
    '阿斑会什么技术？',
    '阿斑有没有PMP证书？',
    '阿斑的薪资期望是多少？', // 知识库里没有
    '阿斑对求职企业有什么期望吗？'
  ]

  for (const q of questions) {
    const answer = await rag(q)
    console.log(`❓ ${q}\n💬 ${answer}\n${'─'.repeat(40)}`)
  }
}

main().catch(console.error)
//console.log(cosine(a, b))
