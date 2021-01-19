import {createServer} from 'http';
import {parse} from 'url';
import {join} from 'path';
import {writeFile, readFileSync, existsSync, fstat} from 'fs';

let port = process.env.PORT || 8080;


import * as _pgp from "pg-promise"
//import * as _express from "express"

const pgp = _pgp["default"]({
    connect(client) {
        console.log('Connected to database:', client.connectionParameters.database);
    },

    disconnect(client) {
        console.log('Disconnected from database:', client.connectionParameters.database);
    }
});


// Local PostgreSQL credentials
const username = "postgres";
const password = "admin";

const url = process.env.DATABASE_URL || `postgres://${username}:${password}@localhost/`;
const db = pgp(url);


async function connectAndRun(task) {
    let connection = null;

    try {
        connection = await db.connect();
        return await task(connection);
    } catch (e) {
        throw e;
    } finally {
        try {
            connection.done();
        } catch(ignored) {

        }
    }
}



let WS_table_create = 'CREATE TABLE IF NOT EXISTS WORDSCORE(Name TEXT, WORD TEXT, SCORE INT);';
let GS_table_create = 'CREATE TABLE IF NOT EXISTS GAMESCORE(Name TEXT, SCORE INT);';


async function createTables() {
    await connectAndRun(db => db.none(WS_table_create));
    await connectAndRun(db => db.none(GS_table_create));
};

let WS_getHWS = 'SELECT * FROM WORDSCORE ORDER BY SCORE DESC LIMIT 10;';
let GS_getHGS = 'SELECT * FROM GAMESCORE ORDER BY SCORE DESC LIMIT 10;';

async function getHighestWS() {
    return await connectAndRun(db => db.any(WS_getHWS));
};
async function getHighestGS() {
    return await connectAndRun(db => db.any(GS_getHGS));
};

async function addWS(NAME, WORD, SCORE) {
    return await connectAndRun(db => db.none(`INSERT INTO WORDSCORE VALUES ($1, $2, $3);`,[NAME, WORD, SCORE]));
}
async function addGS(NAME, SCORE) {
    return await connectAndRun(db => db.none(`INSERT INTO GAMESCORE VALUES ($1, $2);`,[NAME, SCORE]));
}


createServer(async (req, res) => {
    const parsed = parse(req.url, true);
    await createTables();

    if (parsed.pathname === '/wordScore') {
        let body = '';
        req.on('data', data => body += data);
        req.on('end', () => {
            const data = JSON.parse(body);
            addWS(data.name, data.word, data.score);
        });
    } else if (parsed.pathname === '/gameScore') {
        let body = '';
        req.on('data', data => body += data);
        req.on('end', () => {
            const data = JSON.parse(body);
            addGS(data.name, data.score);
        });
    } else if (parsed.pathname === '/highestWordScores') {
        let highestWSquery = await getHighestWS();
        res.end(JSON.stringify(
            highestWSquery
        ));
    } else if (parsed.pathname === '/highestGameScores') {
        let highestGSquery = await getHighestGS();
        res.end(JSON.stringify(
            highestGSquery
        ));
    } else {
        // If the client did not request an API endpoint, we assume we need to fetch a file.
        // This is terrible security-wise, since we don't check the file requested is in the same directory.
        // This will do for our purposes.
        const filename = parsed.pathname === '/' ? "index.html" : parsed.pathname.replace('/', '');
        const path = join("client/", filename);
        console.log("trying to serve " + path + "...");
        if (existsSync(path)) {
            if (filename.endsWith("html")) {
                res.writeHead(200, {"Content-Type" : "text/html"});
            } else if (filename.endsWith("css")) {
                res.writeHead(200, {"Content-Type" : "text/css"});
            } else if (filename.endsWith("js")) {
                res.writeHead(200, {"Content-Type" : "text/javascript"});
            } else {
                res.writeHead(200);
            }

            res.write(readFileSync(path));
            res.end();
        } else {
            res.writeHead(404);
            res.end();
        }
    }
}).listen(port);
