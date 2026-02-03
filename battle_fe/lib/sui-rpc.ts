import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { NETWORK } from '@/lib/constants';

let rpcClient: SuiJsonRpcClient | null = null;

export const getRpcClient = () => {
    if (typeof window === 'undefined') return null;
    if (!rpcClient) {
        rpcClient = new SuiJsonRpcClient({
            network: NETWORK,
            url: getJsonRpcFullnodeUrl(NETWORK),
        });
    }
    return rpcClient;
};
