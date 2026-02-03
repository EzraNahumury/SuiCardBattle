"use client";

import { useQuery } from '@tanstack/react-query';
import { MODULE_NAME, PACKAGE_ID } from '@/lib/constants';
import { getRpcClient } from '@/lib/sui-rpc';

const BATTLE_CREATED_EVENT = `${PACKAGE_ID}::${MODULE_NAME}::BattleCreated`;

export function BattleList({ onSelectBattle }: { onSelectBattle: (id: string) => void }) {
    const { data: battles = [], isPending: isLevelsPending } = useQuery({
        queryKey: ['battles'],
        queryFn: async () => {
            try {
                const client = getRpcClient();
                if (!client) return [];

                const events = await client.queryEvents({
                    query: { MoveEventType: BATTLE_CREATED_EVENT },
                    limit: 50,
                    order: 'descending',
                });

                const ids = events.data
                    .map((event: any) => {
                        const rawId = event?.parsedJson?.battle_id ?? event?.parsedJson?.battleId ?? event?.parsedJson?.battleID;
                        if (!rawId) return null;
                        if (typeof rawId === 'string') return rawId;
                        return rawId.id ?? rawId.bytes ?? null;
                    })
                    .filter(Boolean);

                if (ids.length === 0) return [];

                const uniqueIds = Array.from(new Set(ids));
                return await client.multiGetObjects({ ids: uniqueIds, options: { showContent: true } });
            } catch (e) {
                console.error('Error fetching battles via events:', e);
                return [];
            }
        },
        refetchInterval: 5000,
    });

    if (isLevelsPending) return (
        <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white/5 border border-white/10" />
            ))}
        </div>
    );

    const resolveBattle = (raw: any) => {
        if (raw?.error) return { objectId: null, fields: null };
        const data = raw?.data ?? raw?.object ?? raw;
        const objectId = data?.objectId ?? raw?.objectId ?? raw?.reference?.objectId ?? raw?.id;
        const content = data?.content ?? raw?.content ?? data?.data?.content ?? raw?.object?.data?.content ?? data?.json ?? raw?.json;
        const fields = content?.dataType === 'moveObject' ? content.fields : content?.fields ?? content;
        return { objectId, fields };
    };


    const normalizedBattles = battles
        .map((raw: any) => {
            const { objectId, fields } = resolveBattle(raw);
            if (!fields || !objectId) return null;

            const leftFields = fields.coin_Left?.fields ?? fields.coin_Left ?? {};
            const rightFields = fields.coin_Right?.fields ?? fields.coin_Right ?? {};
            const leftName = String(leftFields.name ?? '').trim();
            const rightName = String(rightFields.name ?? '').trim();
            const entryFee = Number(fields.entry_fee ?? 0);
            const isOpen = Boolean(fields.is_open);

            return { objectId, fields, leftName, rightName, entryFee, isOpen };
        })
        .filter(Boolean) as Array<{
            objectId: string;
            fields: any;
            leftName: string;
            rightName: string;
            entryFee: number;
            isOpen: boolean;
        }>;

    const dedupedBattles = (() => {
        const seen = new Set<string>();
        const unique: typeof normalizedBattles = [];

        for (const battle of normalizedBattles) {
            const key = `${battle.leftName.toLowerCase()}::${battle.rightName.toLowerCase()}::${battle.entryFee}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(battle);
        }

        return unique;
    })();

    const openBattles = dedupedBattles.filter((battle) => battle.isOpen);
    const closedBattles = dedupedBattles.filter((battle) => !battle.isOpen);
    const orderedBattles = [...openBattles, ...closedBattles];

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orderedBattles.length === 0 && (
                <div className="col-span-full py-20 text-center">
                    <div className="panel-soft mx-auto max-w-md rounded-3xl px-6 py-10">
                        <p className="font-display text-lg text-white">No open battles yet</p>
                        <p className="text-sm text-zinc-400">Create one to light up the arena.</p>
                    </div>
                </div>
            )}

            {orderedBattles.map((battle) => {
                const { objectId, fields, leftName, rightName, isOpen } = battle;
                const statusDot = isOpen ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600';

                return (
                    <div
                        key={objectId}
                        className="panel group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1 cursor-pointer"
                        onClick={() => onSelectBattle(objectId)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-cyan-300">#{String(objectId).slice(-6)}</span>
                            <div className={`flex h-2 w-2 rounded-full ${statusDot}`} />
                        </div>

                        <h3 className="font-display text-lg font-semibold text-white mb-1">
                            {leftName || 'Unknown'} vs {rightName || 'Unknown'}
                        </h3>

                        <p className="text-sm text-zinc-400 mb-6">
                            Entry Fee: <span className="text-zinc-100 font-semibold">{(Number(fields.entry_fee) / 1e9).toFixed(2)} SUI</span>
                        </p>

                        <button
                            disabled={!isOpen}
                            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${isOpen ? 'btn-primary' : 'btn-ghost cursor-not-allowed opacity-60'}`}
                        >
                            {isOpen ? 'Join Battle' : 'Battle Finished'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
