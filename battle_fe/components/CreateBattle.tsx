'use client';

import { useState } from 'react';
import { useDAppKit, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { isSuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/utils';
import { PACKAGE_ID, MODULE_NAME } from '@/lib/constants';

export function CreateBattle({ onCreated }: { onCreated: () => void }) {
    const [formData, setFormData] = useState({
        nameLeft: 'BTCX',
        powerLeft: 80,
        nameRight: 'SOLX',
        powerRight: 65,
        entryFee: 0.1,
    });
    const [isPending, setIsPending] = useState(false);

    const { signAndExecuteTransaction, signTransaction } = useDAppKit();
    const currentClient = useCurrentClient();
    const queryClient = useQueryClient();

    const handleCreate = async () => {
        setIsPending(true);
        const txb = new Transaction();

        const feeInMist = BigInt(Math.floor(formData.entryFee * 1e9));

        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::create_battle`,
            arguments: [
                txb.splitCoins(txb.gas, [txb.pure.u64(feeInMist.toString())]),
                txb.pure.string(formData.nameLeft),
                txb.pure.u64(formData.powerLeft),
                txb.pure.string(formData.nameRight),
                txb.pure.u64(formData.powerRight),
                txb.pure.u64(feeInMist.toString()),
            ],
        });

        try {
            let res: any;
            try {
                res = await signAndExecuteTransaction({ transaction: txb });
            } catch (err) {
                if (!signTransaction || !currentClient || typeof (currentClient as any).executeTransaction !== 'function') {
                    throw err;
                }

                const signed: any = await signTransaction({ transaction: txb });
                const signature = signed?.signature ?? signed?.signature?.signature ?? signed?.signatures?.[0];
                const bytes = signed?.bytes ?? signed?.transactionBlockBytes ?? signed?.transactionBlock;

                if (!signature || !bytes) {
                    throw err;
                }

                const isGrpcClient = isSuiGrpcClient(currentClient);
                const transactionBytes = bytes instanceof Uint8Array
                    ? bytes
                    : (isGrpcClient ? fromBase64(bytes) : bytes);

                res = await (currentClient as any).executeTransaction({
                    transaction: transactionBytes,
                    signatures: Array.isArray(signature) ? signature : [signature],
                });
            }
            console.log('Battle created', res);

            // Refresh battle list so the new shared battle appears immediately.
            queryClient.invalidateQueries({ queryKey: ['battles'] });

            setIsPending(false);
            onCreated();
        } catch (err) {
            console.error('Failed to create battle', err);
            setIsPending(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="panel rounded-3xl p-8 backdrop-blur-xl">
                <h2 className="font-display mb-6 text-2xl font-semibold text-white">Configure New Battle</h2>

                <div className="grid gap-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Competitor A</label>
                            <input
                                type="text"
                                value={formData.nameLeft}
                                onChange={(e) => setFormData({ ...formData, nameLeft: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                            />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.powerLeft}
                                onChange={(e) => setFormData({ ...formData, powerLeft: parseInt(e.target.value) })}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
                            />
                            <div className="text-right text-[10px] text-zinc-500">Power: {formData.powerLeft}%</div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Competitor B</label>
                            <input
                                type="text"
                                value={formData.nameRight}
                                onChange={(e) => setFormData({ ...formData, nameRight: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
                            />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.powerRight}
                                onChange={(e) => setFormData({ ...formData, powerRight: parseInt(e.target.value) })}
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-400"
                            />
                            <div className="text-right text-[10px] text-zinc-500">Power: {formData.powerRight}%</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Entry Fee (SUI)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.entryFee}
                                onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) })}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-12 text-white focus:border-cyan-400/60 focus:outline-none"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-200">SUI</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={isPending}
                        className={`mt-4 w-full rounded-2xl py-4 text-lg font-semibold transition-all ${isPending ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'btn-primary'}`}
                    >
                        {isPending ? 'Creating Battle...' : 'Initialize Battle Arena'}
                    </button>
                </div>
            </div>
        </div>
    );
}
