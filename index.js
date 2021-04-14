require('dotenv').config({path: __dirname + '/.env'})
const playwright = require('playwright');

//Login infos
let username = process.env.GO_Username;
let password = process.env.GO_Password;

module.exports.run = async() => {
    const browser = await playwright.chromium.launch({headless: false});
    const page = await browser.newPage();


    //Block useless content
    await page.route('**/*', route => {
        if(route.request().resourceType() === 'image' || route.request().resourceType() === 'css' || route.request().url().includes("livechatinc")|| route.request().url().includes("google"))
            route.abort()
        else route.continue();
      });

    const mainurl = 'https://www.graphistesonline.com/mypage.php?quoi=my_demandes4';
    await page.goto(mainurl);
    await page.waitForSelector('#loader', {visible: false});

    //Check if the user is logged
    if(page.url() !== mainurl) await login(page); //Log in

    await page.goto(mainurl);
    await getOffers(page);
    browser.close();
}

async function login(page) {
    await page.goto('https://www.graphistesonline.com/visitor_mypage_3.php?quoi=login&where=');
    await page.waitForSelector('#loader', {visible: false});
    //Fill the form
    await page.type('input[name=nick]', username, { delay: 20 });
    await page.type('input[name=password]', password, { delay: 20 });
    await page.click('#form_submit', { delay: 20 })
}

async function getOffers(page) {
    await page.waitForSelector('//*[@id="liste_all"]/ul/li[1]/a/h3', {visible: true}, {delay : 2000});

    //Select the list of offers and put it in an array
    let listSelector="#liste_all > ul > li > a";
    var result = await page.$$eval(listSelector, list => {
        var result = [];
        for (let i = 0; i < list.length; i++) {
          var data = {
            href: list[i].href,
            textContent: list[i].textContent,
            innerHTML: list[i].innerHTML
          };
          result.push(data);
        }
        return result;
      });

      var offers = [];

      //Formatting the array with the desired infos
      for (let element of result) {
          let offer = {
              link: element.href, //Link to the offer
              num: element.href.split("&id=")[1],
              title: (element.innerHTML.substring( element.innerHTML.indexOf("&nbsp;") + 6, element.innerHTML.indexOf("</h3>")).replaceAll("&nbsp;", "")+" "),
              desc: element.innerHTML.substring( element.innerHTML.indexOf("projet : </strong>") + 18, element.innerHTML.indexOf("<br><br>"))

          }
          offers.push(offer);
      }

      //Return the array
      return offers;

}

module.exports.run();