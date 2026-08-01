'use strict'

/**
 * Return the first entry accepted by the predicate, or undefined when no entry
 * is accepted.
 *
 * @param {Array<*>} entries entries to inspect from first to last
 * @param {Function} accepts returns true for an accepted entry
 * @returns {*} the first accepted entry, if one exists
 */
function firstAcceptedEntry (entries, accepts) {
  for (let index = 0; index < entries.length; index++) {
    if (!accepts(entries[index])) {
      return entries[index]
    }
  }
}

module.exports = firstAcceptedEntry
