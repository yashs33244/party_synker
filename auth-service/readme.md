```
docker run -d \
  --name mongodb-container \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpassword \
  mongo

```
```
docker run -d \
    --name party_sync \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -e POSTGRES_DB=party_sync \
    -p 5432:5432 \
    postgres
```

```
docker run --name my-redis -d -p 6379:6379 redis
```

