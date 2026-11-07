// T-303 / T-304: a stand-in for an OpenAI-compatible AI provider, for the smoke stack only.
// It answers by keyword in the user's sentence so every path can be driven from the browser:
//   "ballard"  -> understood: Ballard, up to $1,500, washing machine (plus an unknown amenity)
//   "slow"     -> answers after 8 s (the backend gives up after 5 s)
//   "busy"     -> 429, like a provider rate limit
//   "poem"     -> not a room search
//   "garbage"  -> a reply that is not JSON
// Usage: node fake-ai.mjs [port]   (default 9099, on 127.0.0.1)
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 9099);

function completion(content) {
  return JSON.stringify({
    id: "fake",
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  });
}

const notRoom = {
  understood: false,
  neighborhood: null,
  minMonthlyRent: null,
  maxMonthlyRent: null,
  minAreaSqft: null,
  amenities: [],
};

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    let sentence = "";
    try {
      const body = JSON.parse(raw);
      sentence = String(body.messages?.at(-1)?.content ?? "").toLowerCase();
      if (body.response_format?.json_schema?.strict !== true) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "strict json_schema expected" }));
        return;
      }
    } catch {
      res.writeHead(400).end();
      return;
    }
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(body);
    };
    if (sentence.includes("slow")) {
      setTimeout(() => send(200, completion(JSON.stringify(notRoom))), 8000);
    } else if (sentence.includes("busy")) {
      send(429, JSON.stringify({ error: { message: "rate limit" } }));
    } else if (sentence.includes("garbage")) {
      send(200, completion("this is not json"));
    } else if (sentence.includes("ballard")) {
      send(
        200,
        completion(
          JSON.stringify({
            understood: true,
            neighborhood: "Ballard",
            minMonthlyRent: null,
            maxMonthlyRent: 1500,
            minAreaSqft: null,
            amenities: ["WASHING_MACHINE", "HOT_TUB"],
          }),
        ),
      );
    } else {
      send(200, completion(JSON.stringify(notRoom)));
    }
  });
}).listen(port, "127.0.0.1", () => console.log(`fake AI provider on 127.0.0.1:${port}`));
