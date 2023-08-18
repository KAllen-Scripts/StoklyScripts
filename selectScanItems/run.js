const common = require('../common.js');

global.enviroment = 'api.stok.ly';

(async ()=>{

    let scanID = await common.askQuestion('Enter the scan ID: ')

    let scanOptions = {
        variables: await common.askQuestion('Select variables? 0 for No, 1 for Yes: ').then(r=>{return JSON.parse(r)}),
        simples: await common.askQuestion('Select simples? 0 for No, 1 for Yes: ').then(r=>{return JSON.parse(r)}),
        noLinks: await common.askQuestion('Select unlinked items? 0 for No, 1 for Yes: ').then(r=>{return JSON.parse(r)}),
        links: await common.askQuestion('Select linked items? 0 for No, 1 for Yes: ').then(r=>{return JSON.parse(r)})
    }


    let postObj = {listings:[]}
    await common.loopThrough('Getting scanned listings', `https://api.stok.ly/v1/store-scans/${scanID}/listings`, 'size=1000', '(([status]!={imported}))', async (listing)=>{
        if (['disabled_already_linked',"disabled_unmapped"].includes(listing.importOptions.action)){return}
        if (listing.type == 'variable' && !scanOptions.variables){return}
        if (listing.type == 'simple' && !scanOptions.simples){return}
        if (listing.importOptions.action == 'link_item' && !scanOptions.links){return}
        if (['create_item','do_nothing'].includes(listing.importOptions.action) && !scanOptions.noLinks){return}
        postObj.listings.push({
            "scannedListingId": listing.scannedListingId,
            "selected": true
        })
        if (postObj.listings.length >= 500){
            await common.requester('patch', `https://api.stok.ly/v1/store-scans/${scanID}`, postObj)
            postObj.listings = []
        }
    })
    await common.requester('patch', `https://api.stok.ly/v1/store-scans/${scanID}`, postObj)
})()