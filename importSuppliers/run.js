const common = require('../common.js');
const fs = require('fs');
const csv = require('fast-csv');
const csvWrite = require('json-2-csv');

global.enviroment = 'api.stok.ly';

function caseInsensitiveNameCheck(suppliers, supplierName){
    for(const supplier in suppliers){
        if (supplier?.toLowerCase() == supplierName.toLowerCase()){
            return supplier
        }
    }
    return supplierName
}

async function getInput(suppliers){
    let failedImports = []
    let rowDone = false
    let rowCounter = 0
    return new Promise((res,rej)=>{
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({headers: headers => headers.map(h => h.toLowerCase().trim())}))
        .on('error', error => console.error(error))
        .on('data',  async row => {
            stream.pause()

                rowDone = false

                let supplier = {}
                if (suppliers[row['supplier name'].toLowerCase().trim()] == undefined){
                    supplier.new = true
                    if(row['supplier name'] != ''){supplier.name = row['supplier name']}
                }

                supplier.type = row['type [manufacturer/wholesaler]'].toLowerCase() == 'manufacturer' ? 0 : 1
                if(row['account reference'] != ''){supplier.accountReference = row['account reference']}
                if(row['tax rate'] != ''){supplier.taxRate = parseFloat(row['tax rate'])}
                if(row['lead time'] != ''){supplier.leadTime = parseInt(row['lead time'])}
                if(row['minimum spend'] != '' && row['minimum spend'] > 0){supplier.minimumSpend = parseFloat(row['minimum spend'])}
                if(row['currency'] != ''){supplier.currency = row['currency']}
                if(row['dropShips'] != ''){supplier.dropShips = row['drop shipping enabled [yes/no]'].toLowerCase() == 'yes' ? true : false}

                if(row['discount'] != '' && row['discount type'] != ''){
                    supplier.discount = {
                        "amount": row['discount'],
                        "type": row['discount type']
                    }
                }

                if(row['margin'] != '' && row['margin type'] != ''){
                    supplier.discount = {
                        "amount": row['margin'],
                        "type": row['margin type']
                    }
                }

                if(row['account reference'] != ''){
                    supplier.vatNumber = {
                        "value": row['account reference'],
                        "country": "GB"
                    }
                }

                if(!(row['address line 1'] == '' || row['city'] == '' || row['country'] == '' || row['postcode'] == '')){
                    supplier.address = {
                        "line1": row['address line 1'],
                        "city": row['city'],
                        "country": row['country'],
                        "postcode": row['postcode']
                    }
                    if(row['address line 2'] != ''){supplier.address.line2 = row['address line 2']}
                    if(row['region'] != ''){supplier.address.region = row['region']}
                }

                do{
                    var contactNumber = 1

                    if(row[`contact ${contactNumber} name`] == undefined){break}
                    if(row[`contact ${contactNumber} name`] == '' || (row[`contact ${contactNumber} number`] == '' && row[`contact ${contactNumber} email`] == '')){
                        break
                    }

                    supplier.contacts = []
                    let contact = {
                        forename: row[`contact ${contactNumber} name`].split(' ')[0],
                        surname: row[`contact ${contactNumber} name`].split(' ')[1] || '',
                        name: {
                            forename: row[`contact ${contactNumber} name`].split(' ')[0],
                            surname: row[`contact ${contactNumber} name`].split(' ')[1] || ''
                        }
                    }
                    if(row[`contact ${contactNumber} number`] != ''){contact.phone = row[`contact ${contactNumber} number`]}
                    if(row[`contact ${contactNumber} email`] != ''){contact.email = row[`contact ${contactNumber} email`]}
                    if(row[`contact ${contactNumber} role`] != ''){contact.role = row[`contact ${contactNumber} role`]}
                    if(row[`contact ${contactNumber} tags`] != ''){contact.tags = row[`contact ${contactNumber} tags`].split(',')}
                    supplier.contacts.push(contact)
                    contactNumber += 1
                } while (row[`contact ${contactNumber} name`] != undefined)

                rowCounter += 1

                try{
                    await common.requester(supplier.new ? 'post' : 'patch', `https://api.stok.ly/v1/suppliers${supplier.new ? '' : '/' + suppliers[row['supplier name'].toLowerCase()]}`, supplier, undefined, undefined, false)
                    console.log(`Done Supplier ${rowCounter}`)
                } catch (err) {
                    console.log(`Failed to import Supplier ${row['supplier name']} [${rowCounter}]`)
                    failedImports.push({...row, Reason: err.response.data.message, line: rowCounter})
                }

                rowDone = true

            stream.resume()
        })
        .on('end', async () => {
            do{
                await common.sleep(200)
             } while (!rowDone)
            res(failedImports)
        })
    })
}

(async ()=>{
    let suppliers = {}
    await common.loopThrough('Getting Existing Suppliers', `https://${global.enviroment}/v1/suppliers`, 'size=1000', '[status]!={1}', async (supplier)=>{
        suppliers[supplier.name.toLowerCase().trim()] = supplier.supplierId
    })
    let failedImports = await getInput(suppliers)
    if(failedImports.length){
        let i = csvWrite.json2csv(failedImports)
        fs.writeFileSync(`./failedImports.csv`, i)
    }
    global.continueReplen = false
})()