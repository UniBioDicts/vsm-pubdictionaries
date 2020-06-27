# About PubDictionaries

- Simple structure: A dictionary is a collection of pairs: `(label, id)`
- REST API

# Spec for `vsm-pubdictionaries`

## dictInfo

Information for each sub-dictionary.

- `id` (a URI): http://pubdictionaries.org/dictionaries/\<DICTNAME\>
- `abbrev` == `name`: \<DICTNAME\>

Examples:

- http://pubdictionaries.org/dictionaries/PTO-all
- http://pubdictionaries.org/dictionaries/MONDO

## entry, match objects

- `id` => `id` given
- `dictID`: see above
- `str` == `terms[0].str` => `label` given
- `type` = `S` or `T` (prefix, substring match)
- no `descr`, no `z` option !!!

## 'GET'-TYPE FUNCTIONALITY

### `getDictInfos(options, cb)`

We need to get the sub-dictionaries `dictInfo` in JSON! 
Consider creating an endpoint in the API:

http://pubdictionaries.org/dictionaries/get_dictinfo.json?page=2&perPage=10(&dictionaries=<NAME1,NAME2>)

Will return a list of dictInfo objects, each one having the URI (see above `dictinfo`) and the `name` of the respective sub-dictionaries asked for (or all of them if none were specified in the URL - paginated of course).
Maybe include some other info as well? (admin, managers, lan, timestamps?) i.e. I already see that information is available, for example: http://pubdictionaries.org/dictionaries/UBERON-AE/.

Ordering of results can be alphabetical in the name of the dictionary per se.

### `getEntries(options, cb)`

`/find_ids` find ids for given labels from some specified dictionaries. 
Labels match **exactly**.
Also at least one dictionary has to be specified for lookup and a non-empty label. 

Example: http://pubdictionaries.org/find_ids.json?dictionaries=UBERON-AE&labels=stomach  
See info here: http://docs.pubdictionaries.org/lookup-api/

**IDEALLY** we want a more abstract endpoint (let's call it: `/find`), that returns **tuples `(id, label)`** as the `_completion` endpoints do, does not need label but may require `ids=` and may filter specific dictionaries if possible with `dictionaries=` (otherwise returns all results in some order => `dictID, id`).

So it will be something like: `/find.json?dictionaries=<NAME1>,<NAME2>?ids=<id1>,<id2>`

#### Questions/Notes

- No page/pagesize in the API doc? (default: `page` = 1, `pagesize` = 15 ???)
- For the new proposed endpoint:
  - From a specific dictionary (or list of dictionaries) get all tuples/entries *paginated*. 
  Maybe this does it already? => http://pubdictionaries.org/dictionaries/UBERON-AE/prefix_completion.json?term=*
  - Filter the dictionaries: add an `dictionaries=<comma separated dictIDs>`.
  - Sorting of results => always by `id` or even: `dictID,id`.
- What to do/return when `ids` are shared between dictionaries (and same `label`!)? May need to return the dictionary URI id (or just the name - I am sure it is unique since it's part of the URI id) as well...So I propose a triplet as results:

```
[{
    "id": "http://purl.obolibrary.org/obo/UBERON_0000945",
    "label": "stomach",
    "dictID": "http://pubdictionaries.org/dictionaries/UBERON-AE/"
  },
  {
    "id": "http://purl.obolibrary.org/obo/UBERON_0013525",
    "label": "stomach lumen",
    "dictID": "http://pubdictionaries.org/dictionaries/UBERON-AE/"
  }
]
```

#### Examples

- `/find.json?page=1&pagesize=10`: returns first 10 results of the first dictionary (ordering in the database is considered to be `dictID, id, label`, first dictionary has more than 10 results)
- `/find.json?dictionaries=DICT1&page=1,pagesize=10`: returns first 10 results of that `DICT1` dictionary (`id, label` ordering within)
- `/find.json?dictionaries=DICT1,DICT2,DICT3&page=3,pagesize=10`: returns the 20th to 30th results, if results are first ordered by (`dictID`, `id`, `label`). So you might get various results depending on the size of each dictionary and their names! 
- `/find.json?ids=<id1>,<id2>` (Note: `ids` are URL encoded). Searches for these two `ids` **in all PubDictionaries!**. And that's why you need to have the `dictID` in the returned result!
- `/find.json?dictionaries=<NAME1>,<NAME2>?ids=<id1>,<id2>`. Searches for these two `ids` in the two given PubDictionaries.

### `getEntryMatchesForString(str, options, cb)`

Examples (you need to ask specific dictionaries): 

- http://pubdictionaries.org/dictionaries/UBERON-AE/substring_completion.json?term=stomach
- http://pubdictionaries.org/dictionaries/UBERON-AE/prefix_completion.json?term=sto

`page`, `perPage` options please!!!


I can work with the above two endpoints somewhat, but it would be much easier if they were combined to single `/search` endpoint, which had:

- A `dictionaries` option for filtering. If not-provided, search all of the PubDictionaries!
- Ordering would be (I propose) now something like: `dictID`, first prefix matches, then substring matches and within these two groups, by `label`.
- Again: add `dictID` property in the returned JSON! You need it to distinguish the same-id, same-label terms!
(For example internally - on the server side that is - BioPortal considers a *unique* entry to be this: `dictID+id`)

#### Examples

- `/search.json?term=stomach&page=1&pagesize=10`: searches for `stomach` in all the dictionaries returns first 10 results
- `/search.json?term=stomach&dictionaries=DICT1,DICT2&page=1,pagesize=10`: searches for `stomach` in the two given dictionaries

## General note

We can do without searching in all dictionaries (you can return "Unspecified dictionaries" or something when no `dictionaries=` are specified), both in `search` and `find` endpoints, if it makes the implementation easier.