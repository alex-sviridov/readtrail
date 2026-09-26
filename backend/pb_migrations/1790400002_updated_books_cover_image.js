/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  collection.fields.removeById("file3091431417")

  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_coverimages001",
    "hidden": false,
    "id": "relation_books_coverimage_001",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "cover_image",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  collection.fields.removeById("relation_books_coverimage_001")

  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "file3091431417",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "cover_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": ["200x300"],
    "type": "file"
  }))

  return app.save(collection)
})
