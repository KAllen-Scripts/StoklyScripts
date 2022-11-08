const fs = require("fs")
const fastCSV = require("fast-csv")
const axios = require("axios")
const accessToken = process.argv[2];

let done = 0

const getFunc = async (url)=>{
    return new Promise((res,rej)=>{
        let getRequest = {
            method:'get',
            headers:{ 
                'Authorization': 'Bearer ' + accessToken
            },
            url:url
        }
        let response = axios(getRequest).catch(err=>{console.log(err)})
        res(response)
    })
}


const patchFunc = async (url, data)=>{
    return new Promise((res,rej)=>{
        let patchRequest = {
            method:'patch',
            headers:{
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            url:url,
            data:JSON.stringify(data)
        }
        let response = axios(patchRequest).catch(err=>{console.log(err)})
        res(response)
    })
}

const stream = fs.createReadStream('./SKUs.csv')
.pipe(fastCSV.parse({ headers: true }))
.on('error', error => console.error(error))
.on('data',  async row => {
    stream.pause()

    let itemList = await getFunc('https://api.stok.ly/v0/items?size=100&page=0&sortDirection=ASC&sortField=name&filter=' + encodeURIComponent('(([sku]=={' + row.currentSKU + '})&&([status]!={1}))'))
    .catch(err => {console.log(err)})

    let item = ""

    for (const i of itemList.data.data){
        if (i.sku == row.currentSKU){
            item = i
        }
    }

    if (item == ""){
        console.log("No item with SKU " + row.currentSKU + " found")
    } else {
        let data = {
            sku:row.newSKU,
            aquisition:item.format
        }
        let url = 'https://api.stok.ly/v0/' + (item.format == 2 ? 'variable-items/' : 'items/') + item.itemId
        await patchFunc(url, data)
        .catch(err => {console.log(err)})
        done += 1
        console.log("Replaced " + row.currentSKU + " with " + row.newSKU + " (" + done + " items)")
    }

    stream.resume()
})