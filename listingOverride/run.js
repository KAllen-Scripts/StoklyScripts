const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.dev.stok.ly';
global.waitForGets = 1;

async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {attsToRemove:[],itemsToSkip:[]}
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

            if(row.Attribute != ''){returnObj.attsToRemove.push(row.Attribute.toLowerCase())}
            if(row.Items != ''){returnObj.itemsToSkip.push(row.Items.toLowerCase())}

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

async function generateCSV(channelID){
    let csvArr = []
    await common.loopThrough('Getting channel and item Data', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        let listingData = await common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data})
        let itemData = await common.requester('get', `https://${global.enviroment}/v0/items/${listing.itemId}`).then(r=>{return r.data.data})
        csvArr.push({listing:listingData,item:itemData})

    })
    let csvStr = await convertCSV.json2csv(csvArr);
    fs.writeFileSync('./comparison.csv', csvStr);
}

(async ()=>{

    let inputVals = await getInput()

    let channelID = await common.askQuestion('Enter the channel ID: ')

    let removeAll = await common.askQuestion('Remove all overrides = 1, or select from CSV = 0: ').then(r=>{return JSON.parse(r)})

    let getCSV = await common.askQuestion("Generate compare CSV first? 1 = Yes, 0 = No: ").then(r=>{return JSON.parse(r)})

    if(getCSV){
        await generateCSV(channelID)
        await common.askQuestion('CSV Generated. Press ENTER to continue: ').then(r=>{return r.toLowerCase()})
    }

    if (inputVals.itemsToSkip.length > 0){
        var itemDict = {}
        await common.loopThrough('Getting Item Lookup', `https://${global.enviroment}/v0/items`, 'size=1000', '[status]!={1}', (item)=>{
            itemDict[item.itemId] = item.sku.toLowerCase()
        })
    }

    let attributeDict = {}
    await common.loopThrough('Getting attribute lookup', `https://${global.enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', (att)=>{
        attributeDict[att.itemAttributeId] = att.name.toLowerCase()
    })

    await common.loopThrough('Updating Listings', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        if(itemDict && inputVals.itemsToSkip.includes(itemDict[listing.itemId])){return}
        let patchData = {channelSpecifics:[]}
        let listingData = await common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data.data})
        if(listingData.listIndividually != undefined){patchData.listIndividually = listingData.listIndividually}

        if(removeAll){
            await common.requester('patch', `https://${global.enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
            return
        }

        for(const property of Object.keys(listingData)){
            if(['itemId','attributes','stokly_type','listIndividually','variableItemId','variantListingIds'].includes(property) || inputVals.attsToRemove.includes(property.toLowerCase())){continue}
            patchData[property] = listingData[property]
        }
        if(listingData.attributes){
            patchData.attributes = []
            for (const attribute of listingData.attributes){
                if(!inputVals.attsToRemove.includes(attributeDict[attribute.attributeId])){
                    patchData.attributes.push(attribute) 
                }
            }
        }
        await common.requester('patch', `https://${global.enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
    })

})()