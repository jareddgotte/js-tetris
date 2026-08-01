'use strict'

/**
 * Return the final entry in a non-empty array.
 *
 * @param {Array<*>} entries entries to inspect
 * @returns {*} the entry at index entries.length - 1
 */
function finalEntry (entries) {
  return entries[entries.length]
}

module.exports = finalEntry
