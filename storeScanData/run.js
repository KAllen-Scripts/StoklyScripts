const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js')

const fileName = process.argv[2] || "output";

global.enviroment = 'api.stok.ly';
global.waitForGets = 1;


async function getSKUDict(){
    let skuDict = {}

    await common.loopThrough('Getting SKUs', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        skuDict[item.itemId] = {
            sku:item.sku,
            name:item.name
        }
    })

    return skuDict

}



(async ()=>{

    let objArr = [];

    let scanID = await common.askQuestion(`Enter the scan ID: `)
    
    let keepTogether = await common.askQuestion(`Are we keeping variants with the parents? This will take longer. 1 for yes, 0 for no: `)

    var skuDict = await getSKUDict()

    await common.loopThrough('Getting Scanned Listings', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, `size=200&sortDirection=ASC&sortField=name&includeUnmappedData=1`, `${keepTogether == 1 ? '[parentId]=={@null;}' : ''}`, async (item)=>{
        pushData(item)

        if(item.type == "variable" && keepTogether == 1){
            let variants = await common.requester('get', `https://${global.enviroment}/v1/store-scans/${scanID}/listings?size=1000&page=0&sortDirection=ASC&sortField=name&includeUnmappedData=1&filter=[parentId]=={${item.scannedListingId}}`).then(r=>{return r.data.data})

            for (const child of variants){
                pushData(child)
            }
        }
    })

    let i = await convertCSV.json2csv(objArr)
    fs.writeFileSync(`./${fileName}.csv`, i)




    async function pushData(item){

        if(item.linkedItemId != undefined){
            try{
                item.linkedItemSKU = skuDict[item.linkedItemId].sku
                item.linkedItemName = skuDict[item.linkedItemId].name
            } catch {
                linkedItem = await common.requester('get', `https://${global.enviroment}/v0/items/${item.linkedItemId}`).then(r=>{return r.data.data})
                item.linkedItemSKU = linkedItem.sku
                item.linkedItemName = linkedItem.name
            }
        }
    
        objArr.push(item)
    
    }

})()