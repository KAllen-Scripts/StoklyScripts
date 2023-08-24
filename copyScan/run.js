let common = require('../common')

global.enviroment = 'api.stok.ly';
global.waitForGets = 1;

(async ()=>{
    let scanSource = await common.askQuestion('Enter the ID of the scan we are copying from: ')
    let scanTo = await common.askQuestion('Enter the ID of the scan we are copying to: ')
    
    let listingRefDict = {stoklyCountArray:[]}
    let itemRefDict = {}

    let payload = {
        "listings": []
    }



    let channelType = await common.requester('get', `https://${global.enviroment}/v1/store-scans/${scanSource}`).then(r=>{
        return common.requester('get', `https://${global.enviroment}/v0/channels/${r.data.data.channelId}`).then(d=>{return d.data.data.type})
    })



    await common.loopThrough('Getting scan source', `https://${global.enviroment}/v1/store-scans/${scanSource}/listings`, `size=100&includeUnmappedData=1`, `${channelType == 2 ? '[parentId]=={@null;}' : ''}`, async (listing)=>{
        let listingRef = (listing.unmappedData.id || listing.unmappedData['listing-id'] || listing.unmappedData.ItemID)
        
        if(listing.linkedItemId !== undefined){
            listingRefDict[listingRef] = listing.linkedItemId
            listingRefDict.stoklyCountArray.push(listing.linkedItemId)
        }


        if(channelType == 2 && listing.type == 'variable'){
            await common.loopThrough('', `https://${global.enviroment}/v1/store-scans/${scanSource}/listings`, `size=100&includeUnmappedData=1`, `[parentId]=={${listing.scannedListingId}}`, (childListing)=>{
                if(childListing.linkedItemId === undefined){return}    

                let childRefId = listingRef    


                for(const attributeVal of childListing.unmappedData.VariationSpecifics){
                    childRefId += `/${attributeVal.Value}`
                }


                listingRefDict[childRefId] = childListing.linkedItemId
                listingRefDict.stoklyCountArray.push(childListing.linkedItemId)

            })
        }
    })





    await common.loopThrough('Getting items', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        if(!listingRefDict.stoklyCountArray.includes(item.itemId)){return}
        itemRefDict[item.itemId] = {
            "sku": item.sku,
            "name": item.name
        }
    })



    await common.loopThrough('Updating new scan', `https://${global.enviroment}/v1/store-scans/${scanTo}/listings`, `size=100&includeUnmappedData=1`, `${channelType == 2 ? '[parentId]=={@null;}' : ''}`, async (listing)=>{

        let listingRef = (listing.unmappedData.id || listing.unmappedData['listing-id'] || listing.unmappedData.ItemID)
        
        if(listingRefDict[listingRef] != undefined){

            payload.listings.push({
                "scannedListingId": listing.scannedListingId,
                "importOptions": {
                    "action": "link_item",
                    "linkedItem": {
                        "itemId": listingRefDict[listingRef],
                        "sku": itemRefDict[listingRefDict[listingRef]].sku,
                        "name": itemRefDict[listingRefDict[listingRef]].name
                    }
                },
                "selected": true,
                "_id": listing.scannedListingId
            })   

        }

        if(channelType == 2 && listing.type == 'variable'){
            await common.loopThrough('', `https://${global.enviroment}/v1/store-scans/${scanTo}/listings`, `size=100&includeUnmappedData=1`, `[parentId]=={${listing.scannedListingId}}`, async (childListing)=>{
                let childRefId = listingRef    



                for(const attributeVal of childListing.unmappedData.VariationSpecifics){
                    childRefId += `/${attributeVal.Value}`
                }

                if(listingRefDict[childRefId] != undefined){

                    payload.listings.push({
                        "scannedListingId": childListing.scannedListingId,
                        "importOptions": {
                            "action": "link_item",
                            "linkedItem": {
                                "itemId": listingRefDict[childRefId],
                                "sku": itemRefDict[listingRefDict[childRefId]].sku,
                                "name": itemRefDict[listingRefDict[childRefId]].name
                            }
                        },
                        "selected": true,
                        "_id": childListing.scannedListingId
                    })   
                    
                }

            })
        }

        if (payload.listings.length >= 200){
            await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanTo}`, payload)
            payload.listings = []
        }

    })

    await common.requester('patch', `https://${global.enviroment}/v1/store-scans/${scanTo}`, payload)

})()