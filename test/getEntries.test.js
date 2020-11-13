/**
 * File used to quick test the `getEntries` function of
 * `PubDictionaries.js`
 */

const PubDictionaries = require('../src/PubDictionaries');

const dict = new PubDictionaries({log: true});

dict.getEntries(
  { filter: {
    id: [
      'http://purl.obolibrary.org/obo/MONDO_0024919',
      'http://purl.obolibrary.org/obo/MONDO_0006872',
      '2',
      'http://semantic-dicom.org/dcm#ATT2010015E'
    ],
    dictID : [
      'http://pubdictionaries.org/dictionaries/MONDO',
      'http://pubdictionaries.org/dictionaries/test_hpo_ja',
      'http://pubdictionaries.org/dictionaries/ncbi_taxon'
    ]
  },
  page: 1,
  perPage: 14,
  getAllResults: false
  }, (err, res) => {
    if (err) console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
      console.log('\n#Results: ' + res.items.length);
    }
  }
);
