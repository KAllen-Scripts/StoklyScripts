let common = require('../common')

global.enviroment = 'api.stok.ly';

(async ()=>{
    let scanSource = await common.askQuestion('Enter the ID of the scan we are copying from: ')
    let scanTo = await common.askQuestion('Enter the ID of the scan we are copying to: ')

    await common.authenticate()
    
    let listingRefDict = {}
    let itemRefDict = {}

    let payload = {
        "listings": []
    }

    let promiseArr = []

    promiseArr.push(common.loopThrough('Getting items', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        itemRefDict[item.itemId] = {
            "sku": item.sku,
            "name": item.name
        }
    }))

    promiseArr.push(common.loopThrough('Getting Scan Source', `https://api.stok.ly/v1/store-scans/${scanSource}/listings`, `size=1000&sortDirection=ASC&sortField=name`, ``, (listing)=>{
        if(listing.linkedItemId){listingRefDict[listing.remoteId] = listing.linkedItemId}
    }))

    await Promise.all(promiseArr)

    await common.loopThrough('Updating Scan', `https://api.stok.ly/v1/store-scans/${scanTo}/listings`, `size=1000&sortDirection=ASC&sortField=name`, ``, async (listing)=>{
        if(listingRefDict[listing.remoteId] && itemRefDict?.[listingRefDict?.[listing?.remoteId]]){
            payload.listings.push({
                "scannedListingId": listing.scannedListingId,
                "importOptions": {
                    "action": "link_item",
                    "linkedItem": {
                        "itemId": listingRefDict[listing.remoteId],
                        "sku": itemRefDict[listingRefDict[listing.remoteId]].sku,
                        "name": itemRefDict[listingRefDict[listing.remoteId]].name
                    }
                },
                "selected": true,
                "_id": listing.scannedListingId
            })  
            if (payload.listings.length >= 200){
                await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanTo}`, payload)
                payload.listings = []
            }
        }
    })

    await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanTo}`, payload)

})()
