const common = require('../common.js')

let attDict = {}

async function getAttIDs(attList) {
    const returnObj = {};
    const addedAtts = new Set();

    // Helper function to manage case-insensitive uniqueness and create new names as needed
    function getUniqueName(stoklyName) {
        let baseName = normalize(stoklyName);
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
        const normalizedStoklyName = uniqueStoklyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const existingAttribute = attDict[normalizedStoklyName]?.ID;

        if([4,6].includes(attDict[normalizedStoklyName]?.type)){
            await updateTerms(attDict[normalizedStoklyName], attribute)
        }

        returnObj[attribute.remoteName] = {
            localName: uniqueStoklyName, // Preserve the case-sensitive name
            localID: existingAttribute ? existingAttribute : await createAttribute(uniqueStoklyName, attribute)
        };
    }

    return sortObj(returnObj);
}

async function updateTerms(stoklyAttribute, attributeDetails){
    let optionsAdded = false
    for (const option in stoklyAttribute.allowedValues){
        if (stoklyAttribute.allowedValueLabels[option] == undefined){
            stoklyAttribute.allowedValueLabels[option] = ''
        }
    }

    for (const option in attributeDetails.allowedValues){
        if (stoklyAttribute.allowedValues.indexOf(attributeDetails.allowedValues[option]) < 0){
            optionsAdded = true
            stoklyAttribute.allowedValues.push(attributeDetails.allowedValues[option])
            stoklyAttribute.allowedValueLabels.push(attributeDetails?.allowedValueLabels?.[option] || '')
        }
    }

    sortObj(stoklyAttribute)

    await common.requester('patch', `https://${global.enviroment}/v0/item-attributes/${stoklyAttribute.ID}`, stoklyAttribute)

}

// Helper function to create an attribute in the remote system
async function createAttribute(stoklyName, overRides) {
    attDict[stoklyName] = {
        name: stoklyName,
        type: overRides?.type || 0,
        defaultValue: overRides?.defaultValue || "",
        allowedValues: overRides?.allowedValues,
        allowedValueLabels: overRides?.allowedValueLabels
    }
    if([4,6].includes(attDict[stoklyName].type)){sortTerms(attDict[stoklyName])}
    const response = await common.requester('post', `https://${global.enviroment}/v0/item-attributes`, attDict[stoklyName]);
    attDict[stoklyName].ID = response.data.data.id,
    console.log(`Created ${stoklyName}`)
    return response.data.data.id;
}

function sortTerms(values) {
    let sortableArray = values.allowedValues.map((value, index) => {
        let label = values?.allowedValueLabels?.[index];
        return {
            allowedValue: value,
            allowedValueLabel: label || "",
            sortVal: (label || value).toString()
        };
    });
    sortableArray.sort((a, b) => a.sortVal.localeCompare(b.sortVal));
    values.allowedValues = sortableArray.map(item => item.allowedValue);
    values.allowedValueLabels = sortableArray.map(item => item.allowedValueLabel);
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
    await common.loopThrough('Getting Attributes', `https://${enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', function(attribute){
        attDict[normalize((attribute.name)).toLowerCase()] = {
            name: attribute.name,
            ID: attribute.itemAttributeId,
            type: attribute.type,
            // defaultValue: attribute.defaultValue == 0 ? 0 : (attribute.defaultValue || ''),
            allowedValues: attribute.allowedValues,
            allowedValueLabels: attribute.allowedValueLabels
        }
    })
}


async function checkSingleAttribute(name, overRideObj = {}){
    if(attDict[normalize(name).toLowerCase()]){
        return attDict[normalize(name).toLowerCase()].ID
    }
    return createAttribute(name, overRideObj)
}

const normalize = (str)=>{return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}
const indexOfInsensitive = (array,string)=>{return array.findIndex(item =>  string.toLowerCase() === item.stoklyName.toLowerCase())}

module.exports = {
    getAttIDs,
    checkSingleAttribute,
    indexOfInsensitive,
    normalize,
    getAtts
};