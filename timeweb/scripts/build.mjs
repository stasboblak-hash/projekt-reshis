import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const destination = path.join(root, "deploy", "public_html");
await rm(path.join(root, "deploy"), { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(path.join(root, "dist"), destination, { recursive: true });
await cp(path.join(root, "backend"), destination, { recursive: true });
console.log(`Готово: ${destination}`);
