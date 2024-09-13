const fs = require("fs");
const csv = require('fast-csv');
const common = require('../common.js')

global.enviroment = 'api.stok.ly'

async function getInput(){
    return new Promise((res,rej)=>{
        let returnArr = []
        const stream = fs.createReadStream('./input.csv')
        .on('error', error => rej(error))
        .pipe(csv.parse({ headers: true }))
        .on('data',  row => {
            stream.pause()

                returnArr.push(row.SKU.toLowerCase())

            stream.resume()
        })
        .on('end', () => {
            res(returnArr)
        })
    })
}

(async ()=>{
    let skuList = await getInput()
    let doAll = await common.askQuestion('Do All? 1 = Yes, 0 = No').then(r=>{return parseInt(r)})

    await common.loopThrough('Clearing Images', `https://${global.enviroment}/v0/items`, 'size=1000', '[status]!={1}', async (item)=>{
        if (skuList.includes(item.sku.toLowerCase()) || doAll){
            await common.requester('patch', `https://${global.enviroment}/v0/${item.format == 2 ? 'variable-items' : 'items'}/${item.itemId}`, {images:[]})
        }
    })
    global.continueReplen = false
})()
