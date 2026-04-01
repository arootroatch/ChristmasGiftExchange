import crypto from "crypto";
import {getAuthCodesCollection} from "./db.mjs";

function hmacHash(code) {
    const key = crypto.createHmac("sha256", process.env.JWT_SECRET)
        .update("auth-codes")
        .digest();
    return crypto.createHmac("sha256", key)
        .update(code)
        .digest("hex");
}

function generateCode() {
    return String(crypto.randomInt(10000000, 100000000));
}

export async function generateAndStoreCode(email) {
    const col = await getAuthCodesCollection();
    const code = generateCode();
    const codeHash = hmacHash(code);

    await col.deleteMany({email});

    await col.insertOne({
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        createdAt: new Date(),
    });

    return code;
}

export async function verifyCode(email, code) {
    const col = await getAuthCodesCollection();
    const doc = await col.findOne({
        email,
        expiresAt: {$gt: new Date()},
    });

    if (!doc) return {valid: false, error: "Invalid code"};
    if (doc.attempts >= 5) return {valid: false, error: "Too many attempts. Request a new code."};

    const codeHash = hmacHash(code);
    if (codeHash !== doc.codeHash) {
        await col.updateOne({_id: doc._id}, {$inc: {attempts: 1}});
        return {valid: false, error: "Invalid code"};
    }

    await col.deleteOne({_id: doc._id});
    return {valid: true};
}
