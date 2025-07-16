const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

//Global varsiable used for debugging
global.enviroment = 'api.stok.ly';

async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {items:{},locations:[]}
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase().trim())}))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                if(returnObj.items[row['sku'].toLowerCase().trim()] == undefined){returnObj.items[row['sku'].toLowerCase().trim()] = []}
                returnObj.items[row['sku'].toLowerCase().trim()].push(row['location'].toLowerCase().trim())
                if (!returnObj.locations.includes(row['location'].toLowerCase().trim())){returnObj.locations.push(row['location'].toLowerCase().trim())}

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

async function getItemDict(){
    let itemDict = {}
    await common.loopThrough('Getting SKU References', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        itemDict[item.sku.toLowerCase().trim()] = item.itemId
    })
    return itemDict
}

(async () => {
    let items = await getInput()
    let itemDict = await getItemDict()

    let itemCount = Object.keys(items.items).length
    let progressCounter = 0
    for (const item of Object.keys(items.items)){
        try{
            let thresholds = []
            await common.loopThrough('', `https://${global.enviroment}/v0/items/${itemDict[item]}/inventory-thresholds`, `size=1000`, ``, (threshold)=>{
                if (!items.items[item].includes(threshold.locationName.toLowerCase().trim())){
                    thresholds.push(threshold)
                }
            })
            await common.requester('patch', `https://api.stok.ly/v0/items/${itemDict[item]}`, {inventoryThresholds: thresholds})
        } catch {}
        progressCounter += 1
        console.log(`Updating ${progressCounter}/${itemCount}`)
    }
})()