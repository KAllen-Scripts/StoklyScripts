// modules
const axios = require('axios');
const crypto = require('crypto');
const readline = require("readline");
const fs = require('fs');

var accountID
var secret
var clientId
var accessToken = {}
var sleepTime = 200
var authMethod

var logWrite = fs.createWriteStream('./log.txt', {flags: 'a'});

let dateOptions = {
    weekday: "long", year: "numeric", month: "short",  
    day: "numeric", hour: "2-digit", minute: "2-digit"  
}; 

// generic wait for timeout function to handle a delay
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// gets the access token using stored global variables
const getAccessToken = async () => {

    const signature = crypto.createHmac("sha256", secret).update(clientId).digest("hex")

    accessToken = await axios({
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        url: `https://${global.enviroment}/v1/grant`,
        data: {
            accountkey: accountID,
            clientId: clientId,
            signature: signature
        }
    }).then(r => {
        return r.data.data.authenticationResult
    })
}

// All purpose requester function. Pass in a method, url, and data object. Waits for sleep function to resolve then returns a promise to axios
const requester = async (method, url, data) => {

    if(!accessToken.accessToken){await authenticate()}

    if (Date.now() > (new Date(((accessToken?.expiry) || 0).getTime())-60000) && authMethod) {
        await getAccessToken()
    }

    let sendRequest = {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + accessToken.accessToken,
            'Content-Type': 'application/json'
        },
        url: url,
        data: data
    }
    if (!(method == 'get') || global.waitForGets) {
        await sleep(sleepTime)
    }
    let d = new Date();
    logWrite.write(`[${(d).toLocaleTimeString("en-gb", dateOptions)}]${JSON.stringify({method:method,url:url,data:data})}\r\n`)
    if(global.debugMode){
        console.log(sendRequest)
    }
    return axios(sendRequest)
}


// All purpose loop function. Allows you to loop through any list in Stok.ly
// You pass in a message that is displayed after each item in the list is handled
// A callback allows you to decide what you are doing with each list item
// Progress counter included. Does not show if message is blank
async function loopThrough(message, url, params = '', filter = '', callBack) {
    let page = 0
    let done = 0;
    let total
    do {
        let res = await requester('get', `${url}?page=${page}&${params}&filter=${filter}`).then(r => {
            total = r.data.metadata.count
            return r.data
        })
        length = res.data.length
        page += 1
        for (const item of res.data) {
            // If we want to leave the function early, we can return false from the callback
            var continueLoop = await callBack(item)
            done += 1
            if (message != '') {
                console.log(`${message} ${done}/${total}`)
            }
            if(continueLoop === false){return}
        }
    } while (length > 0)
}

// Prompts input from user and returns response in form of promise
const askQuestion = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const boldQuery = `\x1b[1m${query}\x1b[0m`; // Add ANSI escape codes for bold text

    return new Promise(resolve => rl.question(boldQuery, ans => {
        rl.close();
        resolve(ans);
    }));
};


const authenticate = async ()=>{
    do{
        var authenticated = false

        authMethod = await askQuestion('How are we authenticating? 0 for token, 1 for app: ').then(r=>{return JSON.parse(r)})

        if(authMethod){
            accountID = await askQuestion('Enter the account ID: ')
            secret = await askQuestion('Enter the secret: ')
            clientId = await askQuestion('Enter the client ID: ')
            await getAccessToken()
        } else {
            accessToken.accessToken = await askQuestion('Enter the access token: ')
        }

        try{
            await requester('get', `https://${global.enviroment}/v0/items?size=1`)
            authenticated = true
        } catch {
            console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n\nAUTHENTICATION FAILED. TRYING AGAIN\n\n||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||')
        }
    } while (!authenticated)

    console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n\nAUTHENTICATED\n\n||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||')
}


module.exports = {
    requester,
    sleep,
    loopThrough,
    getAccessToken,
    askQuestion,
    authenticate
};