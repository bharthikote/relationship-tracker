import { JSONFilePreset } from "lowdb/node";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DbSchema } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, "..", "data", "db.json");

const defaultData: DbSchema = { people: [], relationships: [], villages: [] };

export const db = await JSONFilePreset<DbSchema>(dbFile, defaultData);
