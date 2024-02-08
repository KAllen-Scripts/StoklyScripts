const fs = require("fs");
const csv = require('fast-csv');
const common = require('../common.js')

global.enviroment = 'api.stok.ly';

(async()=>{
    let tagList = []
    let existingTags = []
    await common.loopThrough('Getting Existing Tags', `https://${global.enviroment}/v0/tags/items`, 'size=1000', '', async (tag)=>{
        existingTags.push(tag.value.toLowerCase())
    })

    await common.loopThrough('Getting Item tags', `https://${global.enviroment}/v0/items`, 'size=1000', '[status]!={1}', async (item)=>{
        for(const tag of item.tags){
            if(!existingTags.includes(tag.toLowerCase()) && !compareLowerCase([...tagList], tag)){
                tagList.push(tag)
            }
        }
    })

    for(const tag in tagList){
        await common.requester('post', `https://${global.enviroment}/v0/tags/items`, {"group":"items","value": tagList[tag]})
        console.log(`Adding tag ${parseInt(tag)+1}/${tagList.length}`)
    }

    global.continueReplen = false
})()


function compareLowerCase(list, item){
    for(const i of list){
        if (i.toLowerCase() == item.toLowerCase()){
            return true
        }
    }
    return false
}