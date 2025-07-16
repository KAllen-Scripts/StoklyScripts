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

                if(returnObj[row['sku'].toLowerCase().trim()] == undefined){returnObj[row['sku'].toLowerCase().trim()] = []}
                returnObj[row['sku'].toLowerCase().trim()].push(row)

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

async function getUOMs(){
    let UOMs = {}
    await common.loopThrough('Getting SKU References', `https://${global.enviroment}/v0/units-of-measure`, `size=1000&sortDirection=ASC&sortField=supplierSku`, ``, (UOM)=>{
        if(UOMs[UOM.itemId.toLowerCase().trim()] == undefined){UOMs[UOM.itemId.toLowerCase().trim()] = []}
        UOMs[UOM.itemId.toLowerCase().trim()].push(UOM)
    })
    return UOMs
}

async function getItemDict(){
    let itemDict = {}
    await common.loopThrough('Getting UOMs', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        itemDict[item.sku.toLowerCase().trim()] = item.itemId
    })
    return itemDict
}

(async () => {
    let items = await getInput()
    let itemDict = await getItemDict()
    let UOMs = await getUOMs()

    let updatedItems = new Set()

    let itemCount = Object.keys(items).length
    let progressCounter = 0
    for (const sku of Object.keys(items || {})) {
        let itemId = itemDict[sku]
        for (const newData of items?.[sku] || []) {
            // Find matching UOMs for this newData
            for (const existingItem of Object.keys(UOMs)) {
                if (updatedItems.has(existingItem)) continue
                
                let newUOM = []
                let uomChanged = false
                
                for (const UOM of UOMs[existingItem]) {
                    let skuToUse = UOM.supplierSku
                    
                    if (UOM.itemId == itemId &&
                        newData['old supplier sku'] == UOM.supplierSku && 
                        newData['supplier'].toLowerCase().trim() == UOM.supplierName.toLowerCase().trim() && 
                        newData['quanity in unit'] == UOM.quantityInUnit) {
                        uomChanged = true
                        skuToUse = newData['new supplier sku']
                    }
                    
                    newUOM.push({
                        "unitOfMeasureId": UOM.unitOfMeasureId,
                        "supplierId": UOM.supplierId,
                        "supplierSku": skuToUse,
                        "cost": {
                            "amount": UOM.cost,
                            "currency": UOM.currency
                        },
                        "currency": UOM.currency,
                        "quantityInUnit": UOM.quantityInUnit
                    })
                }
                
                if (uomChanged) {
                    await common.requester('patch', `https://${global.enviroment}/v0/items/${existingItem}`, {unitsOfMeasure: newUOM})
                    updatedItems.add(existingItem)
                }
            }
        }
        progressCounter += 1
        console.log(`Updating ${progressCounter}/${itemCount}`)
    }
})()