import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient} from "mongodb";
import repl from "node:repl";
import fs from "node:fs";
import {seed} from "./seed.mjs";

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

async function main() {
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

    console.log("\nREPL ready. Available: db, users, exchanges, seed(), find(), findOne()");
    console.log("Example: await find(users, {name: 'Alice'})")
    console.log("Example: await findOne(exchanges, {id: '...'})\n");

    const r = repl.start({prompt: "dev-db> ", useGlobal: true});
    r.context.db = db;
    r.context.users = db.collection("users");
    r.context.exchanges = db.collection("exchanges");
    r.context.seed = () => seed(db);
    r.context.find = (collection, query = {}) => collection.find(query).toArray();
    r.context.findOne = (collection, query = {}) => collection.findOne(query);

    r.on("exit", async () => {
        console.log("\nShutting down...");
        await client.close();
        await mongod.stop();
        process.exit(0);
    });
}

main().catch(console.error);