## concepts
- [hashing function](#hashing-function)
- [one-way functions](#one-way-functions)
- [immutable ledger](#immutable-ledger)
- [decentralisation](#decentralisation)

### hashing function
> A hash function is any function that can be used to map data of arbitrary size to fixed-size values. The values returned by a hash function are called hash values, hash codes, digests, or simply hashes. The values are usually used to index a fixed-size table called a hash table. Use of a hash function to index a hash table is called hashing or scatter storage addressing.

![Hashing function concept](https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Hash_table_4_1_1_0_0_1_0_LL.svg/313px-Hash_table_4_1_1_0_0_1_0_LL.svg.png "Hashing function concept")


#### examples
- CRC32 - simple checksum, used in ZIP, OpenPGP and number of other standards.
- MD2, MD5 - too old and weak MD5 - old and considered weak.
- SHA1 - standard de facto, used almost everywhere (DSA algorithm is used only with SHA1, that's also wide usage area).
- SHA224/256/384/512 - should supersede SHA1, and is used with DSA keys larger than 1024 bits, and ECDSA signatures
- RipeMD160 - used in OpenPGP, and some X.509 certificates.


### one-way functions
> a function that is easy to compute on every input, but hard to invert given the image of a random input.
- "easy" and "hard" are to be understood in the sense of computational complexity.
- "easy" and "hard" are usually interpreted relative to some specific computing entity; typically "cheap enough for the legitimate users" and "prohibitively expensive for any malicious agents".
- all hash functions are one-way functions.

![cryptographic hash functions](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Cryptographic_Hash_Function.svg/320px-Cryptographic_Hash_Function.svg.png "cryptographic has functions")


### immutable ledger
> The word Immutable means “cannot be changed.” And ledger is a fancy term for record, a record of something. Therefore, an Immutable Ledger is a record that cannot be changed.

### decentralisation
> Decentralization or decentralisation is the process by which the activities of an organization, particularly those regarding planning and decision making, are distributed or delegated away from a central, authoritative location or group.

![decentralisation](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Decentralization_diagram.svg/320px-Decentralization_diagram.svg.png "decentralisation")

## blockchain
> trustless and fully decentralized peer-to-peer immutable ledger

- a growing list of records, called blocks, that are linked together using cryptography.
- spread over a network of participants often referred to as nodes.
- each block contains a cryptographic hash of the previous block, a timestamp, and transaction data
- timestamp proves that the transaction data existed when the block was published
- each block contain information about the block previous to it, they form a chain, with each additional block reinforcing the ones before it.
- blockchains are resistant to modification of their data because once recorded, the data in any given block cannot be altered retroactively without altering all subsequent blocks.
- managed by a peer-to-peer network for use as a publicly distributed ledger, where nodes collectively adhere to a protocol to communicate and validate new blocks.

![bitcoin block data overview](https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Bitcoin_Block_Data.svg/320px-Bitcoin_Block_Data.svg.png "bitcoin block data overview")


## use cases
- cheap fund transfer through cryptocurrency by eliminating middlemen
- non-fungible tokens (nft) platforms to buy, sell and bid uber expensive possessions
- cheap smart contracts through ethereum by eliminating middlemen
- secure, cheap and fine-grained sharing of confidential data like identity data, medical data with complete control over share
- secure, cheap and verifiable voting system

