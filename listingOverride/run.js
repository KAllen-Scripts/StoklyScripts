const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.stok.ly';
global.waitForGets = 1;

async function getInput(){
    return new Promise((res,rej)=>{
        let returnArr = []
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                returnArr.push(row.Attribute.toLowerCase())

            stream.resume()
        })
        .on('end', () => {
            res(returnArr)
        })
    })
}

async function generateCSV(channelID){
    let csvArr = []
    await common.loopThrough('Getting channel and item Data', `https://${enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        let listingData = await common.requester('get', `https://${enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data})
        let itemData = await common.requester('get', `https://${enviroment}/v0/items/${listing.itemId}`).then(r=>{return r.data.data})
        csvArr.push({listing:listingData,item:itemData})

    })
    let csvStr = await convertCSV.json2csv(csvArr);
    fs.writeFileSync('./comparison.csv', csvStr);
}

(async ()=>{

    let removeAtts = await getInput()

    let channelID = await common.askQuestion('Enter the channel ID: ')

    let getCSV = await common.askQuestion("Generate compare CSV first? 1 = Yes, 0 = No: ").then(r=>{return JSON.parse(r)})

    if(getCSV){
        await generateCSV(channelID)
        let continueScript = await common.askQuestion('CSV Generated. Type "Continue" to continue, anything else to exit: ').then(r=>{return r.toLowerCase()})
        if (continueScript != 'continue'){return}
    }

    let removeAll = await common.askQuestion('Remove all overrides = 1, or select from CSV = 0: ').then(r=>{return JSON.parse(r)})

    let attributeDict = {}
    await common.loopThrough('Getting attribute lookup', `https://${enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', (att)=>{
        attributeDict[att.itemAttributeId] = att.name.toLowerCase()
    })

    await common.loopThrough('Updating Listings', `https://${enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{  
        let patchData = {channelSpecifics:[]}
        let listingData = await common.requester('get', `https://${enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data.data})
        if(listingData.listIndividually != undefined){patchData.listIndividually = listingData.listIndividually}

        if(removeAll){
            await common.requester('patch', `https://${enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
            return
        }

        for(const property of Object.keys(listingData)){
            if(['itemId','attributes','stokly_type','listIndividually','variableItemId','variantListingIds'].includes(property) || removeAtts.includes(property.toLowerCase())){continue}
            patchData[property] = listingData[property]
        }
        if(listingData.attributes){
            patchData.attributes = []
            for (const attribute of listingData.attributes){
                if(!removeAtts.includes(attributeDict[attribute.attributeId])){
                    patchData.attributes.push(attribute) 
                }
            }
        }
        await common.requester('patch', `https://${enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
    })

})()