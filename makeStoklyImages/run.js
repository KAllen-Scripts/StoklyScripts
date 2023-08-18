let common = require('../common');

global.enviroment = 'api.stok.ly';

(async()=>{
    let accountKey = await common.requester('get', `https://${global.enviroment}/v0/items?size=1`).then(r=>{return r.data.data[0].accountkey})
    
    await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `[status]!={1}`, async (item)=>{
        if (item.imageCount > 0){
            let images = await common.requester(`https://${global.enviroment}/v0/items/${item.itemId}/images`).then(r=>{return r.data.data})
        }
    })
})()