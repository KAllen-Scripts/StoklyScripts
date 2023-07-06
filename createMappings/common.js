// modules
const axios = require('axios');
const crypto = require('crypto');
const readline = require("readline");
const csv = require('fast-csv');
const fs = require('fs');

var accountID
var secret
var clientId
var accessToken = {}
var sleepTime = 200
var authMethod

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

// All purpose requester function. Pass in a method, url, and data object. Returns a promise for the sleep function so there is a delay, then a promise form axios on resolution
const requester = async (method, url, data) => {

    if (Date.now() > (new Date((accessToken?.expiry) || 0).getTime()) && authMethod) {
        await getAccessToken()
    }

    let sendRequest = {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + accessToken.accessToken,
            'Content-Type': 'application/json'
        },
        url: url,
        data: JSON.stringify(data)
    }
    if (!(method == 'get')) {
        await sleep(sleepTime)
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
            var continueLoop = await callBack(item)
            if(continueLoop === false){return}
            done += 1
            if (message != '') {
                console.log(`${message} ${done}/${total}`)
            }
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
        } else {
            accessToken.accessToken = await askQuestion('Enter the access token: ')
        }

        try{
            await requester('get', `https://${enviroment}/v0/items?size=1`)
            authenticated = true
        } catch {
            console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n\nAUTHENTICATION FAILED. TRYING AGAIN\n\n||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||')
        }
    } while (!authenticated)

    console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n\nAUTHENTICATED\n\n||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||')
}

async function getInput(file, callback) {
    let rowFinished
    return new Promise((res, rej) => {
        const stream = fs.createReadStream(file)
            .pipe(csv.parse({
                headers: true
            }))
            .on('error', error => console.error(error))
            .on('data', async row => {
                stream.pause()
                rowFinished = false
                await callback(row)
                rowFinished = true
                stream.resume()
            })
            .on('end', async () => {
                do {
                    await sleep(100)
                } while (rowFinished == false)
                res()
            })
    })
}

async function getAttIDs(attList){
    let returnObj = {}
    let createList = []
    let addedAtts = []
    let attDict = await getAtts()
    const indexOfInsensitive = (array,string)=>{return array.findIndex(item =>  string.toLowerCase() === item.stoklyName.toLowerCase())}

    for (const attribute of attList){
        let count = 0
        let attAdded = false
        do{

            count += 1
            let attName = `${attribute}${count == 1 ? '' : ' - ' + count}`

            if (!(addedAtts.includes(attName.toLowerCase()))){
                addedAtts.push(attName.toLowerCase())
                if(indexOfInsensitive(createList, attName) < 1){
                    createList.push({stoklyName:attName,remoteName:attribute})
                    attAdded = true
                }
            }

        } while (attAdded == false)
    }

    for (const attribute of createList){
        if(attDict[attribute.stoklyName.toLowerCase()] != undefined){
            returnObj[attribute.remoteName] = attDict[attribute.stoklyName.toLowerCase()]
        } else {
            returnObj[attribute.remoteName] = await requester('post',`https://${enviroment}/v0/item-attributes`, {
                "name": attribute.stoklyName,
                "type": 0,
                "defaultValue": "",
                "allowedValues": []
            }).then(r=>{return r.data.data.id})
        }
    }
    return returnObj
}


async function getAtts(){
    let returnObj = {}
    await loopThrough('Getting Attributes', `https://${enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', function(attribute){
        returnObj[attribute.name.toLowerCase()] = attribute.itemAttributeId
    })
    return returnObj
}

module.exports = {requester, sleep, authenticate, loopThrough, getAttIDs, getAtts, getInput};