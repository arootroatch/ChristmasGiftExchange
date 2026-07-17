import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient} from "mongodb";
import fs from "node:fs";
import path from "node:path";
import {execSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {seed} from "./seed.mjs";
import {startRepl} from "./repl.mjs";

const DB_NAME = "gift-exchange";

export function resolveEnvFilePath() {
    const gitCommonDir = execSync("git rev-parse --git-common-dir", {encoding: "utf-8"}).trim();
    const repoRoot = path.dirname(path.resolve(gitCommonDir));
    return path.join(repoRoot, ".env.local");
}

const ENV_FILE = resolveEnvFilePath();

function readEnvFile() {
    try {
        return fs.readFileSync(ENV_FILE, "utf-8");
    } catch {
        return "";
    }
}

function updateEnvUri(content, uri) {
    const uriLine = `MONGO_DB_URI="${uri}"`;
    if (/^MONGO_DB_URI=.*$/m.test(content)) {
        return content.replace(/^MONGO_DB_URI=.*$/m, uriLine);
    }
    return content ? `${content}\n${uriLine}\n` : `${uriLine}\n`;
}

async function startMongo() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const content = readEnvFile();
    fs.writeFileSync(ENV_FILE, updateEnvUri(content, uri));
    console.log(`MongoDB started at ${uri}`);
    console.log(`Updated MONGO_DB_URI in ${ENV_FILE}`);

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(DB_NAME);

    await seed(db);

    startRepl(db, client, () => mongod.stop());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startMongo().catch(console.error);
}
