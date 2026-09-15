# Local patch on oo7 0.6.0

crates.io `oo7` 0.6.0 rejects Secret Service content types with MIME
parameters (`text/plain; charset=utf8`). `agy` / go-keyring writes that
form, so `item.secret()` failed with `Invalid content type`.

This tree is 0.6.0 plus the type-before-`;` parse from
[linux-credentials/oo7#517](https://github.com/linux-credentials/oo7/pull/517)
(`src/secret.rs` `ContentType::from_str`). Upstream shipped that in
0.7.0-alpha, which needs rustc 1.95.
