import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

console.log('process.env.QWEN_API_KEY===', process.env.QWEN_API_KEY)
const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
})

const response = await client.chat.completions.create({
  model: 'qwen-plus',
  messages: [
    { role: 'system', content: '你是一个有用帮助的AI助手' },
    {
      role: 'user',
      content: '解释什么是RAG(检索增强生成)'
    }
  ]
})

console.log('回答：')
console.log(response.choices[0].message.content)
console.log('\n----消耗信息---')
console.log('模型:', response.model)
console.log('Token用量：', JSON.stringify(response.usage))
