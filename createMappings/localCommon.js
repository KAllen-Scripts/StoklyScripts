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
            let attName = `${attribute}${count == 1 ? '' : ' - ' + count}`

            if (!(addedAtts.includes(attName.toLowerCase()))){
                addedAtts.push(attName.toLowerCase())
                if(indexOfInsensitive(createList, attName) < 1){
                    createList.push({stoklyName:attName,remoteName:attribute})
                    attAdded = true
                }
            }

        } while (attAdded == false)
    }

    let done = 0
    for (const attribute of createList){
        done += 1
        if(attDict[attribute.stoklyName.toLowerCase()] != undefined){
            returnObj[attribute.remoteName] = attDict[attribute.stoklyName.toLowerCase()]
            console.log(`Attribute ${attribute.stoklyName} already exists (${done}/${createList.length})`)
        } else {
            returnObj[attribute.remoteName] = await common.requester('post',`https://${enviroment}/v0/item-attributes`, {
                "name": attribute.stoklyName,
                "type": 0,
                "defaultValue": "",
                "allowedValues": []
            }).then(r=>{return r.data.data.id})
            console.log(`Created ${attribute.stoklyName} (${done}/${createList.length})`)
        }
    }
    return returnObj
}

async function getAtts(){
    let returnObj = {}
    await common.loopThrough('Getting Attributes', `https://${enviroment}/v0/item-attributes`, 'size=1000', '[status]!={1}', function(attribute){
        returnObj[attribute.name.toLowerCase()] = attribute.itemAttributeId
    })
    return returnObj
}

module.exports = {
    getAttIDs
};