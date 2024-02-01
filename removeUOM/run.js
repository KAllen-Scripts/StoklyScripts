let fs = require('fs');
let common = require('../common');

global.enviroment = 'api.stok.ly';


(async ()=>{
    await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `([status]!={1})%26%26[status]!={1}`, async (item)=>{
        await common.requester('patch',`https://${global.enviroment}/v0/items/${item.itemId}` , {"unitsOfMeasure": []})
    })
    global.continueReplen = false
})()
