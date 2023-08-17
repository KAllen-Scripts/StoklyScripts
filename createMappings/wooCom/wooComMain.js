const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID)=>{
    let itemsCheck = await invalidAtts(scanID, channel)
    if (itemsCheck){
        await common.askQuestion('Non-global attributes found. Logged to CSV. Press any key to continue: ')
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})

    let remoteAttributes = await common.requester('get',`https://${global.enviroment}/v0/channels/${channel.channelId}/remote-mappables/marketplace/attributes`).then(r=>{return r.data.data})

    let attsToCreate = []
    for (const attribute of remoteAttributes){
        if (!isNaN(attribute.id)){
            attsToCreate.push({value:attribute.name,ID:attribute.id})
        }
    }

    let attributeRefs = await localCommon.getAttIDs(attsToCreate)

    

    let postObj = {
        "remoteMappables": [
            {
                "mappableId": "marketplace",
                "mappableName": "WooCommerce Products"
            }
        ],
        "attributeGroups": [
            {
                "status": "active",
                "attributes": [
                    {
                        "localAttributeId": "sku",
                        "remoteAttributeId": "sku",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 0
                    },
                    {
                        "localAttributeId": "name",
                        "remoteAttributeId": "name",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 1
                    },
                    {
                        "localAttributeId": "description",
                        "remoteAttributeId": "description",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 2
                    },
                    {
                        "localAttributeId": "weight",
                        "remoteAttributeId": "weight",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 3
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Status'),
                        "remoteAttributeId": "status",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 4
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Featured'),
                        "remoteAttributeId": "featured",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 5
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Visibility'),
                        "remoteAttributeId": "catalog_visibility",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 6
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Price'),
                        "remoteAttributeId": "regular_price",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 7
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Sale Price'),
                        "remoteAttributeId": "sale_price",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 8
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Categories'),
                        "remoteAttributeId": "categories",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 9
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tax Rate'),
                        "remoteAttributeId": "tax_status",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 10
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Shipping Class'),
                        "remoteAttributeId": "shipping_class",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 11
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tags'),
                        "remoteAttributeId": "tags",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 12
                    }
                ],
                "index": 0
            }
        ]
    }

    for (const attribute in attributeRefs){
        postObj.attributeGroups[0].attributes.push({
            "localAttributeId": attributeRefs[attribute].localID,
            "remoteAttributeId": attributeRefs[attribute].remoteID,
            "remoteMappableIds": [
                "marketplace"
            ],
            "priority": postObj.attributeGroups[0].attributes.length
        })
    }

    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)
};

async function invalidAtts(scanID, channel){
    let invalidFound = false
    fs.writeFileSync(`./wooCom/Invalid Attributes - ${channel.name}.csv`, `"SKU","Name","ListingID","Invalid Attribute","Used for variations"\r\n`)
    let myWrite = fs.createWriteStream(`./wooCom/Invalid Attributes - ${channel.name}.csv`, {flags:'a'})
    await common.loopThrough('Checking for invalid Attributes', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (listing)=>{
        for(const attribute of listing.unmappedData.attributes){
            if (attribute.id == 0){
                invalidFound = true
                myWrite.write(`"${listing.sku}","${listing.name}","${listing.scannedListingId}","${attribute.name}","${attribute.variation}"\r\n`)
            }
        }
    })
    return invalidFound
}

module.exports = {run};