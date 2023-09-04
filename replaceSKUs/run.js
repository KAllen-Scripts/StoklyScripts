const fs = require("fs");
const fastCSV = require("fast-csv");
const common = require('../common');

global.enviroment = 'api.stok.ly';

(async()=>{

    let notValid = []

    let done = 0

    let skuDict = {}
    await common.loopThrough('Getting SKU References', `https://${global.enviroment}/v0/items`, `size=1000`, `[status]!={1}`, (item)=>{
        skuDict[item.sku.toLowerCase()] = {
            type:item.format,
            ID:item.itemId
        }
    })

    const stream = fs.createReadStream('./SKUs.csv')
    .pipe(fastCSV.parse({ headers: true }))
    .on('error', error => console.error(error))
    .on('data',  async row => {
        stream.pause()
    
        if (skuDict[row.currentSKU.toLowerCase()] == undefined){
            console.log("No item with SKU " + row.currentSKU + " found")
            notValid.push(row.currentSKU)
        } else {
            await common.requester('patch', `https://${global.enviroment}/v0/` + (skuDict[row.currentSKU.toLowerCase()].format == 2 ? 'variable-items/' : 'items/') + skuDict[row.currentSKU.toLowerCase()].ID, {
                sku:row.newSKU,
                aquisition:skuDict[row.currentSKU.toLowerCase()].format
            })
            .catch(err => {
                notValid.push(row.currentSKU)
                console.log(err)
            })
            done += 1
            console.log("Replaced " + row.currentSKU + " with " + row.newSKU + " (" + done + " items)")
        }
    
        stream.resume()
    })
    .on('end', r => {for(const i of notValid){
        console.log(i + " did not update")
    }})
})()