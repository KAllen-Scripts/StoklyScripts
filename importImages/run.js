const compress_images = require("compress-images");
const fs = require("fs");
const common = require('../common.js');
const path = require('path');

global.enviroment = 'api.stok.ly';

compAmount = 70;

let itemDict = {};

function compressImgs(fileIn, fileOut) {
    return new Promise((resolve, reject) => {
        compress_images(
            fileIn,
            fileOut,
            { compress_force: false, statistic: false, autoupdate: true },
            false,
            { jpg: { engine: "mozjpeg", command: ["-quality", compAmount] } },
            { png: { engine: "pngquant", command: ["--quality=" + compAmount * 0.4 + "-" + compAmount, "-o"] } },
            { svg: { engine: "svgo", command: "--multipass" } },
            {
                gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
            },
            function (error, completed, stat) {
                if (error) {
                    return reject(error);
                }
                resolve(stat);
            }
        );
    });
}

async function readdir(directory) {
    try {
        return await fs.promises.readdir(directory);
    } catch (error) {
        throw error;
    }
}

let imgCounter = 0
async function getImages(source, accountKey, nameDelim) {

    let dir = await readdir(source);

    for (const file of dir) {
        let filePath;
        let fileStat = await fs.promises.stat(`./${source}/${file}`);
        if (fileStat.isDirectory()) {
            await getImages(`./${source}/${file}`);
        } else {

            let itemName = (((path.parse(file).name).split(nameDelim)[0].trim()).toLowerCase())

            if(itemDict[itemName] == undefined){return}

            if((fileStat.size * 0.000001) > 2){
                let result = await compressImgs(`./${source}/${file}`, `./${source}/compressed - `);
                filePath = result.path_out_new
            } else {
                filePath = `./${source}/${file}`
            }
            let imgURL = await common.postImage(filePath, accountKey).then(r=>{return r.data.location})
            imgCounter += 1
            console.log(`Uploaded image ${imgCounter}`)
            itemDict[itemName].images.push({
                "uri": imgURL
            })
        }
    }
}

(async ()=>{

    try{
        fs.statSync('./inputFolder')
    } catch {
        fs.mkdirSync('./inputFolder');
    }

    await common.askQuestion(`Move images into 'inputFolder'. If this did not already exist, it has been created. Press ENTER to continue:`)

    let matchProperty = await common.askQuestion(`How are we looking up the items? 1 = SKU, 0 = Barcode: `).then(r=>{return JSON.parse(r)})

    let nameDelim = await common.askQuestion(`Some items may have more than one image.\n\n`+
    `For example, you may have 'mySKU-1' and 'mySKU-2' in the image folder\n\n`+
    `Enter the character used as the delimter between the SKU and the number, or just press enter if N/A: `)
    if (nameDelim == ''){nameDelim = 'nullPlaceHolder'}
    
    let accountKey = await common.askQuestion("Enter the account Key: ")

    await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, 'size=1000', `[status]!={1}`, async (item)=>{
        if(!matchProperty){
            if(item.barcode != undefined){itemDict[item.barcode.toLowerCase()] = {itemId:item.itemId, type:item.format, images:[]}}
        } else {
            itemDict[item.sku.toLowerCase()] = {itemId:item.itemId, type:item.format, images:[]}
        }
    })

    await getImages('./inputFolder', accountKey, nameDelim)

    for(const item in itemDict){
        if(itemDict[item].images.length == 0){continue}
        await common.requester('patch', `https://${global.enviroment}/v0/${itemDict[item].type == 2 ? 'variable-items' : 'items'}/${itemDict[item].itemId}`, {images:itemDict[item].images})
        console.log(`Updated item ${item}`)
    }
})()
