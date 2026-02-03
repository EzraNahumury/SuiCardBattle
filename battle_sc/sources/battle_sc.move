module battle_sc::battle_sc;

use std::string::String;
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::random::{Self, Random};
use sui::object::{Self, UID, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::event;

// Errors
const EInvalidFee: u64 = 0;
const EBattleClosed: u64 = 1;

public struct HeroCoin has store, drop {
    name: String,
    power: u64,
}

public struct Battle has key, store {
    id: UID,
    creator: address,
    entry_fee: u64,
    coin_Left: HeroCoin,
    coin_Right: HeroCoin,
    balance: Balance<SUI>,
    is_open: bool,
}

public struct BattleCreated has copy, drop {
    battle_id: ID,
    creator: address,
    entry_fee: u64,
}

public struct BattleResult has copy, drop {
    battle_id: ID,
    winner: address,
    won_amount: u64,
    player_choice: bool, // true = Left, false = Right
    is_swapped: bool,
    winning_coin_name: String,
}

// User inputs for selection
const SELECT_LEFT: bool = true;
const SELECT_RIGHT: bool = false;

public entry fun create_battle(
    fee: Coin<SUI>,
    name_left: String,
    power_left: u64,
    name_right: String,
    power_right: u64,
    entry_fee: u64,
    ctx: &mut TxContext
) {
    assert!(fee.value() == entry_fee, EInvalidFee);

    let coin_left = HeroCoin { name: name_left, power: power_left };
    let coin_right = HeroCoin { name: name_right, power: power_right };

    let battle = Battle {
        id: object::new(ctx),
        creator: ctx.sender(),
        entry_fee,
        coin_Left: coin_left,
        coin_Right: coin_right,
        balance: fee.into_balance(),
        is_open: true,
    };

    event::emit(BattleCreated {
        battle_id: object::id(&battle),
        creator: ctx.sender(),
        entry_fee,
    });

    transfer::share_object(battle);
}

entry fun join_battle(
    battle: &mut Battle,
    payment: Coin<SUI>,
    choose_left: bool,
    r: &Random,
    ctx: &mut TxContext
) {
    assert!(battle.is_open, EBattleClosed);
    assert!(payment.value() == battle.entry_fee, EInvalidFee);

    let player = ctx.sender();
    let payment_balance = payment.into_balance();
    battle.balance.join(payment_balance);

    // Randomly swap positions to hide which is which
    let mut generator = random::new_generator(r, ctx);
    let swap = random::generate_bool(&mut generator);

    let (left_power, left_name) = if (swap) {
        (battle.coin_Right.power, battle.coin_Right.name)
    } else {
        (battle.coin_Left.power, battle.coin_Left.name)
    };

    let (right_power, right_name) = if (swap) {
        (battle.coin_Left.power, battle.coin_Left.name)
    } else {
        (battle.coin_Right.power, battle.coin_Right.name)
    };

    // Determine user's selected power
    let (user_power, user_coin_name) = if (choose_left) {
        (left_power, left_name)
    } else {
        (right_power, right_name)
    };

    let (opp_power, _) = if (choose_left) {
        (right_power, right_name)
    } else {
        (left_power, left_name)
    };

    let total_amount = battle.balance.value();
    let battle_id = object::id(battle);

    // Determine winner
    let winner = if (user_power > opp_power) {
        // Player wins
        let reward = battle.balance.split(total_amount);
        transfer::public_transfer(coin::from_balance(reward, ctx), player);
        player
    } else {
        // Creator wins (or house, here logic implies creator gets it if player loses? 
        // "Entry fee masuk ke vault" - wait, if creator made it, creator should get it?
        // Requirement: "Jika kalah: Entry fee masuk ke vault". 
        // But the battle object IS the vault. 
        // If simply the player lost, the money says in the battle? No, the battle is one-time use per join?
        // "Battle disimpan sebagai object on-chain" -> "User memilih battle"
        // If it's 1v1 PvP, usually creator vs joiner.
        // "Coin Left" and "Coin Right" defined by creator.
        // If player loses, creator wins the pot.
        let reward = battle.balance.split(total_amount);
        transfer::public_transfer(coin::from_balance(reward, ctx), battle.creator);
        battle.creator
    };

    // Close battle after one play.
    battle.is_open = false;

    event::emit(BattleResult {
        battle_id,
        winner,
        won_amount: total_amount,
        player_choice: choose_left,
        is_swapped: swap,
        winning_coin_name: user_coin_name, // Log actual coin name
    });
}
