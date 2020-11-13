/**
 * File used to quick test the `getDictInfos` function of
 * `PubDictionaries.js`
 */

const PubDictionaries = require('../src/PubDictionaries');

const dict = new PubDictionaries({log: true});

// asking for all pubDictionaries information is not supported
dict.getDictInfos( { page: 1, perPage: 4 }, (err, res) => {
  if (err) console.log(JSON.stringify(err, null, 4));
  else {
    console.log(JSON.stringify(res, null, 4));
    console.log('\n#Results: ' + res.items.length);
  }
});
