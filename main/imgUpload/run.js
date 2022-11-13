const axios = require('axios');
const FormData = require('form-data');
const fs = require("fs");
const isImage = require('is-image')
const compressAll = require("../compressImages/run");
const readline = require('readline');

let args = {
    delim:".",
    checkCSV:1,
    compressFiles:1,
    enviroment:"dev.",
    rate: 70,
    speed:5
}

processInput(process.argv[2])

const logLocation = './logs.txt'
const fileLocation = './images'
let done = 0
let total = 0
let largestArr = 0
const fileExtensions = /(\.jpg|\.jpeg|\.png|\.svg|\.gif)$/i
const skuGetPath =  (function(sku){return 'https://api.' + args.enviroment + 'stok.ly/v0/items?size=1000&page=0&sortDirection=ASC&sortField=name&filter=([sku]::{' + sku + '})%26%26([status]!={1})'})

let SKUlib = {
    accept : fs.readFileSync('./skus.csv', 'utf8').split(/\r\n|\r|\n/),
    skus: {},
    skuDoneArr: []
}

let imagePost = {
  method: 'post',
  url: 'https://' + args.account + '.webapp-api.' + args.enviroment + 'stok.ly/uploads'
};

let getItembySKU = {
    method: 'get',
    headers: {'Authorization': 'Bearer ' + args.accessToken}
};

let imgUpdatePatch = {
    method: 'patch',
    headers: { 
      'Authorization': 'Bearer ' + args.accessToken, 
      'Content-Type': 'application/json'
    },
};

function processInput(input){

    for (const argument of input.split(",")){
        try{
        let arg = argument.trim().split(":")
        args[arg[0]] = arg[1]
        } catch {
            appendToLog("Please check arguments")
        }
    }
}

function readdir(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (error, folders) => {
            if (error) { return reject(error) }

            return resolve(folders)
        })
    })
}

function doStat(imgFolder) {
    return new Promise((resolve, reject) => {
        fs.stat(imgFolder, (error, stat) => {
            if (error) { return reject(error) }

            return resolve(stat)
        })
    })
}

function writeCSV(){
    let str='"SKU",'
    for(let imgTitle = 1; imgTitle <= largestArr; imgTitle++){
        str += '"image "' + imgTitle + ','
    }
    str += "\r\n"
    for(let sku of Object.keys(SKUlib.skus)){
        str += '"' + sku + '",'
        for (let img in SKUlib.skus[sku].images){
            str +=  SKUlib.skus[sku].images[img] + ","
        }
        str += "\r\n"
    }
    fs.writeFileSync('./images.csv', str)
}

function appendToLog(addition, logFile = logLocation){
    console.log(addition)
    addition +=  '\n'
    fs.appendFile(logFile, addition, function (err) {
        if (err) {console.log(err)};
    })
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}


function postImage(imgURL, folder,  file){
    return new Promise(async (res,rej)=>{
        let data = new FormData()
        data.append('image', fs.createReadStream(imgURL))
        imagePost.headers = {'Authorization': 'Bearer ' + args.accessToken, ...data.getHeaders()}
        imagePost.data = data
        await axios(imagePost)
        .then(function (response) {
            res({response:response, folder:folder, file:file})
        })
        .catch(function (error) {
            console.log(error);
        })
    })
}


async function updateItems(sku){
    getItembySKU.url = skuGetPath(sku)
    const items = await axios(getItembySKU).catch(function (error) {console.log(error)})
    let itemID = ""
    let data = {
        "acquisition": format,
        "images": []
      };

    for (const returnItem of items.data.data){
        if (sku == returnItem.sku && returnItem.status != 1){itemID = returnItem.itemId; var format = returnItem.format}
    }

    if(itemID != ""){
        let msg = "Posted " + SKUlib.skus[sku].images.length + " images for " + sku + '\n'
        for (const img of SKUlib.skus[sku].images){
            msg += img + '\n'
            data.images.push({uri: img})
        }

        if (format == 2){
            imgUpdatePatch.url = 'https://api.' + args.enviroment + 'stok.ly/v0/variable-items/' + itemID
        } else {
            imgUpdatePatch.url = 'https://api.' + args.enviroment + 'stok.ly/v0/items/' + itemID
        }
        
        imgUpdatePatch.data = JSON.stringify(data)

        appendToLog("//////////////////////////////////////////////////////////////////\nAll images for " + sku + " uploaded. Updating item with links\n//////////////////////////////////////////////////////////////////")
        await axios(imgUpdatePatch)
        .then(function () {appendToLog(msg + "//////////////////////////////////////////////////////////////////\n")})
        .catch(function (error) {console.log(error)})
    
        SKUlib.skus[sku].images = []
    } else {
        appendToLog("Item with sku '" + sku + "' does not exist")
    }
}

function getSKU(file){
    let split = file.split(args.delim)
    return split.slice(0,-1).join(args.delim) 
}

async function countSKUs(direc){
    const folders = await readdir(direc)
    for (const file of folders) {
        const nextFolder = direc + '/' + file
        const stat = await doStat(nextFolder)
        if(stat.isDirectory()){
            await countSKUs(nextFolder)
        } else {
            let sku = getSKU(String(file).replace(fileExtensions,""))
            if ((SKUlib.accept.includes(sku) || args.checkCSV == 0) && !SKUlib.skuDoneArr.includes(file) && isImage(file)){
                SKUlib.skuDoneArr.push(file)
                try{
                    if (SKUlib.skus[sku] == undefined){
                        SKUlib.skus[sku] = {}
                        SKUlib.skus[sku].images = []
                        SKUlib.skus[sku].local = []
                    }
                        SKUlib.skus[sku].local.push(nextFolder)
                        total += 1
                } catch{
                    console.log("Could not populate SKU library")
                }
            }
        }
    }
}



async function loopThrough(){
    let postImgArr = []
    for(const sku of Object.keys(SKUlib.skus)){
        for (const img in SKUlib.skus[sku].local){
            let image = SKUlib.skus[sku].local[img]
            let temp = image.split('/')
            let file = temp.pop()
            let folder = temp.join('/')
            postImgArr.push(postImage(image,folder,file))
            if (postImgArr.length >= 3 || img == SKUlib.skus[sku].local.length-1) {
                await Promise.all(postImgArr).then(async res => {
                    postImgArr = []
                    for (const response of res){
                        largestArr = SKUlib.skus[sku].local.length > largestArr ? SKUlib.skus[sku].local.length : largestArr
                        done += 1
                        appendToLog("Uploaded " + response.file + " in " + response.folder + ". Count == " + done + '/' + total + '\n' + response.response.data.location + "\n")
                        SKUlib.skus[sku].images.push(response.response.data.location)
                        if(SKUlib.skus[sku].local.length == SKUlib.skus[sku].images.length){
                            await updateItems(sku)
                        }
                    }
                })
            }
        }
    }    
}


(async () => {
    fs.writeFileSync('./logs.txt', "")
    await askQuestion(await compressAll.run(fileLocation, logLocation, args.rate, args.speed) + " images could not be compressed and will not be uploaded. Press any key to continue, or ctrl + C to exit");
    console.log("continuing")
    await countSKUs(fileLocation)
    await loopThrough()
    writeCSV()
})()