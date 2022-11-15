const axios = require("axios");
const fs = require("fs");
const csv = require('fast-csv');

const accessToken = process.argv[2];

idArr = []

const getFunc = async (url)=>{
    return new Promise((res,rej)=>{
        let getRequest = {
            method:'get',
            headers:{ 
                'Authorization': 'Bearer ' + accessToken
            },
            url:url
        }
        res(axios(getRequest).catch(err=>{console.log(err)}))
    })
}


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

async function loopThrough(callback){
    let page = 0
    done = 0

    do{

        let res = await getFunc(encodeURI("https://api.stok.ly/v0/variances?size=1000&page=" + page + "&sortDirection=DESC&sortField=niceId&filter=")).catch(err=>{console.log(err)})

        total = res.data.metadata.count

        length = res.data.data.length
        page += 1

        for (const item of res.data.data){
            await callback(item)
        }

    }while (length > 0)
}

async function resolveItem(item){
    if (item.status == 0 && idArr.includes(String(item.niceId))) {
        await postFunc("https://api.stok.ly/v0/variances/" + item.varianceId + "/resolutions", {
                dismissals:0,
                blemishedCreations:0,
                reason:"",
                onHandAdjustment: item.expected > item.actual ? 0 : item.actual - item.expected
            }
        )
        console.log("Resolved variance " + item.niceId)
    }
}

async function getInput(){
    return new Promise((res,rej)=>{
        let returnArr = []
        const stream = fs.createReadStream('./input.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data',  row => {
            returnArr.push(String(row.ID).trim().toLowerCase())
        })
        .on('end', r => {res(returnArr)})
    })
}

(async ()=>{
    idArr = await getInput()
    console.log(idArr)
    await loopThrough(resolveItem)
    console.log("Complete")
})()