# CANDY MACHINE COMMANDS

https://user-images.githubusercontent.com/81876372/133098938-dc2c91a6-1280-4ee1-bf0e-db0ccc972ff7.mp4

## Documentation

## Development

### Verify Assets

```
ts-node src/candy-machine-v2-cli.ts verify_assets ./assets
```

### Create Candy Machine

```
ts-node src/candy-machine-v2-cli.ts upload \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -cp config.json \
    -c example \
    ./assets

```


ts-node candy-machine-v2-cli.ts upload -e devnet -k ../keys/nba-keys.json -cp ../config/config9.json -c nba-shots ../mock-assets/nba-shots

### Set Candy Machine Collection

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts set_collection \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -c example \
    -m C2eGm8iQPnKVWxakyo8QhwJUvYrZHKF52DPQuAejpTWG
```

### Remove Candy Machine Collection

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts remove_collection \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -c example
```

### Update Candy Machine

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts update_candy_machine \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -cp config.json \
    -c example
```


### Verify Upload

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts verify_upload \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -c example
```

ts-node candy-machine-v2-cli.ts verify_upload -e devnet -k ../keys/nba-keys.json -c nba-shots 

### Mint one token from collection

```
ts-node candy-machine-v2.1-mint-cli.ts mint_one_token -e devnet -k ../keys/nba-keys.json -c nba-shots
```

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts mint_one_token \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -c example
```

### Mint multiple tokens from collection

```
ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts mint_multiple_tokens \
    -e devnet \
    -k ~/.config/solana/devnet.json \
    -c example \
    --number 2
```





