const PubDictionaries = require('./PubDictionaries');
const { deepClone } = require('./fun');
const chai = require('chai'); chai.should();
const expect = chai.expect;
const assert = chai.assert;
const nock = require('nock');
const fs = require('fs');
const path = require('path');

describe('PubDictionaries.js', () => {
  const testURLBase = 'http://test';
  const pubDictTestURLBase = 'https://pubdictionaries.org';

  // dict uses the `mixed_completion` endpoint
  const dict = new PubDictionaries({ baseURL: testURLBase, log: true });
  // dict2 uses the `substring_completion` endpoint
  const dict2 = new PubDictionaries({
    baseURL: testURLBase, log: true, suggest: 'substring'});
  const dictPub = new PubDictionaries({ baseURL: pubDictTestURLBase, log: true });

  const melanomaStr = 'melanoma';
  const noResultsStr = 'somethingThatDoesNotExist';
  const searchMONDOdict = '/dictionaries/MONDO.json';

  const pubDictPagingOpt = '&page=1&per_page=15';
  const errorNonValidDictionaryNameURL = '/dictionaries/nonValidDictionaryNameeeee.json';
  const noResultsURL = '/dictionaries/human-UniProt/mixed_completion?term=' + noResultsStr + pubDictPagingOpt;
  const tp53URL = '/dictionaries/human-UniProt/mixed_completion?term=tp53' + pubDictPagingOpt;
  const searchNumber5URL = '/dictionaries/human-UniProt/mixed_completion?term=5' + pubDictPagingOpt;
  const searchRefURL = '/dictionaries/human-UniProt/mixed_completion?term=it' + pubDictPagingOpt;

  const jsonErrorNonValidDictName = path.join(__dirname, '..',
    'resources', 'unknown_dict.json');
  const jsonResMondoDictInfo = path.join(__dirname, '..',
    'resources', 'mondo_dictinfo.json');
  const jsonPubDictUniprot3Results = path.join(__dirname, '..',
    'resources', 'query_pubdictionaries_human_uniprot_3_results.json');
  const jsonFindTermsResults = path.join(__dirname, '..',
    'resources', 'query_find_terms.json');

  const errorNonValidDictionaryNameURLJSONString =
    fs.readFileSync(jsonErrorNonValidDictName, 'utf8');
  const mondoDictInfoJSONString = fs.readFileSync(jsonResMondoDictInfo, 'utf8');
  const pubDictUniprot3ResultsJSONString =
    fs.readFileSync(jsonPubDictUniprot3Results, 'utf8');
  const pubDictFindTermsEndpointResultsJSONString =
    fs.readFileSync(jsonFindTermsResults, 'utf8');

  const expectedTP53MatchObjArray = [
    {
      id: 'https://www.uniprot.org/uniprot/P04637',
      dictID: 'https://pubdictionaries.org/dictionaries/human-UniProt',
      str: 'TP53',
      descr: 'uniprot.org/uniprot/P04637',
      type: 'T',
      terms: [
        {
          str: 'TP53'
        }
      ],
      z: {
        dictAbbrev: 'human-UniProt'
      }
    },
    {
      id: 'https://www.uniprot.org/uniprot/Q53FA7',
      dictID: 'https://pubdictionaries.org/dictionaries/human-UniProt',
      str: 'TP53I3',
      descr: 'uniprot.org/uniprot/Q53FA7',
      type: 'T',
      terms: [
        {
          str: 'TP53I3',
        }
      ],
      z: {
        dictAbbrev: 'human-UniProt'
      }
    },
    {
      id: 'https://www.uniprot.org/uniprot/Q96S44',
      dictID: 'https://pubdictionaries.org/dictionaries/human-UniProt',
      str: 'TP53RK',
      descr: 'uniprot.org/uniprot/Q96S44',
      type: 'T',
      terms: [
        {
          str: 'TP53RK'
        }
      ],
      z: {
        dictAbbrev: 'human-UniProt'
      }
    }];
  const expectedGetEntriesObjArray = [
    {
      id: '2',
      dictID: 'https://pubdictionaries.org/dictionaries/ncbi_taxon',
      descr: '2',
      terms: [
        { str: 'Monera' }, { str: 'Bacterias' }, { str: '"Procaryotae"' },
        { str: '"Bacteria"' }, { str: 'Prokaryota' }
      ],
      z: {
        dictAbbrev: 'ncbi_taxon'
      }
    },
    {
      id: '2',
      dictID: 'https://pubdictionaries.org/dictionaries/test_hpo_ja',
      descr: '2',
      terms: [{ str: '筋肥大' }],
      z: {
        dictAbbrev: 'test_hpo_ja'
      }
    },
    {
      id: '5',
      dictID: 'https://pubdictionaries.org/dictionaries/test_hpo_ja',
      descr: '5',
      terms: [{ str: '便秘' }],
      z: {
        dictAbbrev: 'test_hpo_ja'
      }
    },
    {
      id: 'http://purl.obolibrary.org/obo/MONDO_0006872',
      dictID: 'https://pubdictionaries.org/dictionaries/MONDO',
      descr: 'purl.obolibrary.org/obo/MONDO_0006872',
      terms: [{ str: 'allergy to nuts' }, { str: 'nut allergic reaction' },
        { str: 'allergy of 022 tree nuts (tn) (ccpr)' },
        { str: 'nut allergic reaction' }, { str: 'nut allergy' }
      ],
      z: {
        dictAbbrev: 'MONDO'
      }
    },
    {
      id: 'http://purl.obolibrary.org/obo/MONDO_0024919',
      dictID: 'https://pubdictionaries.org/dictionaries/MONDO',
      descr: 'purl.obolibrary.org/obo/MONDO_0024919',
      terms: [
        { str: 'dog disease' },
        { str: 'diseases, Dog' },
        { str: 'disease, canine' }
      ],
      z: {
        dictAbbrev: 'MONDO'
      }
    }
  ];

  before(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  after(() => {
    nock.enableNetConnect();
  });

  describe('getDictInfos', () => {
    it('returns empty result for non-valid pub-dictionary name', cb => {
      nock(testURLBase).get(errorNonValidDictionaryNameURL)
        .reply(400, errorNonValidDictionaryNameURLJSONString);
      dict.getDictInfos({ filter: {
        id : [pubDictTestURLBase + '/dictionaries/nonValidDictionaryNameeeee']
      }},(err, res) => {
        expect(err).to.be.null;
        res.items.should.deep.equal([]);
        cb();
      });
    });

    it('returns proper formatted error when the server responds with a '
      + 'text string', cb => {
      nock(pubDictTestURLBase).get(errorNonValidDictionaryNameURL)
        .reply(404, '<h1>Not Found</h1>');
      dictPub.getDictInfos({ filter: {
        id : [pubDictTestURLBase + '/dictionaries/nonValidDictionaryNameeeee']
      }},(err, res) => {
        err.should.deep.equal({
          status: 404,
          error: '<h1>Not Found</h1>'
        });
        assert.typeOf(res, 'undefined');
        cb();
      });
    });

    it('returns proper dictInfo object for the MONDO pubDictionary', cb => {
      nock(pubDictTestURLBase).get(searchMONDOdict)
        .reply(200, mondoDictInfoJSONString);
      dictPub.getDictInfos({ filter: { id : [pubDictTestURLBase + '/dictionaries/MONDO']}},
        (err, res) => {
          expect(err).to.equal(null);
          res.should.deep.equal(
            { items: [
              {
                id: pubDictTestURLBase + '/dictionaries/MONDO',
                name: 'MONDO'
              }
            ]}
          );
          cb();
        });
    });

    it('returns empty result without sending request to the pubDictionaries ' +
      'server because of the trimming of results casued by the `page` ' +
      'option', cb => {
      dictPub.getDictInfos({ filter: {
        id : [
          pubDictTestURLBase + '/dictionaries/MONDO',
          pubDictTestURLBase + '/dictionaries/human-UniProt',
        ]
      }, page: 2}, (err, res) => {
        // asking for 2nd page with 15 results per page, this
        // should not go to the server
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
        cb();
      });
    });

    it('returns empty result when the list of dictIDs does not '
      + 'include a pubDictionaries dictID', cb => {
      dictPub.getDictInfos({ filter: { id: [
        ' ',
        'https://www.rnacentral.org',
        'https://www.ensembl.org' ]}},
      (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
        cb();
      });
    });

    it('returns an error object when the request is for all pubDictionaries', cb => {
      dictPub.getDictInfos({},
        (err, res) => {
          assert.typeOf(res, 'undefined');
          err.should.deep.equal({ status: 404, error: 'Not supported' });
        });
      cb();
    });
  });

  describe('getEntries', () => {
    it('returns empty result when the `options.filter.dictID` is properly ' +
      'defined and in the list of dictIDs there is no valid pubDictionary ' +
      'dictID', cb => {
      dict.getEntries({filter: { dictID: ['']}}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      dict.getEntries({filter: { dictID: [
        ' ',
        'https://www.rnacentral.org',
        'https://www.ensembl.org'
      ]}}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      cb();
    });

    it('returns proper formatted error for non-valid dictionary name in ' +
      '`filter.dictID`', cb => {
      let queryStr = errorNonValidDictionaryNameURL.replace('.json','') + '/entries.json?page=1&per_page=15';
      nock(pubDictTestURLBase).get(queryStr)
        .reply(400, errorNonValidDictionaryNameURLJSONString);

      dictPub.getEntries({ filter: { dictID : [
        pubDictTestURLBase + errorNonValidDictionaryNameURL.replace('.json','')
      ]}},(err, res) => {
        err.should.deep.equal({
          error: 'Unknown dictionary: nonValidDictionaryNameeeee.',
          status: 404
        });
        assert.typeOf(res, 'undefined');
        cb();
      });
    });

    it('returns an error object when the request is for all entries in all ' +
      'pubDictionaries (paginated), i.e. when no `options.filter` specified ' +
      'or it is not in proper format', cb => {
      dictPub.getEntries({}, (err, res) => {
        assert.typeOf(res, 'undefined');
        err.should.deep.equal({ status: 404, error: 'Not supported' });
      });

      dictPub.getEntries({filter: 'test'}, (err, res) => {
        assert.typeOf(res, 'undefined');
        err.should.deep.equal({ status: 404, error: 'Not supported' });
      });

      dictPub.getEntries({filter: {id : ''}}, (err, res) => {
        assert.typeOf(res, 'undefined');
        err.should.deep.equal({ status: 404, error: 'Not supported' });
      });

      dictPub.getEntries({filter: {dictID : []}}, (err, res) => {
        assert.typeOf(res, 'undefined');
        err.should.deep.equal({ status: 404, error: 'Not supported' });
      });

      cb();
    });
  });

  describe('getEntryMatchesForString', () => {
    it('returns proper formatted error for non-valid when no dictionaries ' +
      'are queries based on the `options.sort`, `options.filter` and `page` ' +
      'options', cb => {
      // no dictIDs whatsoever
      dict.getEntryMatchesForString(melanomaStr, {}, (err, res) => {
        err.should.have.property('error');
        err.should.have.property('status');
        err.error.includes('Not supported').should.be.true;
        err.status.should.equal(404);
        assert.typeOf(res, 'undefined');
      });

      dict.getEntryMatchesForString(melanomaStr, { filter: { dictID : [] },
        sort: { dictID : [] }}, (err, res) => {
        err.should.have.property('error');
        err.should.have.property('status');
        err.error.includes('Not supported').should.be.true;
        err.status.should.equal(404);
        assert.typeOf(res, 'undefined');
      });

      // only sort dictIDs and page > 1
      dict.getEntryMatchesForString(melanomaStr, { sort: {
        dictID : [
          'http://test/dictionaries/A',
          'http://test/dictionaries/B',
          'http://test/dictionaries/C'
        ]}, page: 2 }, (err, res) => {
        err.should.have.property('error');
        err.should.have.property('status');
        err.error.includes('Not supported').should.be.true;
        err.status.should.equal(404);
        assert.typeOf(res, 'undefined');
      });

      cb();
    });

    it('returns proper formatted error for non-valid dictionary name in search' +
      'query', cb => {
      let queryStr = errorNonValidDictionaryNameURL.replace('.json','') +
        '/mixed_completion?term=a' + pubDictPagingOpt;
      nock(pubDictTestURLBase).get(queryStr)
        .reply(400, errorNonValidDictionaryNameURLJSONString);

      dictPub.getEntryMatchesForString('a', { filter: { dictID : [
        pubDictTestURLBase + errorNonValidDictionaryNameURL.replace('.json','')
      ]}},(err, res) => {
        err.should.deep.equal({
          error: 'Unknown dictionary: nonValidDictionaryNameeeee.',
          status: 404
        });
        assert.typeOf(res, 'undefined');
        cb();
      });
    });

    it('returns empty array of match objects when the PubDictionaries server ' +
      'does not return any result entry', cb => {
      nock(testURLBase).get(noResultsURL).reply(200, '[]');

      dict.getEntryMatchesForString(noResultsStr, {filter: { dictID : [
        pubDictTestURLBase + '/dictionaries/human-UniProt']}}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
        cb();
      });
    });

    it('returns empty array of match objects when the search string is empty', cb => {
      dict.getEntryMatchesForString(' ', {}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
        cb();
      });
    });

    it('returns empty result when the `options.filter.dictID` is properly ' +
      'defined and in the list of dictIDs there is no valid pubDictionaries ' +
      'dictID', cb => {
      dict.getEntryMatchesForString(melanomaStr, {filter: { dictID: ['']}},
        (err, res) => {
          expect(err).to.equal(null);
          res.should.deep.equal({ items: [] });
        });

      dict.getEntryMatchesForString(melanomaStr, {filter: { dictID: [
        ' ',
        'https://www.rnacentral.org',
        'https://www.ensembl.org']}},
      (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      cb();
    });

    it('calls the pubDictionaries API and returns proper vsm match objects', cb => {
      nock(testURLBase).get(tp53URL)
        .reply(200, pubDictUniprot3ResultsJSONString);

      dict.getEntryMatchesForString('tp53', { filter:
          { dictID: [pubDictTestURLBase + '/dictionaries/human-UniProt'] }
      }, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: expectedTP53MatchObjArray });
        cb();
      });
    });
  });

  describe('getMatchesForString', () => {
    it('lets the parent class add a number-string match', cb => {
      // we hypothesize that the pubDictionaries server returns empty result
      nock(testURLBase).get(searchNumber5URL)
        .reply(200, '[]');

      dict.getMatchesForString('5', {
        filter: {
          dictID: [
            pubDictTestURLBase + '/dictionaries/human-UniProt'
          ]
        }
      }, (err, res) => {
        res.should.deep.equal(
          {
            items: [{ id:'00:5e+0', dictID:'00', str:'5', descr:'number', type:'N' }]
          });
        cb();
      });
    });

    it('lets the parent class add a default refTerm match', cb => {
      // we hypothesize that the pubDictionaries server returns empty result
      nock(testURLBase).get(searchRefURL)
        .reply(200, '[]');

      dict.getMatchesForString('it', {
        filter: {
          dictID: [
            pubDictTestURLBase + '/dictionaries/human-UniProt'
          ]
        }
      }, (err, res) => {
        res.should.deep.equal(
          {
            items: [{ id:'', dictID:'', str:'it', descr:'referring term', type:'R' }]
          });
        cb();
      });
    });
  });

  describe('buildDictInfoURLs', () => {
    it('returns empty array if there is no proper `filter.id` array ' +
      'of dictIDs (proper means non-empty and PubDictionary-like ids)', cb => {
      const options1 = {
        page: 2
      };
      const options2 = {
        filter: {},
        page: 1
      };
      const options3 = {
        filter: { dict: {} }
      };
      const options4 = {
        filter: { id: 'any' }
      };
      const options5 = {
        filter: { id: [] }
      };
      const options6 = {};
      const options7 = {
        filter: { id: ['', ' ']}
      };
      const options8 = {
        filter: { id: [
          '', 'https://www.rnacentral.org', 'https://www.ensembl.org'
        ]}
      };

      const res1 = dict.buildDictInfoURLs(options1);
      const res2 = dict.buildDictInfoURLs(options2);
      const res3 = dict.buildDictInfoURLs(options3);
      const res4 = dict.buildDictInfoURLs(options4);
      const res5 = dict.buildDictInfoURLs(options5);
      const res6 = dict.buildDictInfoURLs(options6);
      const res7 = dict.buildDictInfoURLs(options7);
      const res8 = dict.buildDictInfoURLs(options8);
      const expectedResult = [];

      res1.should.deep.equal(expectedResult);
      res2.should.deep.equal(expectedResult);
      res3.should.deep.equal(expectedResult);
      res4.should.deep.equal(expectedResult);
      res5.should.deep.equal(expectedResult);
      res6.should.deep.equal(expectedResult);
      res7.should.deep.equal(expectedResult);
      res8.should.deep.equal(expectedResult);

      cb();
    });

    it('returns an array of URLs corresponding to the PubDictionaries ' +
      'that were taken from the `filter.id` array ', cb => {
      const options1 = {
        filter: { id: [
          pubDictTestURLBase + '/dictionaries/A',
          pubDictTestURLBase + '/dictionaries/B',
          pubDictTestURLBase + '/dictionaries/C'
        ]},
        page: 2,
        perPage: 2
      };
      const options2 = {
        filter: { id: [
          pubDictTestURLBase + '/dictionaries/GOO!!',
        ]}
      };
      const options3 = { // should prune non PubDictionary-like ids
        filter: { id: [
          ' ', '',
          'https://www.rnacentral.org',
          testURLBase + '/dictionaries/GO',
          'https://www.ensembl.org',
          pubDictTestURLBase + '/dictionaries/GOO!!' // only this should pass
        ]}
      };
      const res1 = dictPub.buildDictInfoURLs(options1);
      const res2 = dictPub.buildDictInfoURLs(options2);
      const res3 = dictPub.buildDictInfoURLs(options3);

      const expectedResult1 = [
        pubDictTestURLBase + '/dictionaries/A.json',
        pubDictTestURLBase + '/dictionaries/B.json',
        pubDictTestURLBase + '/dictionaries/C.json'
      ];
      const expectedResult2 = [
        pubDictTestURLBase + '/dictionaries/GOO!!.json'
      ];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult2);

      cb();
    });
  });

  describe('buildEntryURLs', () => {
    it('returns empty array when asking for all entry objects if options is ' +
      'empty or both `filter.id` and `filter.dictID` are not in proper format', cb => {
      const options1 = {};
      const options2 = { filter: {}, sort: 'id' };
      const options3 = { filter: { id: [], dictID: '' }, sort: '', page: 1,
        perPage: 10 };

      const res1 = dict.buildEntryURLs(options1);
      const res2 = dict.buildEntryURLs(options2);
      const res3 = dict.buildEntryURLs(options3);
      options3.page = 2;
      const res4 = dict.buildEntryURLs(options3);

      const expectedResult = [];

      res1.should.deep.equal(expectedResult);
      res2.should.deep.equal(expectedResult);
      res3.should.deep.equal(expectedResult);
      res4.should.deep.equal(expectedResult);

      cb();
    });

    it('returns proper URLs when asking for specific entry objects when ' +
      'when filter.dictID` is in proper format and `filter.id` is not', cb => {
      const options1 = {
        filter: {
          id: [],
          dictID: [
            pubDictTestURLBase + '/dictionaries/A',
            pubDictTestURLBase + '/dictionaries/B',
            pubDictTestURLBase + '/dictionaries/C'
          ]},
        sort: 'id'
      };

      const options2 = {
        filter: {
          dictID: [
            pubDictTestURLBase + '/dictionaries/A',
            pubDictTestURLBase + '/dictionaries/C',
            pubDictTestURLBase + '/dictionaries/B'
          ]},
        page: 1,
        perPage: 10
      };

      const options3 = {
        filter: {
          dictID: [
            pubDictTestURLBase + '/dictionaries/C',
            pubDictTestURLBase + '/dictionaries/B',
            pubDictTestURLBase + '/dictionaries/A'
          ]},
        page: 2,
        perPage: 10
      };

      const res1 = dict.buildEntryURLs(options1);
      const res2 = dict.buildEntryURLs(options2);
      const res3 = dict.buildEntryURLs(options3);

      const expectedResult1 = [ // sort has nothing to do with the URLs
        testURLBase + '/dictionaries/A/entries.json?page=1&per_page=15',
        testURLBase + '/dictionaries/B/entries.json?page=1&per_page=15',
        testURLBase + '/dictionaries/C/entries.json?page=1&per_page=15'
      ];
      const expectedResult2 = [ // dictNames are sorted
        testURLBase + '/dictionaries/A/entries.json?page=1&per_page=10',
        testURLBase + '/dictionaries/B/entries.json?page=1&per_page=10',
        testURLBase + '/dictionaries/C/entries.json?page=1&per_page=10'
      ];
      // dictNames are sorted
      const expectedResult3 = [
        testURLBase + '/dictionaries/A/entries.json?page=2&per_page=10',
        testURLBase + '/dictionaries/B/entries.json?page=2&per_page=10',
        testURLBase + '/dictionaries/C/entries.json?page=2&per_page=10'
      ];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);

      cb();
    });

    it('returns proper URLs asking for specific entry objects when ' +
      'the `filter.id` is in proper format and `filter.dictID` is not', cb => {
      const options1 = {
        filter: {
          id: [
            'http://purl.bioontology.org/ontology/MEDDRA/10053571',
            'http://purl.bioontology.org/ontology/LNC/LA14279-6'
          ],
          dictID: []
        }
      };

      const options2 = {
        filter: {
          id: ['http://purl.bioontology.org/ontology/MEDDRA/10053571']
        },
        sort: 'id',
        page: 1,
        perPage: 10
      };

      const res1 = dict.buildEntryURLs(options1);
      const res2 = dict.buildEntryURLs(options2);
      options2.page = 2;
      const res3 = dict.buildEntryURLs(options2);

      const expectedResult1 = [
        testURLBase + '/find_terms.json?dictionaries=&ids=http%3A%2F%2Fpurl.bioontology.org%2Fontology%2FMEDDRA%2F10053571%7Chttp%3A%2F%2Fpurl.bioontology.org%2Fontology%2FLNC%2FLA14279-6'
      ];
      const expectedResult2 = [ // no paging on this type of query supported
        testURLBase + '/find_terms.json?dictionaries=&ids=http%3A%2F%2Fpurl.bioontology.org%2Fontology%2FMEDDRA%2F10053571'
      ];
      const expectedResult3 = expectedResult2; // no paging, no sorting here

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      cb();
    });

    it('returns proper URLs asking for specific entry objects when ' +
      'both the `filter.id` and the `filter.dictID` are in proper format', cb => {
      const options = {
        filter: {
          id: [
            'http://purl.obolibrary.org/obo/BFO_0000002',
            'http://purl.bioontology.org/ontology/LNC/LA14279-6'
          ],
          dictID: [
            pubDictTestURLBase + 'dictionaries/C',
            pubDictTestURLBase + 'dictionaries/W',
            pubDictTestURLBase + 'dictionaries/A',
          ]
        },
        sort: 'id', // sort nad paging do not matter for the URLs built
        page: 1,
        perPage: 4
      };

      const res1 = dict.buildEntryURLs(options);
      const expectedResult1 = [
        testURLBase + '/find_terms.json?dictionaries=C,W,A&ids=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FBFO_0000002%7Chttp%3A%2F%2Fpurl.bioontology.org%2Fontology%2FLNC%2FLA14279-6'
      ];

      options.page = 2; // page does not matter
      const res2 = dict.buildEntryURLs(options);
      const expectedResult2 = expectedResult1;

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);

      cb();
    });
  });

  describe('buildMatchURLs', () => {
    it('returns no URLs when there is neither `options.filter` and ' +
      '`options.sort` given, no matter the page asked', cb => {
      const options = {
        filter: { dictID : [] },
        sort: { dictID : [] },
        z: true,
        page: 1,
        perPage: 20
      };

      const res1 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult1 = [];

      options.page = 20;
      const res2 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult2 = [];

      const res3 = dict2.buildMatchURLs(melanomaStr, options);
      const expectedResult3 = [];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      cb();
    });

    it('returns two URLs when `options.filter` is given but no ' +
      '`options.sort`', cb => {
      const options = {
        filter: { dictID : [
          'http://test/dictionaries/A',
          'http://test/dictionaries/B',
          'http://test/dictionaries/C'
        ]},
        sort: {},
        z: true,
        page: 1,
        perPage: 20
      };

      const res1 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult1 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=1&per_page=20',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=1&per_page=20',
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma&page=1&per_page=20'
      ];

      options.page = 20;
      const res2 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult2 = expectedResult1.map(url =>
        url.replace('page=1', 'page=20'));

      const res3 = dict2.buildMatchURLs(melanomaStr, options);
      const expectedResult3 = expectedResult1.map(url =>
        url.replace('page=1', 'page=20').replace('mixed', 'substring'));

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      cb();
    });

    it('returns proper URLs when `options.sort` is given but no ' +
      '`options.filter`, based on the `options.page` value', cb => {
      const options = {
        filter: { dictID : [] },
        sort: { dictID : [
          'http://test/dictionaries/A',
          'http://test/dictionaries/B',
          'http://test/dictionaries/C'
        ]},
        z: true,
        page: 1
      };

      const res1 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult1 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      options.page = 2;
      const res2 = dict.buildMatchURLs(melanomaStr, options);
      // page > 1 and sort.dictID are not compatible according to spec
      const expectedResult2 = [];

      // no `page` option is like `page == 1`
      delete options.page;
      const res3 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult3 = expectedResult1;

      const res4 = dict2.buildMatchURLs(melanomaStr, options);
      const expectedResult4 = [
        testURLBase + '/dictionaries/A/substring_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/B/substring_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/C/substring_completion?term=melanoma' + pubDictPagingOpt
      ];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      res4.should.deep.equal(expectedResult4);
      cb();
    });

    it('returns proper URLs when both `options.sort` and `options.filter` ' +
      'are given, based on the `options.page` value', cb => {
      const options = {
        filter: { dictID : [
          'http://test/dictionaries/A',
          'http://test/dictionaries/B',
          'http://test/dictionaries/C'
        ]},
        sort: { dictID : [
          'http://test/dictionaries/A'
        ]},
        z: true,
        page: 1,
        perPage: 15
      };

      // filter.dictID = {A,B,C}, sort.dictID = {A}, page = 1
      const res0 = dict2.buildMatchURLs(melanomaStr, options);
      const expectedResult0 = [
        testURLBase + '/dictionaries/A/substring_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/B/substring_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/C/substring_completion?term=melanoma' + pubDictPagingOpt
      ];

      // filter.dictID = {A,B,C}, sort.dictID = {A}, page = 1
      const res1 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult1 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      // filter.dictID = {A,B,C}, sort.dictID = {A,C}, no page
      options.sort.dictID.push('http://test/dictionaries/C');
      delete options.page;
      options.perPage = 10;
      const res2 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult2 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=1&per_page=10'
      ];

      // filter.dictID = {A,B,C,D}, sort.dictID = {A,C}, page = 2
      options.filter.dictID.push('http://test/dictionaries/D');
      options.page = 2;
      const res3 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult3 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=2&per_page=10',
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma&page=2&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=2&per_page=10',
        testURLBase + '/dictionaries/D/mixed_completion?term=melanoma&page=2&per_page=10'
      ];

      // filter.dictID = {A,B}, sort.dictID = {A,C}, page = 2
      options.filter.dictID = options.filter.dictID.splice(0,2);
      const res4 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult4 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=2&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=2&per_page=10'
      ];

      // filter.dictID = {A,B,F}, sort.dictID = {A,C}, page = 3
      options.filter.dictID.push('http://test/dictionaries/F');
      options.page = 3;
      const res5 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult5 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=3&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=3&per_page=10',
        testURLBase + '/dictionaries/F/mixed_completion?term=melanoma&page=3&per_page=10'
      ];

      // filter.dictID = {A,B,F}, sort.dictID = {A,C}, no page
      delete options.page;
      const res6 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult6 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/F/mixed_completion?term=melanoma&page=1&per_page=10'
      ];

      // filter.dictID = {A,B,F}, sort.dictID = {A,B,F}, no page
      options.sort.dictID.pop();
      options.sort.dictID.push('http://test/dictionaries/B');
      options.sort.dictID.push('http://test/dictionaries/F');
      const res7 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult7 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=1&per_page=10',
        testURLBase + '/dictionaries/F/mixed_completion?term=melanoma&page=1&per_page=10'
      ];

      options.page = 20;
      const res8 = dict.buildMatchURLs(melanomaStr, options);
      const expectedResult8 = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=20&per_page=10',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=20&per_page=10',
        testURLBase + '/dictionaries/F/mixed_completion?term=melanoma&page=20&per_page=10'
      ];

      // filter.dictID = {A,B,F}, sort.dictID = {A,B,F,G}, page 20
      options.sort.dictID.push('http://test/dictionaries/G');
      const res9 = dict.buildMatchURLs(melanomaStr, options);

      res0.should.deep.equal(expectedResult0);
      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      res4.should.deep.equal(expectedResult4);
      res5.should.deep.equal(expectedResult5);
      res6.should.deep.equal(expectedResult6);
      res7.should.deep.equal(expectedResult7);
      res8.should.deep.equal(expectedResult8);
      res9.should.deep.equal(expectedResult8);
      cb();
    });
  });

  describe('splitDicts', () => {
    it('returns empty dictionaries when neither filter nor sort ' +
      'properties are given, they do not have arrays as values or ' +
      'they have empty arrays as values', cb => {
      const options1 = { page: 1 };
      const options2 = {
        filter: { dictID: 'any' },
        sort: { dictID: 345 }
      };
      const options3 = {
        filter: { dictID: [] },
        sort: { dictID: [] }
      };

      const res1 = dict.splitDicts(options1);
      const res2 = dict.splitDicts(options2);
      const res3 = dict.splitDicts(options3);

      const expectedResult = { pref: [], rest: [] };

      res1.should.deep.equal(expectedResult);
      res2.should.deep.equal(expectedResult);
      res3.should.deep.equal(expectedResult);
      cb();
    });

    it('splits dictionaries properly when no or empty sort property is given', cb => {
      const options1 = {
        filter: { dictID: ['a','b'] },
        page: 3
      };

      const options2 = {
        filter: { dictID: ['a','b'] } ,
        sort: { dictID: [] }
      };

      const expectedResult = {
        pref: [],
        rest: ['a','b']
      };

      const res1 = dict.splitDicts(options1);
      const res2 = dict.splitDicts(options2);

      res1.should.deep.equal(expectedResult);
      res2.should.deep.equal(expectedResult);
      cb();
    });

    it('splits dictionaries properly when no or empty filter property is given', cb => {
      const options1 = {
        sort: { dictID: ['d','e'] },
        page: 3
      };

      const options2 = {
        filter: { dictID: [] },
        sort: { dictID: ['d','e'] }
      };

      const expectedResult = {
        pref: ['d','e'],
        rest: []
      };

      const res1 = dict.splitDicts(options1);
      const res2 = dict.splitDicts(options2);

      res1.should.deep.equal(expectedResult);
      res2.should.deep.equal(expectedResult);
      cb();
    });

    it('splits dictionaries properly when both filter and sort ' +
      'properties are given ', cb => {
      const options1 = {
        filter: { dictID: ['a','b','c','d'] },
        sort: { dictID: ['a','c'] }
      };

      const expectedResult1 = {
        pref: ['a','c'],
        rest: ['b','d']
      };

      const options2 = {
        filter: { dictID: ['a','b','c','d'] },
        sort: { dictID: ['e','b'] }
      };

      const expectedResult2 = {
        pref: ['b'],
        rest: ['a','c','d']
      };

      const options3 = {
        filter: { dictID: ['a','b','c','d'] },
        sort: { dictID: ['e','f'] }
      };

      const expectedResult3 = {
        pref: [],
        rest: ['a','b','c','d']
      };

      const options4 = {
        filter: { dictID: ['e','b'] },
        sort: { dictID: ['e','b'] }
      };

      const expectedResult4 = {
        pref: [],
        rest: ['e','b']
      };

      const options5 = {
        filter: { dictID: ['a','b'] },
        sort: { dictID: ['a','b','c','d'] }
      };

      const expectedResult5 = {
        pref: [],
        rest: ['a','b']
      };

      const options6 = {
        filter: { dictID: ['e','f'] },
        sort: { dictID: ['a','b','c','d'] }
      };

      const expectedResult6 = {
        pref: [],
        rest: ['e','f']
      };

      const res1 = dict.splitDicts(options1);
      const res2 = dict.splitDicts(options2);
      const res3 = dict.splitDicts(options3);
      const res4 = dict.splitDicts(options4);
      const res5 = dict.splitDicts(options5);
      const res6 = dict.splitDicts(options6);

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);
      res4.should.deep.equal(expectedResult4);
      res5.should.deep.equal(expectedResult5);
      res6.should.deep.equal(expectedResult6);

      cb();
    });
  });

  describe('mapPubDictResToDictInfoObj', () => {
    it('properly maps MONDO dictionary\'s returned JSON object to a ' +
      'VSM dictInfo object', cb => {

      const res = dictPub.mapPubDictResToDictInfoObj(
        JSON.parse(mondoDictInfoJSONString)
      );

      const expectedResult = [
        {
          id: pubDictTestURLBase + '/dictionaries/MONDO',
          name: 'MONDO'
        }
      ];

      res.should.deep.equal(expectedResult);
      cb();
    });
  });

  describe('mapPubDictEntriesResToEntryObj', () => {
    it('returns an empty array of entries when the url does not contain neither' +
      ' the `entries` nor the `find_terms` endpoints', cb => {
      dict.mapPubDictEntriesResToEntryObj({}, errorNonValidDictionaryNameURL)
        .should.deep.equal([]);
      cb();
    });

    it('properly maps pubDictionaries returned JSON object to a VSM entry ' +
      'object when the url includes the `entries` endpoint', cb => {
      let url = pubDictTestURLBase + '/dictionaries/human-UniProt/entries.json?page=1&per_page=15';
      // answer is not corresponding to the query but is in the same format:
      // i.e. an array of pbjects with `id`+`label` properties
      let res = JSON.parse(pubDictUniprot3ResultsJSONString);

      const entryObjArray = dict.mapPubDictEntriesResToEntryObj(res, url);

      let expectedTP53EntryObjArray = deepClone(expectedTP53MatchObjArray);
      // remove the properties that a VSM-entry object does not have
      expectedTP53EntryObjArray.forEach(entry => {
        delete entry.type;
        delete entry.str;
      });

      entryObjArray.should.deep.equal(expectedTP53EntryObjArray);
      cb();
    });

    it('properly maps pubDictionaries returned JSON object to an empty ' +
      'array when the pubDictionaries response is an empty object using the ' +
      '`find_terms` endpoint', cb => {
      let url = 'stringThatHasSomewhere_find_terms.json_';
      let res = JSON.parse('{}');
      dict.mapPubDictEntriesResToEntryObj(res, url).should.deep.equal([]);
      cb();
    });

    it('properly maps pubDictionaries returned JSON object to a VSM entry ' +
      'object when the url includes the `find_terms` endpoint', cb => {
      let url = 'stringThatHasSomewhere_find_terms.json_';
      let res = JSON.parse(pubDictFindTermsEndpointResultsJSONString);

      const entryObjArray = dict.mapPubDictEntriesResToEntryObj(res, url);
      entryObjArray.should.deep.equal(expectedGetEntriesObjArray);
      cb();
    });
  });

  describe('mapPubDictSearchResToMatchObj', () => {
    it('properly maps PudDictionaries returned JSON object to a VSM match' +
      'object', cb => {
      let url = tp53URL;
      let str = 'tp53';
      let res = JSON.parse(pubDictUniprot3ResultsJSONString);
      const matchObjArray = dict.mapPubDictSearchResToMatchObj(res, url, str);

      matchObjArray.should.deep.equal(expectedTP53MatchObjArray);
      cb();
    });
  });

  describe('refineID', () => {
    it('removes `http(s)://` or `www.` from the ids to make a more friendly ' +
      'looking description string', cb => {
      dict.refineID('http://purl.obolibrary.org/obo/MONDO_0024919').
        should.equal('purl.obolibrary.org/obo/MONDO_0024919');
      dict.refineID(' https://purl.obolibrary.org/obo/MONDO_0024919').
        should.equal('purl.obolibrary.org/obo/MONDO_0024919');
      dict.refineID('www.ontology.gr ').
        should.equal('ontology.gr');
      dict.refineID('https://www.ontology.gr ').
        should.equal('ontology.gr');

      dict.refineID('42').should.equal('42');

      cb();
    });
  });

  describe('getDictNamesFromArray', () => {
    it('returns empty array when given empty array', cb => {
      const res = dict.getDictNamesFromArray([]);
      res.should.deep.equal([]);
      cb();
    });

    it('returns proper dictionary names when given a list of dictIDs', cb => {
      const dictIDs = [
        'http://pubdictionaries.org/dictionaries/human-UniProt',
        'http://pubdictionaries.org/dictionaries/PTO-all',
        'http://pubdictionaries.org/dictionaries/MONDO'
      ];

      const res = dict.getDictNamesFromArray(dictIDs);
      const expectedDictIDs = ['human-UniProt', 'PTO-all', 'MONDO'];
      res.should.deep.equal(expectedDictIDs);
      cb();
    });
  });

  describe('prepareDictInfoSearchURL', () => {
    it('leaves the template url unchanged when `dictName` is equal to an ' +
      'empty string', cb => {
      const url1 = dict.prepareDictInfoSearchURL('  ');
      const url2 = dict.prepareDictInfoSearchURL('');
      const expectedURL = testURLBase + '/dictionaries/$filterDictID.json';

      url1.should.equal(expectedURL);
      url2.should.equal(expectedURL);
      cb();
    });

    it('returns proper url when `dictName` is not empty', cb => {
      const url1 = dict.prepareDictInfoSearchURL('GO');
      const url2 = dictPub.prepareDictInfoSearchURL('GOO!');
      const expectedURL1 = testURLBase + '/dictionaries/GO.json';
      const expectedURL2 = pubDictTestURLBase + '/dictionaries/GOO!.json';

      url1.should.equal(expectedURL1);
      url2.should.equal(expectedURL2);
      cb();
    });
  });

  describe('prepareEntrySearchURLs', () => {
    it('returns proper URL(s) according to 4 of the possible input ' +
      'combinations that are used by buildEntryURLs()', cb => {
      const url1 = dictPub.prepareEntrySearchURLs(
        { page: 2, perPage: 20 }, [], []);
      const url2 = dictPub.prepareEntrySearchURLs(
        { page: 2, perPage: 20 }, [], ['PTO-all','MONDO']);
      const url3 = dictPub.prepareEntrySearchURLs(
        { page: 0, perPage: -20 }, [], ['A','C','B']);
      const url4 = dictPub.prepareEntrySearchURLs({},
        ['http://purl.obolibrary.org/obo/MONDO_0024919', '2'], []);
      const url5 = dictPub.prepareEntrySearchURLs({ page: 1, perPage: 2 },
        ['http://purl.obolibrary.org/obo/MONDO_0024919', '2'], ['MONDO','test_hpo_ja']);

      const expectedURL1 = [];
      const expectedURL2 = [ // sorts dictNames!
        pubDictTestURLBase + '/dictionaries/MONDO/entries.json?page=2&per_page=20',
        pubDictTestURLBase + '/dictionaries/PTO-all/entries.json?page=2&per_page=20'
      ];
      const expectedURL3 = [
        pubDictTestURLBase + '/dictionaries/A/entries.json?page=1&per_page=15',
        pubDictTestURLBase + '/dictionaries/B/entries.json?page=1&per_page=15',
        pubDictTestURLBase + '/dictionaries/C/entries.json?page=1&per_page=15'
      ];
      const expectedURL4 = [ // ids are separated by `|`
        pubDictTestURLBase + '/find_terms.json?dictionaries=&ids=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FMONDO_0024919%7C2'
      ];
      const expectedURL5 = [ // dictionaries are separated by `,`
        pubDictTestURLBase + '/find_terms.json?dictionaries=MONDO,test_hpo_ja&ids=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FMONDO_0024919%7C2'
      ];

      url1.should.deep.equal(expectedURL1);
      url2.should.deep.equal(expectedURL2);
      url3.should.deep.equal(expectedURL3);
      url4.should.deep.equal(expectedURL4);
      url5.should.deep.equal(expectedURL5);

      cb();
    });
  });

  describe('prepareMatchStringSearchURLs', () => {
    it('returns proper url when dictNameArray is empty', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, {}, []);
      url.should.deep.equal([]);
      cb();
    });

    it('returns proper url when dictNameArray is non-empty', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, {}, ['A','B','C']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma' + pubDictPagingOpt,
        testURLBase + '/dictionaries/C/mixed_completion?term=melanoma' + pubDictPagingOpt,
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returns proper url when the page property is not a number', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, { page : 'String' }, ['A']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returns proper url when the page property is a non-valid integer', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, { page : 0 }, ['A']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returned url does not include a `page` parameter when it is specified' +
      ' in the options', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, { page : 2 }, ['A']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=2&per_page=15'
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returns proper url when the `perPage` property is not a number', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, { perPage : ['Str'] }, ['A']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returns proper url when the `perPage` property is a non-valid integer', cb => {
      const url = dict.prepareMatchStringSearchURLs(
        melanomaStr, { perPage : 0 }, ['A']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma' + pubDictPagingOpt
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });

    it('returned url does not include a `perPage` parameter when it is specified' +
      ' in the options', cb => {
      const url = dict.prepareMatchStringSearchURLs(melanomaStr, { perPage : 1 }, ['A','B']);
      const expectedURL = [
        testURLBase + '/dictionaries/A/mixed_completion?term=melanoma&page=1&per_page=1',
        testURLBase + '/dictionaries/B/mixed_completion?term=melanoma&page=1&per_page=1'
      ];

      url.should.deep.equal(expectedURL);
      cb();
    });
  });

  describe('sortEntries', () => {
    it('sorts VSM entry objects as specified in the documentation', cb => {
      const arr = [
        { id: 'e', dictID: 'b', terms: [{ str: 'a'}] },
        { id: 'd', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'c', dictID: 'c', terms: [{ str: 'c'}] },
        { id: 'b', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'a', dictID: 'b', terms: [{ str: 'c'}] }
      ];
      const arrDictIdSorted = [
        { id: 'b', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'd', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'a', dictID: 'b', terms: [{ str: 'c'}] },
        { id: 'e', dictID: 'b', terms: [{ str: 'a'}] },
        { id: 'c', dictID: 'c', terms: [{ str: 'c'}] }
      ];
      const arrIdSorted = [
        { id: 'a', dictID: 'b', terms: [{ str: 'c'}] },
        { id: 'b', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'c', dictID: 'c', terms: [{ str: 'c'}] },
        { id: 'd', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'e', dictID: 'b', terms: [{ str: 'a'}] }
      ];
      const arrStrSorted = [
        { id: 'e', dictID: 'b', terms: [{ str: 'a'}] },
        { id: 'b', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'd', dictID: 'a', terms: [{ str: 'b'}] },
        { id: 'a', dictID: 'b', terms: [{ str: 'c'}] },
        { id: 'c', dictID: 'c', terms: [{ str: 'c'}] }
      ];

      const options = {};
      dict.sortEntries(arr, options).should.deep.equal(arrDictIdSorted);
      options.sort = {};
      dict.sortEntries(arr, options).should.deep.equal(arrDictIdSorted);
      options.sort = '';
      dict.sortEntries(arr, options).should.deep.equal(arrDictIdSorted);
      options.sort = 'dictID';
      dict.sortEntries(arr, options).should.deep.equal(arrDictIdSorted);
      options.sort = 'id';
      dict.sortEntries(arr, options).should.deep.equal(arrIdSorted);
      options.sort = 'str';
      dict.sortEntries(arr, options).should.deep.equal(arrStrSorted);

      cb();
    });
  });

  describe('sortMatches', () => {
    it('sorts VSM match objects as specified in the documentation', cb => {
      const testMatchObjArray = [
        {
          id:     'id1',
          dictID: 'http://test/ontologies/A',
          str:    'melanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id2',
          dictID: 'http://test/ontologies/A',
          str:    'zelanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id3',
          dictID: 'http://test/ontologies/A',
          str:    'xelanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id4',
          dictID: 'http://test/ontologies/A',
          str:    'zelanoma',
          descr:  'A definition',
          type:   'T',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id5',
          dictID: 'http://test/ontologies/c',
          str:    'melanoma',
          descr:  'A definition',
          type:   'T',
          z: {
            dictAbbrev: 'c'
          }
        },
        {
          id:     'id6',
          dictID: 'http://test/ontologies/b',
          str:    'melanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'b'
          }
        }
      ];
      const testMatchObjArraySorted = [
        {
          id:     'id1',
          dictID: 'http://test/ontologies/A',
          str:    'melanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id6',
          dictID: 'http://test/ontologies/b',
          str:    'melanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'b'
          }
        },
        {
          id:     'id3',
          dictID: 'http://test/ontologies/A',
          str:    'xelanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id2',
          dictID: 'http://test/ontologies/A',
          str:    'zelanoma',
          descr:  'A definition',
          type:   'S',
          z: {
            dictAbbrev: 'A'
          }
        },
        {
          id:     'id5',
          dictID: 'http://test/ontologies/c',
          str:    'melanoma',
          descr:  'A definition',
          type:   'T',
          z: {
            dictAbbrev: 'c'
          }
        },
        {
          id:     'id4',
          dictID: 'http://test/ontologies/A',
          str:    'zelanoma',
          descr:  'A definition',
          type:   'T',
          z: {
            dictAbbrev: 'A'
          }
        },
      ];
      const arr = dict.sortMatches(testMatchObjArray);
      arr.should.deep.equal(testMatchObjArraySorted);
      cb();
    });
  });

  describe('trimDictInfoArray', () => {
    it('correctly trims the array of dictInfo objects based on the values ' +
      'of page, pagesize and the number of results obtained', cb => {
      const arr = [
        {
          id: pubDictTestURLBase + '/dictionaries/CHEAR',
          abbrev: 'CHEAR'
        },
        {
          id: pubDictTestURLBase + '/dictionaries/RH-MESH',
          abbrev: 'RH-MESH'
        },
        {
          id: pubDictTestURLBase + '/dictionaries/MCCL',
          abbrev: 'MCCL'
        },
        {
          id: pubDictTestURLBase + '/dictionaries/GO',
          abbrev: 'GO'
        }
      ];

      const res1 = dict.trimDictInfoArray(arr, 1, 1);
      const res2 = dict.trimDictInfoArray(arr, 2, 1);
      const res3 = dict.trimDictInfoArray(arr, 3, 1);
      const res4 = dict.trimDictInfoArray(arr, 4, 1);
      const res5 = dict.trimDictInfoArray(arr, 5, 1);
      const res6 = dict.trimDictInfoArray(arr, 1, 2);
      const res7 = dict.trimDictInfoArray(arr, 2, 2);
      const res8 = dict.trimDictInfoArray(arr, 3, 2);
      const res9 = dict.trimDictInfoArray(arr, 1, 3);
      const res10 = dict.trimDictInfoArray(arr, 2, 3);
      const res11 = dict.trimDictInfoArray(arr, 3, 3);
      const res12 = dict.trimDictInfoArray(arr, 1, 4);
      const res13 = dict.trimDictInfoArray(arr, 2, 4);

      res1.should.deep.equal([arr[0]]);
      res2.should.deep.equal([arr[1]]);
      res3.should.deep.equal([arr[2]]);
      res4.should.deep.equal([arr[3]]);
      res5.should.deep.equal([]);
      res6.should.deep.equal(arr.slice(0,2));
      res7.should.deep.equal(arr.slice(2,4));
      res8.should.deep.equal([]);
      res9.should.deep.equal(arr.slice(0,3));
      res10.should.deep.equal(arr.slice(3,4));
      res11.should.deep.equal([]);
      res12.should.deep.equal(arr);
      res13.should.deep.equal([]);

      cb();
    });
  });

  describe('reArrangeEntries', () => {
    it('returns an empty array when input is an empty array', cb => {
      const res = dict.reArrangeEntries([], { filter: { id: ['id1'] }});
      expect(res).to.be.empty;
      cb();
    });

    it('returns the same array when `filter.id` is not properly defined', cb => {
      const arr = [ { id: 'id1', z: { dictAbbrev: 'LNC' }},
        { id: 'id2', z: { dictAbbrev: 'CLO' }},
        { id: 'id3', z: { dictAbbrev: 'MO' }},
        { id: 'id4', z: { dictAbbrev: 'RADLEX' }}];

      const arrCloned = deepClone(arr);

      dict.reArrangeEntries(arr, {}).should.deep.equal(arrCloned);
      cb();
    });

    it('returns the same array when no re-arrangement was done', cb => {
      const arr = [ { id: 'id1', z: { dictAbbrev: 'LNC' }},
        { id: 'id2', z: { dictAbbrev: 'CLO' }},
        { id: 'id3', z: { dictAbbrev: 'MO' }},
        { id: 'id4', z: { dictAbbrev: 'RADLEX' }}];

      const arrCloned = deepClone(arr);

      dict.reArrangeEntries(arr,{ filter: { id: ['id1', 'id2', 'id3', 'id4'] }})
        .should.deep.equal(arrCloned);
      cb();
    });

    it('returns a properly re-arranged array when there are objects with the ' +
      'same `id` properties in the given array', cb => {
      const arr1 = [{ id: 'id1', m: 1 }, { id: 'id2', m: 2 }, { id: 'id2', m: 3 },
        { id: 'id1', m: 4 }];
      const expectedResult1 = [{ id: 'id1', m: 1 }, { id: 'id2', m: 2 },
        { id: 'id2', m: 3 }, { id: 'id1', m: 4 }];

      const arr2 = [{ id: 'id1', m: 1 }, { id: 'id1', m: 2 }, { id: 'id2', m: 3 },
        { id: 'id2', m: 4 }];
      const expectedResult2 = [{ id: 'id1', m: 1 }, { id: 'id2', m: 3 },
        { id: 'id1', m: 2 }, { id: 'id2', m: 4 }];

      const arr3 = [{ id: 'id1', m: 1 }, { id: 'id3', m: 2 }, { id: 'id1', m: 3 },
        { id: 'id2', m: 4 }, { id: 'id2', m: 5 }, { id: 'id3', m: 6 },
        { id: 'id1', m: 7 }, { id: 'id4', m: 8 }, { id: 'id4', m: 9 }];
      const expectedResult3 = [{ id: 'id1', m: 1 }, { id: 'id3', m: 2 },
        { id: 'id2', m: 4 }, { id: 'id4', m: 8 }, { id: 'id1', m: 3 },
        { id: 'id2', m: 5 }, { id: 'id3', m: 6 }, { id: 'id1', m: 7 },
        { id: 'id4', m: 9 }];

      // just making sure that the filter id is proper and not putting all
      // the corresponding ids in the `options.filter.id`
      const res1 = dict.reArrangeEntries(arr1, { filter: { id: ['id1'] }});
      const res2 = dict.reArrangeEntries(arr2, { filter: { id: ['id1'] }});
      const res3 = dict.reArrangeEntries(arr3, { filter: { id: ['id1'] }});

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);
      res3.should.deep.equal(expectedResult3);

      cb();
    });
  });

  describe('getUniqueIDsFromObjArray', () => {
    it('returns all the unique ids from an array of vsm-match objects', cb => {
      let arr = [{ id: 'id1', str: 'str1' },
        { id: 'id2', str: 'str2' },
        { id: 'id3', str: 'str3' }];

      const res1 = dict.getUniqueIDsFromObjArray(arr);

      arr.push({id: 'id1', str: 'str1'});
      arr.push({id: 'id3', str: 'str3'});
      arr.push({id: 'id4', str: 'str4'});

      const res2 = dict.getUniqueIDsFromObjArray(arr);

      const expectedResult1 = ['id1','id2','id3'];
      // keeps only the unique ids
      const expectedResult2 = ['id1','id2','id3','id4'];

      res1.should.deep.equal(expectedResult1);
      res2.should.deep.equal(expectedResult2);

      cb();
    });

    it('returns an empty array when input is either an empty array ' +
      'or an array whose elements don\'t have the `id` property', cb => {
      const arr1 = [];
      const arr2 = [{ dictID: 'id1', str: 'str1' }, { dictID: 'id2', str: 'str2'}];

      const res1 = dict.getUniqueIDsFromObjArray(arr1);
      const res2 = dict.getUniqueIDsFromObjArray(arr2);

      res1.should.deep.equal([]);
      res2.should.deep.equal([]);
      cb();
    });

    it('returns proper result when the input array has \'mixed\' elements ' +
      '- some that have the `id` property and some that don\'t', cb => {
      const arr = [{ id: 'id1', str: 'str1' }, { dictID: 'id2', str: 'str2' },
        { id: 'id3', str: 'str3' }];

      const res = dict.getUniqueIDsFromObjArray(arr);
      const expectedResult = ['id1', 'id3'];

      res.should.deep.equal(expectedResult);
      cb();
    });
  });
});
