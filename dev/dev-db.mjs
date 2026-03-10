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

    console.log("\nREPL ready. Available: db, users, exchanges, seed(), find(), findOne(), links()");
    console.log("Example: await find(users, {name: 'Alice'})")
    console.log("Example: await links('user-token-uuid')\n");

    const r = repl.start({prompt: "dev-db> ", useGlobal: true});
    r.context.db = db;
    r.context.users = db.collection("users");
    r.context.exchanges = db.collection("exchanges");
    r.context.seed = () => seed(db);
    r.context.find = (collection, query = {}) => collection.find(query).toArray();
    r.context.findOne = (collection, query = {}) => collection.findOne(query);
    r.context.links = async (token) => {
        const base = "http://localhost:8888";
        const user = await db.collection("users").findOne({token});
        if (!user) { console.log("User not found"); return; }
        console.log(`\nLinks for ${user.name} (${user.email}):`);
        console.log(`  Edit wishlist: ${base}/wishlist/edit/${token}`);
        const exs = await db.collection("exchanges").find({participants: user._id}).toArray();
        for (const ex of exs) {
            console.log(`  View wishlist: ${base}/wishlist/view/${token}?exchange=${ex.exchangeId}`);
        }
        console.log();
    };

    r.on("exit", async () => {
        console.log("\nShutting down...");
        await client.close();
        await mongod.stop();
        process.exit(0);
    });
}

main().catch(console.error);