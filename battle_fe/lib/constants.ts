export const PACKAGE_ID = "0x0bfd969e437e54473fec12abc771a25c328c53bac5f041eea705fd9f8b5bce8d";
export const MODULE_NAME = "battle_sc";
export const NETWORK = "testnet";

export const BATTLE_LIST_ID = PACKAGE_ID; // The package itself might not store the list, but we can query objects of type Battle.

export const BATTLE_TYPE = `${PACKAGE_ID}::${MODULE_NAME}::Battle`;
