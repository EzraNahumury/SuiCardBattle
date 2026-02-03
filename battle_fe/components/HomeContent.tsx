'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BattleList } from '@/components/BattleList';
import { CreateBattle } from '@/components/CreateBattle';
import { BattleGame } from '@/components/BattleGame';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

export default function HomeContent() {
    const account = useCurrentAccount();
    const [activeBattle, setActiveBattle] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'create'>('list');

    return (
        <div className="app-shell text-white selection:bg-cyan-400/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] h-[45%] w-[45%] rounded-full bg-cyan-500/15 blur-[140px]" />
                <div className="absolute bottom-[-20%] right-[-10%] h-[45%] w-[45%] rounded-full bg-indigo-500/15 blur-[140px]" />
            </div>

            <Navbar />

            <main className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20">
                {!activeBattle ? (
                    <div className="space-y-12">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200">
                                Season 01
                            </span>
                            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-300">
                                SUI CARD BATTLE
                            </h1>
                            <p className="max-w-2xl text-lg text-zinc-300">
                                Duel on-chain with hidden cards and provable randomness. Stake SUI, pick your fate, and let the chain decide. Fast, secure, and fair.
                            </p>

                            {!account && (
                                <div className="panel-soft rounded-2xl px-6 py-4">
                                    <p className="text-cyan-200 font-medium">Connect your wallet to start battling</p>
                                </div>
                            )}
                        </div>

                        {account && (
                            <div className="flex justify-center">
                                <div className="inline-flex rounded-2xl bg-white/5 p-1 border border-white/10 shadow-lg shadow-cyan-500/10">
                                    <button
                                        onClick={() => setView('list')}
                                        className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'list' ? 'btn-primary text-white shadow-lg' : 'text-zinc-300 hover:text-white'}`}
                                    >
                                        Arena
                                    </button>
                                    <button
                                        onClick={() => setView('create')}
                                        className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'create' ? 'btn-primary text-white shadow-lg' : 'text-zinc-300 hover:text-white'}`}
                                    >
                                        Create Battle
                                    </button>
                                </div>
                            </div>
                        )}

                        {account ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {view === 'list' ? (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="font-display text-2xl font-semibold">Active Battles</h2>
                                                <p className="text-sm text-zinc-500">Live feed of open arenas</p>
                                            </div>
                                            <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Live</div>
                                        </div>
                                        <BattleList onSelectBattle={setActiveBattle} />
                                    </div>
                                ) : (
                                    <CreateBattle onCreated={() => setView('list')} />
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-10">
                                {[
                                    { title: 'Stake SUI', desc: 'Join pools from 0.1 to 5 SUI', icon: '$' },
                                    { title: 'On-Chain Cards', desc: 'Decentralized card stats', icon: '[#]' },
                                    { title: 'Randomized', desc: 'Secure on-chain randomness', icon: 'RNG' },
                                    { title: 'Instant Reward', desc: 'Automatic payouts to winners', icon: '*' },
                                ].map((feature, i) => (
                                    <div key={i} className="panel rounded-3xl p-6 text-center transition-transform hover:-translate-y-1">
                                        <div className="font-display text-3xl mb-4 text-cyan-200">{feature.icon}</div>
                                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-zinc-400">{feature.desc}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in zoom-in-95 fade-in duration-500">
                        <BattleGame
                            battleId={activeBattle}
                            onBack={() => setActiveBattle(null)}
                        />
                    </div>
                )}
            </main>

            <footer className="border-t border-white/5 py-12">
                <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-zinc-500 text-sm">
                        (c) 2026 Sui Card Battle. Built for Mini Hackathon.
                    </div>
                    <div className="flex gap-8 text-sm">
                        <a href="#" className="text-zinc-500 hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="text-zinc-500 hover:text-white transition-colors">Discord</a>
                        <a href="#" className="text-zinc-500 hover:text-white transition-colors">Contract</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
