import {MongoClient} from "mongodb";
import repl from "node:repl";
import readline from "node:readline";
import fs from "node:fs";
import {wishlistEditPath, wishlistViewPath} from "../netlify/shared/links.mjs";

const ENV_FILES = {
    dev: ".env.local",
    prod: ".env",
};

function readUri(envFile) {
    const content = fs.readFileSync(envFile, "utf-8");
    const match = content.match(/^MONGO_DB_URI="(.+)"$/m);
    if (!match) throw new Error(`MONGO_DB_URI not found in ${envFile}`);
    return match[1];
}

function readDbName(envFile) {
    const content = fs.readFileSync(envFile, "utf-8");
    const match = content.match(/^MONGODB_DATABASE="(.+)"$/m);
    return match ? match[1] : "gift-exchange";
}

async function find(collection, query = {}) {
    return collection.find(query).toArray();
}

async function findOne(collection, query = {}) {
    return collection.findOne(query);
}

function userExchangeData(r, db, queryOrToken) {
    const base = "http://localhost:8888";
    const query = typeof queryOrToken === "string" ? {token: queryOrToken} : queryOrToken;
    (async () => {
        const usersCol = db.collection("users");
        const user = await usersCol.findOne(query);
        if (!user) { console.log("User not found"); return; }
        const exs = await db.collection("exchanges").find({participants: user._id}).toArray();

        console.log(`\n${user.name} (${user.email})`);
        console.log(`  Exchanges: ${exs.length}`);
        console.log(`  Edit wishlist: ${base}${wishlistEditPath()}`);

        for (const ex of exs) {
            console.log(`\n  Exchange: ${ex.exchangeId}`);
            const giverAssignment = ex.assignments.find(a => a.giverId.equals(user._id));
            if (giverAssignment) {
                const recipient = await usersCol.findOne({_id: giverAssignment.recipientId});
                console.log(`    Recipient: ${recipient.name}`);
                console.log(`    View ${recipient.name}'s wishlist: ${base}${wishlistViewPath(ex.exchangeId)}`);
            }
            const recipientAssignment = ex.assignments.find(a => a.recipientId.equals(user._id));
            if (recipientAssignment) {
                const giver = await usersCol.findOne({_id: recipientAssignment.giverId});
                console.log(`    Secret Santa: ${giver.name}`);
                console.log(`    View ${user.name}'s wishlist (as ${giver.name}): ${base}${wishlistViewPath(ex.exchangeId)}`);
            }
        }
        console.log();
    })().catch(console.error)
        .finally(() => r.displayPrompt());
}

export function startRepl(db, client, onExit) {
    console.log("\nREPL ready. Available: db, users, exchanges, find(), findOne(), userExchangeData()");
    console.log("Example: await find(users, {name: 'Alice'})");
    console.log("Example: userExchangeData('user-token-uuid') or userExchangeData({name: 'Alice'})\n");

    const r = repl.start({prompt: "dev-db> ", useGlobal: true});
    r.context.db = db;
    r.context.users = db.collection("users");
    r.context.exchanges = db.collection("exchanges");
    r.context.find = find;
    r.context.findOne = findOne;
    r.context.userExchangeData = (queryOrToken) => userExchangeData(r, db, queryOrToken);

    r.on("exit", async () => {
        console.log("\nShutting down...");
        await client.close();
        if (onExit) await onExit();
        process.exit(0);
    });
}

async function connectAndStartRepl(env) {
    const envFile = ENV_FILES[env];
    if (!envFile) {
        console.error(`Unknown environment "${env}". Available: ${Object.keys(ENV_FILES).join(", ")}`);
        process.exit(1);
    }
    const uri = readUri(envFile);
    const dbName = readDbName(envFile);

    console.log(`Connecting to ${env} (${envFile})...`);
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to ${dbName}`);

    startRepl(db, client);
}

function promptForEnv() {
    const envs = Object.keys(ENV_FILES);
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    rl.question(`Which environment? (${envs.join(", ")}): `, (answer) => {
        rl.close();
        connectAndStartRepl(answer.trim()).catch(console.error);
    });
}

const env = process.argv[2];
if (env) {
    connectAndStartRepl(env).catch(console.error);
} else if (process.argv[1]?.endsWith("repl.mjs")) {
    promptForEnv();
}
