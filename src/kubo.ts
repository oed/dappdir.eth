import { CID } from 'multiformats/cid';
import { create } from 'kubo-rpc-client'

const kubo = create({ url: "http://127.0.0.1:5001/api/v0" });

export async function isOnline(): Promise<boolean> {
    try {
        const version = await kubo.version();
        console.log('Kubo API is online, version:', version.version);
        return true;
    } catch (error) {
        console.error('Kubo API is offline:', error);
        return false;
    }
}

export async function isPinned(cid: CID): Promise<boolean> {
    try {
        const pinList = await kubo.pin.ls({ type: 'recursive' });
        for await (const pin of pinList) {
            if (pin.cid.equals(cid)) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking if IPFS address is pinned:', error);
        return false;
    }
}

export async function pin(cid: CID) {
    await kubo.pin.add(cid);
}

export async function unpin(cid: CID) {
    await kubo.pin.rm(cid);
}