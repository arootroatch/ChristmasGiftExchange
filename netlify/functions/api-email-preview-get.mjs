import fs from 'node:fs';
import path from 'node:path';
import {getDb} from '../shared/db.mjs';

const emailsDir = path.resolve(process.cwd(), 'netlify', 'shared', 'emails');

function listTemplates() {
    return fs.readdirSync(emailsDir)
        .filter(f => f.endsWith('.mjs') && f !== 'layout.mjs')
        .map(f => f.replace('.mjs', ''));
}

export async function handler(event) {
    if (process.env.CONTEXT !== 'dev') {
        return {statusCode: 404, body: 'Not Found'};
    }
    if (event.httpMethod !== 'GET') {
        return {statusCode: 405, body: 'Method Not Allowed'};
    }

    const templateName = event.queryStringParameters?.template;

    if (!templateName) {
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(listTemplates()),
        };
    }

    const templates = listTemplates();
    if (!templates.includes(templateName)) {
        return {statusCode: 400, body: JSON.stringify({error: `Unknown template: ${templateName}`})};
    }

    try {
        const module = await import(`../shared/emails/${templateName}.mjs`);
        const db = await getDb();
        const data = await module.getData(db);
        const html = module.render(data);

        return {
            statusCode: 200,
            headers: {'Content-Type': 'text/html'},
            body: html,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {'Content-Type': 'text/html'},
            body: `<html><body><h1>Preview Error</h1><p>No seed data found. Run <code>bin/db</code> first.</p><pre>${error.message}</pre></body></html>`,
        };
    }
}
