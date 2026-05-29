# 百问猜猜看部署说明

## 推荐：Render Web Service

1. 把 `quiz-web` 这个目录上传到 GitHub 仓库。
2. 在 Render 新建 `Web Service`，连接这个仓库。
3. 如果仓库根目录不是 `quiz-web`，把 `Root Directory` 设为 `quiz-web`。
4. 设置：
   - Runtime: `Node`
   - Build Command: 留空或填 `npm install`
   - Start Command: `npm start`
5. 在 Render 的 Environment Variables 里添加：
   - `AI_PROVIDER=deepseek`
   - `DEEPSEEK_API_KEY=你的 DeepSeek API Key`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `DEEPSEEK_MODEL=deepseek-chat`
6. 部署完成后，Render 会给你一个公开链接。

## 注意

- 不要上传 `.env.local`。
- 不要把 DeepSeek API Key 写进前端文件。
- 本地开发继续运行：

```bash
cd "/Users/cosimo/Documents/New project/quiz-web"
npm start
```
