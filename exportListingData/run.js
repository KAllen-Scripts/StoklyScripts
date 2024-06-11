const common = require('../common.js');
const convertCSV = require("json-2-csv");
const fs = require('fs');

global.enviroment = 'api.stok.ly';

(async ()=>{

    //Start with empty array
    let csvArr = []

    var stopWhenSynced = 0

    let channelID = await common.askQuestion('Enter the channel ID: ')

    let getErrors = await common.askQuestion('Are we exporting errors? 1 = Yes, 0 = No: ').then(r=>{return parseInt(r)})

    if (getErrors){
        stopWhenSynced = await common.askQuestion('Are we getting all errors, or just as far back as the last sync? 1 = Last Sync, 0 = All Errors: ').then(r=>{return parseInt(r)})
    }

    if(getErrors){
        fs.writeFileSync('./errors.csv', 'SKU,Name,ID,Error,Date\r\n')
        var errWrite = fs.createWriteStream('./errors.csv', {flags:'a'})
    }

    let attributeDict = {}
    await common.loopThrough('Getting attribute lookup', `https://${global.enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', (att)=>{
        attributeDict[att.itemAttributeId] = att.name.toLowerCase()
    })

    await common.loopThrough('Getting channel and item Data', `https://${global.enviroment}/v0/channels/${channelID}/listings`, 'size=1000', '[status]!={2}', async (listing)=>{
        //Get listing data and item data, then push to array in an object
        let listingData = await common.requester('get', `https://${global.enviroment}/v0/listings/${listing.listingId}`).then(r=>{return r.data.data})
        
        listingData.attributes = {}

        if(listingData.data.attributes){
            for (const attribute of listingData.data.attributes){
                listingData.attributes[attributeDict[attribute.attributeId]] = attribute.value
            }
            delete listingData.data.attributes
        }
        
        csvArr.push(listingData)

        if(getErrors && (!listing.inventorySynchronised || !listing.dataSynchronised)){
            await common.loopThrough('', `https://${global.enviroment}/v0/listings/${listing.listingId}/messages`, 'size=1000&sortDirection=DESC&sortField=niceId', '', (err)=>{
                if(err.type == 2){
                    errWrite.write(`"${listing.sku}",`)
                    errWrite.write(`"${listing.name}",`)
                    errWrite.write(`"${listing.listingId}",`)
                    errWrite.write(`"${err.message}",`)
                    errWrite.write(`"${err.date}",\r\n`)
                }
                if (type == 0 && stopWhenSynced){
                    return false
                }
            })
        }

    })
    //Library to generate CSV string. WHich then gets written
    let csvStr = await convertCSV.json2csv(csvArr);
    fs.writeFileSync('./output.csv', csvStr);
    global.continueReplen = false
})()