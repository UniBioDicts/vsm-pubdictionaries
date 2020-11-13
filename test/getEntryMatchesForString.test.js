/**
 * File used to quick test the `getEntryMatchesForString` function of
 * `PubDictionaries.js`
 */

const PubDictionaries = require('../src/PubDictionaries');

const dict = new PubDictionaries({log: true});

dict.getEntryMatchesForString('dog',
  { filter: { dictID : [
    'http://pubdictionaries.org/dictionaries/PTO-all',
    'http://pubdictionaries.org/dictionaries/MONDO',
    'http://pubdictionaries.org/dictionaries/human-UniProt'
  ]},
  sort: { dictID : ['http://pubdictionaries.org/dictionaries/human-UniProt'] },
  page: 1,
  perPage: 20
  }, (err, res) => {
    if (err) console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
      console.log('\n#Results: ' + res.items.length);
    }
  }
);
