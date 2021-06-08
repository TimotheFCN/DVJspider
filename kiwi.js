require('dotenv').config({ path: __dirname + '/.env' });
const Discord = require('discord.js');

//Login infos and discord channel from the confg file
let username = process.env.KIWI_Username;
let password = process.env.KIWI_Password;
var channel;

//Check new offers and sends a message on Discord if so
exports.run = async function(page, db, client) {
    channel = client.channels.cache.get(process.env.Discord_Channel);

    const mainurl = 'https://kiwi.junior-entreprises.com/business/appels-d-offres/';
    await page.goto(mainurl);
    setTimeout(() => {}, 2000);

    //Check if the user is logged, if not, log the user
    if (page.url().includes("auth")) {
        await login(page); //Log in
        console.log("logged");
    }

    await page.goto(mainurl);
    await page.waitForSelector('body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-appels-d-offres > div > div:nth-child(4) > div:nth-child(2)', { visible: false }); //Wait for the page to load
    setTimeout(() => {}, 2000);
    //await processOffers(db, await getOffers(page));
    await getOffers(page);
}

//Log with a specified user on the site
async function login(page) {
    console.log("login");
    await page.goto('https://auth.junior-entreprises.com/?returnUrl=https:%2F%2Fkiwi.junior-entreprises.com%2Flogin'); //Go to the login page
    await page.waitForSelector('body > app-root > app-login > div.container > div > mat-card > mat-card-actions > button'); //Wait for the page to load
    //Fill the form
    await page.type('#mat-input-0', username, { delay: 20 });
    await page.type('#mat-input-1', password, { delay: 20 });
    await page.keyboard.press('Enter');
    //await page.click('body > app-root > app-login > div.container > div > mat-card > mat-card-actions > button', { delay: 5000 })
    setTimeout(() => {}, 1000);
    await page.waitForSelector('body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-home > div > h1');
    return;
}

//Sends back all offers on the first page
async function getOffers(page) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.waitForSelector('body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-appels-d-offres > div > div:nth-child(4) > div:nth-child(2)', { visible: true }); //Wait for the page to load
    //Select the list of offers and put it in the array "result"
    let content = await page.$$('mat-card-content');
    var result = [];
     for (let i = 1; i < content.length; i++) {
        var data = {
             innerHTML: content[i].innerHTML
        };
        result.push(data);
        console.log(data);
    }

  /*  //Formatting the array with the desired infos (offers contains a list of offer)
    var offers = [];
    for (let element of result) {

        let offer = {
            //Use the string formatting to get the infos we need
            link: element.href, //Link to the offer
            num: element.href.split("&id=")[1], //ID of the offer
            title: (element.innerHTML.substring(element.innerHTML.indexOf("&nbsp;") + 6, element.innerHTML.indexOf("(" + element.href.split("&id=")[1] + ")")).replace("&nbsp;", "") + " "), //Title of the offer
            desc: element.innerHTML.substring(element.innerHTML.indexOf("projet : </strong>") + 18, element.innerHTML.indexOf("<br><br>")) //Description of the offer

        }
        offers.push(offer);
    }
    //Return the array
    return offers;*/
}

//Check for each offers if it is already in the database. If not, sends a message on Discord and updates the database.
async function processOffers(db, offers) {
    offers.forEach(offer => {
        db.all('SELECT 1 FROM Kiwi WHERE id = ' + offer.num, (err, result) => {
            if (err) throw err;
            if (result.length == 0) //If the ID doesn't exist
            {
                sendMessage(offer);
                db.run('INSERT INTO Kiwi VALUES(?)', [offer.num]); //Add the ID to the database
                console.log("New offer found : " + offer.num);
            }
        });
    });
}

//Build and send the message to Discord
async function sendMessage(offer) {
    const embed = {
        "title": offer.num,
        "url": offer.link,
        "color": 13570130,
        "thumbnail": {
            "url": "https://pbs.twimg.com/profile_images/1241262105/logo_graphistesonline_400x400.PNG"
        },
        "author": {
            "name": "GraphistesOnline",
            "url": "https://graphistesonline.com",
            "icon_url": "https://pbs.twimg.com/profile_images/1241262105/logo_graphistesonline_400x400.PNG"
        },
        "fields": [{
                "name": "Titre",
                "value": offer.title
            },
            {
                "name": "Description",
                "value": offer.desc
            },
            {
                "name": "​",
                "value": "​"
            },
            {
                "name": "👇🏻",
                "value": offer.link
            }
        ]
    };
    channel.send("\n\n**Un nouvel appel d'offre a été publié !** \n@here", { embed });
}