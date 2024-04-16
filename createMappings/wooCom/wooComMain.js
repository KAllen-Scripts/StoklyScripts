const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');

const run = async (channel, scanID)=>{
    let itemsCheck = await invalidAtts(scanID, channel)
    if (itemsCheck.invalidFound){
        await common.askQuestion('Non-global attributes found. Logged to CSV. Press any key to continue: ')
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})

    let remoteAttributes = await common.requester('get',`https://${global.enviroment}/v0/channels/${channel.channelId}/remote-mappables/marketplace/attributes`).then(r=>{return r.data.data})

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
                "attributes": [],
                "index": 0
            }
        ]
    }

    let attsToCreate = []
    for (const attribute of remoteAttributes){
        if (!isNaN(attribute.id)){
            attsToCreate.push({stoklyName:attribute.name,remoteName:attribute.id})
        }
    }

    let attributeRefs = await localCommon.getAttIDs(attsToCreate)

    let standardAtts = [
        {local:'sku',remote:'sku'},
        {local:'name',remote:'name'},
        {local:'description',remote:'description'},
        {local:'weight',remote:'weight'}
    ]
    
    let customAtts = [
        {"local": channel.name + ' - Status',"remote": "status"},
        {"local": channel.name + ' - Featured',"remote": "featured"},
        {"local": channel.name + ' - Visibility',"remote": "catalog_visibility"},
        {"local": channel.name + ' - Price',"remote": "regular_price"},
        {"local": channel.name + ' - Sale Price',"remote": "sale_price"},
        {"local": channel.name + ' - Categories',"remote": "categories",overRide:{"type": 4,"allowedValues": itemsCheck.categories}},
        {"local": channel.name + ' - Tax Rate',"remote": "tax_status"},
        {"local": channel.name + ' - Shipping Class',"remote": "shipping_class"},
        {"local": channel.name + ' - Tags',"remote": "tags",overRide:{"type": 4,"allowedValues": itemsCheck.tags}}
    ]

    postObj.attributeGroups[0].attributes = await localCommon.addAttributes(standardAtts, customAtts, ['marketplace'])

    for (const attribute in attributeRefs){
        console.log(attributeRefs[attribute])
        postObj.attributeGroups[0].attributes.push({
            "localAttributeId": attributeRefs[attribute].localID,
            "remoteAttributeId": attribute,
            "remoteMappableIds": [
                "marketplace"
            ],
            "priority": postObj.attributeGroups[0].attributes.length
        })
    }

    await common.requester('patch', `https://${global.enviroment}/v1/mappings/${currentMapping.mappingId}`, postObj)
};

async function invalidAtts(scanID, channel){
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