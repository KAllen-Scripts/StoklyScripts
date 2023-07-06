const common = require('../../common.js');
const localCommon = require('../localCommon.js');

const fs = require('fs');

let run = async (channel, scanID)=> {

    async function checkPriceExists(name){
        let nameExists = await common.requester('get', `https://${global.enviroment}/v0/item-attributes?filter=(([name]::{${name + ' - Price'}}))&&([status]!={1})`).then(r=>{return r.data.data})
        if(nameExists.length == 0){
            return common.requester('post', `https://${global.enviroment}/v0/item-attributes`, {
                "name": `${name} - Price`,
                "type": 0,
                "defaultValue": "",
                "allowedValues": []
            }).then(r=>{return r.data.data.id})
        }
        return nameExists[0].itemAttributeId
    }
    

    let obj = await getData(scanID)

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})

    let postObj = {
        "remoteMappables": [],
        "attributeGroups":[{
            "attributes":[
                {
                    "localAttributeId": "description",
                    "remoteAttributeId": "Description",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 3
                },
                {
                    "localAttributeId": "barcode",
                    "remoteAttributeId": "EAN",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 2
                },
                {
                    "localAttributeId": "mpn",
                    "remoteAttributeId": "MPN",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 4
                },
                {
                    "localAttributeId": "name",
                    "remoteAttributeId": "Title",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 1
                },
                {
                    "localAttributeId": "sku",
                    "remoteAttributeId": "SKU",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 0
                },
                {
                    "localAttributeId": await checkPriceExists(channel.name),
                    "remoteAttributeId": "StartPrice",
                    "remoteMappableIds": obj.catIDs,
                    "priority": 5
                }

            ],
            "status":"active",
            "index":0
        }]
    }

    for (const map of obj.categories){
        postObj.remoteMappables.push({
            "mappableId": map.ID,
            "mappableName": map.name
        })
    }


    let attObj = await localCommon.getAttIDs(obj.attributes)

    for (const attribute of Object.keys(attObj)){
        if(attribute.toLowerCase() != 'mpn' && attribute.toLowerCase() != 'ean'){
            postObj.attributeGroups[0].attributes.push({
                localAttributeId: attObj[attribute].localID,
                remoteAttributeId: attribute,
                priority:postObj.attributeGroups[0].attributes.length,
                remoteMappableIds: obj.catIDs
            })  
        }
    }

    fs.writeFileSync(`./${channel.channelId}.txt`, JSON.stringify(postObj))

    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)

}


const getData = async (scanID)=>{

    return new Promise((res,rej) =>{

        (async ()=>{

            let outArray = {
                catIDs:[],
                attributes:[],
                categories:[]
            }

            await common.loopThrough('Got unmapped Data for', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (item)=>{
                if(!(outArray.catIDs.includes(item.unmappedData.PrimaryCategory.CategoryID))){
                    outArray.categories.push({
                        name:item.unmappedData.PrimaryCategory.CategoryName.split(':')[item.unmappedData.PrimaryCategory.CategoryName.split(':').length-1],
                        ID: item.unmappedData.PrimaryCategory.CategoryID
                    })
                    outArray.catIDs.push(item.unmappedData.PrimaryCategory.CategoryID)
                }

                if (item.unmappedData.ItemSpecifics != undefined){
                    for (const attribute of item.unmappedData.ItemSpecifics){
                        if (!(outArray.attributes.includes(attribute.Name))){
                            outArray.attributes.push(attribute.Name)
                        }
                    }
                }

                if (item.unmappedData.Variations != undefined){
                    for (const attribute of item.unmappedData.Variations.VariationSpecificsSet){
                        if (!(outArray.attributes.includes(attribute.Name))){
                            outArray.attributes.push(attribute.Name)
                        }
                    }
                }
            })

            res(outArray)

        })()
    })
}

module.exports = {run};