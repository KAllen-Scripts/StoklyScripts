const ebayMain = require('./eBay/ebayMain.js')
const wooComMain = require('./wooCom/wooComMain.js')
const common = require('../common.js')

global.enviroment = 'api.stok.ly';

(async ()=>{

    let channelList = await common.requester('get', `https://${global.enviroment}/v0/channels?size=1000&filter=[status]!={2}`).then(r=>{return r.data.data})

    for (const channel of channelList){

        let scanIDs = await common.requester('get', `https://${global.enviroment}/v1/store-scans?size=1&page=0&sortDirection=DESC&sortField=createdAt&filter=([channelId]=={${channel.channelId}}%26%26[status]=*{ready_for_import,imported})`).then(r=>{    
            return r.data.data
        })

        if (scanIDs.length == 0 & !(channel.type == 3 || channel.type == 6)){
            console.log(`Skipping channel with name ${channel.name} as no completed scans are found`)
        } else {

            // 2	ebay
            // 3	amazon
            // 4	woocommerce
            // 5	magento
            // 6	shopify

            switch(channel.type){
                case 2:
                    console.log(channel.name)
                    await ebayMain.run(channel, scanIDs[0].storeScanId)
                    break;
                case 3:
                    
                    break;
                case 4:
                    // await wooComMain.run(channel.channelId, scanIDs[0].storeScanId)
                    break;
                    
                case 5:
                    break;
                case 6:
                    break;
            }
        }
    }



})()