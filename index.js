require('dotenv').config({ path: __dirname + '/.env' });
const playwright = require('playwright');
const sqlite3 = require('sqlite3');
const Discord = require('discord.js');
var botLogged = false;

const graphistesonline = require('./graphistesonline');
const client = new Discord.Client();

//Opening sqlite database to store websites last updates
let db = new sqlite3.Database('updates.db', err => {
    if (err) throw err;
    else console.log("Database opened on updates.db");
})

module.exports.run = async() => {

    //Create tables if they don't exists
    db.run(`CREATE TABLE IF NOT EXISTS GraphistesOnline(id INTEGER PRIMARY KEY)`);

    //DISCORD LOGIN
    await client.login(process.env.Discord_Token); //Login with Discord API
    client.on('ready', function() {
        botLogged = true;
        console.log("Bot connected");
    })

    const browser = await playwright.chromium.launch( /*{ headless: false }*/ ); //Open a new brower window
    const page = await browser.newPage(); //Open a new page

    //Block useless content on the page
    await page.route('**/*', route => {
        if (route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("livechatinc") || route.request().url().includes("google"))
            route.abort()
        else route.continue();
    });

    await graphistesonline.run(page, db, client); //First check

    //Run all websites checks every 5 minutes
    setInterval(async function() {
        console.log("Checking websites");
        await graphistesonline.run(page, db, client); //Refresh Graphistesonline
    }, 300000);

}

module.exports.run();