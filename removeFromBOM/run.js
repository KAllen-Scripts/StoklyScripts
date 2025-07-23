const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

//Global varsiable used for debugging
global.enviroment = 'api.stok.ly';

async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {}
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase().trim())}))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                if (returnObj[row['bom sku'].toLowerCase().trim()] == undefined){returnObj[row['bom sku'].toLowerCase().trim()] = []}
                returnObj[row['bom sku'].toLowerCase().trim()].push(row['composing sku'].toLowerCase().trim())

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

async function getItemDict(){
    let itemDict = {}
    await common.loopThrough('Getting items', `https://${global.enviroment}/v0/items`, `size=1000&sortDirection=ASC&sortField=name`, `[status]!={1}%26%26[format]=*{3}`, (item)=>{
        itemDict[item.sku.toLowerCase().trim()] = item.itemId
    })
    return itemDict
}

async function getAllBOMs(){
    let BOMList = {}
    await common.loopThrough('Getting BOMs', `https://${global.enviroment}/v0/bill-of-materials-items`, `size=1000&sortDirection=ASC&sortField=billOfMaterialItemId`, ``, (BOM)=>{
        if (BOMList[BOM.itemId] == undefined){BOMList[BOM.itemId] = []}
        BOMList[BOM.itemId].push(BOM)
    })
    return BOMList
}

(async () => {
    let BOMChanges = await getInput()
    let itemDict = await getItemDict()
    let BOMs = await getAllBOMs()
    
    let itemCount = Object.keys(BOMChanges).length
    let progressCounter = 0
    for (const itemToUpdate of Object.keys(BOMChanges)){
        if (!BOMs[itemDict[itemToUpdate]]){continue}
        let updatedPayload = []
        for (const item of BOMs[itemDict[itemToUpdate]]){
            if(!BOMChanges[itemToUpdate].includes(item.itemSku.toLowerCase().trim())){
                updatedPayload.push(item)
            }
        }
        await common.requester('patch', `https://${global.enviroment}/v0/items/${itemDict[itemToUpdate]}`, {billOfMaterials: updatedPayload})
        progressCounter += 1
        console.log(`Updating ${progressCounter}/${itemCount}`)
    }

})()