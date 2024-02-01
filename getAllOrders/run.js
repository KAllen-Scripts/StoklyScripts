const common = require('../common.js');
const fs = require('fs');

global.enviroment = 'api.stok.ly';

(async ()=>{

    fs.writeFileSync('./output.csv',`"orderID","Remote ID","Order Status","Channel Name","Item SKU","Item Name","Item Quantity"\r\n`);

    let myWrite = fs.createWriteStream('./output.csv', {flags:'a'});

    let endOrderId = await common.askQuestion('Which order are we export up to?: ');

    await common.loopThrough('Getting Sale Orders', `https://${global.enviroment}/v2/saleorders`, `size=1000&sortDirection=DESC&sortField=niceId`, `[stage]!={removed}`, async(order)=>{
    let orderItems = await common.requester('get', `https://${global.enviroment}/v2/saleorders/${order.saleOrderId}/items`).then(r=>{return r.data.data})
        for (const item of orderItems){
            myWrite.write(`"${order.niceId}","${order.sourceReferenceId}","${order.itemStatuses}","${order.channelName}","${item.itemSku?.replace('"','""')}","${item.itemName?.replace('"','""')}","${item.quantity}"\r\n`); 
        }
        if(order.niceId == endOrderId){return false};
    })
    global.continueReplen = false
})()