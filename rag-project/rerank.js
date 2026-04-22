import 'dotenv/config';

// 通义千问文本重排 API（Rerank）
async function rerank(query, documents, top_n = 3) {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  const response = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gte-rerank-v2',
        input: {
          query,
          documents,
        },
        parameters: {
          return_documents: true,
          top_n,
        },
      }),
    }
  );

  const result = await response.json();
  return result;
}

export default rerank;
