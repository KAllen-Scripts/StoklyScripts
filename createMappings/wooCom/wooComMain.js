const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID)=>{
    let itemsCheck = await checkForInvalidAttributes(scanID, channel)
    if (itemsCheck.invalidFound){
        await common.askQuestion('Non-global attributes found. Logged to CSV. Press any key to continue: ')
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})
    let remoteAttributes = await common.requester('get',`https://${global.enviroment}/v0/channels/${channel.channelId}/remote-mappables/marketplace/attributes`).then(r=>{return r.data.data})

    let wooCategories = await getWooCategories(channel)

    let attsToCreate = []
    for (const attribute of remoteAttributes){
        if (!isNaN(attribute.id)){
            attsToCreate.push({stoklyName:attribute.name,remoteName:attribute.id})
        }
    }

    let attributeRefs = await localCommon.getAttIDs(attsToCreate)


    let plainAttributes = [
        {stoklyName:'sku',remoteName:'sku'},
        {stoklyName:'name',remoteName:'name'},
        {stoklyName:'description',remoteName:'description'},
        {stoklyName:'weight',remoteName:'weight'}
    ]
    
    let prefixedAttributes = [
        {"stoklyName": channel.name + ' - Status',"remoteName": "status"},
        {"stoklyName": channel.name + ' - Featured',"remoteName": "featured"},
        {"stoklyName": channel.name + ' - Visibility',"remoteName": "catalog_visibility"},
        {"stoklyName": channel.name + ' - Price',"remoteName": "regular_price"},
        {"stoklyName": channel.name + ' - Sale Price',"remoteName": "sale_price"},
        {"stoklyName": channel.name + ' - Categories',"remoteName": "categories",overRides:{"type": 4,"allowedValues": itemsCheck.categories}},
        {"stoklyName": channel.name + ' - Tax Rate',"remoteName": "tax_status"},
        {"stoklyName": channel.name + ' - Shipping Class',"remoteName": "shipping_class"},
        {"stoklyName": channel.name + ' - Tags',"remoteName": "tags",overRides:{"type": 4,"allowedValues": itemsCheck.tags}}
    ]

    let attributes = []
    for (const attribute of plainAttributes){
        attributes.push({
            "localAttributeId": attribute.stoklyName,
            "remoteAttributeId": attribute.remoteName,
            "remoteMappableIds": ['marketplace'],
            "priority": attributes.length
        })
    }
    for (const attribute of prefixedAttributes){
        attributes.push({
            "localAttributeId": await localCommon.checkSingleAttribute(attribute.stoklyName, attribute.overRides),
            "remoteAttributeId": attribute.remoteName,
            "remoteMappableIds": ['marketplace'],
            "priority": attributes.length
        })
    }
    for (const attribute in attributeRefs){
        attributes.push({
            "localAttributeId": attributeRefs[attribute].localID,
            "remoteAttributeId": attribute,
            "remoteMappableIds": ['marketplace'],
            "priority": attributes.length
        })
    }

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
                "attributes": attributes,
                "index": 0
            }
        ]
    }

    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)
};

async function getWooCategories(channel){
    
}

async function checkForInvalidAttributes(scanID, channel){
    let returnObj = {invalidFound:false, tagsArr:[], categoriesArr:[]}
    fs.writeFileSync(`./wooCom/Invalid Attributes - ${channel.name}.csv`, `"SKU","Name","ListingID","Invalid Attribute","Used for variations"\r\n`)
    let myWrite = fs.createWriteStream(`./wooCom/Invalid Attributes - ${channel.name}.csv`, {flags:'a'})
    await common.loopThrough('Checking for invalid Attributes', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (listing)=>{
        for(const attribute of listing.unmappedData.attributes){
            if (attribute.id == 0){
                returnObj.invalidFound = true
                myWrite.write(`"${listing.sku}","${listing.name}","${listing.scannedListingId}","${attribute.name}","${attribute.variation}"\r\n`)
            }
        }
        for(const tag of listing.unmappedData.tags){
            if (returnObj.tagsArr.includes(tag)){
                returnObj.tagsArr.push(tag)
            }
        }
        for(const category of listing.unmappedData.categories){
            if (returnObj.categoriesArr.includes(category)){
                returnObj.categoriesArr.push(category)
            }
        }
    })
    returnObj.tagsArr.sort()
    returnObj.categoriesArr.sort()
    return returnObj
}

module.exports = {run};