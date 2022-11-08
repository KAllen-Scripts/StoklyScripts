var axios = require('axios');
let fs = require('fs');

let accessToken = process.argv[2];

fs.writeFileSync('./images.csv', "")

let request = {
    method: 'get',
    headers: { 
      'Authorization': 'Bearer ' + accessToken
    }
}

async function getLinks(GUID){
    let returnArr = []
    request.url = "https://api.stok.ly/v0/items/" + GUID + "/images"
    let res =  await axios(request)
    .catch(error => {
      console.log(error);
    });
    for (const img of res.data.data){
        returnArr.push(img.uri)
    }
    return returnArr
}

async function appendToCSV(addition){
    let str = ""
    for (const item of addition){
        str += '"' + item.sku + '",'
        for (const img of item.images){
            str += '"' + img + '",'
        }
        str += "\r\n"
    }

    fs.appendFile('./images.csv', str, function (err) {
        if (err) {console.log(err)};
    })
}


(async ()=>{
    let pageNum = 0
    let done = 0

    do{
        let responseObj = []

        request.url = "https://api.stok.ly/v0/items?size=100&page=" + pageNum
        pageNum += 1
        
        var response = await axios(request)
        .catch(function (err){console.log(err)})

        for (const item of response.data.data){
            let sku = item.sku
            let id = item.itemId
            let images = await getLinks(id)
            responseObj.push({sku:sku,id:id,images:images})
        }

        appendToCSV(responseObj)

        done += responseObj.length
        
        console.log("Done " + done + " out of " + response.data.metadata.count)

    } while (response.data.data.length>0)

})()