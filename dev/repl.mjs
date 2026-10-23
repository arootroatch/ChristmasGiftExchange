import {MongoClient, ObjectId} from "mongodb";
import repl from "node:repl";
import readline from "node:readline";
import fs from "node:fs";
import {dashboardPath} from "../netlify/shared/links.mjs";

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

function userExchangeData(r, db, queryOrEmail) {
    const base = "http://localhost:8888";
    const query = typeof queryOrEmail === "string" ? {email: queryOrEmail} : queryOrEmail;
    (async () => {
        const usersCol = db.collection("users");
        const user = await usersCol.findOne(query);
        if (!user) { console.log("User not found"); return; }
        const exs = await db.collection("exchanges").find({participants: user._id}).toArray();

        console.log(`\n${user.name} (${user.email})`);
        console.log(`  Exchanges: ${exs.length}`);
        console.log(`  Dashboard: ${base}${dashboardPath()}`);

        for (const ex of exs) {
            console.log(`\n  Exchange: ${ex.exchangeId}`);
            const giverAssignment = ex.assignments.find(a => a.giverId.equals(user._id));
            if (giverAssignment) {
                const recipient = await usersCol.findOne({_id: giverAssignment.recipientId});
                console.log(`    Recipient: ${recipient.name}`);
            }
            const recipientAssignment = ex.assignments.find(a => a.recipientId.equals(user._id));
            if (recipientAssignment) {
                const giver = await usersCol.findOne({_id: recipientAssignment.giverId});
                console.log(`    Secret Santa: ${giver.name}`);
            }
        }
        console.log();
    })().catch(console.error)
        .finally(() => r.displayPrompt());
}

async function printExchangeAssignments(usersCol, ex) {
    const people = await usersCol.find({_id: {$in: ex.participants}}).toArray();
    const nameOf = (id) => {
        const u = people.find(p => p._id.equals(id));
        return u ? `${u.name} <${u.email}>` : id.toString();
    };

    console.log(`\n  Exchange: ${ex.exchangeId}`);
    console.log(`    Created: ${ex.createdAt.toISOString()}  Secret Santa: ${ex.isSecretSanta}`);
    if (ex.organizer) console.log(`    Organizer: ${nameOf(ex.organizer)}`);
    for (const h of ex.houses) console.log(`    House "${h.name}": ${h.members.map(nameOf).join(", ")}`);
    console.log("    Assignments:");
    for (const a of ex.assignments) console.log(`      ${nameOf(a.giverId)}  →  ${nameOf(a.recipientId)}`);
}

function exchangeResults(r, db, queryOrEmail, {latestOnly}) {
    const query = typeof queryOrEmail === "string" ? {email: queryOrEmail} : queryOrEmail;
    (async () => {
        const usersCol = db.collection("users");
        const user = await usersCol.findOne(query);
        if (!user) { console.log("User not found"); return; }
        const cursor = db.collection("exchanges").find({participants: user._id}).sort({createdAt: -1});
        const exs = await (latestOnly ? cursor.limit(1) : cursor).toArray();

        console.log(`\n${user.name} (${user.email})`);
        if (exs.length === 0) console.log("  No exchanges");
        for (const ex of exs) await printExchangeAssignments(usersCol, ex);
        console.log();
    })().catch(console.error)
        .finally(() => r.displayPrompt());
}

export function startRepl(db, client, onExit) {
    console.log("\nREPL ready. Available: db, users, exchanges, ObjectId, find(), findOne(), userExchangeData(), latestExchangeResults(), allExchangeResults()");
    console.log("Example: await find(users, {name: 'Alice'})");
    console.log("Example: await find(exchanges, {participants: new ObjectId('...')})");
    console.log("Example: userExchangeData('alice@example.com') or userExchangeData({name: 'Alice'})");
    console.log("Example: latestExchangeResults('alice@example.com') or allExchangeResults({name: 'Alice'})\n");

    const r = repl.start({prompt: "dev-db> ", useGlobal: true});
    r.context.db = db;
    r.context.users = db.collection("users");
    r.context.exchanges = db.collection("exchanges");
    r.context.find = find;
    r.context.findOne = findOne;
    r.context.ObjectId = ObjectId;
    r.context.userExchangeData = (queryOrEmail) => userExchangeData(r, db, queryOrEmail);
    r.context.latestExchangeResults = (queryOrEmail) => exchangeResults(r, db, queryOrEmail, {latestOnly: true});
    r.context.allExchangeResults = (queryOrEmail) => exchangeResults(r, db, queryOrEmail, {latestOnly: false});

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
