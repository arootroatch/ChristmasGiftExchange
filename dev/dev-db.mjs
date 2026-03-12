import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient} from "mongodb";
import fs from "node:fs";
import {seed} from "./seed.mjs";
import {startRepl} from "./repl.mjs";

const DB_NAME = "gift-exchange";
const ENV_FILE = ".env.local";

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

startMongo().catch(console.error);
