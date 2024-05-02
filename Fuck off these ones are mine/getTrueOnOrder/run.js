const common = require('../../common.js');

global.enviroment = 'api.stok.ly';

(async () => {
    let trueOnOrder = {}
    let currentOnOrder = await getCurrentOnOrder()

    let composites = await getAllComposites()

    await addPOs(trueOnOrder, composites)
    removeNegatives(trueOnOrder)
    console.log(trueOnOrder)
    await common.askQuestion('PAUSE')
    await addTransfers(trueOnOrder)

    let differences = await compareValues(trueOnOrder, currentOnOrder)

    console.log(differences)
})()

function removeNegatives(trueOnOrder){
    for (const item in trueOnOrder){
        if (trueOnOrder[item].total < 0){trueOnOrder[item].total = 0}
        for (const location in trueOnOrder[item].locations){
            if (trueOnOrder[item].locations[location] < 0){delete trueOnOrder[item].locations[location]}
        }
    }
}

function checkNaN(diff){
    for (const item in diff){
        if (isNaN(diff[item].total)){return true}
        for (const location in diff[item].locations){
            if (isNaN(diff[item].locations[location])){return true}
        }
    }
}


async function compareValues(trueOnOrder, currentOnOrder){
    let differences = {}
    for (const item in trueOnOrder){
        if (differences[item] == undefined){
            differences[item] = {
                total: trueOnOrder[item].total - (currentOnOrder?.[item]?.total || 0),
                locations: {}
            }
        }
        for (const locationVal in trueOnOrder[item].locations){
            if ((trueOnOrder[item].locations[locationVal] - (currentOnOrder?.[item]?.locations?.[locationVal] || 0)) == 0){continue}
            if (differences[item].locations[locationVal] == undefined){
                differences[item].locations[locationVal] = trueOnOrder[item].locations[locationVal] - (currentOnOrder?.[item]?.locations?.[locationVal] || 0)
            }
        }
        if((Object.keys(differences[item].locations).length == 0) && differences[item].total == 0){
            delete differences[item]
        } else {
            differences[item].POs = trueOnOrder?.[item]?.POs
            differences[item].transfers = trueOnOrder?.[item]?.transfers
        }
    }

    for (const item in currentOnOrder){
        if (differences[item] == undefined){
            differences[item] = {
                total: (trueOnOrder?.[item]?.total || 0) - currentOnOrder[item].total,
                locations: {}
            }
        }
        for (const locationVal in currentOnOrder[item].locations){
            if(((trueOnOrder?.[item]?.locations?.[locationVal] || 0) - currentOnOrder[item].locations[locationVal]) == 0){continue}
            if (differences[item].locations[locationVal] == undefined){
                differences[item].locations[locationVal] = (trueOnOrder?.[item]?.locations?.[locationVal] || 0) - currentOnOrder[item].locations[locationVal]
            }
        }
        if((Object.keys(differences[item].locations).length == 0) && differences[item].total == 0){
            delete differences[item]
        } else {
            differences[item].POs = trueOnOrder?.[item]?.POs
            differences[item].transfers = trueOnOrder?.[item]?.transfers
        }
    }

    if(checkNaN(differences)){
        console.trace("Trace at");
        await common.askQuestion('PAUSE')
    }
    return differences
}

