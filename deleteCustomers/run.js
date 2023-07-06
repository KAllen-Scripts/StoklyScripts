global.sleepTimeOverride = 500;
global.enviroment = 'api.stok.ly';
const common = require('../common.js');

(async ()=>{
    await common.loopThrough('Deleting Customers', `https://${global.enviroment}/v0/customers`, 'size=1000', '[status]=={1}', async(customer)=>{
         await common.requester('delete', `https://${global.enviroment}/v0/customers/${customer.customerId}`)       
    })
})()