const common = require('../../common.js');
const localCommon = require('../localCommon.js');
const axios = require('axios');
let magentoToken;

let typeConversion = {
    select: 6,
    multiselect: 4
}

let run = async (channel, scanID)=> {
    let attSets = {}

    await magentoSignIn(channel.data)

    let magentoCategories = await getMagentoCategories(channel.data.uri)

    await common.requester('get', `https://api.stok.ly/v0/channels/${channel.channelId}/remote-mappables`).then(r=>{
        for (const attSet of r.data.data){
            attSets[attSet.id] = attSet.name
        }
    })

    let attDict = await getAttDict(channel.data.uri)
    let scanData = await getData(scanID)

    let mappableList = (()=>{
        let mappablesArray = []
        for (const mappable of scanData.attSets){
            mappablesArray.push({
                "mappableId": mappable,
                "mappableName": attSets[mappable]
            })
        }
        return mappablesArray
    })()

    let attributeList = await (()=>{
        let list = []
        for (const attributeId of scanData.attIds){
            list.push({
                stoklyName: attDict[attributeId].name,
                remoteName: attDict[attributeId].code,
                type: attDict[attributeId].type,
                ...attDict[attributeId].type ? attDict[attributeId].options : {}
            })
        }
        return localCommon.getAttIDs(list)
    })()

    let mappings = {
        "remoteMappables": mappableList,
        "attributeGroups": [
            {
                "status": "active",
                "attributes": [
                    {
                        "localAttributeId": "name",
                        "remoteAttributeId": "name",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 0
                    },
                    {
                        "localAttributeId": "sku",
                        "remoteAttributeId": "sku",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 1
                    },
                    {
                        "localAttributeId": "weight",
                        "remoteAttributeId": "weight",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 2
                    },
                    {
                        "localAttributeId": "description",
                        "remoteAttributeId": "description",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 3
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Categories', {
                            type: 4,
                            allowedValues: magentoCategories.allowedValues,
                            allowedValueLabels: magentoCategories.allowedValueLabels
                        }),
                        "remoteAttributeId": "category_ids",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 4
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Price', {type: 5}),
                        "remoteAttributeId": "price",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 5
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Short Description'),
                        "remoteAttributeId": "short_description",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 6
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Status', {type: 6, allowedValues: [0,1], allowedValueLabels: ['Disabled', 'Enabled']}),
                        "remoteAttributeId": "status",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 7
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Taxable', {type: 6, allowedValues: [0,1], allowedValueLabels: ['No', 'Yes']}),
                        "remoteAttributeId": "tax_class_id",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 8
                    },
                    {
                        "localAttributeId": await localCommon.checkSingleAttribute(channel.name + ' - Visisbility', {type: 6, allowedValues: [1,2,3,4], allowedValueLabels: ['Not Visible Individually','Catelog','Search','Catelog, Search']}),
                        "remoteAttributeId": "visibility",
                        "remoteMappableIds": scanData.attSets,
                        "priority": 9
                    }
                ],
                "index": 0
            }
        ]
    }

    for (const attribute in attributeList){
        mappings.attributeGroups[0].attributes.push({
            "localAttributeId": attributeList[attribute].localID,
            "remoteAttributeId": attribute,
            "remoteMappableIds": scanData.attSets,
            "priority": mappings.attributeGroups[0].attributes.length
        })
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})
    console.log(mappings)
    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, mappings)
}

const getMagentoCategories = async (uri) => {
    let categoryValues = {
        allowedValues:[],
        allowedValueLabels: []
    }
    await magentoLoop('Getting Magento Categories', `${uri}/rest/V1/categories/list`, category => {
        categoryValues.allowedValues.push(category.id)
        categoryValues.allowedValueLabels.push(category.name)
    })
    return categoryValues
}

const magentoSignIn = async (channelData) => {
    magentoToken = await axios({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${channelData.uri}/rest/V1/integration/admin/token`,
        data: {
            "username": channelData.username,
            "password": channelData.password
        }
    }).then(r => {
        return r.data
    })
}

const getAttDict = async (uri) => {

    let attDict = {}

    await magentoLoop(`Getting Magento Product Attributes`, `${uri}/rest/V1/products/attributes`, (attribute) => {
        attDict[attribute.attribute_id] = {
            type: typeConversion[attribute.frontend_input],
            code: attribute.attribute_code,
            name: attribute.default_frontend_label,
            options: (()=>{
                let options = {
                    allowedValues:[],
                    allowedValueLabels: []
                }
                for (const option of attribute.options){
                    if(option.value == ''){continue}
                    options.allowedValues.push(option.value)
                    options.allowedValueLabels.push(option.label)
                }
                return options
            })()
        }
    })

    return attDict
}

const getData = async (scanID)=>{

    let outArrays = {
        attSets: [],
        attIds: []
    }

    await common.loopThrough('Got unmapped Data for', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (item)=>{
        if(!outArrays.attSets.includes(item.unmappedData.attribute_set_id))outArrays.attSets.push(item.unmappedData.attribute_set_id)
        if(item.unmappedData.type_id == 'configurable'){
            for (const attribute of item.unmappedData.extension_attributes.configurable_product_options){
                if(!outArrays.attIds.includes(attribute.attribute_id)){outArrays.attIds.push(attribute.attribute_id)}
            }
        }
    })

    return outArrays
}

const magentoLoop = async (message, url, callBack) => {
    let currentPage = 1
    let done = 0
    do {
        var magentoData = await axios({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${url}?searchCriteria[currentPage]=${currentPage}&searchCriteria[pageSize]=100`,
            headers: {
                'Authorization': 'Bearer ' + magentoToken
            }
        }).then(r => {
            return r.data
        })
        for (const item of magentoData.items){
            done += 1
            if(message != ''){
                console.log(`${message} ${done}/${magentoData.total_count}`)
            }
            await callBack(item)
        }

        currentPage += 1
    } while (magentoData.items.length >= 100)
}

module.exports = {run};