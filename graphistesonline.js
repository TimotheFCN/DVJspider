require('dotenv').config({ path: __dirname + '/.env' });
const Discord = require('discord.js');

//Login infos and discord channel from the confg file
let username = process.env.GO_Username;
let password = process.env.GO_Password;
var channel;
var messageSent = false; //If feedback message has already been sent
var offersFetched = false //Temporary fix for unexpected errors when loading the page for the first time

//Check new offers and sends a message on Discord if so
exports.run = async function(page, db, client) {
    channel = client.channels.cache.get(process.env.Discord_Channel);

    const mainurl = 'https://www.graphistesonline.com/mypage.php?quoi=my_demandes4';
    await page.goto(mainurl);

    //Check if the user is logged, if not, log the user
    if (page.url().includes("login")) {
        await login(page); //Log in
        console.log("logged");
    }

    await page.goto(mainurl);
    await page.waitForSelector('#bloc-presta-prj-dispo', { visible: false }); //Wait for the page to load
    if (page.url().includes("feedback")) EvaluateMessage();
    else {
        messageSent = false;
        await processOffers(db, await getOffers(page));
    }
    await page.close();
}

//Log with a specified user on the site
async function login(page) {
    console.log("login");
    await page.goto('https://www.graphistesonline.com/visitor_mypage_3.php?quoi=login&where='); //Go to the login page
    await page.waitForSelector('#loader', { visible: false }); //Wait for the page to load
    //Fill the form
    await page.type('input[name=nick]', username, { delay: 20 });
    await page.type('input[name=password]', password, { delay: 20 });
    await page.waitForSelector('#form_submit', { delay: 200 });
    await page.click('#form_submit', { delay: 200 })
    return;
}

//Check if a feedback request is pending
async function EvaluateMessage(page) {
    console.log("feedback pending");
    if (!messageSent) {
        channel.send("\n @here\n ⛔  `Une demande de feedback est en attente, impossible de vérifier les nouvelles offres.`  ⛔ \n<https://www.graphistesonline.com/mypage.php?quoi=my_demandes4> \n");
        messageSent = true;
    }
    return;
}

//Sends back all offers on the first page
async function getOffers(page) {
    await page.waitForSelector('//*[@id="liste_all"]/ul/li[1]/a/h3', { visible: true }, { delay: 2000 }); //Wait for the page to load
    //Select the list of offers and put it in the array "result"
    let listSelector = "#liste_all > ul > li > a";
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
            title: (element.innerHTML.substring(element.innerHTML.indexOf("&nbsp;") + 6, element.innerHTML.indexOf("(" + element.href.split("&id=")[1] + ")")).replace("&nbsp;", "") + " "), //Title of the offer
            desc: element.innerHTML.substring(element.innerHTML.indexOf("projet : </strong>") + 18, element.innerHTML.indexOf("<br><br>")) //Description of the offer

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
            if (err) throw err;
            if (result.length == 0) //If the ID doesn't exist
            {
                sendMessage(offer);
                db.run('INSERT INTO GraphistesOnline VALUES(?)', [offer.num]); //Add the ID to the database
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