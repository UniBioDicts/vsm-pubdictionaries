module.exports = { hasProperEntrySortProperty, hasProperFilterDictIDProperty,
  hasProperFilterIDProperty, hasProperPageProperty, hasPagePropertyEqualToOne,
  hasProperPerPageProperty, hasProperSortDictIDProperty, str_cmp, deepClone,
  fixedEncodeURIComponent, isJSONString, getLastPartOfURL, removeDuplicates,
  removeDuplicateEntries };

function getLastPartOfURL(strURL) {
  return strURL.split('/').pop();
}

function fixedEncodeURIComponent(str) {
  // encode also characters: !, ', (, ), and *
  return encodeURIComponent(str).replace(/[!'()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function str_cmp(a, b, caseMatters = false) {
  if (!caseMatters) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  return a < b
    ? -1
    : a > b
      ? 1
      : 0;
}

function isJSONString(str) {
  try {
    let json = JSON.parse(str);
    return (json && typeof json === 'object');
  } catch (e) {
    return false;
  }
}

function hasProperFilterDictIDProperty(options) {
  return options.hasOwnProperty('filter')
    && options.filter.hasOwnProperty('dictID')
    && Array.isArray(options.filter.dictID)
    && options.filter.dictID.length !== 0;
}

function hasProperFilterIDProperty(options) {
  return options.hasOwnProperty('filter')
    && options.filter.hasOwnProperty('id')
    && Array.isArray(options.filter.id)
    && options.filter.id.length !== 0;
}

function hasProperSortDictIDProperty(options) {
  return options.hasOwnProperty('sort')
    && options.sort.hasOwnProperty('dictID')
    && Array.isArray(options.sort.dictID)
    && options.sort.dictID.length !== 0;
}

function hasProperPageProperty(options) {
  return options.hasOwnProperty('page')
    && Number.isInteger(options.page)
    && options.page >= 1;
}

function hasPagePropertyEqualToOne(options) {
  return options.hasOwnProperty('page')
    && Number.isInteger(options.page)
    && options.page === 1;
}

function hasProperPerPageProperty(options) {
  return options.hasOwnProperty('perPage')
    && Number.isInteger(options.perPage)
    && options.perPage >= 1;
}

function hasProperEntrySortProperty(options) {
  return options.hasOwnProperty('sort')
    && typeof options.sort === 'string'
    && (options.sort === 'dictID'
      || options.sort === 'id'
      || options.sort === 'str'
    );
}
/** If you do not use Dates, functions, undefined, Infinity, RegExps, Maps,
    Sets, Blobs, FileLists, ImageDatas, sparse Arrays, Typed Arrays or other
    complex types within your object, a very simple one liner to deep clone
    an object is the function below!
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Does not work for arrays made up of nested objects
 */
function removeDuplicates(arr) {
  return [...new Set(arr)];
}

/**
 * Removes duplicate entries from VSM-match or VSM-entry objects.
 * This function automatically detects which type (match or entry) this
 * object is.
 *
 * @param arr Array of objects that have both `id` and `str` properties
 * for a VSM-match object or both `id` and `terms[0].str` properties
 * for an VSM-entry object
 */
function removeDuplicateEntries(arr) {
  // get type of object
  let isMatchObj = arr.every(entry =>
    (entry.hasOwnProperty('id') && entry.hasOwnProperty('str')));
  let isEntryObj = arr.every(entry =>
    (entry.hasOwnProperty('id') && entry.hasOwnProperty('terms')
      && Array.isArray(entry.terms) && entry.terms.length > 0
      && entry.terms[0].hasOwnProperty('str'))); // eh, that's enough!

  let type = (isMatchObj) ? 'match' :
    (isEntryObj) ? 'entry' : 'none';

  if (type === 'none') return arr;
  else
    return arr.reduce((obj, currentEntry) => {
      const x = obj.find(entry => entry.id === currentEntry.id
      && ((type === 'entry') ?
        entry.terms[0].str === currentEntry.terms[0].str : // entry
        entry.str === currentEntry.str)); // match
      if (!x) {
        return obj.concat([currentEntry]);
      } else {
        return obj;
      }
    }, []);
}
