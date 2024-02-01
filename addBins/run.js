const fs = require("fs");
const csv = require('fast-csv');
const common = require('../common.js')

global.enviroment = 'api.stok.ly'

async function getInput(){
    let rowDone = false
    return new Promise((res,rej)=>{
        let payload = {bins:[]}
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            stream.pause()

                rowDone = false

                payload.bins.push({
                    "name": row.bin,
                    "type": row.type,
                    "barcode": row.barcode
                })

                rowDone = true

            stream.resume()
        })
        .on('end', async () => {
            do{
                await common.sleep(200)
            } while (!rowDone)
            res(payload)
        })
    })
}

(async ()=>{
    let locationID = await common.askQuestion('Enter the location ID: ')

    let payload = await getInput()

    await common.requester('patch', `https://${global.enviroment}/v0/locations/${locationID}`, payload)
    global.continueReplen = false
})()   