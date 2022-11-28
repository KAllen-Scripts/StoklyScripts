var fileStream = require("fs")

let defaultIn = ((feedIn)=>{
    let returnArr = []
    for (let i of fileStream.readFileSync(feedIn, 'utf8').split(/\r\n|\r|\n/)) {
        try{
            let obj = JSON.parse(i)
            for (const k of Object.keys(obj)) {
                if (Array.isArray(obj[k])) {
                    returnArr.push(...obj[k])
                }
            }
        }catch{}
    }
    return returnArr
})

const run = ((jason = defaultIn("./CombineJSON - input.txt"), feedOut = './Combined JSON.csv', delim = ",")=>{

    //index of 0 is used for headers
    let arrData = [
        []
    ]

    //loop through each object in our array
    for (const i of jason) {
        arrData.push(populate(i))
    }

    //function is called recursively when the value of a property is another object. This includes a whole nother object array
    function populate(obj, arr = [], oldKey = "", option1 = "", option2 = "") {

        //push the values from the last iteration if this was called recursively
        let arrReturn = [...arr]

        for (const i of Object.keys(obj)) {

            //we want some way of identifying hierarchy when this is called recursively. For example, '{item1:{item2:2}}' will show a header of 'item1/item2'
            const key = oldKey + option2 + option1 + i
            //check if value is object array. If it is, we loop through this now so we can add all values to the same line
            if (Array.isArray(obj[i])) {
                if (isObjectArray(obj[i])) {
                    for (const k in obj[i]) {
                        try{
                            arrReturn = [...populate(obj[i][k], arrReturn, key, " - ", " " + (parseInt(k) + 1))]
                        } catch {}
                    }
                } else {
                    obj[i] = obj[i].join(",")
                }

            // call function again if value is object
            } else if (typeof obj[i] == "object" && !Array.isArray(obj[i])) {
                try{
                    arrReturn = [...populate(obj[i], arrReturn, key + "/")]
                }catch{}
            } else {

                //if the header for this does not exist yet, add it
                if (!arrData[0].includes(key)) {
                    arrData[0].push(key)
                }

                //match the index of the value to the index of the header
                arrReturn[arrData[0].indexOf(key)] = obj[i]
            }
        }
        return arrReturn
    }

    //loop through each array in arrData. Then loop through each item in those. If the value is 'undefined' then just add a delimiter
    //else encapsulate it, add the delim, and push it to the string
    let str = ""
    for (const i of arrData) {
        for (let j of i) {
            if (j === undefined) {
                str += delim
            } else {
                //In a CSV, you need to put "" in order to show " when you open the file. This is because " is an encapsulator
                //By having two directly next to eachother, we tell Excel to treat it as one double quote
                str += '"' + String(j).replace(/"/g, '""') + '"' + delim
            }
        }

        //start new line at end of each array
        str += "\r\n"
    }

    fileStream.writeFileSync(feedOut, str)

    // function to determine if a given value is an object array
    function isObjectArray(value) {
        if (value.length < 1 || !Array.isArray(value)) {
            return false
        }
        for (const m of value) {
            if (!(typeof m == "object" && !Array.isArray(m))) {
                return false
            }
        }
        return true
    }
})

run()

module.exports = { run };