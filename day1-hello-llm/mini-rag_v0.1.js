// import OpenAI from 'openai'
// import dotenv from 'dotenv'
// dotenv.config()

// const client = new OpenAI({
//   apiKey: process.env.QWEN_API_KEY,
//   baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
// })

// // ===== 1. 准备知识库 =====
// const knowledgeBase = [
//   '谢壮是一名拥有13年软件研发经验的项目经理，其中5年为专职项目管理经验。',
//   '谢壮主导过7个以上项目的全生命周期交付，项目准时交付率达到95%。',
//   '谢壮擅长跨职能团队协调，最多协调过8类职能角色。',
//   '谢壮的客户需求转化准确率超过90%，客户满意度从70%提升至95%。',
//   '谢壮通过架构优化与云存储策略，为项目节省超30万元成本。',
//   '谢壮熟练运用Vue、Angular、Node.js技术栈，深度参与AI模型整合与架构设计。',
//   '谢壮在AI视频二创平台项目中，推动视频处理效率提升35%，存储成本降低17%。',
//   '谢壮目前系统备考PMP认证，具备持续学习与快速迭代的管理思维。'
// ]

// // ========2.向量化知识库==========

// async function getEmbedding(text) {
//   const response = await client.embeddings.create({
//     model: 'text-embedding-v3',
//     input: text,
//     dimensions: 1024
//   })
//   return response.data[0].embedding
// }

// function cosine(a, b) {
//   let dot = 0,
//     normA = 0,
//     normB = 0
//   for (let i = 0; i < a.length; i++) {
//     dot += a[i] * b[i]
//     normA += a[i] * a[i]
//     normB += b[i] * b[i]
//   }
//   return dot / (Math.sqrt(normA) * Math.sqrt(normB))
// }

//====3.检索: 找到和问题最相关的文档======

import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

// ===== 知识库 =====
const knowledgeBase = [
  '谢壮是一名拥有13年软件研发经验的项目经理，其中5年为专职项目管理经验。',
  '谢壮主导过7个以上项目的全生命周期交付，项目准时交付率达到95%。',
  '谢壮擅长跨职能团队协调，最多协调过8类职能角色。',
  '谢壮的客户需求转化准确率超过90%，客户满意度从70%提升至95%。',
  '谢壮通过架构优化与云存储策略，为项目节省超30万元成本。',
  //'谢壮熟练运用Vue、Angular、Node.js技术栈，深度参与AI模型整合与架构设计。',
  '谢壮的技术技能包括Vue、Angular、Node.js前端框架和Node.js后端开发',
  '谢壮在AI视频二创平台项目中，推动视频处理效率提升35%，存储成本降低17%。',
  '谢壮目前系统备考PMP认证，具备持续学习与快速迭代的管理思维。'
]

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
async function retrieve(query, docs, topK = 3) {
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
  return scored.slice(0, topK) // 取前 topK 条
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
  const contextText = contextDocs.map((c) => c.doc).join('\n')
  // 构造prompt
  const prompt = `你是问答助手。根据以下参考资料回答用户问题。
  如果参考资料中没有相关信息，请诚实说"我不知道"，不要编造。
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
  console.log(
    '📄 检索结果：',
    fragment.map((f) => `${(f.score * 100).toFixed(1)}% → ${f.doc}`)
  )
  const finalAnswer = await generate(query, fragment)
  return finalAnswer
}

// ===== 主函数 =====
async function main() {
  const questions = [
    '谢壮的项目管理经验怎么样？',
    '谢壮会什么技术？',
    '谢壮有没有PMP证书？',
    '谢壮的薪资期望是多少？', // 知识库里没有
    '谢壮对求职企业有什么期望吗？'
  ]

  for (const q of questions) {
    const answer = await rag(q)
    console.log(`❓ ${q}\n💬 ${answer}\n${'─'.repeat(40)}`)
  }
}

main().catch(console.error)
//console.log(cosine(a, b))
