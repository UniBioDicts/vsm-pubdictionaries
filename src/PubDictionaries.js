const Dictionary = require('vsm-dictionary');
const { hasProperEntrySortProperty, hasProperFilterDictIDProperty,
  hasProperFilterIDProperty, hasProperPageProperty, hasPagePropertyEqualToOne,
  hasProperPerPageProperty, hasProperSortDictIDProperty, str_cmp, deepClone,
  fixedEncodeURIComponent, isJSONString, getLastPartOfURL, removeDuplicates,
  removeDuplicateEntries } = require('./fun');

module.exports = class PubDictionaries extends Dictionary {

  constructor(options) {
    const opt = options || {};
    super(opt);

    const baseURL = opt.baseURL || 'https://pubdictionaries.org';

    // enable the console.log() usage
    this.enableLog = opt.log || false;

    // pubDictionaries dictID URI for pattern match
    this.pubDictIdURI = 'pubdictionaries.org/dictionaries';

    // PubDictionaries default API values
    this.pubDictionariesDefaultPage = 1;
    this.pubDictionariesDefaultPageSize = 15;

    // 2 types of type-ahead suggestions supported: 'prefix' and 'substring'
    this.suggest = (typeof opt.suggest === 'string'
      && (opt.suggest === 'prefix') || opt.suggest === 'substring' || opt.suggest === 'mixed')
      ? opt.suggest
      : 'mixed'; // by default, use the `mixed_completion` endpoint

    // getDictInfo URL pattern
    this.urlGetDictInfos = opt.urlGetDictInfos || baseURL + '/dictionaries/$filterDictID.json';

    // getEntries URL pattern
    // 1st case: get all entries for a specific dictionary (no id for filtering)
    this.urlGetEntriesForSpecificDict = opt.urlGetEntries
      || baseURL + '/dictionaries/$filterDictID/entries.json';
    // 2nd case: get entries when at least one id is given
    this.urlGetEntries = opt.urlGetEntries
      || baseURL + '/find_terms.json?dictionaries=$filterDictIDs&ids=$filterIDs';

    // getEntryMatchesForString
    this.urlGetMatches = opt.urlGetMatches
      || baseURL + '/dictionaries/$filterDictID/';
    if (this.suggest === 'prefix')
      this.urlGetMatches = this.urlGetMatches + 'prefix_completion?term=$queryString';
    else if (this.suggest === 'substring')
      this.urlGetMatches = this.urlGetMatches + 'substring_completion?term=$queryString';
    else
      this.urlGetMatches = this.urlGetMatches + 'mixed_completion?term=$queryString';
  }

  getDictInfos(options, cb) {
    // if request is for non-PubDictionaries, return empty result
    if (hasProperFilterIDProperty(options)
      && options.filter.id.findIndex(
        id => id.includes(this.pubDictIdURI)) === -1
    ) {
      return cb(null, { items: [] });
    }

    const page = this.getPage(options);
    const pageSize = this.getPageSize(options);

    let urlArray = this.buildDictInfoURLs(options);

    // asking for all dictionaries information is not supported
    if (urlArray.length === 0) {
      let err = { status: 404, error: 'Not supported' };
      return cb(err);
    }

    // prune common urls (e.g. when someone evil asks for a dictionary twice)
    urlArray = removeDuplicates(urlArray);
    let callsRemaining = urlArray.length;

    // cover the cases where you don't need to send a query to PubDictionaries
    if (callsRemaining > 1 && page > 1) {
      const firstExpectedResIndex = (page - 1) * pageSize;
      if (callsRemaining <= firstExpectedResIndex) {
        return cb(null, {items: []});
      }
    }

    const urlToResultsMap = new Map();
    let answered = false;

    for (let url of urlArray) {
      if (this.enableLog)
        console.log('URL: ' + url);

      urlToResultsMap.set(url, []);

      this.request(url, (err, res) => {
        if (err) {
          // no error when dictionary name does not exist
          if (typeof(err.message) !== 'undefined'
            && err.message.includes('Unknown dictionary')) {
            err = null; // `res` is already set to []
          } else {
            if (!answered) {
              answered = true;
              --callsRemaining;
              return cb(err);
            }
          }
        } else {
          urlToResultsMap.set(url, this.mapPubDictResToDictInfoObj(res));
        }

        --callsRemaining;
        // all calls have returned, so trim results
        if (callsRemaining <= 0) {
          // gather all results in one array
          let arr = [];
          for (let dictInfoObjArray of urlToResultsMap.values())
            arr = arr.concat(dictInfoObjArray);

          arr = this.trimDictInfoArray(arr, page, pageSize);

          if (!answered) cb(err, {items: arr});
        }
      });
    }
  }

  getEntries(options, cb) {
    let optionsCloned = deepClone(options);

    // if no `filter` is given, pubDictionaries does not support
    // returning the entries from all sub-dictionaries
    if (!options.hasOwnProperty('filter') ||
      (!hasProperFilterDictIDProperty(optionsCloned)
        && !hasProperFilterIDProperty(optionsCloned))) {
      let err = { status: 404, error: 'Not supported' };
      return cb(err);
    }

    // if request is for non-pubDictionaries, return empty result
    if (hasProperFilterDictIDProperty(optionsCloned)) {
      let idList = optionsCloned.filter.dictID.filter(dictID =>
        dictID.trim().includes(this.pubDictIdURI)
      );

      if (idList.length === 0) {
        return cb(null, { items: [] });
      }

      // keep only the pubDictionary dictIDs
      optionsCloned.filter.dictID = idList;
    }

    // Hack option for getting proper sorted results from PubDictionaries
    // when requesting for an entry by id (with or without dictID)
    optionsCloned.getAllResults = optionsCloned.getAllResults || false;

    if ((optionsCloned.getAllResults)
      && hasProperFilterIDProperty(optionsCloned)) {
      //  ignore perPage and page, return all, sort unique asked IDs first TODO
    }

    const urlArray = this.buildEntryURLs(optionsCloned);
    let callsRemaining = urlArray.length;
    const urlToResultsMap = new Map();
    let answered = false;

    for (let url of urlArray) {
      if (this.enableLog)
        console.log('URL: ' + url);

      urlToResultsMap.set(url, []);

      this.request(url, (err, res) => {
        if (err) {
          if (!answered) {
            // make proper error object when dictionary name does not exist
            if (typeof(err.message) !== 'undefined'
              && err.message.includes('Unknown dictionary')) {
              err = { error: err.message, status: 404 };
            }
            answered = true;
            --callsRemaining;
            return cb(err);
          }
        } else {
          urlToResultsMap.set(url,
            this.mapPubDictEntriesResToEntryObj(res, url)
          );
        }

        --callsRemaining;
        // all calls have returned, so sort and trim results
        if (callsRemaining <= 0) {
          let arr = [];
          for (let entryObjArray of urlToResultsMap.values())
            arr = arr.concat(entryObjArray);

          // z-prune and trim results
          arr = this.trimEntryObjArray(
            Dictionary.zPropPrune(arr, optionsCloned.z), optionsCloned
          );

          if (!answered) cb(err, {items: arr});
        }
      });
    }
  }

  getEntryMatchesForString(str, options, cb) {
    if ((!str) || (str.trim() === '')) return cb(null, {items: []});

    // if request is not for some pubDictionaries, return empty result
    let optionsCloned = deepClone(options);
    if (hasProperFilterDictIDProperty(optionsCloned)) {
      let idList = optionsCloned.filter.dictID.filter(dictID =>
        dictID.trim().includes(this.pubDictIdURI)
      );

      if (idList.length === 0) {
        return cb(null, { items: [] });
      }

      // keep only the pubDictionaries dictIDs
      optionsCloned.filter.dictID = idList;
    }

    const urlArray = this.buildMatchURLs(str, optionsCloned);
    // If no URLs, return error with appropriate message
    if (urlArray.length === 0) {
      let err = { status: 404, error: 'Not supported: either only sort.dictID' +
          '\'s present and page > 1 or no dictIDs to filter at all' };
      return cb(err);
    }

    let callsRemaining = urlArray.length;
    let urlToResultsMap = new Map();
    let answered = false;

    for (let url of urlArray) {
      if (this.enableLog)
        console.log('URL: ' + url);

      urlToResultsMap.set(url, []);

      this.request(url, (err, res) => {
        if (err) {
          if (!answered) {
            // make proper error object when dictionary name does not exist
            if (typeof(err.message) !== 'undefined'
              && err.message.includes('Unknown dictionary')) {
              err = { error: err.message, status: 404 };
            }
            answered = true;
            --callsRemaining;
            return cb(err);
          }
        } else {
          urlToResultsMap.set(
            url, this.mapPubDictSearchResToMatchObj(res, url, str)
          );
        }

        --callsRemaining;
        // all calls have returned, so merge, z-prune, sort and trim results
        if (callsRemaining <= 0) {
          let mergedMatchObjArrays = Array.from(urlToResultsMap.values());

          // gather all results in one array, sort and z-prune them
          // remove duplicates in each sub-array as there may be entries with
          // the same (label+id) in a single pubDictionary!
          let arr = [];
          for (let matchObjArray of mergedMatchObjArrays) {
            arr = arr.concat(this.trimMatchObjArray(
              Dictionary.zPropPrune(
                removeDuplicateEntries(matchObjArray), optionsCloned.z),
              optionsCloned));
          }

          arr = this.trimMatchObjArray(arr, optionsCloned);

          if (!answered) cb(err, {items: arr});
        }
      });
    }
  }

  buildDictInfoURLs(options) {
    let idList = [];

    // remove non-PubDictionary DictIDs
    if (hasProperFilterIDProperty(options)) {
      idList = options.filter.id.filter(
        id => id.trim().includes(this.pubDictIdURI)
      );
    }

    if (idList.length !== 0) {
      // specific dictIDs
      return idList.map(dictID =>
        this.prepareDictInfoSearchURL(getLastPartOfURL(dictID)));
    } else {
      // all dictIDs (not supported)
      return [];
    }
  }

  buildEntryURLs(options) {
    // getting all entries from all pubDictionaries is not supported
    if (!hasProperFilterIDProperty(options)
      && !hasProperFilterDictIDProperty(options)
    ) {
      return this.prepareEntrySearchURLs(options, [], []);
    // all entries from specific pubDictionaries
    } else if (!hasProperFilterIDProperty(options)
      && hasProperFilterDictIDProperty(options)
    ) {
      const dictNameArray = this.getDictNamesFromArray(options.filter.dictID);
      return this.prepareEntrySearchURLs(options, [], dictNameArray);
    // find given ids in all pubDictionaries
    } else if (hasProperFilterIDProperty(options)
      && !hasProperFilterDictIDProperty(options)
    ) {
      return this.prepareEntrySearchURLs(options, options.filter.id, []);
    } else {
      // both proper `filter.id` and `filter.dictID`
      // find given ids in specific pubDictionaries
      const dictNameArray = this.getDictNamesFromArray(options.filter.dictID);
      return this.prepareEntrySearchURLs(options, options.filter.id,
        dictNameArray);
    }
  }

  buildMatchURLs(str, options) {
    const obj = this.splitDicts(options);
    // coming (mostly) out of `options.sort`
    const pref = this.getDictNamesFromArray(obj.pref);
    // coming (mostly) out of `options.filter`
    const rest = this.getDictNamesFromArray(obj.rest);

    // not supported by pubDictionaries
    if (pref.length === 0 && rest.length === 0)
      return this.prepareMatchStringSearchURLs(str, options, []);
    // filter on specific pubDictionaries (`rest`)
    else if (pref.length === 0 && rest.length !== 0)
      return this.prepareMatchStringSearchURLs(str, options, rest);
    // filter on specific pubDictionaries (`pref`) only if `page=1`
    else if (pref.length !== 0 && rest.length === 0) {
      if (!options.hasOwnProperty('page') || hasPagePropertyEqualToOne(options))
        return this.prepareMatchStringSearchURLs(str, options, pref);
      else // not supported
        return this.prepareMatchStringSearchURLs(str, options, []);
    } else if (pref.length !== 0 && rest.length !== 0) {
      // filter on specific pubDictionaries (first `pref`, then the `rest`)
      return this.prepareMatchStringSearchURLs(str, options, pref.concat(rest));
    }
  }

  /**
   * Splits requested sub-dictionaries based on the `options.filter` and
   * `options.sort`
   */
  splitDicts(options) {
    if (!hasProperSortDictIDProperty(options))
      return ({
        pref: [],
        rest: hasProperFilterDictIDProperty(options)
          ? options.filter.dictID
          : []
      });
    else if (hasProperFilterDictIDProperty(options)) {
      if (options.filter.dictID.every(
        dictID => options.sort.dictID.includes(dictID)))
        return {
          pref: [],
          rest: options.filter.dictID
        };
      else {
        return {
          pref: options.sort.dictID.reduce((res, dictID) => {
            if (options.filter.dictID.includes(dictID))
              res.push(dictID);
            return res;
          }, []),
          rest: options.filter.dictID.reduce((res, dictID) => {
            if (!options.sort.dictID.includes(dictID))
              res.push(dictID);
            return res;
          }, [])
        };
      }
    } else return ({
      pref: options.sort.dictID,
      rest: []
    });
  }

  mapPubDictResToDictInfoObj(res) {
    // this response is per single pubDictionary
    return [
      {
        id: this.urlGetDictInfos.
          replace('$filterDictID', res.name).replace('.json', ''),
        name: res.name // no `abbrev` property
      }
    ];
  }

  mapPubDictEntriesResToEntryObj(res, url) {
    // get entry results from the specified pubDictionary
    if (url.includes('entries.json')) {
      // find the dictionary name from the URL
      let dictNameRegex = /dictionaries\/(.*?)\//g;
      const match = dictNameRegex.exec(url);
      let dictName = '';
      if (match) {
        dictName = match[1];
      } else {
        if (this.enableLog) console.log('No dictionary name?');
      }

      let dictURL = 'https://' + this.pubDictIdURI + '/' + dictName;
      return res.map(entry => ({
        id: entry.id,
        dictID: dictURL,
        descr: this.refineID(entry.id),
        terms: [{ str: entry.label }],
        z: {
          dictAbbrev: dictName
        }
      }));

    } else if (url.includes('find_terms.json')) {
      return Object.keys(res).reduce((resObj, id) => {
        let arr = res[id]; // array of objects with (label, dictionary) props
        let uniqueDicts = [...new Set(arr.map(item => item.dictionary))];

        uniqueDicts.forEach(dictName => {
          resObj.push({
            id: id,
            dictID: 'https://' + this.pubDictIdURI + '/' + dictName,
            descr: this.refineID(id),
            terms: arr.reduce((newArray, tuple) => {
              if (tuple.dictionary === dictName) {
                // all synonyms with the same id + dictionary belong here
                newArray.push({ str: tuple.label });
              }
              return newArray;
            }, []),
            z: {
              dictAbbrev: dictName
            }
          });
        });

        return resObj;
      }, []);
    } else {
      if (this.enableLog) console.log('Unknown endpoint for entries?');
      return [];
    }
  }

  mapPubDictSearchResToMatchObj(res, url, str) {
    // find the dictionary name from the URL
    let dictNameRegex = /dictionaries\/(.*?)\//g;
    const match = dictNameRegex.exec(url);
    let dictName = '';
    if (match) {
      dictName = match[1];
    } else {
      if (this.enableLog) console.log('No dictionary name?');
    }

    let dictURL = 'https://' + this.pubDictIdURI + '/' + dictName;

    return res.map(entry => ({
      id: entry.id,
      dictID: dictURL,
      str: entry.label,
      descr: this.refineID(entry.id),
      type: entry.label.startsWith(str) ? 'S' : 'T',
      terms: [{ str: entry.label }],
      z: {
        dictAbbrev: dictName
      }
    }));
  }

  refineID(id) {
    return id.trim()
      .replace('http://', '')
      .replace('https://', '')
      .replace('www.', '');
  }

  getDictNamesFromArray(arr) {
    if (arr.length === 0) return arr;
    return arr.map(dictID => getLastPartOfURL(dictID));
  }

  prepareDictInfoSearchURL(dictName) {
    let url = this.urlGetDictInfos;
    if (dictName.trim() !== '') {
      return url.replace('$filterDictID', dictName);
    } else return url;
  }

  prepareEntrySearchURLs(options, searchIDs, dictNameArray) {
    let urlArray = [];

    // getting all entries from all pubDictionaries is not supported
    if (dictNameArray.length === 0 && searchIDs.length === 0) {
      return urlArray;
    }

    // all entries from specific pubDictionaries
    // default sorting is by dictID
    if (dictNameArray.length > 0 && searchIDs.length === 0) {
      let searchURL = this.urlGetEntriesForSpecificDict;
      urlArray = dictNameArray.sort().map(dictName =>
        searchURL.replace('$filterDictID', dictName));

      // add paging
      const page = this.getPage(options);
      const pageSize = this.getPageSize(options);

      urlArray = urlArray.map(url => url.concat('?page=' + page +
        '&per_page=' + pageSize));
    } else { // some ids are given for sure to be in this case
      let searchURL = (dictNameArray.length === 0) ?
        this.urlGetEntries.replace('$filterDictIDs', '') :
        this.urlGetEntries.replace('$filterDictIDs', dictNameArray.join(','));

      urlArray = [searchURL.replace('$filterIDs',
        fixedEncodeURIComponent(searchIDs.join('|')))];
    }

    return urlArray;
  }

  prepareMatchStringSearchURLs(str, options, dictNameArray) {
    // pubDictionaries does not support looking for terms if no
    // specific dictionaries are given
    if (dictNameArray.length === 0) {
      return [];
    }

    let searchURL = this.urlGetMatches
      .replace('$queryString', fixedEncodeURIComponent(str));

    let urlArray = dictNameArray.map(
      dictName => searchURL.replace('$filterDictID', dictName));

    // add paging
    const page = this.getPage(options);
    const pageSize = this.getPageSize(options);

    urlArray = urlArray.map(url => url.concat('&page=' + page +
      '&per_page=' + pageSize));

    return urlArray;
  }

  request(url, cb) {
    const req = this.getReqObj();
    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        if (req.status !== 200) {
          let response = req.responseText;
          isJSONString(response)
            ? cb(JSON.parse(response))
            : cb(JSON.parse('{ "status": ' + req.status
              + ', "error": ' + JSON.stringify(response) + '}'));
        }
        else {
          try {
            const response = JSON.parse(req.responseText);
            cb(null, response);
          } catch (err) {
            cb(err);
          }
        }
      }
    };
    req.open('GET', url, true);
    req.send();
  }

  getReqObj() {
    return new (typeof XMLHttpRequest !== 'undefined'
      ? XMLHttpRequest // In browser
      : require('xmlhttprequest').XMLHttpRequest  // In Node.js
    )();
  }

  sortEntries(arr, options) {
    if (!hasProperEntrySortProperty(options) || options.sort === 'dictID')
      return arr.sort((a, b) =>
        str_cmp(a.dictID, b.dictID)
        || str_cmp(a.id, b.id));
    else if (options.sort === 'id')
      return arr.sort((a, b) =>
        str_cmp(a.id, b.id));
    else if (options.sort === 'str')
      return arr.sort((a, b) =>
        str_cmp(a.terms[0].str, b.terms[0].str)
        || str_cmp(a.dictID, b.dictID)
        || str_cmp(a.id, b.id));
  }

  sortMatches(arr) {
    return arr.sort((a, b) =>
      str_cmp(a.type, b.type)
      || str_cmp(a.str, b.str)
      || str_cmp(a.dictID, b.dictID));
  }

  getPage(options) {
    return hasProperPageProperty(options)
      ? options.page
      : this.pubDictionariesDefaultPage;
  }

  getPageSize(options) {
    return hasProperPerPageProperty(options)
      ? options.perPage
      : this.pubDictionariesDefaultPageSize;
  }

  trimDictInfoArray(arr, page, pageSize) {
    const numberOfResults = arr.length;
    if (page === 1) {
      return arr.slice(0, Math.min(numberOfResults, pageSize));
    } else {
      return arr.slice(
        ((page - 1) * pageSize),
        Math.min(page * pageSize, numberOfResults)
      );
    }
  }

  trimEntryObjArray(arr, options) {
    // do not trim when getAllResults hack is enabled
    return (options.getAllResults)
      ? arr
      : this.trimMatchObjArray(arr, options);
  }

  trimMatchObjArray(arr, options) {
    if (hasProperPerPageProperty(options)) {
      return arr.slice(0, options.perPage);
    } else {
      return arr.slice(0, this.pubDictionariesDefaultPageSize);
    }
  }
};
