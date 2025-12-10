import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { bookOps } from '../db-memory.js';
import { validateBook, validateBatch, ValidationError } from '../utils/validation.js';

const router = express.Router();

// GET /api/books - List all books
router.get('/', (req, res, next) => {
  try {
    const books = bookOps.getAll(req.userId);
    res.json({ books });
  } catch (error) {
    next(error);
  }
});

// POST /api/books/batch - Batch create books (MUST come before /:id route)
router.post('/batch', (req, res, next) => {
  try {
    const data = req.body;

    // Validate batch data
    validateBatch(data);

    // Process books
    const books = data.books.map(book => {
      const attributes = {
        isUnfinished: false,
        customCover: false,
        score: null,
        ...book.attributes
      };

      return {
        id: uuidv4(),
        name: book.name,
        author: book.author || null,
        coverLink: book.coverLink || null,
        year: book.year !== undefined ? book.year : null,
        month: book.month !== undefined ? book.month : null,
        attributes
      };
    });

    // Create all books in a transaction
    const created = bookOps.createBatch(req.userId, books);

    res.status(201).json({ books: created });
  } catch (error) {
    next(error);
  }
});

// GET /api/books/:id - Get single book
router.get('/:id', (req, res, next) => {
  try {
    const book = bookOps.getById(req.userId, req.params.id);

    if (!book) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Book not found'
      });
    }

    res.json({ book });
  } catch (error) {
    next(error);
  }
});

// POST /api/books - Create book
router.post('/', (req, res, next) => {
  try {
    const bookData = req.body;

    // Validate book data
    validateBook(bookData);

    // Set defaults for attributes if not provided
    const attributes = {
      isUnfinished: false,
      customCover: false,
      score: null,
      ...bookData.attributes
    };

    // Create book with UUID
    const newBook = {
      id: uuidv4(),
      name: bookData.name,
      author: bookData.author || null,
      coverLink: bookData.coverLink || null,
      year: bookData.year !== undefined ? bookData.year : null,
      month: bookData.month !== undefined ? bookData.month : null,
      attributes
    };

    const created = bookOps.create(req.userId, newBook);

    res.status(201).json({ book: created });
  } catch (error) {
    next(error);
  }
});

// PUT /api/books/:id - Update book
router.put('/:id', (req, res, next) => {
  try {
    const updates = req.body;

    // Validate updates
    validateBook(updates, true);

    // Check if book exists
    const existing = bookOps.getById(req.userId, req.params.id);
    if (!existing) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Book not found'
      });
    }

    // Update book
    const updated = bookOps.update(req.userId, req.params.id, updates);

    res.json({ book: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', (req, res, next) => {
  try {
    const deleted = bookOps.delete(req.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Book not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
