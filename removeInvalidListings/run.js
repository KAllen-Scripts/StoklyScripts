const common = require('../common.js');

global.enviroment = 'api.stok.ly';


async function getRefs(scan){
    let listingList = []
    await common.loopThrough('Getting Refs', ` https://api.stok.ly/v1/store-scans/${scan}/listings`, 'size=1000', '', (item)=>{
        listingList.push(item.remoteId)
    })
    return listingList
}


(async ()=>{
    let scan = await common.askQuestion('Enter the scan ID: ')
    let scanDetails = await common.requester('Get', `https://api.stok.ly/v1/store-scans/${scan}`).then(r=>{return r.data.data})
    let channel = scanDetails.channelId
    let listingList = await getRefs(scan)

    if(scanDetails.expired){
        throw new Error(`Scan is expired. Choose a different one`)
    }

    await common.loopThrough('Deleting Old Listings', `https://api.stok.ly/v0/channels/${channel}/listings`, 'size=1000', `[status]!={2}`, async (item)=>{
        if(listingList.includes(item.referenceId)){return}
        await common.requester('delete', `https://api.stok.ly/v0/listings/${item.listingId}`)
    })
})()