// modules
const axios = require('axios');
const crypto = require('crypto');
const readline = require("readline");
const fs = require('fs');
const FormData = require('form-data');

var accountID
var secret
var clientId
var accessToken = {}
var sleepTime = global.sleepTimeOverride  || 200
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

async function postImage(imgURL, accountKey){

    let data = new FormData();
    data.append('image', fs.createReadStream(imgURL));

    headers = {...data.getHeaders()}
    return requester('post', `https://${accountKey}.webapp-${global.enviroment}/uploads`, data, attemptCount, headers)
}

// All purpose requester function. Pass in a method, url, and data object. Waits for sleep function to resolve then returns a response from axios
const requester = async (method, url, data, attempt = 2, additionalHeaders) => {

    if(!accessToken.accessToken){await authenticate()}

    if (new Date(Date.now()+60000) > (new Date((accessToken?.expiry) || 0)) && authMethod) {
        await getAccessToken()
    }

    let headers = additionalHeaders || {'Content-Type': 'application/json'}
    headers.Authorization = 'Bearer ' + accessToken.accessToken

    let sendRequest = {
        method: method,
        headers: headers,
        url: url,
        data: data
    }
    if (!(method == 'get') || global.waitForGets) {
        await sleep(sleepTime)
    }

    let returnVal = await axios(sendRequest).catch(async e=>{
        if(e.response.data.message == 'jwt expired'){
            accessToken.accessToken = await askQuestion('Access token expired. Please enter a new one: ')
            return requester(method, url, data)
        } else if (attempt) {
            let tryAgain
            console.log(e)
            if(attempt >= 2){
                tryAgain = attempt - 1
            } else if (attempt == 1){
                tryAgain = await askQuestion(`Request Failed. Enter the number of times you want to retry, or 0 to give up: `).then(r=>{return parseInt(r)})
            } else {
                return e
            }
            await sleep(3000)
            return requester(method, url, data, tryAgain)
        } else {
            console.log(e)
            return e;
        }
    })

    let d = new Date();
    logWrite.write(`[${(d).toLocaleTimeString("en-gb", dateOptions)}]${JSON.stringify({REQUEST:{method:method,url:url,data:data},RESPONSE:returnVal.data})}\r\n`)
    if(global.debugMode){
        console.log(sendRequest)
    }

    return returnVal
    
}


// All purpose loop function. Allows you to loop through any list in Stok.ly
// You pass in a message that is displayed after each item in the list is handled
// A callback allows you to decide what you are doing with each list item
// Progress counter included. Does not show if message is blank
async function loopThrough(message, url, params = '', filter = '', callBack, incrementPage = true) {
    let page = 0
    let done = 0;
    let total
    do {
        let res = await requester('get', `${url}?page=${page}&${params}&filter=${filter}`).then(r => {
            total = r.data.metadata.count
            return r.data
        })
        var length = res.data.length
        if(incrementPage){page += 1}
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
            console.log(`${'|'.repeat(80)}\n\nAUTHENTICATION FAILED. TRYING AGAIN\n\n${'|'.repeat(80)}`)
        }
    } while (!authenticated)

    console.log(`${'|'.repeat(80)}\n\nAUTHENTICATED\n\n${'|'.repeat(80)}`)
}


module.exports = {
    requester,
    sleep,
    loopThrough,
    getAccessToken,
    askQuestion,
    authenticate,
    postImage
};