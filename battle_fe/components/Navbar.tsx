'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getRpcClient } from '@/lib/sui-rpc';

export function Navbar() {
    const account = useCurrentAccount();
    const address = account?.address;

    const { data: balanceData } = useQuery({
        queryKey: ['sui-balance', address],
        enabled: Boolean(address),
        queryFn: async () => {
            const client = getRpcClient();
            if (!client || !address) return null;
            return client.getBalance({ owner: address });
        },
        refetchInterval: 10000,
    });

    const rawBalance = (balanceData as any)?.totalBalance
        ?? (balanceData as any)?.balance
        ?? (balanceData as any)?.coinBalance
        ?? (balanceData as any)?.addressBalance
        ?? (balanceData as any)?.balance?.balance
        ?? (balanceData as any)?.balance?.coinBalance;
    const suiBalance = rawBalance ? (Number(rawBalance) / 1e9).toFixed(3) : '--';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20">
                        <span className="text-xl font-bold text-white">S</span>
                    </div>
                    <span className="font-display text-xl font-semibold tracking-tight text-white">
                        Sui Card <span className="text-cyan-300">Battle</span>
                    </span>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="panel-soft rounded-full px-4 py-2 text-sm font-semibold text-white/80">
                            SUI: <span className="text-white">{suiBalance}</span>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <ConnectButton className="!rounded-xl !bg-gradient-to-r !from-cyan-500 !to-indigo-500 !px-6 !py-2.5 !text-sm !font-semibold !text-white !transition-all hover:!brightness-110 active:!scale-95" />
                </div>
            </div>
        </nav>
    );
}
