const axios = require("axios");
const fs = require("fs");
const csv = require('fast-csv');

const accessToken = process.argv[2];

let excludeArr = []
let length = 0
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
        res(axios(getRequest).catch(err=>{rej(err)}))
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
        res(axios(patchRequest).catch(err=>{rej(err)}))
    })
}

const appendToBackup = (addition, logFile)=>{
    addition +=  '\n'
    fs.appendFile(logFile, addition, function (err) {
        if (err) {console.log(err)};
    })
}

async function loopThrough(callback){
    let page = 0
    done = 0

    do{

        let res = await getFunc(encodeURI("https://api.stok.ly/v0/variances?size=1000&page=" + page + "&sortDirection=DESC&sortField=niceId&filter=")).catch(err=>{console.log(err)})

        await sleep(sleepTime)

        total = res.data.metadata.count

        length = res.data.data.length
        page += 1

        for (const item of res.data.data){

            let response = await getFunc("https://api.stok.ly/v0/variances/" + item.varianceId).catch(err=>{console.log(err)})

            try{
                await callback(response.data)
            } catch {
                throw response
            }
        }

    }while (length > 0)
}