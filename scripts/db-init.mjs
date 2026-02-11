import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "prompts.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dbFile)) {
  const initial = { prompts: [] };
  fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), "utf-8");
  console.log("Initialized data/prompts.json");
} else {
  console.log("data/prompts.json already exists");
}
