/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_coverimages001",
    "name": "cover_images",
    "type": "base",
    "system": false,
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_ci_id_001",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_ci_created_001",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_ci_updated_001",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "file_ci_file_001",
        "maxSelect": 1,
        "maxSize": 524288,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp"
        ],
        "name": "file",
        "presentable": false,
        "protected": false,
        "required": true,
        "system": false,
        "thumbs": ["200x300"],
        "type": "file"
      },
      {
        "exceptDomains": [],
        "hidden": false,
        "id": "url_ci_sourceurl_001",
        "name": "source_url",
        "onlyDomains": [],
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_ci_hash_001",
        "max": 64,
        "min": 64,
        "name": "hash",
        "pattern": "^[a-f0-9]{64}$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_ci_refcount_001",
        "max": null,
        "min": 0,
        "name": "ref_count",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_cover_images_hash` ON `cover_images` (`hash`)",
      "CREATE INDEX `idx_cover_images_source_url` ON `cover_images` (`source_url`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_coverimages001")

  return app.delete(collection)
})
