const ebayMain = require('./eBay/ebayMain.js')
const wooComMain = require('./wooCom/wooComMain.js')
const amazonMain = require('./amazon/amazonMain.js')
const shopifyMain = require('./shopify/shopifyMain.js')
const common = require('../common.js')

global.enviroment = 'api.stok.ly';

(async ()=>{

    let channelList = await common.requester('get', `https://${global.enviroment}/v0/channels?size=1000&filter=[status]!={2}`).then(r=>{return r.data.data})

    for (const channel of channelList){

        let scanIDs = await common.requester('get', `https://${global.enviroment}/v1/store-scans?size=1&page=0&sortDirection=DESC&sortField=createdAt&filter=([channelId]=={${channel.channelId}}%26%26[status]=*{ready_for_import,imported})`).then(r=>{    
            return r.data.data
        })

        if(scanIDs.length > 0){
            var scanLength = await common.requester('get',`https://${global.enviroment}/v1/store-scans/${scanIDs[0].storeScanId}/listings`).then(r=>{return r.data.data.length})
        }
       

        if (scanIDs.length == 0 || scanLength == 0){
            console.log(`Skipping channel with name ${channel.name} as no completed scans are found`)
        } else {

            // 2	ebay
            // 3	amazon
            // 4	woocommerce
            // 5	magento
            // 6	shopify

            switch(channel.type){
                case 2:
                    // await ebayMain.run(channel, scanIDs[0].storeScanId)
                    break;
                case 3:
                    // await amazonMain.run(channel, scanIDs[0].storeScanId)
                    break;
                case 4:
                    // await wooComMain.run(channel, scanIDs[0].storeScanId)
                    break;
                case 5:
                    break;
                case 6:
                    await shopifyMain.run(channel, scanIDs[0].storeScanId)
                    break;
            }
        }
    }



})()