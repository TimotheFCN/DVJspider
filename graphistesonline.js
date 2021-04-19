require('dotenv').config({path: __dirname + '/.env'});

//Login infos from the confg file
let username = process.env.GO_Username;
let password = process.env.GO_Password;

//Check new offers and sends a message on Discord if so
exports.run = async function(page, db) {
    const mainurl = 'https://www.graphistesonline.com/mypage.php?quoi=my_demandes4';
    await page.goto(mainurl);
    await page.waitForSelector('#loader', {visible: false}); //Wait for the page to load

    //Check if the user is logged, if not, log the user
    if(page.url() !== mainurl) await login(page); //Log in

    await page.goto(mainurl);
    await processOffers(db, await getOffers(page));
}

//Log with a specified user on the site
async function login(page) {
    await page.goto('https://www.graphistesonline.com/visitor_mypage_3.php?quoi=login&where='); //Go to the login page
    await page.waitForSelector('#loader', {visible: false}); //Wait for the page to load
    //Fill the form
    await page.type('input[name=nick]', username, { delay: 20 });
    await page.type('input[name=password]', password, { delay: 20 });
    await page.click('#form_submit', { delay: 20 })
}

//Sends back all offers on the first page
async function getOffers(page) {
    await page.waitForSelector('//*[@id="liste_all"]/ul/li[1]/a/h3', {visible: true}, {delay : 2000}); //Wait for the page to load

    //Select the list of offers and put it in the array "result"
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


      //Formatting the array with the desired infos (offers contains a list of offer)
      var offers = [];
      for (let element of result) {
          let offer = {
              //Use the string formatting to get the infos we need
              link: element.href, //Link to the offer
              num: element.href.split("&id=")[1], //ID of the offer
              title: (element.innerHTML.substring( element.innerHTML.indexOf("&nbsp;") + 6, element.innerHTML.indexOf("</h3>")).replaceAll("&nbsp;", "")+" "), //Title of the offer
              desc: element.innerHTML.substring( element.innerHTML.indexOf("projet : </strong>") + 18, element.innerHTML.indexOf("<br><br>")) //Description of the offer

          }
          offers.push(offer);
      }
      //Return the array
      return offers;
}

//Check for each offers if it is already in the database. If not, sends a message on Discord and updates the database.
async function processOffers(db, offers) {
    offers.forEach(offer => {
        db.all('SELECT 1 FROM GraphistesOnline WHERE id = ' + offer.num, (err, result) => {
            if(err) throw err;
            if (result.length == 0) //Si l'id n'existe pas déjà
            {
                db.run('INSERT INTO GraphistesOnline VALUES(?)', [offer.num]); //Ajout de l'ID à la base
                console.log("Nouvelle offre trouvée : " + offer.num);
            }
        });
    });
}