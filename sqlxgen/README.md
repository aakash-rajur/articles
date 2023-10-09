# Databases with Sqlx

## Goals
1. Demonstrate the current paradigm for working with databases in Go using [sqlx](https://github.com/jmoiron/sqlx).
2. Introduce [sqlxgen](https://github.com/aakash-rajur/sqlxgen), self-authored tool to generate boilerplate code required around [sqlx](https://github.com/jmoiron/sqlx).

## sqlx
[sqlx](https://github.com/jmoiron/sqlx) is a very popular library for working with databases in Go. 
It provides a thin wrapper around the standard library's `database/sql` package to support marshal/unmarshal of structs, 
and provides convenience methods for working with the database.

#### table
```postgresql
create table if not exists movies (
  id serial not null,
  title text not null default '',
  original_title text not null default '',
  original_language text not null default '',
  overview text not null default '',
  runtime int not null default 0,
  release_date date not null default '1970-01-01',
  tagline text not null default '',
  status text not null default '',
  homepage text not null default '',
  popularity float not null default 0,
  vote_average float not null default 0,
  vote_count int not null default 0,
  budget bigint not null default 0,
  revenue bigint not null default 0,
  keywords text[] not null default '{}'
  primary key(id)
);
```

We can use `sqlx` to interact with this table like so:
```go
package example

type Movie struct {
  Id               *int32          `db:"id" json:"id"`
  Title            *string         `db:"title" json:"title"`
  OriginalTitle    *string         `db:"original_title" json:"original_title"`
  OriginalLanguage *string         `db:"original_language" json:"original_language"`
  Overview         *string         `db:"overview" json:"overview"`
  Runtime          *int32          `db:"runtime" json:"runtime"`
  ReleaseDate      *time.Time      `db:"release_date" json:"release_date"`
  Tagline          *string         `db:"tagline" json:"tagline"`
  Status           *string         `db:"status" json:"status"`
  Homepage         *string         `db:"homepage" json:"homepage"`
  Popularity       *float64        `db:"popularity" json:"popularity"`
  VoteAverage      *float64        `db:"vote_average" json:"vote_average"`
  VoteCount        *int32          `db:"vote_count" json:"vote_count"`
  Budget           *int64          `db:"budget" json:"budget"`
  Revenue          *int64          `db:"revenue" json:"revenue"`
  Keywords         *pq.StringArray `db:"keywords" json:"keywords"`
}

func GetMovie(tx *sqlx.Tx, id int) (*Movie, error) {
  movie := &Movie{}

  rows, err := tx.Queryx(
    "select * from movies where id = :id",
    map[string]interface{}{
      "id": id,
    },
  )
	
  if err != nil {
    return nil, err
  }

  defer func(rows *sqlx.Rows) {
      _ = rows.Close()
  }(rows)
  
  rows.Next()
  	
  err = rows.StructScan(movie)
  
  if err != nil {
    return nil, err
  }
  
  return movie, nil
}

func UpdateMovie(tx *sqlx.Tx, movie *Movie) error {
  _, err := tx.NamedExec(
    `update movies set 
      title = :title,
      original_title = :original_title,
      original_language = :original_language,
      overview = :overview,
      runtime = :runtime,
      release_date = :release_date,
      tagline = :tagline,
      status = :status,
      homepage = :homepage,
      popularity = :popularity,
      vote_average = :vote_average,
      vote_count = :vote_count,
      budget = :budget,
      revenue = :revenue,
      keywords = :keywords 
    where id = :id`,
    movie,
  )
  
  if err != nil {
    return err
  }
  
  return nil
}
```

#### query
We can use `sqlx` to list movies in this table like so:
```go
package example

type ListMoviesArgs struct {
  GenreId *string `db:"genre_id" json:"genre_id"`
  Limit   *int32  `db:"limit" json:"limit"`
  Offset  *int32  `db:"offset" json:"offset"`
  Search  *string `db:"search" json:"search"`
  Sort    *string `db:"sort" json:"sort"`
}

type ListMoviesResult struct {
  TotalRecordsCount *int64     `db:"totalRecordsCount" json:"totalRecordsCount"`
  Id                *int32     `db:"id" json:"id"`
  Title             *string    `db:"title" json:"title"`
  ReleaseDate       *time.Time `db:"releaseDate" json:"releaseDate"`
  Status            *string    `db:"status" json:"status"`
  Popularity        *float64   `db:"popularity" json:"popularity"`
}

func ListMovies(tx *sqlx.Tx, args *ListMoviesArgs) ([]*ListMoviesResult, error) {
  results := []*ListMoviesResult{}
  
  rows, err := tx.NamedQuery(
    `select
      count(*) over () as "totalRecordsCount",
      m.id as "id",
      m.title as "title",
      m.release_date as "releaseDate",
      m.status as "status",
      m.popularity as "popularity"
    from movies m
    where true
    and (
      false
      or cast(:search as text) is null
      or m.title_search @@ to_tsquery(:search)
      or m.keywords_search @@ to_tsquery(:search)
    )
    and (
      false
      or cast(:genre_id as text) is null
      or m.id in (
        select
        g.movie_id
        from movies_genres g
        where true
        and g.genre_id = :genre_id
        order by g.movie_id
      )
    )
    order by (case when :sort = 'desc' then m.id end) desc, m.id
    limit :limit
    offset :offset`,
    args,
  )
  
  if err != nil {
    return nil, err
  }

  defer func(rows *sqlx.Rows) {
      _ = rows.Close()
  }(rows)

  result := make([]ListMoviesResult, 0)

  for rows.Next() {
    var instance ListMoviesResult
  
    err = rows.StructScan(&instance)
  
    if err != nil {
      return nil, err
    }
  
    result = append(result, instance)
  }
  
  return results, nil
}
```

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

### generated files
#### store.gen.go
```go
package example

type model interface {
  FindQuery() string

  UpdateQuery() string
}

func Insert[T model](db Database, instances ...T) error {
  for _, instance := range instances {
    rows, err := db.NamedQuery(instance.InsertQuery(), instance)
    
    if err != nil {
      return err
    }
    
    rows.Next()
    
    err = rows.StructScan(&instance)
    
    _ = rows.Close()
    
    if err != nil {
      return err
    }
  }
  
  return nil
}

type queryable interface {
  Sql() string
}

func Query[R any](db Database, args queryable) ([]R, error) {
  re, err := regexp.Compile(`-{2,}\s*([\w\W\s\S]*?)(\n|\z)`)
  
  if err != nil {
  	return nil, err
  }
  
  query := re.ReplaceAllString(args.Sql(), "$2")
  
  rows, err := db.NamedQuery(query, args)
  
  if err != nil {
  	return nil, err
  }
  
  defer func(rows *sqlx.Rows) {
  	_ = rows.Close()
  }(rows)
  
  result := make([]R, 0)
  
  for rows.Next() {
  	var instance R
  
  	err = rows.StructScan(&instance)
  
  	if err != nil {
  	  return nil, err
  	}
  
  	result = append(result, instance)
  }
  
  return result, nil
}
```

#### model.gen.go
```go
package example

type Movie struct {
  Id               *int32          `db:"id" json:"id"`
  Title            *string         `db:"title" json:"title"`
  OriginalTitle    *string         `db:"original_title" json:"original_title"`
  OriginalLanguage *string         `db:"original_language" json:"original_language"`
  Overview         *string         `db:"overview" json:"overview"`
  Runtime          *int32          `db:"runtime" json:"runtime"`
  ReleaseDate      *time.Time      `db:"release_date" json:"release_date"`
  Tagline          *string         `db:"tagline" json:"tagline"`
  Status           *string         `db:"status" json:"status"`
  Homepage         *string         `db:"homepage" json:"homepage"`
  Popularity       *float64        `db:"popularity" json:"popularity"`
  VoteAverage      *float64        `db:"vote_average" json:"vote_average"`
  VoteCount        *int32          `db:"vote_count" json:"vote_count"`
  Budget           *int64          `db:"budget" json:"budget"`
  Revenue          *int64          `db:"revenue" json:"revenue"`
  Keywords         *pq.StringArray `db:"keywords" json:"keywords"`
}

func (_ Movie) FindQuery() string {
	return movieFindSql
}

func (_ Movie) UpdateQuery() string {
	return movieUpdateSql
}

// language=postgresql
var movieFindSql = `
SELECT
  id,
  title,
  original_title,
  original_language,
  overview,
  runtime,
  release_date,
  tagline,
  status,
  homepage,
  popularity,
  vote_average,
  vote_count,
  budget,
  revenue,
  keywords,
  title_search,
  keywords_search
FROM public.movies
WHERE TRUE
  AND (CAST(:id AS INT4) IS NULL or id = :id)
LIMIT 1;
`

// language=postgresql
var movieUpdateSql = `
UPDATE public.movies
SET
  id = :id,
  title = :title,
  original_title = :original_title,
  original_language = :original_language,
  overview = :overview,
  runtime = :runtime,
  release_date = :release_date,
  tagline = :tagline,
  status = :status,
  homepage = :homepage,
  popularity = :popularity,
  vote_average = :vote_average,
  vote_count = :vote_count,
  budget = :budget,
  revenue = :revenue,
  keywords = :keywords
WHERE TRUE
  AND id = :id
RETURNING
  id,
  title,
  original_title,
  original_language,
  overview,
  runtime,
  release_date,
  tagline,
  status,
  homepage,
  popularity,
  vote_average,
  vote_count,
  budget,
  revenue,
  keywords;
`
```

#### query
for the following `list-movies.sql` file:
```postgresql
select
count(*) over () as "totalRecordsCount",
m.id as "id",
m.title as "title",
m.release_date as "releaseDate",
m.status as "status",
m.popularity as "popularity"
from movies m
where true
and (
  false
  or cast(:search as text) is null
  or m.title_search @@ to_tsquery(:search)
  or m.keywords_search @@ to_tsquery(:search)
) -- :search type: text
and (
  false
  or cast(:genre_id as text) is null
  or m.id in (
    select
    g.movie_id
    from movies_genres g
    where true
    and g.genre_id = :genre_id -- :genre_id type: text
    order by g.movie_id
  )
)
order by (case when :sort = 'desc' then m.id end) desc, m.id -- :sort type: text
limit :limit -- :limit type: int
offset :offset; -- :offset type: int
```

will generate the following code co-located with the query file:
#### list-movies.gen.go
```go
type ListMoviesArgs struct {
  GenreId *string `db:"genre_id" json:"genre_id"`
  Limit   *int32  `db:"limit" json:"limit"`
  Offset  *int32  `db:"offset" json:"offset"`
  Search  *string `db:"search" json:"search"`
  Sort    *string `db:"sort" json:"sort"`
}

func (args ListMoviesArgs) Query(db store.Database) ([]ListMoviesResult, error) {
  return store.Query[ListMoviesResult](db, args)
}

func (args ListMoviesArgs) Sql() string {
  return listMoviesSql
}

type ListMoviesResult struct {
  TotalRecordsCount *int64     `db:"totalRecordsCount" json:"totalRecordsCount"`
  Id                *int32     `db:"id" json:"id"`
  Title             *string    `db:"title" json:"title"`
  ReleaseDate       *time.Time `db:"releaseDate" json:"releaseDate"`
  Status            *string    `db:"status" json:"status"`
  Popularity        *float64   `db:"popularity" json:"popularity"`
}

//go:embed list-movies.sql
var listMoviesSql string
```

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

