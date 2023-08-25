// gets my general purpose library
const common = require('../common.js');
const fs = require('fs');
const csv = require('fast-csv');

global.enviroment = 'api.stok.ly'; // allows me to easily go into testing mode for dev

// Gets all the base data from a listing, filtering out what we don't need
function getListingData(listing) {
    return common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r => {
        for (const o of Object.keys(r.data.data.data)) {
            if (["itemId", "stokly_type", "channelSpecifics", "listIndividually", "variableAttributes", "variantListingIds", "variableItemId"].includes(o)) { // unwanted properties in array for easy scaling
                delete r.data.data.data[o]
            }
        }
        return r.data.data.data
    })
}

function getItemAttributes(listing){
    return common.requester('get', `https://${global.enviroment}/v0/items/${listing.itemId}/attributes`).then(r => {
        // reduce function builds an object of keys (itemAttributeId) to value (attribute value) pairs
        return r.data.data.reduce((returnObj, currentObj) => {
            returnObj[currentObj.itemAttributeId] = currentObj.value
            return returnObj
        }, {});
    })
}

// streams through a CSV to populate a list of attributes that should be over-ridden#
async function getParameters() {
    let returnObj = {
        overRide: [],
        ignore: [],
        onlyDo: []
    }


    return new Promise((res,rej)=>{
        const stream = fs.createReadStream('./Attributes.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

            if (String(row.Override).trim() != '') {
                returnObj.overRide.push(String(row.Override).trim().toLowerCase())
            }
            if (String(row.Ignore).trim() != '') {
                returnObj.ignore.push(String(row.Ignore).trim().toLowerCase())
            }
            if (String(row['Only Do']).trim() != '') {
                returnObj.onlyDo.push(String(row['Only Do']).trim().toLowerCase())
            }

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

(async ()=>{
    let channelArr = []

    do{
        var channel = await common.askQuestion(`Enter a channel ID or type 'Continue' to proceed: `)
        if (channel != 'Continue'){channelArr.push(channel)}
    } while (channel.toLowerCase() != 'continue')

    for (const channel of channelArr){await run(channel)}

})()

async function run (channelID) {

    // gets attributes to be over-ridden and to be ignored
    let csvDict = await getParameters()
    let attDict = {}
    let descFailedArr = []
    let miscFailedArr = []

    // build dictionary of attribute ID's to names so we can translate the attribute names from the CSV
    await common.loopThrough('', `https://${global.enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', (attribute) => {
        attDict[attribute.itemAttributeId] = attribute.name.toLowerCase()
    })

    // Loop through channel listings
    await common.loopThrough('Updating Listing', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing) => {

        if (csvDict.onlyDo.length && !(csvDict.onlyDo.includes(listing.listingId))){return}

        let updateBody = {} // start with empty request body

        // get attributes for linked item. put it into object library for easy handling
        let itemAttributes = await getItemAttributes(listing)

        // get base listing data such as Name, SKU, etc
        let listingData = await getListingData(listing)


        // hold listing attributes so we can delete it from listingData
        // Maybe not too effecient but screw it, this is easy and makes the whole thing readable
        // This is also dumb, but if there are no attributes then we use an empty array so it doesn't break our loop later on
        let listingAttributes = listingData.attributes || []
        delete listingData.attributes


        // add base values from listing to item data. Replace existing value if defined in CSV
        let itemData = await common.requester('get', `https://${global.enviroment}/v0/items/${listing.itemId}`).then(r => {
            return r.data.data
        })
        for (const key of Object.keys(listingData)) {
            // If the item has no value for this attribute, add it. Otherwise replcase the value if specified
            if ((!itemData[key]?.trim?.() || csvDict.overRide.includes(key.toLowerCase())) && !(csvDict.ignore.includes(key.toLowerCase()))) {
                // images can suck my entire nut, this stupid shit is the only half decent way I could find to handle them
                if (key == 'images' && itemData.imageCount > 0 && !csvDict.overRide.includes('images')) {
                    continue
                }
                updateBody[key] = listingData[key]
            }
        }


        // add listing attributes. Override existing value if defined in CSV
        for (const att of listingAttributes) {
            if ((itemAttributes[att.attributeId] == undefined || csvDict.overRide.includes(attDict[att.attributeId])) && !(csvDict.ignore.includes(attDict[att.attributeId]))) {
                itemAttributes[att.attributeId] = att.value
            }
        }


        // put request body into the right format
        updateBody.attributes = []
        for (const key of Object.keys(itemAttributes)) {
            if(attDict[key]){
                updateBody.attributes.push({
                    itemAttributeId: key,
                    value: itemAttributes[key]
                })
            }
        }

        if(updateBody?.description?.length > 6500){
            delete updateBody.description
            descFailedArr.push(listing.listingId)
        }

        try{
            await common.requester('patch', `https://${global.enviroment}/v0/${itemData.format == 2 ? 'variable-items' : 'items'}/${listing.itemId}`, updateBody, 0)
        } catch (err){
            miscFailedArr.push({
                Reason:err.response.data.message,
                ListingID:listing.listingId
            })
        }

    })

    if (descFailedArr.length){
        console.log('The descriptions could not be updated for the following listings\n')
        console.log(descFailedArr)
    }

    if (miscFailedArr.length){
        console.log(`These listing have failed for various reasons`)
        for(const log of miscFailedArr){
            console.log(log)
        }
    }

}