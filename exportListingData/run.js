const common = require('../common.js');
const convertCSV = require("json-2-csv");
const fs = require('fs');

global.enviroment = 'api.stok.ly';

(async ()=>{

    //Start with empty array
    let csvArr = []

    let channelID = await common.askQuestion('Enter the channel ID: ')

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

    })
    //Library to generate CSV string. WHich then gets written
    let csvStr = await convertCSV.json2csv(csvArr);
    fs.writeFileSync('./output.csv', csvStr);
})()