# authentication system design

> design a generic authentication system

## functional requirements

- upon successful login, a session token should be generated and passed on to the client
- session token should have an expiry time configurable
- session token should have a grace period configurable, within which the user can refresh the token
- session verification should yield relevant details like user id (typically), role id etc
- state management of the mechanism is left to implementation

## constraints

- session has to be verified for validity and expiry on every request
- a typical system also has role and a set of permissions associated with that role or user, which is used to authorize the user to perform certain actions. retrieval of this permission occurs on every request and has to be quick.
- session token should be opaque to the client and
  should not contain any information that can be used to identify the user
- session token should be cryptographically secure and
  resistant to replay attacks, tampering, brute force attacks and timing attacks
- forceful logout of a user may or may not be possible

## process flow

1. user identifies themselves with a username and password, oauth token or any other mechanism
2. verify the credentials and generates a session token with an expiry time
3. create payload with at least user id and expiry time, add any other information as needed
4. marshal the payload into a string or byte array as needed
5. store the payload in a cache store with the session token as key
6. set the expiry time plus grace period as the expiry time for the cache store, if supported
7. return the session token to the client
8. on every request, client sends the session token through either header, cookie or in request body
9. if the cache store removes the session token, the user is logged out automatically. send appropriate response to the
   client
10. otherwise, retrieve the payload from the cache store and verify the expiry time
11. if `current_time` is greater than expiry time plus grace period, user is logged out. send appropriate response to
    the client
12. if `current_time` is greater than expiry time, but less than expiry time plus grace period
    1. re-identify user
    2. upon failure, logout
    3. upon success, regenerate session token and renew expiry
13. if `current_time` is less than expiry time, session is valid. continue with the request

## design choices

### not using jwe

1. JSON Web Encryption (JWE) is a standard for exchanging encrypted data using JSON and Base64.
   JWE allows you to encrypt a JWT payload so that only the intended recipient can read it.
   JWE also provides integrity and authentication checks
2. JWT-JWE is not supported by all languages and frameworks
3. JWT-JWE cannot be invalidated intentionally, without storing the token in a database or cache store,
   defeating the purpose (stateless session verification) of using JWT in the first place
4. workaround would involve shortening expiry time
   which would increase the load on the database every time one needs to refresh the token
5. large payloads in scenario of storing additional details like access-control, role id etc via JWT-JWE would
   increase request size, which is not ideal for mobile devices with limited bandwidth

### using simple randomly generated hash

1. an arbitrary length string is generated using a cryptographically secure hash function
2. seed can be arbitrary and in demonstration is just the current timestamp
3. this string is used as the session token and key for the cache store
4. no personal identifying information can be reverse engineered from the session token
5. session can be invalidated by removing the key from the cache store
6. incoming session token is verified by checking if the key exists in the cache store
   along with the expiry time validation
7. additional request payload size is small, which is ideal for mobile devices with limited bandwidth

### redis or memcached for cache store

1. redis or memcached are in-memory databases, that don't pay the cost of disk access and are very fast relative to disk
   based databases
2. they are simple key-value stores, with a very small set of operations
3. they have in-built support for expiry of keys
4. complex additional data can be marshalled into strings or byte arrays and stored as values

## implementation

### python

```python
import hashlib
import datetime
from typing import Dict, Any, Union, Optional


class Auth:
  def __init__(self, cache: 'Cache', db: 'Database') -> None:
    self.cache = cache
    self.db = db
    self.session_duration = 100000  # Fetch from environment
    self.session_refresh_duration = 10000  # Fetch from environment

  def create_session(self, user_id: int) -> Dict[str, Any]:
    issued_at = datetime.datetime.now()

    expires_at = issued_at + datetime.timedelta(milliseconds=self.session_duration)

    session_token = self.hash(issued_at.isoformat(), 15)

    payload: Dict[str, Any] = {
      'session': session_token,
      'user_id': user_id,
      'issued_at': issued_at,
      'expires_at': expires_at,
    }

    created = self.cache.set(session_token, payload, self.session_duration / 100)

    if not created:
      raise Exception("Unable to create session")

    return payload

  def verify_session(self, session: str) -> Dict[str, Any]:
    payload = self.cache.get(session)

    if payload is None:
      raise Exception("Session not found")

    now = datetime.datetime.now()

    user_id = payload['user_id']

    expires_at = payload['expires_at']

    if now < expires_at:
      return payload

    refresh_expiry = expires_at + datetime.timedelta(milliseconds=self.session_refresh_duration)

    if now >= refresh_expiry:
      raise Exception("Session beyond refresh period")

    valid_credentials = self.check_user_credentials(self.db, user_id)

    if not valid_credentials:
      raise Exception("User not found")

    return self.create_session(user_id)

  @staticmethod
  def hash(text: str, length: int) -> str:
    hasher = hashlib.sha256()

    hasher.update(text.encode('utf-8'))

    hash_value = hasher.hexdigest()

    sliced = hash_value[:length]

    return sliced

  @staticmethod
  def check_user_credentials(db: 'Database', user_id: int) -> bool:
    return True


class Cache:
  def get(self, key: str) -> Optional[Dict[str, Any]]:
    return None

  def set(self, key: str, payload: Dict[str, Any], expiry_in_ms: int = 0) -> bool:
    return True


class Database:
  pass
```

