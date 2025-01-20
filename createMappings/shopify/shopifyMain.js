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
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Collection'),
                        "remoteAttributeId": "collection",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 10
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
                        "priority": 11
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Status',{
                            "type": 6,
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
                        "priority": 12
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
                        "priority": 13
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Taxable'),
                        "remoteAttributeId": "taxable",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 14
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Tax Percentage'),
                        "remoteAttributeId": "taxPercentage",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 15
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Vendor'),
                        "remoteAttributeId": "vendor",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 16
                    },
                    {
                        "localAttributeId": "countryOfOrigin",
                        "remoteAttributeId": "countryCodeOfOrigin",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 17
                    },
                    {
                        "localAttributeId": "harmonyCode",
                        "remoteAttributeId": "harmonizedSystemCode",
                        "remoteMappableIds": [
                            "global"
                        ],
                        "priority": 18
                    }
                ],
                "index": 0
            }
        ]
    }

    for (const option in tagsAndTypes.options){
        postObj.attributeGroups[0].attributes.push({
            "localAttributeId": await localCommon.checkSingleAttribute(`${channel.name} - Option ${option} Title`),
            "remoteAttributeId": `option${option}Title`,
            "remoteMappableIds": [
                "global"
            ],
            "priority": postObj.attributeGroups[0].attributes.length
        })
        postObj.attributeGroups[0].attributes.push({
            "localAttributeId": await localCommon.checkSingleAttribute(`${channel.name} - Option ${option}`, {
                "type": 4,
                "allowedValues": tagsAndTypes.options[option]
            }),
            "remoteAttributeId": `option${option}`,
            "remoteMappableIds": [
                "global"
            ],
            "priority": postObj.attributeGroups[0].attributes.length
        })
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})
    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)
}


async function getTagsAndTypes(scanID){
    let returnObj = {
        tags:[],
        types:[],
        options:{}
    }
    await common.loopThrough('gGetting Listing Data', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', async (listing)=>{
        if(listing.unmappedData.productType !== null){
            if(!returnObj.types.includes(listing.unmappedData.productType) && listing.unmappedData.productType.trim() != ''){returnObj.types.push(listing.unmappedData.productType)}
        }
        for(const tag of (Array.isArray(listing?.unmappedData?.tags) ? listing?.unmappedData?.tags : [])){
            if(!returnObj.tags.includes(tag)){returnObj.tags.push(tag)}
        }
        for (const option of listing.unmappedData.options){
            if(returnObj.options[option.position] == undefined){returnObj.options[option.position] = []}
        }
        if(listing.type == 'variable'){
            await common.loopThrough('', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=1000&includeUnmappedData=1', `[parentId]=={${listing.scannedListingId}}`, (childListing)=>{
                for (const option in childListing.unmappedData.selectedOptions){
                    console.log(parseInt(option)+1)
                    returnObj.options[parseInt(option)+1].push(childListing.unmappedData.selectedOptions[option].value)
                }
            })
        }
    })
    return returnObj
}

module.exports = {run};
