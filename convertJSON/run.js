const convertCSV = require("json-2-csv");
const fs = require('fs');
const {askQuestion} = require('../common.js');

(async ()=>{

    try{
        fs.readFileSync('./input.txt')
    } catch {
        fs.writeFileSync('./input.txt', '')
    }

    await askQuestion(`Add JSON strings to 'input.txt'. Seprate multiple strings with a newline (ENTER)\n\nPress ENTER to continue`)

    fs.writeFileSync(`./output.csv`, convertCSV.json2csv(fs.readFileSync('./input.txt', 'utf8')
    .split('\n')
    .map(line => JSON.parse(line).data)
    .reduce((acc, data) => acc.concat(data), []), {emptyFieldValue: ''}))
})()