# Databases in GoLang

## sqlx
[sqlx](https://github.com/jmoiron/sqlx) is a very popular library for working with databases in Go. 
It provides a thin wrapper around the standard library's `database/sql` package to support marshal/unmarshal of structs, 
and provides convenience methods for working with the database.

> as minimal and out of the way as `sqlx` is,
> it still requires a lot of boilerplate code to be written.
> can we do better?

## sqlxgen

[sqlxgen](https://github.com/aakash-rajur/sqlxgen) is a cli tool for generating the 
aforementioned boilerplate code around `sqlx`.

### features
1. introspects database schema to generate `struct`s for all tables, including their respective `crud` methods.
2. discover sql files in configured directories and generate argument and result `struct`s for them, 
   along with all the necessary plumbing code.
3. runs a modified version of your query to not return any actual result, thus allowing to find accurate return types.
4. supports `postgres` and `mysql` databases.

### usage
#### install
```shell
# homebrew
brew install aakash-rajur/tap/sqlxgen

# from source
go install -v github.com/aakash-rajur/sqlxgen/cmd/sqlxgen@latest
```

#### generate
```shell
# in your project directory, generate sqlxgen.yml
sqlxgen init

# edit sqlxgen.yml to update database connection details
# generate table model and query model code
sqlxgen generate
```

#### sqlxgen.yml
```yaml
# will expand variables from environment and .env file
version: 1

log:
  level: info # debug, info, warn, error
  format: text # json, text

configs:
  - name: tmdb_pg # name of this config
    engine: postgres # postgres, mysql
    database:
      # either provide url or host, host takes precedence
      url: "${TMDB_PG_URL}"
      host: "${TMDB_PG_HOST}"
      port: "${TMDB_PG_PORT}"
      db: "${TMDB_PG_DATABASE}"
      user: "${TMDB_PG_USER}"
      password: "${TMDB_PG_PASSWORD}"
      sslmode: "${TMDB_PG_SSLMODE}"
    source:
      models:
        schemas:
          - public
        # array of go regex pattern, empty means all, e.g. ["^.+$"]
        include: []
        # array of go regex pattern, empty means none e.g. ["^public\.migrations*"]
        exclude:
          - "^public.migrations$"
      queries:
        paths:
          - internal/api
        # array of go regex pattern, empty means all e.g. ["^[a-zA-Z0-9_]*.sql$"]
        include: []
        # array of go regex pattern, empty means none e.g. ["^migrations*.sql$"]
        exclude: []
    gen:
      store:
        path: internal/store
      models:
        path: internal/models
```

## alternatives

### sqlc
[sqlc](https://github.com/sqlc-dev/sqlc) is a popular tool to generate type-safe code from SQL, while sqlc has been an inspiration, 
following concerns led me to author `sqlxgen`:

1. dumps all generated code in a single place, not allowing me to organize my code more contextually. 
2. does not introspect my queries through database unless I type cast my selects explicitly.
3. introduces sqlc [syntax](https://docs.sqlc.dev/en/latest/howto/named_parameters.html#nullable-parameters) for 
   writing queries, which is not sql. Fine in most cases but if i want to run that query in my database client, 
   i have to rewrite it.
4. does not generate crud operations for my tables.

### gorm
[gorm](https://gorm.io/) is a popular orm for working with databases in Go.

### sqlboiler
[sqlboiler](https://github.com/volatiletech/sqlboiler) Generate a Go ORM tailored to your database schema.

