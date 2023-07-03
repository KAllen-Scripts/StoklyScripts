const fs = require("fs");
const csv = require('fast-csv');
const common = require('../common.js')

global.enviroment = 'api.stok.ly'

async function getInput(){
    return new Promise((res,rej)=>{
        let returnArr = []
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                returnArr.push(parseInt(row.niceID))

            stream.resume()
        })
        .on('end', () => {
            res(returnArr)
        })
    })
}

(async ()=>{

    const locationID = await common.askQuestion(`What is the ID of the location we are collecting from?: `)
    const clearBefore = await common.askQuestion(`What order are we clearing up to?: `)

    let optInArr = await getInput()

    let toCollect = []

    await common.loopThrough('Checking Orders', `https://${global.enviroment}/v2/saleorders`, `sortDirection=ASC&sortField=createdAt&size=1000`, `(([stage]=={order}%26%26[itemStatuses]::{unprocessed}))%26%26([stage]!={removed})`, async (item)=>{
        if(optInArr.includes(item.niceId) || parseInt(item.niceId) <= clearBefore){toCollect.push(item)}
    })

    for (const item in toCollect){
        await common.requester('get',`https://${global.enviroment}/v2/saleorders/${toCollect[item].saleOrderId}/items`).then(async r=>{

            let postObj = {
                items:[],
                locationId: locationID
            }

            for(const i of r.data.data){
                postObj.items.push({
                    lineId: i.lineId,
                    quantity: i.quantity
                })
            }
            await common.requester('post',`https://${global.enviroment}/v2/saleorders/${toCollect[item].saleOrderId}/collect-items`, postObj)
            await common.sleep(3000)
            console.log(`Done ${parseInt(item) + 1} of ${toCollect.length}`)
        })
        .catch(err=>{console.log(err)})
    }

})()