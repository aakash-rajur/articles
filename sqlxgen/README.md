# Simplifying Database Operations in Go with SQLxgen

When working with databases in Go, developers often find themselves writing boilerplate code to handle routine database
operations like inserting records, updating data, finding single records, querying for multiple records, and deleting
data. This repetitive work can be time-consuming and error-prone. That's where SQLxgen comes to the rescue.

**SQLxgen** is a command-line tool written in Go that simplifies database access by automating the generation of code
for standard CRUD (Create, Read, Update, Delete) operations. Upon invoking the 'generate' command, SQLxgen performs
several key tasks to streamline database operations:

1. **Model Struct Generation**: SQLxgen introspects your database to automatically generate model structs with valid
   struct tags. These model structs are designed to map to your database tables, making it easy to work with database
   records in a type-safe manner.

2. **Store APIs Generation**: In addition to model structs, SQLxgen generates standard store APIs for common database
   operations, including inserting records, updating data, finding single records, querying for multiple records, and
   deleting data. These APIs are ready to use, saving you from writing boilerplate code.

3. **Query File Discovery**: SQLxgen scans your project to discover nested SQL files. It then runs modified versions of
   these queries to avoid fetching rows. As a result, it generates input and output structs, along with a simple API to
   invoke these queries. Since the queries run within the database, the output structs have accurate typings.

4. **JSON Aggregation**: SQLxgen provides the ability to hint JSON aggregation with comments in your query files. These
   comments help determine whether an output field should be treated as an array or struct, enhancing the generated
   code's accuracy.

The ability to automatically generate code for model structs, store APIs, and database queries significantly reduces the
time and effort required to interact with your database. This results in more efficient and maintainable database access
in your Go applications.

## Getting Started

To get started with SQLxgen and experience the benefits of streamlined database operations in Go, check out
the [GitHub repository](https://github.com/aakash-rajur/sqlxgen) for detailed documentation and installation
instructions.

## Example

### model

`actor table`
```sql
CREATE TABLE public.actors (
    id integer NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    name_search tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, name)) STORED
);
```

generates `actor.gen.go`
```go
package example

type Actor struct {
	Id         *int32  `db:"id" json:"id"`
	Name       *string `db:"name" json:"name"`
	NameSearch *string `db:"name_search" json:"name_search"`
}

func (actor Actor) String() string {
	/* skipping for example */
	return ""
}

// language=postgresql
var actorInsertSql = `
-- generated, skipping for example
`

// language=postgresql
var actorUpdateSql = `
-- generated, skipping for example
`

// language=postgresql
var actorFindSql = `
-- generated, skipping for example
`

// language=postgresql
var actorFindAllSql = `
-- generated, skipping for example
`

// language=postgresql
var actorDeleteSql = `
-- generated, skipping for example
`
```

#### usage

```go
package main

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/aakash-rajur/example/models"
	"github.com/aakash-rajur/example/store"
)

func main() {
	db, _ := sqlx.Connect("postgres", "...")

	tx, _ := db.Beginx()

	actor := models.Actor{
		Name: utils.PointerTo("John Doe"),
	}

	_ = store.Insert(tx, &actor)

	// actor.Id is now populated
	fmt.Println(actor)
}

```

### query

`get-actor.sql`
```sql
select
a."id" as "id",
a."name" as "name",
coalesce(
  (
    select
    jsonb_agg(
      jsonb_build_object(
        'id', ma.movie_id,
        'title', m.title,
        'releaseDate', m.release_date,
        'character', ma.character
      ) order by m.release_date desc
    )
    from movies_actors ma
    inner join movies m on ma.movie_id = m.id
    where true
    and ma.actor_id = a.id
  ),
  '[]'
) as "movies"
from actors a
where a.id = :id; -- :id type: bigint
```

`get_actor.gen.go`
```go
package example

import (
	_ "embed"
	"fmt"
	"strings"

	"github.com/aakash-rajur/example/store"
)

type GetActorArgs struct {
	Id *int64 `db:"id" json:"id"`
}

func (args GetActorArgs) Sql() string {
	return getActorSql
}

func (args GetActorArgs) Query(db store.Database) ([]GetActorResult, error) {
	return store.Query[GetActorResult](db, args)
}

type GetActorResult struct {
	Id     *int32           `db:"id" json:"id"`
	Movies *store.JsonArray `db:"movies" json:"movies"`
	Name   *string          `db:"name" json:"name"`
}
```

#### usage

```go
package main

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/aakash-rajur/example/api"
	"github.com/aakash-rajur/example/store"
)

func main() {
	db, _ := sqlx.Connect("postgres", "...")

	tx, _ := db.Beginx()

	actorArgs := api.GetActorArgs{Id: utils.PointerTo[int64](1)}

	actorResults, _ := actorArgs.Query(tx)

	fmt.Println(actorResults)
}

```
