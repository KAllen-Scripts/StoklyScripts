var axios = require('axios');
let fs = require('fs');

let accessToken = process.argv[2];
let sleepTime = process.argv[3] = undefined ? 0 : process.argv[3];

let getRequest = async (url) => {
    return new Promise((res, rej) => {
        let request = {
            method: 'get',
            headers: { 
              'Authorization': 'Bearer ' + accessToken
            },
            url:url
        }
        res(axios(request).catch(err=>{rej(err)}))
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getChildren(itemID){
    let returnArr = []
    let res =  await getRequest("https://api.stok.ly/v0/items/" + itemID + "/children").catch(error => {console.log(error);});
    for (const child of res.data.data){
        returnArr.push({
            sku:child.sku,
            name:child.name,
            composingQuant:child.composingItemQuantity
        })
    }

    await sleep(sleepTime)
    return returnArr
}

function writeToCSV(reponseObj){
    let replaceReg = /"/g
    let str = '"Item SKU","Item Name","Item Format","Composing Quantity"\r\n'
    for (const row of reponseObj){
        str += '"' + row.sku.replace(replaceReg,'""') + '","' + row.name.replace(replaceReg,'""') + '","' + row.format + '",\r\n'
        for(const child of row.children){
            str += '"' + child.sku.replace(replaceReg,'""') + '","' + child.name.replace(replaceReg,'""') + '","Simple",'
            if (child.composingQuant != undefined){
                str += '"' + child.composingQuant + '"'
            }
            str += '\r\n'
        }
        str += "\r\n"
    }
    fs.writeFileSync('./childItems.csv', str)
}

(async ()=>{
    let pageNum = 0
    let responseObj = []
    let done = 0

    do{

        var response = await getRequest("https://api.stok.ly/v0/items?size=100&page=" + pageNum + "&filter=([status]!={1})").catch(err => {console.log(err)})
        for (const item of response.data.data){
            if(item.format != 0){
                responseObj.push({
                    sku:item.sku,
                    id:item.itemId,
                    name:item.name,
                    format:item.format==1?"Composite":"Variable",
                    children:await getChildren(item.itemId)
                })
            }
            done += 1

        }

        pageNum += 1
        
        console.log("Checked items " + done + " out of " + response.data.metadata.count)

    } while (response.data.data.length>0)

    writeToCSV(responseObj)

})()