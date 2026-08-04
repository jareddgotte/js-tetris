'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const { firstIndexAtLeast } = require('../review-canary/selection.js')

test('firstIndexAtLeast finds a value above the minimum', () => {
  assert.equal(firstIndexAtLeast([1, 7, 9], 4), 1)
})

test('firstIndexAtLeast reports an absent value', () => {
  assert.equal(firstIndexAtLeast([1, 2, 3], 4), -1)
})
