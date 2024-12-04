/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Database } from '../database/main.js'
import vine, { VineNumber, VineString } from '@vinejs/vine'
import { VineDbSearchCallback, VineDbSearchOptions } from '../types/vine.js'

/**
 * Default validation messages used by the unique and the
 * exists rules
 */
export const messages = {
  'database.unique': 'The {{ field }} has already been taken',
  'database.exists': 'The selected {{ field }} is invalid',
}

/**
 * Defines the "unique" and "exists" validation rules with
 * VineJS.
 */
export function defineValidationRules(db: Database) {
  const uniqueRule = vine.createRule<VineDbSearchCallback | VineDbSearchOptions>(
    async (value, callbackOrOptions, field) => {
      if (!field.isValid) {
        return
      }

      /**
       * Rely on the callback to execute the query and return value
       * a boolean.
       *
       * True means value is unique
       * False means value is not unique
       */
      if (typeof callbackOrOptions === 'function') {
        const isUnique = await callbackOrOptions(db, value as string, field)
        if (!isUnique) {
          field.report(messages['database.unique'], 'database.unique', field)
        }
        return
      }

      const { table, column, filter, connection, caseInsensitive } = callbackOrOptions
      const query = db.connection(connection).from(table).select(column)

      /**
       * Apply where clause respecting the caseInsensitive flag.
       */
      if (caseInsensitive) {
        query.whereRaw(`lower(${column}) = ?`, [db.raw(`lower(?)`, [value])])
      } else {
        query.where(column, value as string)
      }

      /**
       * Apply user filter
       */
      await filter?.(query, value as string, field)

      /**
       * Fetch the first row from the database
       */
      const row = await query.first()
      if (row) {
        field.report(messages['database.unique'], 'database.unique', field)
      }
    }
  )

  const existsRule = vine.createRule<VineDbSearchCallback | VineDbSearchOptions>(
    async (value, callbackOrOptions, field) => {
      if (!field.isValid) {
        return
      }

      /**
       * Rely on the callback to execute the query and return value
       * a boolean.
       *
       * True means value exists
       * False means value does not exist
       */
      if (typeof callbackOrOptions === 'function') {
        const exists = await callbackOrOptions(db, value as string, field)
        if (!exists) {
          field.report(messages['database.exists'], 'database.exists', field)
        }
        return
      }

      const { table, column, filter, connection, caseInsensitive } = callbackOrOptions
      const query = db.connection(connection).from(table).select(column)

      /**
       * Apply where clause respecting the caseInsensitive flag.
       */
      if (caseInsensitive) {
        query.whereRaw(`lower(${column}) = ?`, [db.raw(`lower(?)`, [value])])
      } else {
        query.where(column, value as string)
      }

      /**
       * Apply user filter
       */
      await filter?.(query, value as string, field)

      /**
       * Fetch the first row from the database
       */
      const row = await query.first()
      if (!row) {
        field.report(messages['database.exists'], 'database.exists', field)
      }
    }
  )

  VineString.macro('unique', function (this: VineString, callbackOrOptions) {
    return this.use(uniqueRule(callbackOrOptions))
  })
  VineString.macro('exists', function (this: VineString, callbackOrOptions) {
    return this.use(existsRule(callbackOrOptions))
  })

  VineNumber.macro('unique', function (this: VineNumber, callbackOrOptions) {
    return this.use(uniqueRule(callbackOrOptions))
  })
  VineNumber.macro('exists', function (this: VineNumber, callbackOrOptions) {
    return this.use(existsRule(callbackOrOptions))
  })
}