### typescript

```ts
import {createHash} from "crypto";
import {isAfter} from "date-fns";

class Auth {
  cache: Cache;
  db: Database;
  sessionDuration: 100_000; // fetch from environment
  sessionRefreshDuration: 10_000; // fetch from environment

  async createSession(userId: number): Promise<Payload> {
    const issuedAt = new Date();

    const expiresAt = new Date(issuedAt);

    expiresAt.setMilliseconds(
      issuedAt.getMilliseconds() + this.session_duration,
    );

    const sessionToken = hash(issuedAt.toISOString(), 15);

    const payload: Payload = {
      session: sessionToken,
      userId: userId,
      issuedAt: issuedAt,
      expiresAt: expiresAt,
    };

    const created = await this.cache.set(sessionToken, payload, this.session_duration / 100);

    if (!created) {
      throw new Error("unable to create session");
    }

    return payload;
  }

  async verifySession(session: string): Promise<Payload> {
    const payload = await this.cache.get<Payload>(sessionToken);

    if (payload === null) {
      return new Error("session not found");
    }

    const now = new Date();

    const {userId, expiresAt} = payload;

    if (!isAfter(now, expiresAt)) {
      return payload;
    }

    const refreshExpiry = new Date(expiresAt);

    refreshExpiry.setMilliseconds(
      refreshExpiry.getMilliseconds() +
      this.sessionRefreshDuration,
    );

    if (isAfter(now, refreshExpiry)) {
      return new Error("session beyond refresh period");
    }

    const validCredentials = await checkUserCredentials(this.db, userId);

    if (!validCredentials) {
      throw new Error("user not found");
    }

    return this.createSession(userId);
  }
}

function hash(
  text: string,
  length: number,
): string {
  const hasher = createHash("sha256").update(text);

  const hash = hasher.digest("hex");

  const sliced = hash.slice(0, length);

  return sliced;
}

async function checkUserCredentials(
  db: Database,
  userId: number,
): Promise<boolean> {
  return true;
}

/**
 * inteface over redis or memcached
 */
class Cache {
  async get<T = any>(key: string): Promise<T | null> {
    return null;
  }

  async set<T = any>(
    key: string,
    paylod: T,
    expiryInMs = 0,
  ): Promise<bool> {
    return true;
  }
}

/**
 * interface over postgresql, mysql or sql
 */
class Database {
}

type Payload = {
  userId: number;
  issuedAt: Date;
  expiresAt: Date;
  session: string;
};
```

### golang

```go
package main

import (
    "crypto/sha256"
    "encoding/hex"
    "errors"
    "time"
)

type Auth struct {
    cache                  Cache
    db                     Database
    sessionDuration        int // fetch from environment
    sessionRefreshDuration int // fetch from environment
}

func (a *Auth) createSession(userID int) (*Payload, error) {
    issuedAt := time.Now()

    expiresAt := issuedAt.Add(time.Millisecond * time.Duration(a.sessionDuration))

    sessionToken := hash(issuedAt.String(), 15)

    payload := &Payload{
        UserID:    userID,
        IssuedAt:  issuedAt,
        ExpiresAt: expiresAt,
        Session:   sessionToken,
    }

    created, err := a.cache.set(sessionToken, payload, a.sessionDuration / 100)
    
    if err != nil {
        return nil, err
    }

    if !created {
        return nil, errors.New("unable to create session")
    }

    return payload, nil
}

func (a *Auth) verifySession(session string) (*Payload, error) {
    payload, err := a.cache.get(session)
    if err != nil {
        return nil, err
    }

    if payload == nil {
        return nil, errors.New("session not found")
    }

    now := time.Now()

    expiresAt := payload.ExpiresAt

    if now.Before(expiresAt) {
        return payload, nil
    }

    refreshExpiry := expiresAt.Add(time.Millisecond * time.Duration(a.sessionRefreshDuration))

    if now.After(refreshExpiry) {
        return nil, errors.New("session beyond refresh period")
    }

    validCredentials, err := checkUserCredentials(a.db, payload.UserID)
    
    if err != nil {
        return nil, err
    }

    if !validCredentials {
        return nil, errors.New("user not found")
    }

    return a.createSession(payload.UserID)
}

func hash(text string, length int) string {
    hasher := sha256.New()
    
    hasher.Write([]byte(text))
    
    hashBytes := hasher.Sum(nil)
    
    hashStr := hex.EncodeToString(hashBytes)
    
    return hashStr[:length]
}

func checkUserCredentials(db Database, userID int) (bool, error) {
    return true, nil // Replace with your implementation
}

type Payload struct {
    UserID    int
    IssuedAt  time.Time
    ExpiresAt time.Time
    Session   string
}

type Cache interface {
    get(key string) (*Payload, error)
    
    set(key string, payload *Payload, expiryInMs int) (bool, error)
}

type Database interface {}
```
