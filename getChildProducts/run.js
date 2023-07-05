let fs = require('fs');
let common = require('../common')

global.enviroment = 'api.stok.ly';

(async ()=>{

    let type = await common.askQuestion('What are we getting? Composites = 1, Variables = 2, Both = 3: ')

    let fileName = `./${(()=>{if (type > 2){return "Both"} else {return type == 1 ? "Composites" : "Variables"}})()}.csv`

    let myWrite = fs.createWriteStream(fileName, {flags:'a'})
    fs.writeFileSync(fileName,'"parent SKU","parent name","Format","child sku","child Name","Composing Quantity"\r\n')

    await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `([status]!={1})%26%26${type > 2 ? '(([format]!={0}))' : '(([format]=={' + type + '}))'}`, async (item)=>{
        if(item.format == type || type > 2){

            let children = await common.requester('get', `https://${global.enviroment}/v0/items/${item.itemId}/children`).then(r=>{return r.data.data})
            if (children.length == 0){
                myWrite.write(`"${item.sku}",`)
                myWrite.write(`"${item.name}",`)
                myWrite.write(`"${item.format == 1 ? 'Composite' : 'Variable'}",`)
                myWrite.write('\r\n')
            }

            for (const child of children){
                myWrite.write(`"${item.sku}",`)
                myWrite.write(`"${item.name}",`)
                myWrite.write(`"${item.format == 1 ? 'Composite' : 'Variable'}",`)
                myWrite.write(`"${child.sku}",`)
                myWrite.write(`"${child.name}",`)
                myWrite.write(`"${child.composingItemQuantity || ''}",`)
                myWrite.write('\r\n')
            }
        }
        myWrite.write('\r\n')
    })

})()