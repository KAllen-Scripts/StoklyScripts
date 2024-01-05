const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.stok.ly';


async function getInput(){
    let rowComplete = true
    return new Promise((res,rej)=>{
        let returnArr = []
        const stream = fs.createReadStream('./include.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                rowComplete = false

                returnArr.push(String(row['Variances to skip'].trim()))

                rowComplete = true

            stream.resume()
        })
        .on('end', async () => {
            do{
                console.log(rowComplete)
                await common.sleep(200)
            } while (rowComplete == false)
            res(returnArr)
        })
    })
}

(async ()=>{

    let skipArr = await getInput()

    let moveToOnHand = await common.askQuestion('Resolve variance to on hand stock? 1 = Yes, 0 = No: ').then(r=>{return parseInt(r)})

    await common.loopThrough('Resolving Variances', `https://${global.enviroment}/v0/variances`, 'size=1000&sortDirection=DESC&sortField=niceId', '', async (variance)=>{
        if(skipArr.includes(String(variance.niceId)) || variance.status == 1){return}
        try{
            await common.requester('post', `https://${global.enviroment}/v0/variances/${variance.varianceId}/resolutions`, {
                dismissals:moveToOnHand ? 0 : variance.actual - variance.expected,
                blemishedCreations:0,
                reason:"",
                onHandAdjustment: ((variance.expected > variance.actual) || !moveToOnHand) ? 0 : variance.actual - variance.expected
            })
        } catch {}
    })

})()