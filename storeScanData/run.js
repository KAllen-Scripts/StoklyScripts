const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js')

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
    await common.authenticate()

    let doAll = await common.askQuestion('Do most recent scan for all channels? 1 for yes, 0 for no: ')

    let objArr = []

    if(parseInt(doAll)){
        let keepTogether = await common.askQuestion(`Are we keeping variants with the parents? This will take longer. 1 for yes, 0 for no: `).then(r=>{return parseInt(r)})
        await common.loopThrough('Getting Channels', `https://${global.enviroment}/v0/channels`, 'size=1000', '[status]!={2}', async(channel)=>{
            
            let scanId = await common.requester('get',`https://api.stok.ly/v1/store-scans?sortDirection=DESC&sortField=createdAt&filter=[channelId]=={${channel.channelId}}`).then(async r=>{
                return r?.data?.data[0]?.storeScanId || undefined
            })

            if(!scanId){return}
            objArr.push({
                scanId: scanId,
                channelName: channel.name,
                keepTogether: keepTogether
            })

        })
    } else {

        do{
            console.log(common.makeBold(`\n${'|'.repeat(40)} Enter details for scan ${objArr.length + 1} or press ENTER to continue ${'|'.repeat(40)}`))
            var scanId = await common.askQuestion(`Enter the scan ID: `)
            if (scanId != ''){
                var channelName = await common.requester('get', `https://api.stok.ly/v1/store-scans/${scanId}`).then(r=>{
                    return common.requester('get', `https://api.stok.ly/v0/channels/${r.data.data.channelId}`).then(r=>{return r.data.data.name})
                })
                var keepTogether = await common.askQuestion(`Are we keeping variants with the parents? This will take longer. 1 for yes, 0 for no: `)
                objArr.push({
                    scanId: scanId,
                    channelName: channelName,
                    keepTogether: keepTogether
                })
            }
        } while (scanId != '')

    }

    let skuDict = await getSKUDict()

    for (const scan of objArr){
        await run(scan.scanId, scan.channelName, scan.keepTogether, skuDict)
    }

})()

async function run (scanID, fileName, keepTogether, skuDict){

    let objArr = []

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

}