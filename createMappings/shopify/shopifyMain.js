const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID)=>{

    let postObj = {
        "remoteMappables": [
            {
                "mappableId": "global",
                "mappableName": "Global"
            }
        ],
        "attributeGroups": [
            {
                "groupId": "1b062b8e-c98d-4d44-9b5c-d64edfeb70f1",
                "status": "active",
                "attributes": [
                    {
                        "localAttributeId": "name",
                        "remoteAttributeId": "title",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 0
                    },
                    {
                        "localAttributeId": "sku",
                        "remoteAttributeId": "sku",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 1
                    },
                    {
                        "localAttributeId": "barcode",
                        "remoteAttributeId": "barcode",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 2
                    },
                    {
                        "localAttributeId": "description",
                        "remoteAttributeId": "descriptionHtml",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 3
                    },
                    {
                        "localAttributeId": "weight",
                        "remoteAttributeId": "weight",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 4
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Price'),
                        "remoteAttributeId": "price",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 5
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Compare At Price'),
                        "remoteAttributeId": "compareAtPrice",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 6
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 1'),
                        "remoteAttributeId": "option1",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 7
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 2'),
                        "remoteAttributeId": "option2",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 8
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 3'),
                        "remoteAttributeId": "option3",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 9
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 1 Title'),
                        "remoteAttributeId": "option1Title",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 10
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 2 Title'),
                        "remoteAttributeId": "option2Title",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 11
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Option 3 Title'),
                        "remoteAttributeId": "option3Title",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 12
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Collection'),
                        "remoteAttributeId": "collection",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 13
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Product Type'),
                        "remoteAttributeId": "productType",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 14
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Status'),
                        "remoteAttributeId": "status",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 15
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tags'),
                        "remoteAttributeId": "tags",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 16
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Taxable'),
                        "remoteAttributeId": "taxable",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 17
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tax Percentage'),
                        "remoteAttributeId": "taxPercentage",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 18
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Vendor'),
                        "remoteAttributeId": "vendor",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 19
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