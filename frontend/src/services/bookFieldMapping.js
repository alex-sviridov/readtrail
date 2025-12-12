/**
 * Book Field Mapping
 * Defines the mapping between PocketBase API fields and internal store fields
 */

/**
 * Field mapping schema for book data
 * Makes the transformation logic explicit and maintainable
 */
export const BOOK_FIELD_MAP = {
  // PocketBase → Store mappings
  fromBackend: {
    cover_url: 'coverLink',
    read_date: ['year', 'month'], // Requires date parsing
    created: 'createdAt',
    updated: 'updatedAt'
  },

  // Store → PocketBase mappings
  toBackend: {
    coverLink: 'cover_url',
    year: 'read_date', // Requires date formatting (year + month)
    month: 'read_date', // Requires date formatting (year + month)
    createdAt: 'created',
    updatedAt: 'updated'
  }
}

/**
 * Fields that pass through without transformation
 */
export const PASSTHROUGH_FIELDS = ['id', 'name', 'author', 'attributes']
