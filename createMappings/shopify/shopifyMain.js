const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID)=>{

    let tagsAndTypes = await getTagsAndTypes(scanID)

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
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Product Type',{
                            "type": 6,
                            "allowedValues": tagsAndTypes.types
                        }),
                        "remoteAttributeId": "productType",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 14
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Status',{
                            "type": 4,
                            "allowedValues": [
                                "active",
                                "draft",
                                "archived"
                            ]
                        }),
                        "remoteAttributeId": "status",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 15
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tags', {
                            "type": 4,
                            "allowedValues": tagsAndTypes.tags
                        }),
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


async function getTagsAndTypes(scanID){
    let returnObj = {
        tags:[],
        types:[]
    }
    await common.loopThrough('gGetting Listing Data', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (listing)=>{
        if(!returnObj.types.includes(listing.unmappedData.product_type)){returnObj.types.push(listing.unmappedData.product_type)}
        for(const tag of listing.unmappedData.tags){
            if(!returnObj.tags.includes(tag)){returnObj.tags.push(tag)}
        }
    })
    returnObj.tags.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
    returnObj.types.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
    return returnObj
}

module.exports = {run};