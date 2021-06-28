require('dotenv').config({ path: __dirname + '/.env' });
const playwright = require('playwright');
const sqlite3 = require('sqlite3');
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
var botLogged = false;

const graphistesonline = require('./graphistesonline');
const kiwi = require('./kiwi');
const client = new Discord.Client();

//Opening sqlite database to store websites last updates
let db = new sqlite3.Database('updates.db', err => {
    if (err) throw err;
    else console.log("Database opened on updates.db");
})

module.exports.run = async() => {

    //Create tables if they don't exists
    db.run(`CREATE TABLE IF NOT EXISTS GraphistesOnline(id INTEGER PRIMARY KEY)`);
    db.run(`CREATE TABLE IF NOT EXISTS Kiwi(id INTEGER PRIMARY KEY)`);

    //DISCORD LOGIN
    await client.login(process.env.Discord_Token); //Login with Discord API
    client.on('ready', function() {
        botLogged = true;
        console.log("Bot connected");
    })

    var userDataDir = path.join(__dirname, 'BrowserData');
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir);
    }

    const browser = await playwright.chromium.launchPersistentContext(userDataDir, { headless: true, chromiumSandbox: false }); //Open a new brower window with persistent storage

    async function refreshGO() {
        console.log("Checking GO");
        try {
            await graphistesonline.run(await openGO(browser), db, client);
            console.log('[GO] Done.');
        } catch(e) {
            console.log(e)
        }
    }

    async function refreshKiwi() {
        console.log("Checking Kiwi");
        try {
            await kiwi.run(await openKiwi(browser), db, client);
            console.log('[Kiwi] Done.');
        } catch(e) {
            console.log(e)
        }
    }

    await refreshGO();
    await refreshKiwi();

    //Check GO every 10 minutes and Kiwi every 20 minutes
    setInterval(refreshGO, 600000);
    setInterval(refreshKiwi, 1200000);


}

async function openGO(browser) {
    const page = await browser.newPage();

    //Block useless content on the page
    await page.route('**/*', route => {
        if (route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("livechatinc") || route.request().url().includes("google"))
            route.abort()
        else route.continue();
    });

    return page;
}

async function openKiwi(browser) {
    const page = await browser.newPage();

    await page.route('**/*', route => {
        if (route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("hotjar") || route.request().url().includes("gtag"))
            route.abort()
        else route.continue();
    });

    return page;
}

module.exports.run();