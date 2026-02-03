'use client';

import { useState } from 'react';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PACKAGE_ID, MODULE_NAME } from '@/lib/constants';
import { getRpcClient } from '@/lib/sui-rpc';

export function BattleGame({ battleId, onBack }: { battleId: string, onBack: () => void }) {
    const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null);
    const [stage, setStage] = useState<'hidden' | 'choosing' | 'pending' | 'revealed'>('hidden');
    const [isShuffling, setIsShuffling] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [cardOrder, setCardOrder] = useState<Array<'left' | 'right'>>(
        () => (Math.random() > 0.5 ? ['left', 'right'] : ['right', 'left'])
    );

    const account = useCurrentAccount();
    const address = account?.address;
    const currentClient = useCurrentClient();
    const { signAndExecuteTransaction } = useDAppKit();
    const fallbackClient = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' });

    const { data: battleData, isPending } = useQuery({
        queryKey: ['battle', battleId],
        queryFn: () => {
            const rpcClient = getRpcClient();
            if (rpcClient) {
                return rpcClient.getObject({ id: battleId, options: { showContent: true } });
            }
            const client: any = currentClient ?? fallbackClient;
            return client.getObject({ objectId: battleId, include: { content: true } });
        }
    });

    const triggerShuffle = () => {
        setIsShuffling(true);
        setTimeout(() => setIsShuffling(false), 600);
    };

    const randomizeCardOrder = () => {
        setCardOrder(Math.random() > 0.5 ? ['left', 'right'] : ['right', 'left']);
    };

    const handleStartJoin = () => {
        if (!address) return;
        setResult(null);
        setSelectedSide(null);
        setStage('choosing');
        randomizeCardOrder();
        triggerShuffle();
    };

    const fetchBattleResult = async (digest: string) => {
        try {
            const client = getRpcClient();
            if (!client) return null;
            const tx = await client.getTransactionBlock({
                digest,
                options: { showEvents: true },
            });
            const events = tx?.events ?? tx?.data?.events ?? [];
            const eventType = `${PACKAGE_ID}::${MODULE_NAME}::BattleResult`;
            const events = tx?.events ?? [];
            const parsed = battleEvent?.parsedJson;
            if (!parsed) return null;

            const winner = parsed?.winner ?? parsed?.winner_address ?? parsed?.winnerAddress;
            const isSwapped = parsed?.is_swapped ?? parsed?.isSwapped ?? false;
            const playerChoice = parsed?.player_choice ?? parsed?.playerChoice;
            const winningCoinName = parsed?.winning_coin_name ?? parsed?.winningCoinName;
            const didWin = winner && address ? String(winner).toLowerCase() === String(address).toLowerCase() : null;

            return { winner, isSwapped, playerChoice, winningCoinName, didWin };
        } catch (err) {
            console.error('Failed to fetch battle result', err);
            return null;
        }
    };

    const handleConfirmJoin = async () => {
        if (!selectedSide) return;
        setStage('pending');

        const txb = new Transaction();
        const RANDOM_ID = "0x8";

        const raw = (battleData as any)?.data ?? (battleData as any)?.object ?? battleData;
        const content = raw?.content ?? raw?.data?.content ?? raw?.object?.data?.content ?? raw?.json ?? raw?.object?.json;
        const fields = content?.dataType === 'moveObject' ? content.fields : content?.fields ?? content;
        if (!fields) {
            console.error('No battle data found');
            setStage('choosing');
            return;
        }

        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::join_battle`,
            arguments: [
                txb.object(battleId),
                txb.splitCoins(txb.gas, [txb.pure.u64(fields.entry_fee.toString())]),
                txb.pure.bool(selectedSide === 'left'),
                txb.object(RANDOM_ID),
            ],
        });

        try {
            const tx = await signAndExecuteTransaction({ transaction: txb });
            console.log('Battle joined', tx);
            const digest = tx?.digest ?? tx?.Transaction?.digest ?? tx?.transaction?.digest ?? tx?.effects?.transactionDigest;
            const battleResult = digest ? await fetchBattleResult(digest) : null;
            setResult(battleResult ?? { didWin: null });
            setStage('revealed');
        } catch (err) {
            console.error('Failed to join battle', err);
            setStage('choosing');
        }
    };

    if (isPending) return <div className="p-8 text-center text-zinc-400">Loading battle...</div>;

    const raw = (battleData as any)?.data ?? (battleData as any)?.object ?? battleData;
    const content = raw?.content ?? raw?.data?.content ?? raw?.object?.data?.content ?? raw?.json ?? raw?.object?.json;
    const fields = content?.dataType === 'moveObject' ? content.fields : content?.fields ?? content;
    if (!fields) return <div className="p-8 text-center text-zinc-400">Battle not found</div>;

    const baseLeftFields = fields.coin_Left?.fields ?? fields.coin_Left ?? fields.coin_left?.fields ?? fields.coin_left ?? {};
    const baseRightFields = fields.coin_Right?.fields ?? fields.coin_Right ?? fields.coin_right?.fields ?? fields.coin_right ?? {};
    const isRevealed = stage === 'revealed';
    const isSwapLoop = stage === 'choosing' && !selectedSide;
    const showShufflePulse = isShuffling && !isSwapLoop;
    const shouldSwap = Boolean(result?.isSwapped);
    const leftFields = shouldSwap ? baseRightFields : baseLeftFields;
    const rightFields = shouldSwap ? baseLeftFields : baseRightFields;
    const hasWinResult = typeof result?.didWin === 'boolean';
    const winnerSide = hasWinResult && selectedSide ? (result.didWin ? selectedSide : selectedSide === 'left' ? 'right' : 'left') : null;
    const leftHighlight = winnerSide === 'left';
    const rightHighlight = winnerSide === 'right';
    const leftSelected = selectedSide === 'left';
    const rightSelected = selectedSide === 'right';
    const resultTone = hasWinResult ? (result?.didWin ? 'text-emerald-400' : 'text-rose-400') : 'text-zinc-300';

    const leftCardTone = `border ${leftSelected ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/5 bg-white/5'}`;
    const rightCardTone = `border ${rightSelected ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-white/5 bg-white/5'}`;
    const leftOrder = cardOrder[0] === 'left' ? 'order-1' : 'order-2';
    const rightOrder = cardOrder[0] === 'right' ? 'order-1' : 'order-2';

    return (
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button
                onClick={onBack}
                className="group flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
                <span className="text-lg transition-transform group-hover:-translate-x-1">{'<-'}</span>
                Back to Battles
            </button>

            <div className="grid gap-8 md:grid-cols-2">
                <div className={`card-flip h-[220px] ${leftOrder} ${showShufflePulse ? 'is-shuffling' : ''} ${isSwapLoop ? 'is-looping-left' : ''}`}>
                    <div className={`card-inner ${isRevealed ? 'is-revealed' : ''}`}>
                        <div className={`card-face card-front ${leftCardTone} ${leftHighlight ? 'ring-2 ring-emerald-500/60' : ''} rounded-3xl p-8`}>
                            <div className="mb-6 flex items-center justify-end">
                                {leftSelected && <span className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-bold text-white">SELECTED</span>}
                            </div>
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <div className="text-3xl font-black tracking-[0.3em] text-white/30">CARD</div>
                                    <div className="mt-2 text-xs uppercase tracking-[0.4em] text-white/40">BACK</div>
                                </div>
                            </div>
                        </div>
                        <div className={`card-face card-back ${leftCardTone} ${leftHighlight ? 'ring-2 ring-emerald-500/60' : ''} rounded-3xl p-8`}>
                            <div className="mb-6 flex items-center justify-end">
                                {leftSelected && <span className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-bold text-white">SELECTED</span>}
                            </div>
                            <h3 className="font-display mb-2 text-3xl font-semibold text-white">{leftFields.name ?? 'Unknown'}</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="mb-1 h-2 w-full rounded-full bg-white/5">
                                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${leftFields.power ?? 0}%` }} />
                                    </div>
                                    <span className="text-xs text-zinc-400">Power: {leftFields.power ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`card-flip h-[220px] ${rightOrder} ${showShufflePulse ? 'is-shuffling' : ''} ${isSwapLoop ? 'is-looping-right' : ''}`}>
                    <div className={`card-inner ${isRevealed ? 'is-revealed' : ''}`}>
                        <div className={`card-face card-front ${rightCardTone} ${rightHighlight ? 'ring-2 ring-emerald-500/60' : ''} rounded-3xl p-8`}>
                            <div className="mb-6 flex items-center justify-end">
                                {rightSelected && <span className="rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold text-white">SELECTED</span>}
                            </div>
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <div className="text-3xl font-black tracking-[0.3em] text-white/30">CARD</div>
                                    <div className="mt-2 text-xs uppercase tracking-[0.4em] text-white/40">BACK</div>
                                </div>
                            </div>
                        </div>
                        <div className={`card-face card-back ${rightCardTone} ${rightHighlight ? 'ring-2 ring-emerald-500/60' : ''} rounded-3xl p-8`}>
                            <div className="mb-6 flex items-center justify-end">
                                {rightSelected && <span className="rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold text-white">SELECTED</span>}
                            </div>
                            <h3 className="font-display mb-2 text-3xl font-semibold text-white">{rightFields.name ?? 'Unknown'}</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="mb-1 h-2 w-full rounded-full bg-white/5">
                                        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${rightFields.power ?? 0}%` }} />
                                    </div>
                                    <span className="text-xs text-zinc-400">Power: {rightFields.power ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="panel rounded-3xl p-8 text-center backdrop-blur-xl">
                {stage === 'hidden' && (
                    <div className="space-y-6">
                        <div className="text-zinc-400">
                            Kartu masih tertutup. Klik join untuk bayar fee dan mengocok kartu.
                        </div>
                        <button
                            onClick={handleStartJoin}
                            className="w-full rounded-2xl py-4 text-lg font-semibold transition-all btn-primary"
                        >
                            Join Battle
                        </button>
                    </div>
                )}

                {stage === 'choosing' && (
                    <div className="space-y-6">
                        <div className="text-zinc-400">
                            Pilih kiri atau kanan. Fee: <span className="font-semibold text-white">{(Number(fields.entry_fee) / 1e9).toFixed(2)} SUI</span>
                        </div>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setSelectedSide('left')}
                                className={`rounded-xl px-8 py-3 text-sm font-semibold transition-all ${leftSelected ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'btn-ghost hover:text-white'}`}
                            >
                                Team Left
                            </button>
                            <button
                                onClick={() => setSelectedSide('right')}
                                className={`rounded-xl px-8 py-3 text-sm font-semibold transition-all ${rightSelected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'btn-ghost hover:text-white'}`}
                            >
                                Team Right
                            </button>
                        </div>
                        <button
                            onClick={handleConfirmJoin}
                            disabled={!selectedSide}
                            className={`w-full rounded-2xl py-4 text-lg font-semibold transition-all ${!selectedSide ? 'btn-ghost cursor-not-allowed opacity-60' : 'btn-primary'}`}
                        >
                            Pay & Reveal
                        </button>
                    </div>
                )}

                {stage === 'pending' && (
                    <div className="space-y-6">
                        <div className="text-zinc-400">Mengacak kartu dan memproses transaksi...</div>
                        <button
                            disabled
                            className="w-full rounded-2xl py-4 text-lg font-semibold btn-ghost cursor-not-allowed opacity-60"
                        >
                            Resolving...
                        </button>
                    </div>
                )}

                {stage === 'revealed' && (
                    <div className="space-y-6 py-4 animate-in zoom-in duration-500">
                        <div className="font-display text-5xl font-semibold text-white italic tracking-tight">BATTLE ENDED!</div>
                        <div className={`text-2xl font-semibold ${resultTone}`}>
                            {hasWinResult ? (result?.didWin ? 'YOU WIN' : 'YOU LOSE') : 'RESULT UNKNOWN'}
                        </div>
                        {result?.winningCoinName && (
                            <div className="text-sm text-zinc-400">Winning Coin: <span className="text-white font-semibold">{result.winningCoinName}</span></div>
                        )}
                        <button
                            onClick={onBack}
                            className="rounded-xl px-8 py-3 font-semibold btn-ghost hover:text-white"
                        >
                            View Other Battles
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
