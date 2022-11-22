const axios = require("axios");
const fs = require("fs");

const accessToken = process.argv[2];
const channelID = process.argv[3];

let length = 0
let done = 0
let total

let channelDataBackup

const getFunc = async (url)=>{
    let getRequest = {
        method:'get',
        headers:{ 
            'Authorization': 'Bearer ' + accessToken
        },
        url:url
    }
    return axios(getRequest)
}


const patchFunc = (url, data)=>{
    let patchRequest = {
        method:'patch',
        headers:{
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        },
        url:url,
        data:JSON.stringify(data)
    }
    return axios(patchRequest)
}

const appendToBackup = (addition, logFile)=>{
    addition +=  '\n'
    fs.appendFile(logFile, addition, function (err) {
        if (err) {console.log(err)};
    })
}


async function changeSKU(listingURL){
    let response = await getFunc(listingURL)

    appendToBackup(JSON.stringify(response.data),"./backup.txt")

    let data = {}

    for (const key of Object.keys(response.data.data.data)){
        if(!["stokly_type","variableItemId","variantListingIds","images","itemId"].includes(key)){
            data[key] = response.data.data.data[key]
        }
    }

    if (response.data.data.data.images != undefined){
        data.images = []
        for(const i of response.data.data.images){
            data.images.push({uri:i.uri})
        }
    }

    data.channelSpecifics = []

    let dataBackup = structuredClone(data)

    data.sku = data.sku == undefined ? response.data.data.sku + '.' : data.sku + '.'

    await patchFunc(listingURL, {data:data})
    await new Promise(resolve => setTimeout(resolve, 500))
    await patchFunc(listingURL, {data:dataBackup})

    done += 1

    console.log(listingURL + ' (' + done + '/' + total + ')')

}

async function channelOff(channelID){
    let channelData = await getFunc("https://api.stok.ly/v0/channels/" + channelID)

    let data = {
        name:channelData.data.data.name,
        manageInventory: channelData.data.data.manageInventory,
        syncData:channelData.data.data.syncData,
        data:channelData.data.data.data,
        inventoryLocationIds:channelData.data.data.inventoryLocationIds

    }

    if (channelData.data.data.defaultInventory != undefined){
        data.defaultInventory = channelData.data.data.defaultInventory
    }

    channelDataBackup = structuredClone(data)

    data.syncData = false

    await patchFunc("https://api.stok.ly/v0/channels/" + channelID, data)
}

(async ()=>{

    appendToBackup("\n//////////////////////////////////////////////////////////////////////////////////\nBackups for " + new Date() + "\n//////////////////////////////////////////////////////////////////////////////////\n", "./backup.txt")

    await channelOff(channelID)

    let page = 0
    done = 0

    do{

        let res = await getFunc(encodeURI("https://api.stok.ly/v0/channels/" + channelID + "/listings?size=100&page=" + page + "&sortDirection=ASC&sortField=name&filter=([status]!={2})")).catch(err=>{console.log(err)})

        total = res.data.metadata.count

        length = res.data.data.length
        page += 1

        for (const item of res.data.data){

            await changeSKU("https://api.stok.ly/v0/listings/" + item.listingId).catch(err=>{console.log(err)})

        }

    }while (length > 0)

    await patchFunc("https://api.stok.ly/v0/channels/" + channelID, channelDataBackup)

})()



