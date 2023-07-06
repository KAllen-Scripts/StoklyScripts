const common = require('../common.js');
const fs = require('fs');

let myWrite = fs.createWriteStream('./wooCom/invalid.csv',{flags:'a'})

const run = async (channelID, scanID)=>{
    let returnObj = {
        invalidItems:[]
    }

    let validAttributes = await common.getFunc(`https://${global.enviroment}/v0/channels/${channelID}/remote-mappables/marketplace/attributes`).then(r=>{
        let returnArr = []
        for (const attribute of r.data.data){
            returnArr.push(attribute.id)
        }
        return returnArr
    })

    await common.loopThrough('Getting item',`https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=500&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}',  (scannedListing)=>{   
        let itemObj = {
            variable:[],
            simple:[],
            sku: scannedListing.sku
        }
        for (const att of scannedListing.unmappedData.attributes){
            if (!(validAttributes.includes(String(att.id)))){
                if(att.variation){
                    itemObj.variable.push(att.name)
                } else {
                    itemObj.simple.push(att.name)
                }
            }
        }
        if(itemObj.simple.length > 0 || itemObj.variable.length > 0){returnObj.invalidItems.push(itemObj)}
    })

    fs.writeFileSync('./wooCom/invalid.csv', '"SKU","Simple Attributes","Variations Attributes"\r\n')
    for(const item of returnObj.invalidItems){
        myWrite.write(`"${item.sku}","${item.simple.join(',')}","${item.variable.join(',')}"\r\n`)
    }
};

module.exports = {run};