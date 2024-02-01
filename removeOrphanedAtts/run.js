const common = require('../common.js');

global.enviroment = 'api.stok.ly';

(async ()=>{

    let attributesList = []

    await common.loopThrough('', `https://${global.enviroment}/v0/item-attributes`, 'size=1000', `[status]!={1}`, (attribute)=>{
        attributesList.push(attribute.itemAttributeId)
    })

    await common.loopThrough('Cleaning Items', `https://${global.enviroment}/v0/items`, 'size=1000', `([status]!={1})`, async (item)=>{
        let updateFlag = false
        let request = {attributes:[]}
        let attributes = await common.requester('get', `https://${global.enviroment}/v0/items/${item.itemId}/attributes?size=1000&filter=[status]=={active}`).then(r=>{return r.data.data})
        for(const att of attributes){
            if(attributesList.includes(att.itemAttributeId)){
                request.attributes.push({
                    itemAttributeId: att.itemAttributeId,
                    value: att.value
                })
            } else {
                updateFlag = true
            }
        }
        if(updateFlag){
            await common.requester('patch', `https://${global.enviroment}/v0/${item.format == 2 ? 'variable-items' : 'items'}/${item.itemId}`, request, 3, undefined, false)
        }
    })

    global.continueReplen = false
})()