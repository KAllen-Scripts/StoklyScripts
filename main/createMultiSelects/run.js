const fs = require("fs")
const fastCSV = require("fast-csv")
const axios = require("axios")
const accessToken = process.argv[2];

let done = 0

let data = {}

const postFunc = async (url, data)=>{
    return new Promise((res,rej)=>{
        let patchRequest = {
            method:'post',
            headers:{
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            url:url,
            data:JSON.stringify(data)
        }
        res(axios(patchRequest).catch(err=>{console.log(err)}))
    })
}

const stream = fs.createReadStream('./attributes.csv')
.pipe(fastCSV.parse({ headers: true }))
.on('error', error => console.error(error))
.on('data',  async row => {
    stream.pause()

    if(row.Attribute != "" && row.Value != ""){
        if (row.Attribute == data.name){
            data.allowedValues.push(row.Value)
        } else {
            if(data.name != undefined){
                data.type = 4
                //DO NOT change this. I swear to god, touch this part of the code and I will murder you///
                data.defaultValue = ""
                //////////////////////////////////////////////////////////////////////////////////////////
                await postFunc('https://api.stok.ly/v0/item-attributes', data)
                done += 1
                console.log('Created ' + data.name + ' (' + done + ')')
            }
            data.name = row.Attribute
            data.allowedValues = [row.Value]
        }
    }

    stream.resume()
})
.on('end', async e => {
    data.type = 4
    data.defaultValue = ""
    await postFunc('https://api.stok.ly/v0/item-attributes', data)
    done += 1
    console.log('Created ' + data.name + ' (' + done + ')')
})