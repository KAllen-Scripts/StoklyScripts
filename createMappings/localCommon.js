const common = require('../common.js')

async function getAttIDs(attList){
    let returnObj = {}
    let createList = []
    let addedAtts = []
    let attDict = await getAtts()
    const indexOfInsensitive = (array,string)=>{return array.findIndex(item =>  string.toLowerCase() === item.stoklyName.toLowerCase())}

    for (const attribute of attList){
        let count = 0
        let attAdded = false
        do{

            count += 1
            let attName = `${attribute.value}${count == 1 ? '' : ' - ' + count}`

            if (!(addedAtts.includes(attName.toLowerCase()))){
                addedAtts.push(attName.toLowerCase())
                if(indexOfInsensitive(createList, attName) < 1){
                    createList.push({stoklyName:attName,remoteName:attribute.value,ID:attribute.ID})
                    attAdded = true
                }
            }

        } while (attAdded == false)
    }

    let done = 0
    for (const attribute of createList){
        done += 1
        returnObj[attribute.remoteName] = {}
        if(attDict[attribute.stoklyName.toLowerCase()] != undefined){
            returnObj[attribute.remoteName].localID = attDict[attribute.stoklyName.toLowerCase()]
            returnObj[attribute.remoteName].localName = attribute.stoklyName.toLowerCase()
            returnObj[attribute.remoteName].remoteID = attribute.ID
            console.log(`Attribute ${attribute.stoklyName} already exists (${done}/${createList.length})`)
        } else {
            returnObj[attribute.remoteName].localID = await common.requester('post',`https://${enviroment}/v0/item-attributes`, {
                "name": attribute.stoklyName,
                "type": 0,
                "defaultValue": "",
                "allowedValues": []
            }).then(r=>{return r.data.data.id})
            returnObj[attribute.remoteName].localName = attribute.stoklyName.toLowerCase()
            returnObj[attribute.remoteName].remoteID = attribute.ID
            console.log(`Created ${attribute.stoklyName} (${done}/${createList.length})`)
        }
    }
    let sortedReturn = sortObj(returnObj)
    return sortedReturn
}

function sortObj(unsortedObject){
    let sortArr = []
    let sortedObj = {}
    for (const property in unsortedObject){
        sortArr.push(unsortedObject[property].localName)
    }
    sortArr.sort()
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
        returnObj[attribute.name.toLowerCase()] = attribute.itemAttributeId
    })
    return returnObj
}


async function checkSingleAttribute(name){
    let nameExists = await common.requester('get', `https://${global.enviroment}/v0/item-attributes?filter=(([name]::{${name}}))%26%26([status]!={1})`).then(r=>{return r.data.data})
    if(nameExists.length == 0){
        return common.requester('post', `https://${global.enviroment}/v0/item-attributes`, {
            "name": name,
            "type": 0,
            "defaultValue": "",
            "allowedValues": []
        }).then(r=>{return r.data.data.id})
    }
    return nameExists[0].itemAttributeId
}

module.exports = {
    getAttIDs,
    checkSingleAttribute
};