const common = require('../common.js')

async function getAttIDs(attList) {
    const returnObj = {};
    const addedAtts = new Set();
    const attDict = await getAtts();

    // Helper function to manage case-insensitive uniqueness and create new names as needed
    function getUniqueName(stoklyName) {
        let baseName = stoklyName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let count = 0;
        let uniqueName = baseName;

        // Use a loop to find the first available unique name
        while (addedAtts.has(uniqueName.toLowerCase())) {
            uniqueName = `${baseName} - ${++count + 1}`;
        }
        
        addedAtts.add(uniqueName.toLowerCase());
        return uniqueName;
    }

    // Process each attribute for creation or linking
    for (const attribute of attList) {
        const uniqueStoklyName = getUniqueName(attribute.stoklyName);
        const normalizedStoklyName = uniqueStoklyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const existingAttribute = attDict[normalizedStoklyName];
        
        returnObj[attribute.remoteName] = {
            localName: uniqueStoklyName, // Preserve the case-sensitive name
            localID: existingAttribute ? existingAttribute : await createAttribute(uniqueStoklyName, attribute)
        };
    }

    return sortObj(returnObj);
}

// Helper function to create an attribute in the remote system
async function createAttribute(stoklyName, attribute) {
    const response = await common.requester('post', `https://${global.enviroment}/v0/item-attributes`, {
        name: stoklyName,
        type: attribute?.overRides?.type || 0,
        defaultValue: attribute?.overRides?.defaultValue || 0,
        allowedValues: attribute?.overRides?.allowedValues || [],
        allowedValueLabels: attribute?.overRides?.allowedValueLabels || []
    });
    // console.log(`Created ${stoklyName}`);
    return response.data.data.id;
}



function sortObj(unsortedObject){
    let sortArr = []
    let sortedObj = {}
    for (const property in unsortedObject){
        sortArr.push(unsortedObject[property].localName)
    }
    sortArr.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
    for(const name of sortArr){
        for (const property in unsortedObject){
            if(unsortedObject[property].localName == name){
                sortedObj[property] = unsortedObject[property]
            }
        }
    }
    return sortedObj
}


async function getAtts(){
    let returnObj = {}
    await common.loopThrough('Getting Attributes', `https://${enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', function(attribute){
        returnObj[normalize((attribute.name.toLowerCase()))] = attribute.itemAttributeId
    })
    return returnObj
}


async function checkSingleAttribute(name, overRideObj = {}){
    let attributes = await common.requester('get', `https://${global.enviroment}/v0/item-attributes?filter=(([name]=={${name}}))%26%26([status]!={1})`).then(r=>{return r.data.data})
    if(attributes.length == 0){
        return common.requester('post', `https://${global.enviroment}/v0/item-attributes`, {
            "name": name,
            "type": overRideObj.type || 0,
            "defaultValue": overRideObj.defaultValue || "",
            "allowedValues": overRideObj.allowedValues || [],
            "allowedValueLabels": overRideObj.allowedValueLabels || []
        }).then(r=>{return r.data.data.id})
    }
    return attributes[0].itemAttributeId
}

async function addAttributes(standardAtts, customAtts, remoteMappables){
    let returnArr = []
    for(const attribute of standardAtts){
        returnArr.push({
            "localAttributeId": attribute.local,
            "remoteAttributeId": attribute.remote,
            "remoteMappableIds": remoteMappables,
            "priority": returnArr.length
        })
    }

    for(const attribute of customAtts){
        returnArr.push({
            "localAttributeId": await checkSingleAttribute(attribute.local, attribute.overRide || {}),
            "remoteAttributeId": attribute.remote,
            "remoteMappableIds": remoteMappables,
            "priority": returnArr.length
        })
    }
    return returnArr
}

const normalize = (str)=>{return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}
const indexOfInsensitive = (array,string)=>{return array.findIndex(item =>  string.toLowerCase() === item.stoklyName.toLowerCase())}

module.exports = {
    getAttIDs,
    checkSingleAttribute,
    addAttributes,
    indexOfInsensitive,
    normalize
};