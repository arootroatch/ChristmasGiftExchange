import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient} from "mongodb";
import repl from "node:repl";
import fs from "node:fs";
import {seed} from "./seed.mjs";

const DB_NAME = "gift-exchange";

async function main() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const envContent = `MONGO_DB_URI="${uri}"\nMONGDB_DATABASE="${DB_NAME}"\n`;
    fs.writeFileSync(".env.development", envContent);
    console.log(`MongoDB started at ${uri}`);
    console.log("Wrote .env.development");

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(DB_NAME);

    await seed(db);

    console.log("\nREPL ready. Available: db, users, exchanges, seed()");
    console.log("Example: await users.find({}).toArray()\n");

    const r = repl.start({prompt: "dev-db> ", useGlobal: true});
    r.context.db = db;
    r.context.users = db.collection("users");
    r.context.exchanges = db.collection("exchanges");
    r.context.seed = () => seed(db);

    r.on("exit", async () => {
        console.log("\nShutting down...");
        await client.close();
        await mongod.stop();
        fs.unlinkSync(".env.development");
        process.exit(0);
    });
}

main().catch(console.error);
