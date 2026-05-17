import Database from "better-sqlite3";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const db = new Database("agridata.db");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS crop_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT,
    district TEXT,
    year INTEGER,
    crop TEXT,
    area REAL,
    production REAL,
    yield REAL
  )
`);

// Seed Data helper
function seedData() {
  const count = db.prepare("SELECT COUNT(*) as count FROM crop_data").get() as { count: number };
  if (count.count > 0) return;

  const states = ["Punjab", "Haryana", "Uttar Pradesh", "West Bengal", "Maharashtra", "Andhra Pradesh", "Madhya Pradesh"];
  const crops = ["Rice", "Wheat", "Sugarcane", "Maize", "Cotton"];
  const years = [2018, 2019, 2020, 2021, 2022, 2023];

  const insert = db.prepare(`
    INSERT INTO crop_data (state, district, year, crop, area, production, yield)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  states.forEach(state => {
    crops.forEach(crop => {
      years.forEach(year => {
        // Generate somewhat realistic trends
        let baseArea = 0;
        let baseYield = 0;

        if (state === "Punjab" && crop === "Wheat") { baseArea = 3500; baseYield = 5.0; }
        else if (state === "West Bengal" && crop === "Rice") { baseArea = 5000; baseYield = 2.8; }
        else if (state === "Maharashtra" && crop === "Sugarcane") { baseArea = 900; baseYield = 80; }
        else if (state === "Uttar Pradesh" && crop === "Wheat") { baseArea = 9500; baseYield = 3.4; }
        else if (state === "Maharashtra" && crop === "Cotton") { baseArea = 4000; baseYield = 0.4; }
        else { baseArea = 1000 + Math.random() * 2000; baseYield = 1 + Math.random() * 4; }

        // Add some noise and growth
        const trend = 1 + (year - 2018) * 0.02;
        const area = baseArea * (0.95 + Math.random() * 0.1);
        const yieldVal = baseYield * trend * (0.95 + Math.random() * 0.1);
        const production = area * yieldVal;

        insert.run(state, state + " District", year, crop, area, production, yieldVal);
      });
    });
  });
  console.log("Database seeded successfully.");
}

seedData();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Insights Endpoint (Optional Advanced Feature)
  app.post("/api/insights/generate", async (req, res) => {
    try {
      const { dataSummary } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As an agricultural expert, analyze this crop production data summary and provide 3 key insights or recommendations for farmers and policymakers: ${dataSummary}`,
      });
      
      res.json({ insight: response.text });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // API Routes
  app.get("/api/states", (req, res) => {
    const states = db.prepare("SELECT DISTINCT state FROM crop_data ORDER BY state").all();
    res.json(states.map((s: any) => s.state));
  });

  app.get("/api/crops", (req, res) => {
    const crops = db.prepare("SELECT DISTINCT crop FROM crop_data ORDER BY crop").all();
    res.json(crops.map((c: any) => c.crop));
  });

  app.get("/api/analytics/summary", (req, res) => {
    const { state, crop, year } = req.query;
    let query = "SELECT SUM(production) as totalProduction, AVG(yield) as avgYield, SUM(area) as totalArea FROM crop_data WHERE 1=1";
    const params: any[] = [];

    if (state && state !== "All") {
      query += " AND state = ?";
      params.push(state);
    }
    if (crop && crop !== "All") {
      query += " AND crop = ?";
      params.push(crop);
    }
    if (year && year !== "All") {
      query += " AND year = ?";
      params.push(year);
    }

    const summary = db.prepare(query).get(...params);
    res.json(summary);
  });

  app.get("/api/analytics/trends", (req, res) => {
    const { state, crop } = req.query;
    let query = "SELECT year, SUM(production) as production, AVG(yield) as yield FROM crop_data WHERE 1=1";
    const params: any[] = [];

    if (state && state !== "All") {
      query += " AND state = ?";
      params.push(state);
    }
    if (crop && crop !== "All") {
      query += " AND crop = ?";
      params.push(crop);
    }

    query += " GROUP BY year ORDER BY year";
    const trends = db.prepare(query).all(...params);
    res.json(trends);
  });

  app.get("/api/analytics/state-comparison", (req, res) => {
    const { crop, year } = req.query;
    let query = "SELECT state, SUM(production) as production FROM crop_data WHERE 1=1";
    const params: any[] = [];

    if (crop && crop !== "All") {
      query += " AND crop = ?";
      params.push(crop);
    }
    if (year && year !== "All") {
      query += " AND year = ?";
      params.push(year);
    }

    query += " GROUP BY state ORDER BY production DESC";
    const comparison = db.prepare(query).all(...params);
    res.json(comparison);
  });

  app.get("/api/analytics/crop-distribution", (req, res) => {
    const { state, year } = req.query;
    let query = "SELECT crop, SUM(production) as production FROM crop_data WHERE 1=1";
    const params: any[] = [];

    if (state && state !== "All") {
      query += " AND state = ?";
      params.push(state);
    }
    if (year && year !== "All") {
      query += " AND year = ?";
      params.push(year);
    }

    query += " GROUP BY crop";
    const distribution = db.prepare(query).all(...params);
    res.json(distribution);
  });

  app.post("/api/data/reset", (req, res) => {
    db.prepare("DELETE FROM crop_data").run();
    seedData();
    res.json({ status: "success", message: "Database reset to default" });
  });

  app.post("/api/data/upload", (req, res) => {
    const { data, mode } = req.body; // mode: 'replace' or 'merge'
    if (mode === "replace") {
      db.prepare("DELETE FROM crop_data").run();
    }

    const insert = db.prepare(`
      INSERT INTO crop_data (state, district, year, crop, area, production, yield)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Helper to find value by case-insensitive key
    const getValue = (obj: any, target: string) => {
      const key = Object.keys(obj).find(k => k.toLowerCase().trim() === target.toLowerCase());
      return key ? obj[key] : null;
    };

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        const state = getValue(row, "State") || getValue(row, "state") || "Unknown";
        const district = getValue(row, "District") || getValue(row, "district") || "";
        const year = parseInt(String(getValue(row, "Year") || getValue(row, "year") || 2023));
        const crop = getValue(row, "Crop") || getValue(row, "crop") || "Unknown";
        const area = parseFloat(String(getValue(row, "Area") || getValue(row, "area") || 0));
        const prod = parseFloat(String(getValue(row, "Production") || getValue(row, "production") || 0));
        const yieldVal = area > 0 ? (prod / area) : parseFloat(String(getValue(row, "Yield") || getValue(row, "yield") || 0));

        insert.run(
          String(state).trim(),
          String(district).trim(),
          year,
          String(crop).trim(),
          area,
          prod,
          yieldVal
        );
      }
    });

    try {
      transaction(data);
      res.json({ status: "success", count: data.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to upload data" });
    }
  });

  // Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
