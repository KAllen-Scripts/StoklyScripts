const compress_images = require("compress-images");
const fs = require("fs");
const common = require('../common.js');

global.enviroment = 'api.stok.ly'

compAmount = 70

let itemDict = {}

async function compressImgs(fileIn, fileOut) {
    return new Promise((resolve, reject) => {
        compress_images(
            fileIn, fileOut,
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: "mozjpeg", command: ["-quality", compAmount] } },
            { png: { engine: "pngquant", command: ["--quality=" + compAmount * 0.4 + "-" + compAmount, "-o"] } },
            { svg: { engine: "svgo", command: "--multipass" } },
            {
                gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
            },
            async function (err, completed, stat) {
            if (err) { return resolve(err) }
            return resolve ({com: await completed, stat: await stat}) 
            }
        );
    })
}

function readdir(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (error, folders) => {
            if (error) { return reject(error) }

            return resolve(folders)
        })
    })
}

async function getImages(source){
    let dir = await readdir(source)

    for (const file of dir){
        let fileStat = fs.statSync(`./${source}/${file}`)
        if(fileStat.isDirectory()){
            await getImages(`./${source}/${file}`)
        } else {
            if((fileStat.size * 0.000001) > 2){
                let result = await compressImgs(`./${source}/${file}`, `./${source}/compressed - `)
            }
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

    // await common.loopThrough('Getting Items', `https://${global.enviroment}/v0/items`, '', `[status]!={1}`, async (item)=>{
    //     if(!matchProperty){
    //         if(item.barcodes != undefined){itemDict[item.barcode] = {itemId:item.itemId}}
    //     } else {
    //         itemDict[item.sku] = {itemId:item.itemId}
    //     }
    // })

    await getImages('./inputFolder')

    // let k = await readdir('./compressedImages')

    // for (const t of k){
    //     let b = fs.statSync(`./compressedImages/${t}`)
    //     console.log(b.isDirectory())
    // }

    // let b = fs.statSync('./example.JPG')

    // console.log(b.size * 0.000001)
    
    // let i = await compressImgs('./example.JPG')
    // console.log(i)
})()