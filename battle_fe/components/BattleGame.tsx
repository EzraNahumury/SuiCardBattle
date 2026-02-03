'use client';

import { useState } from 'react';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PACKAGE_ID, MODULE_NAME } from '@/lib/constants';
import { getRpcClient } from '@/lib/sui-rpc';

export function BattleGame({ battleId, onBack }: { battleId: string; onBack: () => void }) {
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
    const fallbackClient = new SuiGrpcClient({
        network: 'testnet',
        baseUrl: 'https://fullnode.testnet.sui.io:443',
    });

    const { data: battleData, isPending } = useQuery({
        queryKey: ['battle', battleId],
        queryFn: () => {
            const rpcClient = getRpcClient();
            if (rpcClient) {
                return rpcClient.getObject({ id: battleId, options: { showContent: true } });
            }
            const client: any = currentClient ?? fallbackClient;
            return client.getObject({ objectId: battleId, include: { content: true } });
        },
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

    // ✅ FIXED FUNCTION
    const fetchBattleResult = async (digest: string) => {
        try {
            const client = getRpcClient();
            if (!client) return null;

            const tx = await client.getTransactionBlock({
                digest,
                options: { showEvents: true },
            });

            const events = tx?.events ?? [];
            const eventType = `${PACKAGE_ID}::${MODULE_NAME}::BattleResult`;

            const battleEvent = events.find(
                (event: any) => event?.type === eventType
            );

            const parsed = battleEvent?.parsedJson;
            if (!parsed) return null;

            const winner = parsed?.winner ?? parsed?.winner_address ?? parsed?.winnerAddress;
            const isSwapped = parsed?.is_swapped ?? parsed?.isSwapped ?? false;
            const playerChoice = parsed?.player_choice ?? parsed?.playerChoice;
            const winningCoinName = parsed?.winning_coin_name ?? parsed?.winningCoinName;

            const didWin =
                winner && address
                    ? String(winner).toLowerCase() === String(address).toLowerCase()
                    : null;

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
        const RANDOM_ID = '0x8';

        const raw = (battleData as any)?.data ?? (battleData as any)?.object ?? battleData;
        const content =
            raw?.content ??
            raw?.data?.content ??
            raw?.object?.data?.content ??
            raw?.json ??
            raw?.object?.json;

        const fields =
            content?.dataType === 'moveObject' ? content.fields : content?.fields ?? content;

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
            const digest =
                tx?.digest ??
                tx?.Transaction?.digest ??
                tx?.transaction?.digest ??
                tx?.effects?.transactionDigest;

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
    const content =
        raw?.content ??
        raw?.data?.content ??
        raw?.object?.data?.content ??
        raw?.json ??
        raw?.object?.json;

    const fields =
        content?.dataType === 'moveObject' ? content.fields : content?.fields ?? content;

    if (!fields) return <div className="p-8 text-center text-zinc-400">Battle not found</div>;

    // ⬇️ UI code kamu TIDAK DIUBAH (aman)
    // … lanjutannya tetap sama
    return <div>{/* UI kamu tetap */}</div>;
}
