const axios = require("axios");
const fs = require("fs");

const accessToken = process.argv[2];

let outArr=[['PO Number','Status','Supplier']]

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


async function getPO(item){
    let noteArr = [item.niceId,item.status,item.supplierName]
    let noteNum = 1
    let response = await getFunc('https://api.stok.ly/v0/purchase-orders/' + item.purchaseOrderId + '/notes')


    let notes = response.data.data

    for(const n of notes){
        if(!outArr[0].includes('Note '+ noteNum)){
            outArr[0].push('Note '+ noteNum)
        }
        noteArr.push(n.content)
        noteNum += 1
    }

    outArr.push(noteArr)
}

(async ()=>{
    let page = 0
    done = 0

    do{

        let res = await getFunc(encodeURI("https://api.stok.ly/v0/purchase-orders?size=1000&page=" + page + "&sortDirection=DESC&sortField=niceId&filter=")).catch(err=>{console.log(err)})

        total = res.data.metadata.count

        length = res.data.data.length
        page += 1

        for (const item of res.data.data){
            await getPO(item)
        }

    }while (length > 0)

    let str = ""

    for (const i of outArr){
        for (const n of i){
            str += '"' + n + '",'
        }
        str += '\r\n'
    }

    fs.writeFileSync("./output.csv", str)

})()