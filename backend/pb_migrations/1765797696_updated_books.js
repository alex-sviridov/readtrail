/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  // update field
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
    "thumbs": [
      "200x300"
    ],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  // update field
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
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
