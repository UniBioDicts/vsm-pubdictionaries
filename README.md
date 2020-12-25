# vsm-pubdictionaries

<!-- badges: start -->
[![Node.js CI](https://github.com/UniBioDicts/vsm-pubdictionaries/workflows/Node.js%20CI/badge.svg)](https://github.com/UniBioDicts/vsm-pubdictionaries/actions)
[![codecov](https://codecov.io/gh/UniBioDicts/vsm-pubdictionaries/branch/master/graph/badge.svg)](https://codecov.io/gh/UniBioDicts/vsm-pubdictionaries)
[![npm version](https://img.shields.io/npm/v/vsm-pubdictionaries)](https://www.npmjs.com/package/vsm-pubdictionaries)
[![Downloads](https://img.shields.io/npm/dm/vsm-pubdictionaries)](https://www.npmjs.com/package/vsm-pubdictionaries)
[![License](https://img.shields.io/npm/l/vsm-pubdictionaries)](#license)
<!-- badges: end -->

## Summary

`vsm-pubdictionaries-bioportal` is an implementation of the 'VsmDictionary' parent-class/interface (from the package [`vsm-dictionary`](https://github.com/vsm/vsm-dictionary)), that communicates with the [PubDictionaries REST API](https://docs.pubdictionaries.org/) and translates the provided terms+ids into a VSM-specific format.

The implementation was done during an intense hacking week at Elixir BioHackathon 2020, see [project reference](https://github.com/elixir-europe/BioHackathon-projects-2020/tree/master/projects/4).

## Citation

The work done in the Europe BioHackathon 2020 was published in http://biohackrxiv.org/.
Please cite as follows:

Zobolas, J., Kim, J., Kuiper, M., & Vercruysse, S. (2020, December 25). Linking PubDictionaries with UniBioDicts to support Community Curation. https://doi.org/10.37044/osf.io/gzfa8

## Install

Run: `npm install`

## Example use

### Node.js

Create a directory `test-dir` and inside run `npm install vsm-pubdictionaries`.
Then, create a `test.js` file and include this code for example:

```javascript
const PubDict = require('vsm-pubdictionaries');
const dict = new PubDict({log: true, suggest: 'substring'});

dict.getEntryMatchesForString('dog',
  { filter: { dictID : [
    'http://pubdictionaries.org/dictionaries/PTO-all',
    'http://pubdictionaries.org/dictionaries/MONDO',
    'http://pubdictionaries.org/dictionaries/human-UniProt'
    ]},
    sort: { dictID : ['http://pubdictionaries.org/dictionaries/PTO-all'] },
    z: true,
    page: 1,
    perPage: 7
  }, (err, res) => {
    if (err)
      console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
  }
});
```
Then, run `node test.js`

### Browsers

```html
<script src="https://unpkg.com/vsm-pubdictionaries@^1.0.0/dist/vsm-pubdictionaries.min.js"></script>
```
after which it is accessible as the global variable `VsmPubDictionaries`.

## Tests

Run `npm test`, which runs the source code tests with Mocha.
If you want to live test the PubDictionaries API and the main functions provided by `vsm-pubdictionaries`, go to the `test` directory and run:
```
node getAllDictInfos.test.js
node getDictInfos.test.js
node getEntries.test.js
node getEntryMatchesForString.test.js
```

We also include a [test HTML file](https://github.com/UniBioDicts/vsm-pubdictionaries/blob/master/test/test_vsm_box_pubdictionaries.html) that illustrates a basic curation/annotation example with the autocomplete feature, using [vsm-box](https://github.com/vsm/vsm-box) and some demo PubDictionaries (see next section).

## 'Build' configuration & demo

To use a VsmDictionary in Node.js, one can simply run `npm install` and then use `require()`.
But it is also convenient to have a version of the code that can just be loaded via a `<script>`-tag in the browser.

Therefore, we included [webpack.config.js](https://github.com/UniBioDicts/vsm-pubdictionaries/blob/master/webpack.config.js), a Webpack configuration file for generating such a browser-ready package.

By running `npm build`, the built file will appear in a `dist` subdirectory.
A demo-use of this file can then be seen by opening the [HTML file](https://github.com/UniBioDicts/vsm-pubdictionaries/blob/master/test/test_vsm_box_pubdictionaries.html) with the vsm-box example.

## Specification

Like all VsmDictionary subclass implementations, this package follows the parent class [specification](https://github.com/vsm/vsm-dictionary/blob/master/Dictionary.spec.md) or simply **spec**.
Every PubDictionary is a list of labels/terms + ids.
In the next sections we will explain the mapping between the objects returned by the PubDictionaries server (most of the REST URL endpoints return `label` + `id` tuples as specified in the [API documentation](https://docs.pubdictionaries.org/)) and the corresponding VSM objects.

Note that we mostly implement **strict error handling** in the sense that whenever we launch multiple parallel queries to PubDictionaries REST API (see the functions specifications below), if one of them returns an error (either a string or an error JSON object response), then the result will be an error object (no matter if all the rest of the calls returned proper results).

The error responses are formulated as JSON objects in the following format:
```javascript
{
    status: <number>,
    error: <response>
}
```
where the *response* from the server is usually JSON stringified.
In the next subsections we will explicitly state some of the errors returned by PubDictionaries or ones that we make ourselves in case some of the specified parent-class features are not implemented yet on the server side.

### Map PubDictionaries to DictInfo VSM object

This specification is related to the function `getDictInfos(options, cb)`.

If the `options.filter.id` is properly defined and none of the ids used for filtering are PubDictionaries-related (meaning that they do not have the `pubdictionaries.org/dictionaries` as a substring), then `getDictInfos` returns an empty object result.

When no `options.filter` is given, the specification indicates to return all `dictInfo` objects but this is not supported by the PubDictionaries API.
Instead, we return the error object:
```javascript
{ status: 404, error: 'Not supported' }
```

Otherwise, an example of a URL that is send when requesting for the dictionary information of a PubDictionary, e.g. [human-UniProt](https://pubdictionaries.org/dictionaries/human-UniProt), is:
```
https://pubdictionaries.org/dictionaries/human-UniProt.json
```

Note that when the dictionary acronym (here `human-UniProt`) is not an existent dictionary, we get back an error from the server but we ignore it (according to the spec).
The `options.page` and `options.perPage` are used to trim the number of the results.
If these options are not properly defined, then the default values from the PubDictionaries API are used (*1* and *15* respectively).

After sending a query to ask for information about a specific PubDictionary, the returned JSON result is mapped to a VSM `dictInfo` object. The mapping is fully detailed in the table below:

VSM dictInfo object property | PubDictionaries dictionary property | Notes
:---:|:---:|---
`id` | `name` | the unique URI of the dictionary as `https://pubdictionaries.org/dictionaries/` + `name`
`name` | `name` | the unique dictionary acronym/name

### Map PubDictionaries to Entry VSM object

This specification is related to the function `getEntries(options, cb)`.

If the `options.filter.dictID` is properly defined and none of the dictIDs used for filtering are PubDictionaries-related (meaning that they do not have the `pubdictionaries.org/dictionaries` as a substring), then `getEntries` returns an empty object result.

If no `options.filter` is given, the specification indicates to return all `entry` objects from all sub-dictionaries, but this is not supported by the PubDictionaries API.
Instead, we return the error object:
 ```javascript
 { status: 404, error: 'Not supported' }
 ```

If only the `options.filter.dictID` is properly specified and so we request for all the entries (paginated) from a specific sub-dictionary, we send the following URL to the PubDictionaries server, using the `entries.json` endpoint:
```
https://pubdictionaries.org/dictionaries/human-UniProt/entries.json?page=1&per_page=15
```

In case of multiple specified `dictID`'s, multiple parallel queries like the above are sent, only changing the dictionary name.
The `options.page` and `options.perPage` options correspond to the `page` and `per_page` parameters in the REST URL.

When only the `options.filter.id` is properly defined (requesting specific ids in all PubDictionaries) or both `filter.id` and `filter.dictID` are properly defined (requesting specific ids in specific PubDictionaries), we send the following URL to the PubDictionaries server, using the `find_terms.json` endpoint:
```
https://pubdictionaries.org/find_terms.json?dictionaries=MONDO,ncbi_taxon&ids=2|5|http://purl.obolibrary.org/obo/MONDO_0024919
```

No pagination is supported, so `options.page` and `options.perPage` are discarded.
If no `filter.dictID` is given, the URL above is written as `...?dictionaries=&ids=...`.

Because of **common ids between different PubDictionaries**, we always re-arrange the returned entries in order to have the **first uniquely-matched ids** atop in the returned list of VSM entries.
For example, if using the above URL, we had found `id1` in dictionaries `A` and `B` and `id2` and `id3` in the `C` dictionary, the VSM `entry` objects would then be received in `(id,dictID)` form as `{ (id1,A), (id1,B), (id2,C), (id3,C) }` from the server.
We re-arrange them as `{ (id1,A), (id2,C), (id3,C), (id1,B) }`, in order to have the first unique-`id` result entries atop the rest.

Note that **no sorting** whatsoever is done on the client side, but on the server side the `entries.json` endpoint sorts entries by `label`, while the `find_terms.json` endpoint sorts entries first by `id`, then by `dictID`.

A possible trimming of entry results might take place after the re-arranging is done, only if the `options.getAllResults` is `false`.
Then, if the `options.filter.id` is properly defined (asking for specific ids on all or some PubDictionaries), we trim using both the `options.page` and `options.perPage` options.
 Otherwise, when asking for entries for specific PubDictionaries (proper `options.filter.dictID` only), we trim using the `options.perPage` (since the `page` and `perPage` parameters have already been used in the URL string for the `entries.json` endpoint and we might want to trim results from multiple dictionaries).

The mapping between the returned JSON objects from the PubDictionaries API and the corresponding VSM `entry` objects is fully detailed in the tables below for the different endpoints:

- `entries.json` endpoint:

The returned result is an array of labels and ids.

VSM entry object property | PubDictionaries entry's property | Notes
|:---:|:---:|:---:
`id` | `id` | the concept-ID
`dictID` | - | the URI dictID is the concatenation of the string `https://pubdictionaries.org/dictionaries/` and the dictionary name given in the `entries.json` URL
`descr` | `id` | we trim any leading `http(s)://` or `www.` substrings from the `id`
`terms[0].str` | `label` | the concept's synonymous term (1 only)

- `find_terms.json` endpoint:

The returned result is an object with properties the requested ids and corresponding values arrays, the elements of which are pairs of terms/labels and dictionary names.

VSM entry object property | PubDictionaries entry's property | Notes
|:---:|:---:|:---:
`id` | `id` | the concept-ID (*)
`dictID` | - | the URI dictID is the concatenation of the string `https://pubdictionaries.org/dictionaries/` and the dictionary value returned
`descr` | `id` | we trim any leading `http(s)://` or `www.` substrings from the `id`
`terms[i].str` | `label` | the concept's synonymous terms (*) - can be many

(*) Note that since synonyms are represented with **different labels but same ids** in a PubDictionary, we merge all these entries to a single VSM `entry` object, which has the common `id` and possibly many synonymous `label`s in the `terms` array.

### Map PubDictionaries to Match VSM object

This specification is related to the function `getEntryMatchesForString(str, options, cb)`.

If the `options.filter.dictID` is properly defined and none of the dictIDs used for filtering are PubDictionaries-related (meaning that they do not have the `pubdictionaries.org/dictionaries` as a substring), then `getEntryMatchesForString` returns an empty object result.

If no dictionaries are given for filtering (empty/absent `options.filter.dictID` option) - which corresponds to asking for terms in all PubDictionaries - then we return an error object as follows:
```javascript
{ status: 404, error: 'Not supported' }
```
Same error object we return when the request is for specific dictionaries with the `options.sort.dictID` option and `option.page` > 1 (all according to the **spec**).

An example of a URL string that is built and sent to the PubDictionaries server is:
```
https://pubdictionaries.org/dictionaries/human-UniProt/substring_completion?term=TP53&page=1&per_page=7
```

When multiple dictionaries have been specified in the `options.filter.dictID` and `options.sort.dictID` options, we create 2 groups of dictionaries, corresponding to *preferred* and *filtered/rest* dictionaries.
Multiple parallel URL queries can thus be sent, each corresponding to a specific PubDictionary (like in the example above).
The returned results from each respective group of dictionaries are merged and then sorted according to the spec: first by `type` (first prefix, then infix matches), then by label (`str`) and lastly by dictionary name (`dictID`).
Then the sorted results from the 2 groups are merged and trimmed based on the `options.perPage` value.

The PubDictionaries API currently supports 3 endpoints that can be used for searching terms in the corresponding dictionaries.
By default, the `substring_completion` endpoint is used. 
The (developer) user can specify which one of the 3 endpoints he wants to use with the global option `suggest`.
For example, to use the `prefix_completion` endpoint we initialize the `vsm-pubdictionaries` instance as:
```javascript
const PubDict = require('vsm-pubdictionaries');
const dict = new PubDict({ suggest: 'prefix' }); // 'substring' or 'mixed' also allowed
...
```

We use the URL example above to demonstrate and explain the differences between the 3 endpoints:

- `prefix_completion`: returns only entries whose label **starts with** `TP53`
- `substring_completion`: returns entries which have the `TP53` string **somewhere in their label**, not necessarily having the prefix matches first.
- `mixed_completion`: a **combination of the above two endpoints**, putting the prefix matches first and the infix matches later (common possible entries are pruned).

Each of the `*_completion` endpoints return an array of labels and ids.
The mapping between the returned JSON object from the PubDictionaries API and the corresponding VSM `match` object is fully detailed in the table below:

VSM match object property | PubDictionaries entry's property | Notes
|:---:|:---:|:---:
`id` | `id` | the concept-ID
`dictID` | - | the URI dictID is the concatenation of the string `https://pubdictionaries.org/dictionaries/` and the dictionary name given in the `*_completion` URL
`str` | `label` | the string representation of the term
`descr` | `id` | we trim any leading `http(s)://` or `www.` substrings from the `id`
`terms[0].str` | `label` | the concept's synonymous term (only 1)

## License

This project is licensed under the AGPL license - see [LICENSE.md](LICENSE.md).
