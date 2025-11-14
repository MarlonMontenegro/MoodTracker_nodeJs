const http = require("http");
const fs = require("fs");
const path = require("path");

// 👉 Puerto dinámico para Azure (y 3000 en local)
const PORT = process.env.PORT || 3000;

// 👉 “Base de datos” en memoria
let moods = [];

// Servidor HTTP
const server = http.createServer((req, res) => {
  const { method, url } = req;
  const { pathname } = new URL(url, "http://localhost");

  // ----- CORS -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ---------- API SIN DB ----------

  // GET /moods  → devuelve todos los moods en memoria
  if (pathname === "/moods" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(moods));
  }

  // POST /moods  → guarda en memoria
  if (pathname === "/moods" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { mood, comment } = JSON.parse(body || "{}");
        if (!mood) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Falta 'mood'" }));
        }

        const newMood = {
          id: moods.length + 1,
          mood,
          comment: comment || "",
          date: new Date().toISOString(),
        };

        moods.unshift(newMood); // lo ponemos al inicio

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newMood));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "JSON inválido" }));
      }
    });
    return;
  }

  // GET /moods/stats → cuenta cuántas veces aparece cada mood
  if (pathname === "/moods/stats" && method === "GET") {
    const countsMap = moods.reduce((acc, m) => {
      const key = m.mood || "Sin dato";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const stats = Object.entries(countsMap).map(([mood, count]) => ({
      mood,
      count,
    }));

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(stats));
  }

  // ---------- ARCHIVOS ESTÁTICOS ----------
  let filePath = "." + (pathname === "/" ? "/index.html" : pathname);
  const ext = path.extname(filePath).toLowerCase();

  const mime =
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".json": "application/json",
    }[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Archivo no encontrado");
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  });
});

// 👉 Usamos PORT (para Azure) o 3000 en local
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
