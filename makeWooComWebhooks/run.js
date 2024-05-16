let common = require('../common.js');
let crypto = require('crypto');

(async ()=>{
    let accountKey = await common.askQuestion('Enter the account ID: ')
    let channelID = await common.askQuestion('Enter the channel ID: ')

    let createdSecret = generateWebhookSecret(accountKey, channelID, "order.created")
    let updatedSecret = generateWebhookSecret(accountKey, channelID, "order.updated")

    console.log(common.makeBold(`||||CREATED WEBHOOK DETAILS||||`))
    console.log(`Delivery URL - https://${accountKey}.woocommerce-api.stok.ly/notifications?channelId=${channelID}`)
    console.log(`Secret - ${createdSecret}\n\n`)

    console.log(common.makeBold(`||||UPDATED WEBHOOK DETAILS||||`))
    console.log(`Delivery URL - https://${accountKey}.woocommerce-api.stok.ly/notifications?channelId=${channelID}`)
    console.log(`Secret - ${updatedSecret}`)
})()

function generateWebhookSecret(accountkey, channelId, topic) { //for topic use order.created or order.updated
    var hash = crypto.createHash('md5');
    hash.update(accountkey + ':' + channelId + ':' + topic);
    return hash.digest('hex');
}