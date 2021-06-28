require('dotenv').config({ path: __dirname + '/.env' });
const Discord = require('discord.js');

//Login infos and discord channel from the confg file
let username = process.env.KIWI_Username;
let password = process.env.KIWI_Password;
const mainurl = 'https://kiwi.junior-entreprises.com/business/appels-d-offres/';
var channel;

//Check new offers and sends a message on Discord if so
exports.run = async function(page, db, client) {
    channel = client.channels.cache.get(process.env.Discord_Kiwi_Channel);


    await page.goto(mainurl);
    //Check if the user is logged, if not, log the user
    if (page.url().includes("auth")) {
        try {
            await login(page); //Log in
            console.log("[Kiwi] logged");
        } catch (e) {
            console.log('[Kiwi] ' + e);
            throw new Error('Kiwi login error, will try again later.')
        }
    }

    await page.goto(mainurl);

    var offers = [];

    try {
        offers = await getOffers(page)
    } catch (e) {
        console.log('[Kiwi] ' + e);
        throw new Error("Kiwi offers not loaded; will try again later.")
    }

    await processOffers(db, offers);

    await page.close();
}

//Log with a specified user on the site
async function login(page) {
    console.log("[Kiwi] login");
    await page.goto('https://auth.junior-entreprises.com/?returnUrl=https:%2F%2Fkiwi.junior-entreprises.com%2Flog'); //Go to the login page
    try {
        await page.waitForSelector('body > app-root > app-login > div.container > div > mat-card > mat-card-actions > button'); //Wait for the page to load
    } catch (e) {
        throw new Error('Login page unreachable.')
    }
    //Fill the form
    await page.type('#mat-input-0', username, { delay: 20 });
    await page.type('#mat-input-1', password, { delay: 20 });
    await page.keyboard.press('Enter');
    try {
        await page.waitForSelector('body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-home > div > h1');
    } catch (e) {
        await page.goto(mainurl); //Cancel if the selector is unavailable
        throw new Error('Login not completed.')
    }
    return;
}

//Sends back all offers on the first page
async function getOffers(page) {

    try {
    await page.waitForSelector('body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-appels-d-offres > div > div:nth-child(4) > div:nth-child(2) > mat-card > app-card-ao:nth-child(2) > mat-card > mat-card-content > div:nth-child(5) > button > span.mat-button-wrapper', { visible: true }); //Wait for the page to load
    } catch (e) {
        throw new Error('Offers page unreachable.')
    }

    var offers = []; //List of all the availible offers

    for (let i = 2; i < 6; i++) { //Get the 5 last offers
        let selector = 'body > app-root > div > div.mybody > app-navbar > mat-sidenav-container > mat-sidenav-content > div > div > app-appels-d-offres > div > div:nth-child(4) > div:nth-child(2) > mat-card > app-card-ao:nth-child(' + i + ') > mat-card > mat-card-content > div:nth-child(5) > button';

        //Wait for the popup to load
        const [request] = await Promise.all([
            page.waitForNavigation(),
            // Triggers the request
            page.click(selector),
        ]);

        //Aggregate the datas
        let offer = {
            num: page.url().split('offres/')[1],
            title: await page.$eval('#mat-dialog-' + (i - 2) + ' > app-popup-ao-details > div > h1', el => el.innerText)
        }
        offers.push(offer);

        await page.keyboard.press('Escape', { delay: 200 }); //Exit the popup
    }

    //Return the array
    return offers;
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
                console.log("[Kiwi] New offer found : " + offer.num);
            }
        });
    });
}

//Build and send the message to Discord
async function sendMessage(offer) {
    const embed = {
        "title": offer.num,
        "url": 'https://kiwi.junior-entreprises.com/business/appels-d-offres/',
        "color": 13570130,
        "thumbnail": {
            "url": "https://auth.junior-entreprises.com/assets/logos/JE_logo.png"
        },
        "author": {
            "name": "Kiwi",
            "url": "https://kiwi.junior-entreprises.com/",
            "icon_url": "https://auth.junior-entreprises.com/assets/logos/JE_logo.png"
        },
        "fields": [{
                "name": "Titre",
                "value": offer.title
            },
            {
                "name": "​",
                "value": "​"
            },
            {
                "name": "👇🏻",
                "value": 'https://kiwi.junior-entreprises.com/business/appels-d-offres/'
            }
        ]
    };
    channel.send("\n\n**Un nouvel appel d'offre a été publié !** \n@here", { embed });
}