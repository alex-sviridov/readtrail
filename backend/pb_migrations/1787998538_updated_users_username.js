/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.add(new Field({
    "name": "username",
    "type": "text",
    "required": false,
    "presentable": false,
    "system": false
  }))

  collection.indexes.push(
    "CREATE UNIQUE INDEX `idx_username_pb_users_auth_` ON `users` (`username`) WHERE `username` != ''"
  )

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.removeByName("username")
  collection.indexes = collection.indexes.filter((idx) => !idx.includes("idx_username_pb_users_auth_"))

  return app.save(collection)
})
