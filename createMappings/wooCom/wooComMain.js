const common = require('../../common.js');
const localCommon = require('../localCommon.js')
const fs = require('fs');
const axios = require('axios');

const run = async (channel, scanID)=>{
    let itemsCheck = await checkForInvalidAttributes(scanID, channel)
    if (itemsCheck.invalidFound){
        await common.askQuestion('Non-global attributes found. Logged to CSV. Press any key to continue: ')
    }

    let currentMapping = await common.requester('get', `https://${global.enviroment}/v0/channels/${channel.channelId}/mappings`).then(r=>{return r.data.data})
    let remoteAttributes = await common.requester('get',`https://${global.enviroment}/v0/channels/${channel.channelId}/remote-mappables/marketplace/attributes`).then(r=>{return r.data.data})

    //Not too sure about my naming here, but cannot think of what to call this function
    let wooCategories = await getWooDict(channel, 'categories', 'Getting Woo Categories')
    let wooTags = await getWooDict(channel, 'tags', 'Getting Woo Tags')

    //Not sure if I want to pre-populate terms or not here. WooCommerce automatically adds them to attributes, so is it neccesary?
    //tbh, might just add a toggle so the user can decide if these are dropdowns or not
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
        {"stoklyName": channel.name + ' - Status',"remoteName": "status", overRides:{type: 6, allowedValues: ['publish','pending','draft','private']}},
        {"stoklyName": channel.name + ' - Featured',"remoteName": "featured", overRides:{type: 3}},
        {"stoklyName": channel.name + ' - Visibility',"remoteName": "catalog_visibility", overRides:{type: 6, allowedValues: ['visible','catalog','search','hidden'], allowedValueLabels: ['Shop and search results','Shop only','Search results only','Hidden']}},
        {"stoklyName": channel.name + ' - Price',"remoteName": "regular_price", overRides:{type: 7}},
        {"stoklyName": channel.name + ' - Sale Price',"remoteName": "sale_price", overRides:{type: 7}},
        {"stoklyName": channel.name + ' - Categories',"remoteName": "categories", overRides:{"type": 4, ...wooCategories}},
        {"stoklyName": channel.name + ' - Tax Rate',"remoteName": "tax_status", overRides:{type: 3}},
        {"stoklyName": channel.name + ' - Tags',"remoteName": "tags", overRides:{"type": 4, ...wooTags}}
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

function getWooDict(channel, type, message) {
    let items = { allowedValues: [], allowedValueLabels: [] };
    return wooLoop(message, channel, `${channel.data.uri}/wp-json/wc/v3/products/${type}`, (item) => {
        items.allowedValues.push(item.id);
        items.allowedValueLabels.push(item.name);
    }).then(() => {
        let combined = items.allowedValues.map((id, index) => {
            return { id: id, name: items.allowedValueLabels[index] };
        });
        combined.sort((a, b) => a.name.localeCompare(b.name));
        items.allowedValues = combined.map(item => item.id);
        items.allowedValueLabels = combined.map(item => item.name);

        return items;
    });
}

async function wooLoop(message, channel, url, callback){
    let currentPage = 1
    let done = 0
    do {
        var wooData = await axios({
            method: 'get',
            maxBodyLength: Infinity,
            url: `${url}?per_page=100&page=${currentPage}`,
            headers: {
                'Authorization': `Basic ${btoa(`${channel.data.consumerKey}:${channel.data.consumerSecret}`)}`
            }
        }).then(r => {
            return r.data
        })
        for (const item of wooData){
            await callback(item)
            done += 1
            if(message != ''){
                console.log(`${message} ${done}`)
            }
        }

        currentPage += 1
    } while (wooData.length >= 100)
}

async function checkForInvalidAttributes(scanID, channel){
    let returnObj = {invalidFound:false}
    fs.writeFileSync(`./wooCom/Invalid Attributes - ${channel.name}.csv`, `"SKU","Name","ListingID","Invalid Attribute","Used for variations"\r\n`)
    let myWrite = fs.createWriteStream(`./wooCom/Invalid Attributes - ${channel.name}.csv`, {flags:'a'})
    await common.loopThrough('Checking for invalid Attributes', `https://${global.enviroment}/v1/store-scans/${scanID}/listings`, 'size=50&sortDirection=ASC&sortField=name&includeUnmappedData=1', '[parentId]=={@null;}', (listing)=>{
        for(const attribute of listing.unmappedData.attributes){
            if (attribute.id == 0){
                returnObj.invalidFound = true
                myWrite.write(`"${listing.sku}","${listing.name}","${listing.scannedListingId}","${attribute.name}","${attribute.variation}"\r\n`)
            }
        }
    })
    return returnObj
}

module.exports = {run};