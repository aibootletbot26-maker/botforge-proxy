const https = require("https");
const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
  if (req.url === "/health") { res.writeHead(200); res.end("OK"); return; }
if (req.method !== "POST") { res.writeHead(405); res.end("Method not allowed"); return; }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    try {
      const { messages, systemPrompt } = JSON.parse(body);
      const payload = JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: systemPrompt || process.env.SYSTEM_PROMPT || "You are a helpful assistant.",
        messages: messages
      });

      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, apiRes => {
        let data = "";
        apiRes.on("data", chunk => data += chunk);
        apiRes.on("end", () => {
          try {
            const json = JSON.parse(data);
            const reply = json?.content?.[0]?.text || data;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ reply }));
          } catch(e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message, raw: data }));
          }
        });
      });

      apiReq.on("error", e => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(payload);
      apiReq.end();
    } catch(e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Proxy running on port " + PORT));
