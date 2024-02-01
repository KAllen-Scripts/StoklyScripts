const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.stok.ly';

async function getInput(skuDict){
    return new Promise((res,rej)=>{
        let returnObj = {}
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase())}))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                returnObj[row.remoteid] = skuDict[row.sku.toLowerCase()]

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

(async()=>{

    let scanId = await common.askQuestion('Enter the Scan ID: ')

    let skuDict = {}

    await common.loopThrough('Getting Item Refs', `https://${global.enviroment}/v0/items`, 'size=1000', `[status]!={1}`, (item)=>{
        skuDict[item.sku.toLowerCase()] = {}
        skuDict[item.sku.toLowerCase()].itemId = item.itemId
        skuDict[item.sku.toLowerCase()].sku = item.sku
        skuDict[item.sku.toLowerCase()].name = item.name
    })

    let linkDict = await getInput(skuDict)

    let payload = {
        "listings": []
    }

    await common.loopThrough('Updating Scan', `https://${global.enviroment}/v1/store-scans/${scanId}/listings`, 'size=1000', `[status]!={1}`, async (listing)=>{
        if(linkDict[listing.remoteId] == undefined){return}
        payload.listings.push({
            "scannedListingId": listing.scannedListingId,
            "importOptions": {
                "action": "link_item",
                "linkedItem": {
                    "itemId": linkDict[listing.remoteId].itemId,
                    "sku": linkDict[listing.remoteId].sku,
                    "name": linkDict[listing.remoteId].name
                }
            },
            "_id": listing.scannedListingId
        })  
        if (payload.listings.length >= 200){
            await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanId}`, payload)
            payload.listings = []
        }
    })
    await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanId}`, payload)

    global.continueReplen = false
})()