const axios = require("axios");
const fs = require("fs");
const readline = require("readline")
const csv = require('fast-csv');

const accessToken = process.argv[2];
const channelID = process.argv[3];
const sleepTime = process.argv[4] == undefined ? 0 : process.argv[4];
const removeImages = process.argv[5] == undefined ? true : JSON.parse(process.argv[5].toLowerCase());

let overRideAtts = []
let excludeArr = []

let length = 0
let done = 0
let total
let attributeNames
let attLibMain = {}
let skipped = 0

const askQuestion = (query)=>{
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

const getFunc = async (url)=>{
    return new Promise((res,rej)=>{
        let getRequest = {
            method:'get',
            headers:{ 
                'Authorization': 'Bearer ' + accessToken
            },
            url:url
        }
        res(axios(getRequest).catch(err=>{rej(err)}))
    })
}


const patchFunc = async (url, data)=>{
    return new Promise((res,rej)=>{
        let patchRequest = {
            method:'patch',
            headers:{
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            url:url,
            data:JSON.stringify(data)
        }
        res(axios(patchRequest).catch(err=>{rej(err)}))
    })
}

const appendToBackup = (addition, logFile = "./backup.txt")=>{
    addition +=  '\n'
    fs.appendFile(logFile, addition, function (err) {
        if (err) {console.log(err)};
    })
}

const sleep = (ms)=>{
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllAttributes(){
    let page = 0
    let attributes = {}

    do{
        let res = await getFunc(encodeURI("https://api.stok.ly/v0/item-attributes?size=1000&page=" + page + "&sortDirection=ASC&sortField=name&filter=([status]!={1})")).catch(err=>{console.log(err)})

        for (const att of res.data.data){
            attributes[att.itemAttributeId] = att.name
        }

        length = res.data.data.length
        page += 1

    }while (length > 0)

    return attributes
}


async function loopThrough(callback){
    let page = 0
    done = 0

    do{

        let res = await getFunc(encodeURI("https://api.stok.ly/v0/channels/" + channelID + "/listings?size=100&page=" + page + "&sortDirection=ASC&sortField=name&filter=([status]!={2})")).catch(err=>{console.log(err)})

        await sleep(sleepTime)

        total = res.data.metadata.count

        length = res.data.data.length
        page += 1

        for (const item of res.data.data){

            let response = await getFunc("https://api.stok.ly/v0/listings/" + item.listingId).catch(err=>{console.log(err)})

            await sleep(sleepTime)

            await callback(response.data)
        }

    }while (length > 0)
}


async function checkData(listing){

    let attLib = {}

    let mainItemAttributes = await getFunc(encodeURI("https://api.stok.ly/v0/items/" + listing.data.itemId + "/attributes")).catch(err=>{console.log(err)})

    let mainItemBasicDetails = await getFunc(encodeURI("https://api.stok.ly/v0/items/" + listing.data.itemId)).catch(err=>{console.log(err)})

        attLib.listing = {
            name:listing.data.data.name,
            sku:listing.data.data.sku,
            barcode:listing.data.data.barcode,
            description:listing.data.data.description,
            manufacturer:listing.data.data.manufacturer
        }
        try{attLib.listing.weight = listing.data.data.weight.amount}catch{}
    
    if (listing.data.data.attributes != undefined){
        for (const att of listing.data.data.attributes){
            attLib.listing[attributeNames[att.attributeId]] = att.value
        }   
    }

    attLib.item = {
        name:mainItemBasicDetails.data.data.name,
        sku:mainItemBasicDetails.data.data.sku,
        barcode:mainItemBasicDetails.data.data.barcode,
        description:mainItemBasicDetails.data.data.description,
        manufacturer:mainItemBasicDetails.data.data.manufacturer,
        weight:mainItemBasicDetails.data.data.weight
    }

    for (const att of mainItemAttributes.data.data){
        attLib.item[att.itemAttributeName] = att.value
    }

    attLibMain[mainItemBasicDetails.data.data.sku] = attLib

    done += 1

    console.log("Fetched attributes for " + done + " out of " + total)

    await sleep(sleepTime)

}

function generateCSV(){
    let body = []
    let headers = []
    let str = ""
    for(const sku of Object.keys(attLibMain)){
        let row = []
        for (const head of Object.keys(attLibMain[sku].item)){
            if(!headers.includes("Item " + head)){headers.push("Item " + head)}
            row[headers.indexOf("Item " + head)] = attLibMain[sku].item[head]
        }
        for (const head of Object.keys(attLibMain[sku].listing)){
            if(!headers.includes("Listing " + head)){headers.push("Listing " + head)}
            row[headers.indexOf("Listing " + head)] = attLibMain[sku].listing[head]
        }
        body.push(row)
    }

    for (const i of headers){
        str += '"' + String(i).replace(/"/g, '""') + '",'
    }

    str += "\r\n"

    for(const r of body){
        for(const i of r){
            str += i == (undefined||null) ? "," : '"' + String(i).replace(/"/g,'""') + '",' 
        }
        str += "\r\n"
    }

    fs.writeFileSync("./compare.csv", str)
}


function getPatchData(item){

    let attributes = []
    let images = []
    let returnObj = {}

    if(item.data.data.attributes != undefined){
        for(const att of item.data.data.attributes){
            if (!overRideAtts.includes(String(attributeNames[att.attributeId]).toLowerCase())){
                attributes.push(att)
            }
        }
    }


    if (item.data.data.listIndividually != undefined){
        returnObj.listIndividually = item.data.data.listIndividually
    }

    if (removeImages == false && item.data.data.images != undefined){
        for (const img of item.data.data.images){
            images.push({uri:img.uri})
        }
    }

    returnObj = {
        attributes:attributes,
        images:images,
        channelSpecifics:[]
    }

    for(const att of Object.keys(item.data.data)){
        if (!overRideAtts.includes(String(att).toLowerCase()) && !["attributes","images","channelspecifics","stokly_type","variableitemid","variantlistingids"].includes(String(att).toLowerCase())){
            returnObj[att] = item.data.data[att]
        }
    }

    return returnObj

}


async function removeOverrides(item){

    appendToBackup(JSON.stringify(item))

    done += 1

    if(!excludeArr.includes(String(item.data.sku))){
        data = getPatchData(item)


        patchFunc("https://api.stok.ly/v0/listings/" + item.data.listingId, {data:data}).catch(err=>{console.log(err)})

        console.log("done " + item.data.sku + " (" + item.data.listingId + ") " + "(" + done + " out of " + total + ")")

        await sleep(sleepTime)

    } else {
        
        skipped += 1

        console.log("Skipped " + item.data.sku + " (" + item.data.listingId + ") " + "(" + done + " out of " + total + ")")
    }

}


async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {items:[],attributes:[]}
        const stream1 = fs.createReadStream('./attributes.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            returnObj.attributes.push(String(row.Attribute).trim().toLowerCase())
        })
        .on('end', r => {
            const stream2 = fs.createReadStream('./items.csv')
            .pipe(csv.parse({ headers: true }))
            .on('error', error => console.error(error))
            .on('data',  row => {
                returnObj.items.push(String(row.Item).trim().toLowerCase())
            })
            .on('end', r => {res(returnObj)})
        })
    })
}


(async () => {

    attributeNames = await getAllAttributes()

    await loopThrough(checkData)
    generateCSV()

    let userInput = await askQuestion("\n//////////////////////////////////////////////////////////////////////////////////\nCSV generated.\n'Items' CSV dictates items you wish to skip.\n'Attributes' CSV dictates attributes you wish to override.\nType 'Continue' to start, or anything else to exit\n//////////////////////////////////////////////////////////////////////////////////\n")
    
    let inputs = await getInput()

    overRideAtts = inputs.attributes
    excludeArr = inputs.items

    if(userInput.toLowerCase() == "continue"){
        appendToBackup("//////////////////////////////////////////////////////////////////////////////////\nBackups for " + new Date() + "\n//////////////////////////////////////////////////////////////////////////////////\n")
        await loopThrough(removeOverrides)
    }
})()