import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";

const DB_PATH = "agridata.db";

// --- Compatibility layer: sql.js API → better-sqlite3-like API ---

class StatementCompat {
  private db: SqlJsDatabase;
  private sql: string;

  constructor(db: SqlJsDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  get(...params: any[]): any {
    const stmt = this.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    let result: any = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  }

  all(...params: any[]): any[] {
    const stmt = this.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  run(...params: any[]): void {
    this.db.run(this.sql, params);
  }
}

class DatabaseCompat {
  private db: SqlJsDatabase;

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  exec(sql: string): void {
    // sql.js exec can handle multiple statements but returns results;
    // we ignore the return value just like better-sqlite3's exec
    this.db.exec(sql);
  }

  prepare(sql: string): StatementCompat {
    return new StatementCompat(this.db, sql);
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      this.db.run("BEGIN");
      try {
        const result = fn(...args);
        this.db.run("COMMIT");
        return result;
      } catch (e) {
        this.db.run("ROLLBACK");
        throw e;
      }
    }) as T;
  }

  save(): void {
    const data = this.db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// --- App code ---

let db: DatabaseCompat;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
  db.save();
  console.log("Database seeded successfully.");
}

async function startServer() {
  // Initialize sql.js and load/create database
  const SQL = await initSqlJs();
  let sqlJsDb: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(buffer);
  } else {
    sqlJsDb = new SQL.Database();
  }
  db = new DatabaseCompat(sqlJsDb);

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
  seedData();

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
    if (!data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({ error: "No data provided" });
      return;
    }

    if (mode === "replace") {
      db.prepare("DELETE FROM crop_data").run();
    }

    const insert = db.prepare(`
      INSERT INTO crop_data (state, district, year, crop, area, production, yield)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Parse numeric values robustly (handles "NA", commas, empty strings)
    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      const str = String(val).replace(/,/g, "").trim();
      if (str === "" || str.toUpperCase() === "NA") return 0;
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    // Helper to find value by flexible case-insensitive key matching
    const getValue = (obj: any, targets: string[]): any => {
      for (const target of targets) {
        const key = Object.keys(obj).find(k => k.trim().toLowerCase() === target.toLowerCase());
        if (key && obj[key] !== undefined && obj[key] !== null) {
          const val = String(obj[key]).trim();
          if (val !== "" && val.toUpperCase() !== "NA") return obj[key];
        }
      }
      return null;
    };

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        const state = String(getValue(row, ["State", "state", "State Name", "state_name"]) || "Unknown").trim();
        const district = String(getValue(row, ["District", "district", "Dist Name", "dist_name", "District Name"]) || "").trim();
        const yearRaw = getValue(row, ["Year", "year", "Crop Year", "crop_year"]);
        const crop = String(getValue(row, ["Crop", "crop", "Crop Name", "crop_name"]) || "Unknown").trim();
        const area = parseNum(getValue(row, ["Area", "area"]) ?? row["Area"] ?? row["area"] ?? 0);
        const prod = parseNum(getValue(row, ["Production", "production"]) ?? row["Production"] ?? row["production"] ?? 0);
        const yieldRaw = parseNum(getValue(row, ["Yield", "yield"]) ?? row["Yield"] ?? row["yield"] ?? 0);

        // Parse year robustly (handles "2020-21" format)
        let year = 0;
        if (yearRaw !== null) {
          const yearNum = parseInt(String(yearRaw));
          if (!isNaN(yearNum) && yearNum > 1900) {
            year = yearNum;
          } else {
            const yearMatch = String(yearRaw).match(/(\d{4})/);
            year = yearMatch ? parseInt(yearMatch[1]) : 2023;
          }
        }
        if (year === 0) year = 2023;

        // Compute yield from production/area if yield not provided
        const yieldVal = (prod > 0 && area > 0) ? (yieldRaw > 0 ? yieldRaw : prod / area) : yieldRaw;

        insert.run(state, district, year, crop, area, prod, yieldVal);
      }
    });

    try {
      transaction(data);
      db.save();
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
