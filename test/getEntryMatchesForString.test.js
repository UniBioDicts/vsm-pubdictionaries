/**
 * File used to quick test the `getEntryMatchesForString` function of
 * `PubDictionaries.js`
 */

const PubDictionaries = require('../src/PubDictionaries');

const dict = new PubDictionaries({log: true, suggest: 'substring'});

dict.getEntryMatchesForString('dog',
  { filter: { dictID : [
    'http://pubdictionaries.org/dictionaries/PTO-all',
    'http://pubdictionaries.org/dictionaries/MONDO',
    'http://pubdictionaries.org/dictionaries/human-UniProt'
  ]},
  sort: { dictID : ['http://pubdictionaries.org/dictionaries/PTO-all'] },
  page: 1,
  perPage: 7
  }, (err, res) => {
    if (err) console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
      console.log('\n#Results: ' + res.items.length);
    }
  }
);
