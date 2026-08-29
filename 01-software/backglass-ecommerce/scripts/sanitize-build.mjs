import { rm } from "node:fs/promises";
import { resolve } from "node:path";

await rm(resolve("build", "server", ".dev.vars"), { force: true });
