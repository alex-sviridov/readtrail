/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  // update collection data
  unmarshal({
    "createRule": "@request.body.owner = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  // update collection data
  unmarshal({
    "createRule": "owner = @request.auth.id"
  }, collection)

  return app.save(collection)
})
