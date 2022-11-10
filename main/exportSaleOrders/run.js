const axios = require('axios')
const accessToken = process.argv[2]
const pageLimit = process.argv[3]

let objectArr = []

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

(async () => {
    let page = 0
    do{
        var orderPage = await getFunc('https://api.stok.ly/v1/saleorders?size=100&page=' + page + '&sortDirection=DESC&sortField=niceId&filter=')
        for(const order of orderPage.data.data){
            await getOrderDetails(order.saleOrderId)
        }
        page += 1
    } while (orderPage.data.data.length != 0)
})()