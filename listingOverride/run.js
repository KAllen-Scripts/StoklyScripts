//Libraries
const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

//Global varsiable used for debugging
global.enviroment = 'api.dev.stok.ly';
global.waitForGets = 1;

//Get the values formt he CSV and return as promise which resolves to object
//Each header is an object property
async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {attsToRemove:[],itemsToSkip:[]}
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

            if(row.Attribute != ''){returnObj.attsToRemove.push((row.Attribute.toLowerCase()).trim())}
            if(row.Items != ''){returnObj.itemsToSkip.push((row.Items.toLowerCase()).trim())}

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

//Generate the CSV which allows the user to compare the listing values to the item values
async function generateCSV(channelID){
    //Start with empty array
    let csvArr = []
    await common.loopThrough('Getting channel and item Data', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        //Get listing data and item data, then push to array in an object
        let listingData = await common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data})
        let itemData = await common.requester('get', `https://${global.enviroment}/v0/items/${listing.itemId}`).then(r=>{return r.data.data})
        csvArr.push({listing:listingData,item:itemData})

    })
    //Library to generate CSV string. WHich then gets written
    let csvStr = await convertCSV.json2csv(csvArr);
    fs.writeFileSync('./comparison.csv', csvStr);
}

(async ()=>{

    //Get user defined parameters
    let inputVals = await getInput()

    let channelID = await common.askQuestion('Enter the channel ID: ')

    let removeAll = await common.askQuestion('Remove all overrides = 1, or select from CSV = 0: ').then(r=>{return JSON.parse(r)})

    let getCSV = await common.askQuestion("Generate compare CSV first? 1 = Yes, 0 = No: ").then(r=>{return JSON.parse(r)})

    //Only generate the CSV if the user wants to
    //Await user input before continuing, so they can review the CSV first
    if(getCSV){
        await generateCSV(channelID)
        await common.askQuestion('CSV Generated. Press ENTER to continue: ').then(r=>{return r.toLowerCase()})
    }

    //If the user has defined item to skip, get all items and create sku to itemID lookup
    if (inputVals.itemsToSkip.length > 0){
        var itemDict = {}
        await common.loopThrough('Getting Item Lookup', `https://${global.enviroment}/v0/items`, 'size=1000', '[status]!={1}', (item)=>{
            itemDict[item.itemId] = item.sku.toLowerCase()
        })
    }

    //Create attribute ID to attribute name lookup
    let attributeDict = {}
    await common.loopThrough('Getting attribute lookup', `https://${global.enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', (att)=>{
        attributeDict[att.itemAttributeId] = att.name.toLowerCase()
    })

    //Start looping through the listings
    await common.loopThrough('Updating Listings', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        //Skip the listing if it links back to an item defined by the user
        if(itemDict && inputVals.itemsToSkip.includes(itemDict[listing.itemId])){return}
        //Start with empty patch data
        //Not sure what channel specifics do, but they are literally always empty
        let patchData = {channelSpecifics:[]}
        //Get listing Data, assign the listIndividually flag right away to avoid fucking with it when we update
        let listingData = await common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data.data})
        if(listingData.listIndividually != undefined){patchData.listIndividually = listingData.listIndividually}

        //Don't bother with the rest of this function if we are removing all overrides. Just post the object
        if(removeAll){
            await common.requester('patch', `https://${global.enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
            return
        }

        //Loop through the listing data. We skip anything that is not applicable, as I do not know what sending an update for these will do
        //Attributes need to be handled seperately
        //Skip anything that the user has defined we should remove the override for
        for(const property of Object.keys(listingData)){
            if(['itemId','attributes','stokly_type','listIndividually','variableItemId','variantListingIds'].includes(property) || inputVals.attsToRemove.includes(property.toLowerCase())){continue}
            patchData[property] = listingData[property]
        }
        
        //Do the same as above, but for the attributes
        //Don't do this but if there are no attributes
        if(listingData.attributes){
            patchData.attributes = []
            for (const attribute of listingData.attributes){
                if(!inputVals.attsToRemove.includes(attributeDict[attribute.attributeId])){
                    patchData.attributes.push(attribute) 
                }
            }
        }
        //Finally update the listing
        await common.requester('patch', `https://${global.enviroment}/v0/listings/${listing.listingId}`, {data:patchData})
    })

})()