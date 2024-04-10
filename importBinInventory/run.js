const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.stok.ly';

fs.writeFileSync('./missedInventory.csv', 'Row,Location,Bin,SKU,Inventory\r\n')
let missedInv = fs.createWriteStream('./missedInventory.csv', {flags: 'a'});

(async ()=>{
    let overRide = await common.askQuestion('Are we over-riding current stock values? 1 = Yes, 0 = No: ').then(r=>{return parseInt(r)})
    let itemDict = await getAllItems()
    let stockFeed = await getAllLocations().then(r=>{return getInventory(r, itemDict)})

    let binCount = 0
    for (const location in stockFeed.adjustments){
        for (const bin in stockFeed.adjustments[location].bins){
            if(Object.keys(stockFeed.adjustments[location].bins[bin].items).length > 0){
                await adjustStock(stockFeed.adjustments[location].bins[bin], stockFeed.adjustments[location].locationId, overRide)
                binCount += 1
                console.log(`Done ${binCount}/${stockFeed.count}`)
            }
        }
    }

    global.continueReplen = false
})()

async function adjustStock(bin, locationId, overRide){
    if(overRide){
        await common.loopThrough('', `https://${global.enviroment}/v1/inventory-records`, 'size=1000', `[locationId]=={${locationId}}%26%26[binId]=={${bin.binId}}%26%26([onHand]!={0}||[quarantined]!={0})`, item=>{
            if(bin.items[item.itemSku.toLowerCase()] != undefined){
                bin.items[item.itemSku.toLowerCase()].quantity -= item.onHand
                if(bin.items[item.itemSku.toLowerCase()].quantity == 0){
                    delete bin.items[item.itemSku.toLowerCase()]
                }
            }
        })
    }
    if (Object.keys(bin.items).length != 0){
        let stockUpdate = {
            "locationId": locationId,
            "binId": bin.binId,
            "reason": "Updated from CSV",
            "items": []
        }
        for (const item in bin.items){
            stockUpdate.items.push({
                "itemId": bin.items[item].itemId,
                "quantity": bin.items[item].quantity
            })
            if (stockUpdate.items.length >= 1000){
                await common.requester('post', `https://${global.enviroment}/v1/adjustments`, stockUpdate)
                stockUpdate.items = []
            }
        }
        if (stockUpdate.items.length > 0){
            await common.requester('post', `https://${global.enviroment}/v1/adjustments`, stockUpdate)
        }
    }
}

function getAllItems(){
    let itemDict = {}
    return common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `[status]=={0}`, async (item)=>{
        itemDict[item.sku.toLowerCase()] = item.itemId
    }).then(()=>{return itemDict})
}

function getAllLocations(){
    let locationDict = {}
    return common.loopThrough('Getting Locations and bins', `https://${global.enviroment}/v0/locations`, '', `[status]=={0}`, async (location)=>{
        locationDict[location.name.toLowerCase()] = {locationId: location.locationId, bins:{}}
        await common.loopThrough('', `https://${global.enviroment}/v0/locations/${location.locationId}/bins`, 'size=1000', '[status]=={active}', (bin)=>{
            locationDict[location.name.toLowerCase()].bins[bin.name.toLowerCase()] = {binId: bin.binId, items: {}}
        })
    }).then(()=>{return locationDict})
}

async function getInventory(locations, itemDict){
    let binCount = []
    let rowCount = 2
    return new Promise((res,rej)=>{
        const stream = fs.createReadStream('./inventory.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase().trim())}))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

            if ((locations?.[row?.['location']?.toLowerCase()]?.bins?.[row?.['bin']?.toLowerCase()]) != undefined){
                if (locations[row['location'].toLowerCase()].bins[row['bin'].toLowerCase()].items[row['sku'].toLowerCase()] == undefined){
                    locations[row['location'].toLowerCase()].bins[row['bin'].toLowerCase()].items[row['sku'].toLowerCase()] = {
                        itemId: itemDict[row['sku'].toLowerCase()],
                        quantity: 0
                    }
                }
                locations[row['location'].toLowerCase()].bins[row['bin'].toLowerCase()].items[row['sku'].toLowerCase()].quantity += parseInt(row['inventory'])
                if(!binCount.includes(row['bin'].toLowerCase())){
                    binCount.push(row['bin'].toLowerCase())
                }
            } else {
                missedInv.write(rowCount)
                missedInv.write(row['location'])
                missedInv.write(row['bin'])
                missedInv.write(row['sku'])
                missedInv.write(row['inventory'])
                missedInv.write(`\r\n`)
            }

            rowCount += 1

            stream.resume()
        })
        .on('end', () => {
            res({adjustments: locations, count: binCount.length})
        })
    })
}