async function addPOs(trueOnOrder, composites) {
    await common.loopThrough('Getting Purchase Orders', `https://api.stok.ly/v0/purchase-orders`, 'size=1000', '(([receiptStatus]!={received})%26%26([status]=*{submitted}))', async (PO) => {
        let POItems = {}
        await common.loopThrough('', `https://api.stok.ly/v0/purchase-orders/${PO.purchaseOrderId}/items`, 'size=1000', '', async (POItem) => {
            if (composites[POItem.itemId] != undefined) {
                for (const composing in composites[POItem.itemId]) {
                    POItems[composing] = (POItem.supplierQuantityInUnit * POItem.quantity) * composites[POItem.itemId][composing]
                }
            } else {
                POItems[POItem.itemId] = POItem.supplierQuantityInUnit * POItem.quantity
            }
        })

        await common.loopThrough('', `https://api.stok.ly/v0/goods-receipts`, 'size=1000', `(([referenceIds]::{${PO.purchaseOrderId}}||[referenceId]::{${PO.purchaseOrderId}})%26%26[status]=*{1})`, async (goodsReceipt) => {
            await common.loopThrough('', `https://api.stok.ly/v0/goods-receipts/${goodsReceipt.goodsReceiptId}/items`, 'size=1000', '', async (item) => {
                if(POItems[item.itemId] == undefined){return}
                POItems[item.itemId] -= (item.quantityExpected - item.quantityReceived) < 0 ? item.quantityExpected : item.quantityReceived
            })
        })

        for (const POItem in POItems) {
            if(POItems[POItem] == 0){continue}
            if(trueOnOrder[POItem] == undefined){
                trueOnOrder[POItem] = {locations: {}, POs: [], total: 0}
            }
            if (trueOnOrder[POItem].POs == undefined){trueOnOrder[POItem].POs = []}
            if(trueOnOrder[POItem].locations[PO.deliveryLocationId] == undefined){trueOnOrder[POItem].locations[PO.deliveryLocationId] = 0}
            trueOnOrder[POItem].locations[PO.deliveryLocationId] += POItems[POItem]
            trueOnOrder[POItem].POs.push(PO.niceId)
            trueOnOrder[POItem].total += POItems[POItem]
        }
    })
}

function checkPOID(POItems){
    for (const i in POItems){
        if (i == '004acd35-38de-446a-b691-e98680aac033'){return true}
    }
}

async function addTransfers(trueOnOrder) {
    await common.loopThrough('Getting Transfers', `https://api.stok.ly/v0/stock-transfers`, 'size=1000', '(([receiveStatus]=*{0}||[receiveStatus]=*{1})%26%26([courierRequired]=={1})%26%26([status]=*{1}))', async (transfer) => {
        await common.requester('get', `https://api.stok.ly/v0/stock-transfers/${transfer.stockTransferId}/items`).then(items => {
            for (const item of items.data.data) {
                let amountToAdd = (item.quantityReceived > item.quantityDispatched ? item.quantityDispatched : item.quantityDispatched - item.quantityReceived)
                if (amountToAdd > 0){
                    if (trueOnOrder[item.itemId] == undefined) {
                        trueOnOrder[item.itemId] = {
                            locations: {},
                            transfers: [],
                            total: 0
                        }
                    }
                    if (trueOnOrder[item.itemId].locations[transfer.destinationLocationId] == undefined) {
                        trueOnOrder[item.itemId].locations[transfer.destinationLocationId] = 0
                    }
                    trueOnOrder[item.itemId].locations[transfer.destinationLocationId] += amountToAdd
                    trueOnOrder[item.itemId].transfers.push(transfer.niceId)
                }
            }
        })
    })
}

async function getCurrentOnOrder() {
    let currentOnOrder = {}
    await common.loopThrough('Getting Current On Order', `https://api.stok.ly/v0/items`, 'size=1000', '([status]!={1}%26%26[onOrder]!={0})', (item) => {
        currentOnOrder[item.itemId] = {
            locations: {},
            total: item.onOrder
        }
    })

    await common.loopThrough('Getting Current On Order', `https://api.stok.ly/v1/inventory-records`, 'size=1000', '([onOrder]!={0}%26%26([locationId]!={UNASSIGNED}%26%26[binId]=={UNASSIGNED}))', (record) => {
        if (currentOnOrder[record.itemId] == undefined) {
            currentOnOrder[record.itemId] = {
                locations: {},
                total: 0
            }
        }
        currentOnOrder[record.itemId].locations[record.locationId] = record.onOrder
    })
    return currentOnOrder
}

async function getAllComposites() {
    let composites = {}
    await common.loopThrough('Getting Composing Items', `https://api.stok.ly/v0/composing-items`, 'size=1000', '', (composing) => {
        if (composites[composing.itemId] == undefined) {
            composites[composing.itemId] = {}
        }
        composites[composing.itemId][composing.composingItemId] = composing.quantity
    })
    return composites
}