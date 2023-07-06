const getData = require('../../common.js');

const run = async (channelID, scanID)=>{
    let scanData = await getData.run(channelID, scanID)
};

module.exports = {run};