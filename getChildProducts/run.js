const convertCSV = require("json-2-csv");
const fs = require('fs');
let common = require('../common')

global.enviroment = 'api.stok.ly';

(async ()=>{

    let type = await common.askQuestion('What are we getting? Composites = 1, Variables = 2, Both = 3: ')

    let fileName = `./${(()=>{if (type > 2){return "Both"} else {return type == 1 ? "Composites" : "Variables"}})()}`

    let objArr = []

    await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `([status]!={1})%26%26${type > 2 ? '(([format]!={0}))' : '(([format]=={' + type + '}))'}`, async (item)=>{
        if(item.format == type || type > 2){
    
            let children = await common.requester('get', `https://${global.enviroment}/v0/items/${item.itemId}/children`).then(r=>{return r.data.data})
            
            let variableAttributes = await (async ()=>{
                if(item.format == 2){
                    let i = await common.requester('get', `https://api.stok.ly/v0/items/${item.itemId}/variable-attributes`).then(r=>{return r.data.data.map(item => item.name).join()})
                    return i
                } else {
                    return ''
                }
            })()


            if (children.length == 0){
                objArr.push({
                    'Parent SKU': item.sku,
                    'Parent Name': item.name,
                    'Variable Attributes': variableAttributes,
                    Format: `"${item.format == 1 ? 'Composite' : 'Variable'}"`
                })
            }

            for (const child of children){
                objArr.push({
                    'Parent SKU': item.sku,
                    'Parent Name': item.name,
                    'Variable Attributes': variableAttributes,
                    Format: `"${item.format == 1 ? 'Composite' : 'Variable'}"`,
                    'Child SKU': child.sku,
                    'Child Name': child.name,
                    'Composing Quantity': `"${child.composingItemQuantity || ''}"`
                })
            }
        }
    })
    let i = await convertCSV.json2csv(objArr)
    fs.writeFileSync(`./${fileName}.csv`, i)

    global.continueReplen = false
})()