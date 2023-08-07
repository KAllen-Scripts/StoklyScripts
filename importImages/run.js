const compress_images = require("compress-images");
let fs = require("fs");

compAmount = 70

async function compressImgs(fileIn) {
    return new Promise((resolve, reject) => {
        compress_images(
            fileIn, `./compressedImages/`,
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

async function moveImages(source, destination){

}

(async ()=>{

    // let k = await readdir('./compressedImages')

    // for (const t of k){
    //     let b = fs.statSync(`./compressedImages/${t}`)
    //     console.log(b.isDirectory())
    // }

    // let b = fs.statSync('./example.JPG')

    // console.log(b.size * 0.000001)
    
    let i = await compressImgs('./example.JPG')
    console.log(i)
})()