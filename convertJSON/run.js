const convertCSV = require("json-2-csv");
const fs = require('fs');
const common = require('../common.js');

(async ()=>{

    try{
        fs.readFileSync('./input.txt')
    } catch {
        fs.writeFileSync('./input.txt', '')
    }

    console.log(common.makeBold(`Add JSON strings to 'input.txt'. Seprate multiple strings with a newline (ENTER)\n\n`))
    await common.askQuestion('Press ENTER to continue')

    let JSONArray = fs.readFileSync('./input.txt', 'utf8').split('\n').map(line => JSON.parse(line).data)

    let combinedJSON = []

    for (const J of JSONArray){
        combinedJSON.push(...J)
    }

    let i = convertCSV.json2csv(combinedJSON, {emptyFieldValue: ''})
    fs.writeFileSync(`./output.csv`, i)
})()