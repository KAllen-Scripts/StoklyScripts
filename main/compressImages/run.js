export const compressAll = (fileLocation, logLocation)=>{
    const fs = require("fs");
    const isImage = require('is-image')
    const compress_images = require("compress-images");
    const {promisify} = require('util');
    const mv = promisify(fs.rename);
    const pngToJpeg = require('png-to-jpeg');

    const rate = process.argv[2] == undefined ? 50 : process.argv[2]

    let SKUlib = {
        accept : fs.readFileSync('./skus.csv', 'utf8').split(/\r\n|\r|\n/),
        files: []
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


    function appendToLog(addition, logFile = logLocation){
        console.log(addition)
        addition +=  '\n'
        fs.appendFile(logFile, addition, function (err) {
            if (err) {console.log(err)};
        })
    }

    async function compressImgs(fileIn) {
        return new Promise((resolve, reject) => {
            compress_images(
                fileIn,"./",
                { compress_force: false, statistic: true, autoupdate: true },
                false,
                { jpg: { engine: "mozjpeg", command: ["-quality", rate] } },
                { png: { engine: "pngquant", command: ["--quality=" + rate*0.4 + "-"+rate, "-o"] } },
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



    let total = 0
    async function countSKUs(direc){
        const folders = await readdir(direc)
        for (const file of folders) {
            const nextFolder = direc + '/' + file
            const stat = await doStat(nextFolder)
            if(stat.isDirectory()){
                await countSKUs(nextFolder)
            } else {
                let i = await fs.promises.stat(nextFolder)
                if (isImage(file) && (i.size * 0.000001) >= 2){
                    SKUlib.files.push(nextFolder)
                    total+=1
                }
            }
        }
    }


    async function imagesTooFat(){
        let unCompressableArr = []
        let awaitArr = []
        let img = 0
        let done = 0
        do{
            if(SKUlib.files[img] != undefined){
                let type = SKUlib.files[img].split(".").at(-1).toUpperCase()
                if(["PNG","JPG","JPEG","SVG","GIF"].includes(type)){awaitArr.push(compressImgs(SKUlib.files[img]))} else {unCompressableArr.push(SKUlib.files[img])}
            }
            if(awaitArr.length >= 5 || parseInt(img) >= parseInt(SKUlib.files.length-1)){
                await Promise.all(awaitArr).then(async res => {
                    let extra = 0
                    awaitArr = []
                    for (const response of res){
                        let stats = response.stat
                        let path = stats.path_out_new
                        if((stats.size_output * 0.000001) > 2){
                            if(/(.png)$/i.test(path)){
                                await fs.promises.unlink(path)
                                await pngToJpeg({quality: 100})(fs.readFileSync(stats.input)).then(output => fs.writeFileSync(path.replace(/(.png)$/i,".jpg"), output));
                                await fs.promises.unlink(stats.input)
                                await mv(path.replace(/(.png)$/i,".jpg"), stats.input.replace(/(.png)$/i,".jpg")) 
                                awaitArr.push(compressImgs(stats.input.replace(/(.png)$/i,".jpg")))
                                extra += 1
                            } else {
                                unCompressableArr.push(stats.input)
                                await fs.promises.unlink(path) 
                                done+=1
                            }
                        } else {
                            await fs.promises.unlink(stats.input)
                            await mv(path, stats.input) 
                            done+=1
                        }
                    }
                    console.log(done + "/" + total)
                })
            }    
            img+=1
        } while(img <= SKUlib.files.length-1 || awaitArr.length > 0);       
        for (const tooThick of unCompressableArr){
            appendToLog(tooThick + " could not be compressed\n")
            await mv(tooThick, "./CannotCompress/" + tooThick.split('/').at(-1))
        }
    }

    (async()=>{
        await countSKUs(fileLocation)
        imagesTooFat()
    })()
}