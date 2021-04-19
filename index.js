require('dotenv').config({path: __dirname + '/.env'});
const playwright = require('playwright');
const sqlite3 = require('sqlite3');

const graphistesonline = require('./graphistesonline')

//Opening sqlite database to store websites last updates
let db = new sqlite3.Database('updates.db', err => {
  if(err) throw err;
  else console.log("Database opened on updates.db");
})

module.exports.run = async() => {
    
  //Create tables if they don't exists
  db.run(`CREATE TABLE IF NOT EXISTS GraphistesOnline(id INTEGER PRIMARY KEY)`);
  
  const browser = await playwright.chromium.launch({headless: false}); //Open a new brower window
  const page = await browser.newPage(); //Open a new page
    
  //Block useless content on the page
  await page.route('**/*', route => {
      if(route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("livechatinc")|| route.request().url().includes("google"))
          route.abort()
       else route.continue();
      });

    //Run all websites checks
    await graphistesonline.run(page, db); //Refresh Graphistesonline




    browser.close();
    db.close();
}


module.exports.run();