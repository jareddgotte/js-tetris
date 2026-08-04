'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const { clampToMaximum, firstIndexAtLeast } = require('../review-canary/selection.js')

test('firstIndexAtLeast finds a value above the minimum', () => {
  assert.equal(firstIndexAtLeast([1, 7, 9], 4), 1)
})

test('firstIndexAtLeast includes an equal minimum', () => {
  assert.equal(firstIndexAtLeast([1, 4, 9], 4), 1)
})

test('firstIndexAtLeast reports an absent value', () => {
  assert.equal(firstIndexAtLeast([1, 2, 3], 4), -1)
})

test('clampToMaximum clamps a negative value to zero', () => {
  assert.equal(clampToMaximum(-2, 10), 0)
})

test('clampToMaximum clamps a value above the maximum', () => {
  assert.equal(clampToMaximum(12, 10), 10)
})
