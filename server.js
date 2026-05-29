const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadEnv(path.join(__dirname, "..", ".env.local"));

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const TIME_LIMIT = 200;
const games = new Map();

const topics = [
  {
    name: "秦始皇",
    aliases: ["嬴政", "始皇帝"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "中国秦朝开国皇帝，统一六国，推行郡县制、统一文字和度量衡。"
  },
  {
    name: "武则天",
    aliases: ["武曌"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "中国唐代至武周时期政治人物，中国历史上唯一得到普遍承认的女皇帝。"
  },
  {
    name: "孔子",
    aliases: ["孔丘", "仲尼"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "春秋时期思想家、教育家，儒家学派代表人物。"
  },
  {
    name: "诸葛亮",
    aliases: ["孔明", "卧龙"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "三国时期蜀汉丞相，以政治、军事才能和《出师表》闻名。"
  },
  {
    name: "郑和",
    aliases: ["三宝太监"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "明代航海家，曾多次率船队下西洋。"
  },
  {
    name: "岳飞",
    aliases: ["岳武穆"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "中国",
    summary: "南宋抗金名将，常与精忠报国联系在一起。"
  },
  {
    name: "辛亥革命",
    aliases: ["1911革命"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "中国",
    summary: "发生于清末的革命，推翻清朝统治，推动中华民国建立。"
  },
  {
    name: "鸦片战争",
    aliases: ["第一次鸦片战争"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "中国",
    summary: "1840年前后英国与清朝之间的战争，是中国近代史开端的重要事件。"
  },
  {
    name: "安史之乱",
    aliases: ["安史叛乱"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "中国",
    summary: "唐朝中期由安禄山、史思明发动的叛乱，对唐朝由盛转衰影响重大。"
  },
  {
    name: "玄武门之变",
    aliases: ["玄武门事变"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "中国",
    summary: "唐朝初年李世民在玄武门发动的政变，之后成为唐太宗。"
  },
  {
    name: "长城",
    aliases: ["万里长城", "中国长城"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "中国",
    summary: "中国古代重要防御工程，跨越多个省区，是著名世界文化遗产。"
  },
  {
    name: "故宫",
    aliases: ["紫禁城", "北京故宫"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "中国",
    summary: "位于北京的明清皇家宫殿建筑群，也称紫禁城。"
  },
  {
    name: "兵马俑",
    aliases: ["秦始皇兵马俑", "秦兵马俑"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "中国",
    summary: "位于陕西西安附近的秦始皇陵陪葬坑，以大量陶俑闻名。"
  },
  {
    name: "布达拉宫",
    aliases: ["拉萨布达拉宫"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "中国",
    summary: "位于西藏拉萨的著名宫堡式建筑群，是世界文化遗产。"
  },
  {
    name: "拿破仑",
    aliases: ["拿破仑·波拿巴", "波拿巴"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "世界",
    summary: "法国军事家和政治家，曾建立法兰西第一帝国。"
  },
  {
    name: "华盛顿",
    aliases: ["乔治华盛顿", "乔治·华盛顿"],
    type: "person",
    topicLabel: "历史人物",
    regionLabel: "世界",
    summary: "美国独立战争重要领导者，美国第一任总统。"
  },
  {
    name: "文艺复兴",
    aliases: ["欧洲文艺复兴"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "世界",
    summary: "欧洲思想文化运动，与人文主义、艺术和科学发展关系密切。"
  },
  {
    name: "法国大革命",
    aliases: ["法兰西大革命"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "世界",
    summary: "18世纪末法国爆发的重大政治革命，对欧洲和世界政治影响深远。"
  },
  {
    name: "工业革命",
    aliases: ["第一次工业革命"],
    type: "event",
    topicLabel: "历史事件",
    regionLabel: "世界",
    summary: "始于英国的生产技术和社会经济变革，以机器生产和工厂制度为代表。"
  },
  {
    name: "金字塔",
    aliases: ["埃及金字塔", "胡夫金字塔"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "世界",
    summary: "古埃及著名陵墓建筑，其中吉萨金字塔群最有名。"
  },
  {
    name: "埃菲尔铁塔",
    aliases: ["巴黎铁塔"],
    type: "place",
    topicLabel: "建筑/景点",
    regionLabel: "世界",
    summary: "位于法国巴黎的著名铁塔建筑，是巴黎地标。"
  }
];

const allTopics = topics.concat(require("./extra-topics.json"));

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/api/start") {
      return sendJson(res, 200, startGame());
    }

    if (req.method === "POST" && req.url === "/api/ask") {
      const body = await readJson(req);
      return await handleAsk(res, body);
    }

    if (req.method === "POST" && req.url === "/api/guess") {
      const body = await readJson(req);
      return await handleGuess(res, body);
    }

    if (req.method === "POST" && req.url === "/api/hint") {
      const body = await readJson(req);
      return await handleHint(res, body);
    }

    if (req.method === "POST" && req.url === "/api/reveal") {
      const body = await readJson(req);
      return await handleReveal(res, body);
    }

    return serveStatic(req, res);
  } catch (error) {
    return sendJson(res, 500, { error: "服务出了点问题：" + error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`百问猜猜看已启动：http://127.0.0.1:${PORT}`);
});

function startGame() {
  cleanupGames();
  const topic = allTopics[Math.floor(Math.random() * allTopics.length)];
  const gameId = crypto.randomUUID();

  games.set(gameId, {
    topic,
    createdAt: Date.now(),
    hinted: false
  });

  return {
    gameId,
    timeLimit: TIME_LIMIT
  };
}

async function handleAsk(res, body) {
  const game = games.get(body.gameId);
  const question = String(body.question || "").trim();

  if (!game) {
    return sendJson(res, 404, { error: "这道题已经失效，请换一题。" });
  }

  if (!question) {
    return sendJson(res, 400, { error: "请输入一个问题。" });
  }

  const answer = await askAi(game.topic, question);
  return sendJson(res, 200, { answer });
}

function handleGuess(res, body) {
  const game = games.get(body.gameId);
  const guess = normalize(String(body.guess || ""));

  if (!game) {
    return sendJson(res, 404, { error: "这道题已经失效，请换一题。" });
  }

  const names = [game.topic.name, ...game.topic.aliases].map(normalize);
  const correct = names.some((name) => name === guess || guess.includes(name));

  return sendJson(res, 200, {
    correct,
    answer: correct ? game.topic.name : undefined
  });
}

function handleReveal(res, body) {
  const game = games.get(body.gameId);

  if (!game) {
    return sendJson(res, 404, { error: "这道题已经失效，请换一题。" });
  }

  return sendJson(res, 200, { answer: game.topic.name });
}

function handleHint(res, body) {
  const game = games.get(body.gameId);

  if (!game) {
    return sendJson(res, 404, { error: "这道题已经失效，请换一题。" });
  }

  game.hinted = true;
  return sendJson(res, 200, { hint: game.topic.hint || makeFallbackHint(game.topic) });
}

async function askAi(topic, question) {
  if (AI_PROVIDER === "deepseek") {
    return askDeepSeek(topic, question);
  }

  return askOpenAI(topic, question);
}

async function askOpenAI(topic, question) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("缺少 OPENAI_API_KEY，请检查 .env.local。");
  }

  let response;

  try {
    response = await fetch(`${OPENAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "developer",
            content:
              "你是一个中文猜谜游戏裁判。隐藏答案以历史人物、历史事件、建筑景点和少量现代公共知识为主。玩家会围绕隐藏答案提出中文问题。你只能回答一个字：是 或 否。必须根据隐藏答案和常识判断。即使问题不是严格的是/否句，也要尽量判断成是或否。不要解释，不要透露答案。"
          },
          {
            role: "user",
            content: `隐藏答案：${topic.name}
别名：${topic.aliases.join("、")}
类型：${topic.topicLabel}
地域：${topic.regionLabel}
背景：${topic.summary}
玩家问题：${question}

只回答：是 或 否`
          }
        ],
        max_output_tokens: 8
      })
    });
  } catch {
    throw new Error("AI 服务暂时连不上。请确认网络能访问 OpenAI API，或在 .env.local 配置 OPENAI_BASE_URL。");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "AI 判断失败，请检查 OpenAI API 网络连接。");
  }

  const text = extractOutputText(data);
  return text.includes("是") && !text.includes("否") ? "是" : "否";
}

async function askDeepSeek(topic, question) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("缺少 DEEPSEEK_API_KEY，请在 .env.local 里配置 DeepSeek API Key。");
  }

  let response;

  try {
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content:
              "你是一个中文猜谜游戏裁判。隐藏答案以历史人物、历史事件、建筑景点和少量现代公共知识为主。玩家会围绕隐藏答案提出中文问题。你只能回答一个字：是 或 否。必须根据隐藏答案和常识判断。即使问题不是严格的是/否句，也要尽量判断成是或否。不要解释，不要透露答案。"
          },
          {
            role: "user",
            content: `隐藏答案：${topic.name}
别名：${topic.aliases.join("、")}
类型：${topic.topicLabel}
地域：${topic.regionLabel}
背景：${topic.summary}
玩家问题：${question}

只回答：是 或 否`
          }
        ],
        temperature: 0,
        max_tokens: 8
      })
    });
  } catch {
    throw new Error("DeepSeek 服务暂时连不上。请确认网络能访问 DeepSeek API，或检查 DEEPSEEK_BASE_URL。");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "DeepSeek 判断失败。");
  }

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  return text.includes("是") && !text.includes("否") ? "是" : "否";
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(__dirname, safePath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const contentType = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8"
    }[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("请求过大"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON 格式错误"));
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders()
  });
  res.end(JSON.stringify(payload));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function normalize(value) {
  return value.toLowerCase().replace(/[？?。！!，,、\s·]/g, "");
}

function cleanupGames() {
  const maxAge = 1000 * 60 * 30;
  const now = Date.now();

  for (const [gameId, game] of games.entries()) {
    if (now - game.createdAt > maxAge) {
      games.delete(gameId);
    }
  }
}

function makeFallbackHint(topic) {
  return topic.summary.split(/[，。]/).filter(Boolean)[0] || "它是一个中文语境里比较常见的答案。";
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
