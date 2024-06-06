const crypto = require('crypto');
const common = require('../common.js');
const axios = require('axios');

global.enviroment = 'api.dev.stok.ly';

(async ()=>{
    let channel = await common.askQuestion('Enter Channel ID: ').then(r=>{return common.requester('get', `https://${global.enviroment}/v0/channels/${r}`)}).then(r=>{return r.data.data})
    let timeLimit = await common.askQuestion(`In hours, how far back are we going? Leave blank for 4 days: `).then(r=>{return parseInt((r || 95.5)*60*60*1000)})

    let accountKey = await common.requester('get', `https://${global.enviroment}/v0/items`).then(r=>{
        return r.data.data[0].accountkey
    })
    let secret = generateWebhookSecret(accountKey, channel.channelId, 'order.created')

    await wooLoop(`Checking Orders`, channel, `${channel.data.uri}/wp-json/wc/v3/orders`, async (order)=>{

        let existingOrder = await common.requester('get', `https://${global.enviroment}/v2/saleorders?filter=[sourceReferenceId]=={${order.id}}`).then(r=>{return r.data.data.length})



        if(existingOrder > 0){return}

        let headers = { 
            'x-wc-webhook-topic': 'order.created', 
            'x-wc-webhook-resource': 'order', 
            'x-wc-webhook-event': 'created', 
            'x-wc-webhook-signature': generateSignature(JSON.stringify(order), secret), 
            'Content-Type': 'application/json'
        }

        if ((new Date(order.date_created)) < (new Date(new Date(Date.now()).getTime() - timeLimit))){
            return false
        }

        await axios({
            method: 'post',
            headers: headers,
            url: `https://${accountKey}.woocommerce-${global.enviroment}/notifications?channelId=${channel.channelId}`,
            data: order
        })
    })
})()

async function wooLoop(message, channel, url, callback){
    let currentPage = 1
    let done = 0
    do {
        var wooData = await axios({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${url}?per_page=100&page=${currentPage}`,
            headers: {
                'Authorization': `Basic ${btoa(`${channel.data.consumerKey}:${channel.data.consumerSecret}`)}`
            }
        }).then(r => {
            return r.data
        })
        for (const item of wooData){
            var continueLoop = await callback(item)
            done += 1
            if(message != ''){
                console.log(`${message} ${done}`)
            }
            if (continueLoop === false){return}
        }

        currentPage += 1
    } while (wooData.length >= 100)
}

function generateSignature(payload, secret) {
    const hashAlgo = 'sha256';
    const hmac = crypto.createHmac(hashAlgo, secret);
    hmac.update(payload);
    return hmac.digest('base64');
}

function generateWebhookSecret(accountkey, channelId, topic) { //for topic use order.created or order.updated
    var hash = crypto.createHash('md5');
    hash.update(accountkey + ':' + channelId + ':' + topic);
    return hash.digest('hex');
}