const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID) =>{

    let postObj = {
        "remoteMappables": [
            {
                "mappableId": "marketplace",
                "mappableName": "Amazon Marketplace"
            }
        ],
        "attributeGroups": [
            {
                "groupId": "a96368dc-7183-42b1-85d5-87100d94483d",
                "status": "active",
                "attributes": [
                    {
                        "localAttributeId": "sku",
                        "remoteAttributeId": "SKU",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 0
                    },
                    {
                        "localAttributeId": "name",
                        "remoteAttributeId": "Title",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 1
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Price'),
                        "remoteAttributeId": "StandardPrice",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 2
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - ASIN'),
                        "remoteAttributeId": "StandardProductID",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 3
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Fulfilment Latency'),
                        "remoteAttributeId": "FulfillmentLatency",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 4
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - MaximumSellerAllowedPrice'),
                        "remoteAttributeId": "MaximumSellerAllowedPrice",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 5
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - MinimumSellerAllowedPrice'),
                        "remoteAttributeId": "MinimumSellerAllowedPrice",
                        "remoteMappableIds": [
                            "marketplace"
                        ],
                        "priority": 6
                    }
                ],
                "index": 0
            }
        ]
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})
    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)
}

module.exports = {run};