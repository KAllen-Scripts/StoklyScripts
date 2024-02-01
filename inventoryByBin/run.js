const common = require('../common.js');
const ExcelJS = require('exceljs');

global.enviroment = 'api.stok.ly';

function createSheet(workbook, sheetName, data) {
    const worksheet = workbook.addWorksheet(sheetName);

    let rows = convertToArrays(data);

    worksheet.addRows(rows);
}

(async ()=>{

    const workbook = new ExcelJS.Workbook();

    let locations = {}
    await common.loopThrough('Getting Bins', `https://${global.enviroment}/v1/inventory-records`, 'size=1000', `[binId]!={UNASSIGNED}`, (record)=>{
        if (!locations[record.locationName]){locations[record.locationName] = {}}
        if (!locations[record.locationName][record.itemSku]){locations[record.locationName][record.itemSku] = {
            itemId: record.itemId,
            name: record.itemName,
            bins: {}
        }}

        locations[record.locationName][record.itemSku].bins[`${record.binName} on Hand`] = record.onHand      
    })

    for (const location in locations){
        createSheet(workbook, location.replace(/[*?:\/[\]]/g, ''), locations[location])
    }

    workbook.xlsx.writeFile('./inventory.xlsx')
        .then(() => {
                console.log('Workbook created successfully!');
        })
        .catch((error) => {
            console.error('Error creating workbook:', error);
        });
        global.continueReplen = false
})()


function convertToArrays(data){
    let headerArr = ['SKU', 'Name', 'itemId']
    let rowArr = []

    for(const item in data){
        let pushRow = false
        let row = [item, data[item].name, data[item].itemId]
        for (const bin in data[item].bins){
            if(data[item].bins[bin] != 0){
                if(!headerArr.includes(bin)){headerArr.push(bin)}
                row[headerArr.indexOf(bin)] = data[item].bins[bin]
                pushRow = true
            }
        }

        if (pushRow){rowArr.push(row)}
    }

    return [headerArr, ...rowArr]
}