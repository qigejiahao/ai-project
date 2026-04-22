# ai-project

my study ai-project

# AI Learning

学习 AI 应用开发（RAG / Agent），走 JS 路线。

# 20260420

1.完成mini-rag_v0.1.js版本2.增加gitee仓库同步推送到github仓库的镜像仓库配置功能

# 20260421

1.增加Rerank重排功能

# 20260422

1.完成Rerank功能
使用gte-rerank-v2重排接口，此接口无法兼容使用OpaiAPI库，只能使用fetch库进行单独请求，2.重排接口返回的数据格式与qwen-plus返回的数据格式和字段不同，在未使用重排接口时，粗排片段的数据结构字段为自定义，但在粗排之后需要进行重排操作，数据会流经te-rerank-v2重排接口，数据结构和字段名称会改变，所以需要注意配合修改
3.system prompt需要修改，以便更好的引导LLM 4.去除环境变量文件，将API Key保存在本地系统环境变量
