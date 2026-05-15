# Vhey Marketplace Contract

Move package for the Vhey NFT marketplace.

The marketplace uses escrow:

- `list` transfers a digital asset object from the seller into a listing object.
- `buy` transfers APT from buyer to seller, then releases the NFT to the buyer.
- `delist` returns the NFT to the seller and deletes the listing object.

## Build

```bash
aptos move compile --package-dir contracts/vhey_marketplace --named-addresses vhey_marketplace=<publisher-address>
```

## Publish

```bash
aptos move publish --package-dir contracts/vhey_marketplace --named-addresses vhey_marketplace=<publisher-address>
```

After publish, set the frontend env value:

```bash
VITE_MARKETPLACE_ADDRESS=0xeb9465b68be2f4ed4f69f2178e989ee2dba12300e04899b6aafa06cc30c3f5a5
```

The current NFT mint flow uses Aptos digital assets from `0x4::aptos_token`, whose default object type is `0x4::token::Token`.
