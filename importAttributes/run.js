const fs = require('fs');
const common = require('../common.js');
const csv = require('fast-csv');

global.enviroment = 'api.dev.stok.ly';

let rowCount = 0

const stream = fs.createReadStream('./attributes.csv')
.pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase().trim())}))
.on('error', error => console.error(error))
.on('data', async row => {
    stream.pause()

    await common.requester('POST', `https://${global.enviroment}/v0/item-attributes`, {
        "name": row['name'],
        "type": parseInt(row['type']),
        "defaultValue": row['defaultvalue'].trim(),
        "allowedValues": row['allowedvalues'].split(','),
        "allowedValueLabels": row['allowedvaluelabels'].split(',')
    })

    rowCount +=1

    console.log(`Imported row ${rowCount}`)

    stream.resume()
})