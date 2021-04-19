require('dotenv').config({path: __dirname + '/.env'})
const playwright = require('playwright');

const graphistesonline = require('./graphistesonline')


module.exports.run = async() => {
    const browser = await playwright.chromium.launch({headless: false}); //Open a new brower window
    const page = await browser.newPage(); //Open a new page
    //Block useless content on the page
    await page.route('**/*', route => {
        if(route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("livechatinc")|| route.request().url().includes("google"))
            route.abort()
        else route.continue();
      });

    //Run all websites checks
    await graphistesonline.run(page); //Refresh Graphistesonline




    browser.close();
}


module.exports.run();