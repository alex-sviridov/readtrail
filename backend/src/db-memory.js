// In-memory database for testing
const users = new Map();
const books = new Map();
const settings = new Map();

function ensureUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, { id: userId, is_guest: 0, created_at: new Date().toISOString() });
  }
}

export function ensureGuestUser() {
  ensureUser('guest');
  return 'guest';
}

export function migrateGuestData(userId) {
  if (!users.has('guest')) return;

  ensureUser(userId);

  // Migrate books
  for (const [bookId, book] of books.entries()) {
    if (book.user_id === 'guest') {
      book.user_id = userId;
    }
  }

  // Migrate settings
  if (settings.has('guest')) {
    if (!settings.has(userId)) {
      settings.set(userId, settings.get('guest'));
    }
    settings.delete('guest');
  }

  users.delete('guest');
}

export const bookOps = {
  getAll(userId) {
    const result = [];
    for (const book of books.values()) {
      if (book.user_id === userId) {
        result.push({
          id: book.id,
          name: book.name,
          author: book.author,
          coverLink: book.cover_link,
          year: book.year,
          month: book.month,
          attributes: {
            isUnfinished: Boolean(book.is_unfinished),
            customCover: Boolean(book.custom_cover),
            score: book.score
          },
          createdAt: book.created_at,
          updatedAt: book.updated_at
        });
      }
    }
    return result;
  },

  getById(userId, bookId) {
    const book = books.get(bookId);
    if (!book || book.user_id !== userId) return null;

    return {
      id: book.id,
      name: book.name,
      author: book.author,
      coverLink: book.cover_link,
      year: book.year,
      month: book.month,
      attributes: {
        isUnfinished: Boolean(book.is_unfinished),
        customCover: Boolean(book.custom_cover),
        score: book.score
      },
      createdAt: book.created_at,
      updatedAt: book.updated_at
    };
  },

  create(userId, bookData) {
    ensureUser(userId);
    const now = new Date().toISOString();

    books.set(bookData.id, {
      id: bookData.id,
      user_id: userId,
      name: bookData.name,
      author: bookData.author,
      cover_link: bookData.coverLink,
      year: bookData.year,
      month: bookData.month,
      is_unfinished: bookData.attributes.isUnfinished ? 1 : 0,
      custom_cover: bookData.attributes.customCover ? 1 : 0,
      score: bookData.attributes.score,
      created_at: now,
      updated_at: now
    });

    return this.getById(userId, bookData.id);
  },

  update(userId, bookId, updates) {
    const book = books.get(bookId);
    if (!book || book.user_id !== userId) return null;

    const now = new Date().toISOString();

    if (updates.name !== undefined) book.name = updates.name;
    if (updates.author !== undefined) book.author = updates.author;
    if (updates.coverLink !== undefined) book.cover_link = updates.coverLink;
    if (updates.year !== undefined) book.year = updates.year;
    if (updates.month !== undefined) book.month = updates.month;

    if (updates.attributes) {
      if (updates.attributes.isUnfinished !== undefined) {
        book.is_unfinished = updates.attributes.isUnfinished ? 1 : 0;
      }
      if (updates.attributes.customCover !== undefined) {
        book.custom_cover = updates.attributes.customCover ? 1 : 0;
      }
      if (updates.attributes.score !== undefined) {
        book.score = updates.attributes.score;
      }
    }

    book.updated_at = now;

    return this.getById(userId, bookId);
  },

  delete(userId, bookId) {
    const book = books.get(bookId);
    if (!book || book.user_id !== userId) return false;

    books.delete(bookId);
    return true;
  },

  createBatch(userId, booksArray) {
    ensureUser(userId);
    const created = [];
    const tempBooks = new Map();

    // First validate and prepare all books (atomic check)
    try {
      for (const bookData of booksArray) {
        const now = new Date().toISOString();
        const book = {
          id: bookData.id,
          user_id: userId,
          name: bookData.name,
          author: bookData.author,
          cover_link: bookData.coverLink,
          year: bookData.year,
          month: bookData.month,
          is_unfinished: bookData.attributes.isUnfinished ? 1 : 0,
          custom_cover: bookData.attributes.customCover ? 1 : 0,
          score: bookData.attributes.score,
          created_at: now,
          updated_at: now
        };
        tempBooks.set(book.id, book);
      }

      // If all valid, commit to database
      for (const [id, book] of tempBooks) {
        books.set(id, book);
        created.push(this.getById(userId, id));
      }
    } catch (error) {
      // If any error, rollback by not committing anything
      throw error;
    }

    return created;
  }
};

export const settingsOps = {
  get(userId) {
    const userSettings = settings.get(userId);

    if (!userSettings) {
      return {
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: true,
        updatedAt: null
      };
    }

    return {
      showBookInfo: Boolean(userSettings.show_book_info),
      allowUnfinishedReading: Boolean(userSettings.allow_unfinished_reading),
      allowScoring: Boolean(userSettings.allow_scoring),
      updatedAt: userSettings.updated_at
    };
  },

  update(userId, updates) {
    ensureUser(userId);
    const now = new Date().toISOString();

    let userSettings = settings.get(userId);

    if (!userSettings) {
      userSettings = {
        user_id: userId,
        show_book_info: 1,
        allow_unfinished_reading: 1,
        allow_scoring: 1,
        updated_at: now
      };
      settings.set(userId, userSettings);
    }

    if (updates.showBookInfo !== undefined) {
      userSettings.show_book_info = updates.showBookInfo ? 1 : 0;
    }
    if (updates.allowUnfinishedReading !== undefined) {
      userSettings.allow_unfinished_reading = updates.allowUnfinishedReading ? 1 : 0;
    }
    if (updates.allowScoring !== undefined) {
      userSettings.allow_scoring = updates.allowScoring ? 1 : 0;
    }

    userSettings.updated_at = now;

    return this.get(userId);
  }
};

export { ensureUser };
