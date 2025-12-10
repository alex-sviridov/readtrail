export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function validateBook(book, isUpdate = false) {
  const errors = [];

  // Validate name (required for create, optional for update)
  if (!isUpdate || book.name !== undefined) {
    if (typeof book.name !== 'string') {
      errors.push('name must be a string');
    } else if (book.name.trim() === '') {
      errors.push('name cannot be empty');
    }
  } else if (!isUpdate) {
    errors.push('name is required');
  }

  // Validate author
  if (book.author !== undefined && book.author !== null && typeof book.author !== 'string') {
    errors.push('author must be a string or null');
  }

  // Validate coverLink
  if (book.coverLink !== undefined && book.coverLink !== null && typeof book.coverLink !== 'string') {
    errors.push('coverLink must be a string or null');
  }

  // Validate year and month consistency
  if (book.year !== undefined || book.month !== undefined) {
    const year = book.year !== undefined ? book.year : null;
    const month = book.month !== undefined ? book.month : null;

    if ((year === null && month !== null) || (year !== null && month === null)) {
      errors.push('year and month must both be null or both be set');
    }

    if (year !== null && typeof year !== 'number') {
      errors.push('year must be a number or null');
    }

    if (month !== null) {
      if (typeof month !== 'number') {
        errors.push('month must be a number or null');
      } else if (month < 1 || month > 12) {
        errors.push('month must be between 1 and 12');
      }
    }
  }

  // Validate attributes
  if (book.attributes !== undefined) {
    if (typeof book.attributes !== 'object' || book.attributes === null || Array.isArray(book.attributes)) {
      errors.push('attributes must be an object');
    } else {
      if (book.attributes.isUnfinished !== undefined && typeof book.attributes.isUnfinished !== 'boolean') {
        errors.push('attributes.isUnfinished must be a boolean');
      }

      if (book.attributes.customCover !== undefined && typeof book.attributes.customCover !== 'boolean') {
        errors.push('attributes.customCover must be a boolean');
      }

      if (book.attributes.score !== undefined && book.attributes.score !== null) {
        if (typeof book.attributes.score !== 'number' || ![-1, 0, 1].includes(book.attributes.score)) {
          errors.push('attributes.score must be -1, 0, 1, or null');
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '), { errors });
  }
}

export function validateSettings(settings) {
  const errors = [];
  const validFields = ['showBookInfo', 'allowUnfinishedReading', 'allowScoring'];

  // Check for unknown fields
  for (const key of Object.keys(settings)) {
    if (!validFields.includes(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  // Validate field types
  if (settings.showBookInfo !== undefined) {
    if (typeof settings.showBookInfo !== 'boolean') {
      errors.push('showBookInfo must be a boolean');
    }
  }

  if (settings.allowUnfinishedReading !== undefined) {
    if (typeof settings.allowUnfinishedReading !== 'boolean') {
      errors.push('allowUnfinishedReading must be a boolean');
    }
  }

  if (settings.allowScoring !== undefined) {
    if (typeof settings.allowScoring !== 'boolean') {
      errors.push('allowScoring must be a boolean');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '), { errors });
  }
}

export function validateBatch(data) {
  if (!data.books) {
    throw new ValidationError('books array is required');
  }

  if (!Array.isArray(data.books)) {
    throw new ValidationError('books must be an array');
  }

  // Validate each book
  for (let i = 0; i < data.books.length; i++) {
    try {
      validateBook(data.books[i], false);
    } catch (error) {
      throw new ValidationError(`Invalid book at index ${i}: ${error.message}`, error.details);
    }
  }
}
