const fs = require('fs');
const fastCSV = require('fast-csv');
const myWrite = fs.createWriteStream('./output.csv',{flags:'a'});

fs.writeFileSync('./output.csv', '"sku","composing sku","quantity in item"\r\n')

const stream = fs.createReadStream('./input.csv')
.pipe(fastCSV.parse({ headers: true }))
.on('error', error => console.error(error))
.on('data',  async row => {
    stream.pause()

    let childCount = 1

    do{

        myWrite.write(`"${row.PROD_SKU}",`)
        myWrite.write(`"${row[`ITEM${childCount}_SKULinks`]}",`)
        myWrite.write(`"${row[`ITEM${childCount}_Quantity`]}"`)
        myWrite.write(`\r\n`)

        childCount += 1

    } while ((row[`ITEM${childCount}_SKULinks`] || '') != '')

    stream.resume()
})