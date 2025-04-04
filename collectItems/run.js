const fs = require("fs");
const csv = require('fast-csv');
const common = require('../common.js')

global.enviroment = 'api.stok.ly'

async function getInput(){
    return new Promise((res,rej)=>{
        let returnObj = {optIn:[], optOut:[]}
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase())}))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                returnObj.optIn.push(parseInt(row.clear))
                returnObj.optOut.push(parseInt(row["don't clear"]))

            stream.resume()
        })
        .on('end', () => {
            res(returnObj)
        })
    })
}

(async ()=>{

    const locationID = await common.askQuestion(`What is the ID of the location we are collecting from?: `)
    const channelName = await common.askQuestion(`What is the name of the channel we are collecting for? Leave blank to do all: `)
    const clearBefore = await common.askQuestion(`What order are we clearing up to?: `)
    const resetInv = await common.askQuestion(`Are we undoing any adjustments this will cause? 1 = Yes, 0 = No: `).then(r=>{return parseInt(r)})

    let options = await getInput()
    let optInArr = options.optIn
    let optOutArr = options.optOut

    console.log(optOutArr)

    let toCollect = []

    let activeItems = await getActiveItems()

    const defaultBin = await common.requester('get', `https://${global.enviroment}/v0/locations/${locationID}/bins?filter=[default]=={1}`).then(r=>{return r.data.data[0].binId})

    await common.loopThrough('Checking Orders', `https://${global.enviroment}/v2/saleorders`, `sortDirection=DESC&sortField=createdAt&size=1000`, `(([stage]=={order}%26%26[itemStatuses]::{unprocessed}))%26%26([stage]!={removed})`, async (item)=>{
        if(item.channelName?.toLowerCase() != channelName.toLowerCase() && channelName.trim() != ''){return}
        if(optOutArr.includes(item.niceId)){return}
        if(optInArr.includes(item.niceId) || parseInt(item.niceId) <= clearBefore){toCollect.push(item)}
    })

    for (const item in toCollect){
        await common.requester('get',`https://${global.enviroment}/v2/saleorders/${toCollect[item].saleOrderId}/items?size=1000&filter=([parentId]=={@null;})`).then(async r=>{

            let postObj = {
                items:[],
                locationId: locationID
            }

            let adjustObj = {
                items: [],
                locationId: locationID,
                binId: defaultBin,
                reason: 'Clearing Orders'
            }

            for(const i of r.data.data){
                if(i.status != 'unprocessed'){continue}

                if(activeItems.includes(i.referenceId)){
                    adjustObj.items.push({
                        itemId: i.referenceId,
                        quantity: i.quantity
                    })
                }

                postObj.items.push({
                    lineId: i.lineId,
                    quantity: i.quantity
                })
            }
            try{
                await common.requester('patch', `https://api.stok.ly/v2/saleorders/${toCollect[item].saleOrderId}`, {tags:["ignoreInReports"]})
                await common.requester('post',`https://${global.enviroment}/v2/saleorders/${toCollect[item].saleOrderId}/collect-items`, postObj, 0)
                if((resetInv) && (adjustObj.items.length > 0)){await common.requester('post', `https://${global.enviroment}/v1/adjustments`, adjustObj, 0)}
                await common.sleep(1200)
                console.log(`Done ${parseInt(item) + 1} of ${toCollect.length} | ${toCollect[item].niceId}`)
            } catch {
                console.log(`Failed ${parseInt(item) + 1} of ${toCollect.length} | ${toCollect[item].niceId}`)
            }


        })
        .catch(err=>{console.log(err)})
    }
    global.continueReplen = false
})()

function getActiveItems(){
    let activeItems = []
    return common.loopThrough('Getting Active Items', `https://${global.enviroment}/v0/items`, 'size=1000', '[status]!={1}', (item)=>{
        activeItems.push(item.itemId)
    }).then(()=>{return activeItems})
}
