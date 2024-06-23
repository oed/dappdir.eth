
async function loadAndSortNames() {
    const fs = await import('fs');
    try {
        const data = await fs.promises.readFile('./known-names.json', 'utf8');
        const names = JSON.parse(data);
        const sortedNames = Object.entries(names).sort((a, b) => {
            const partsA = a[0].split('.').reverse();
            const partsB = b[0].split('.').reverse();
            for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                if (partsA[i] < partsB[i]) return -1;
                if (partsA[i] > partsB[i]) return 1;
            }
            return partsA.length - partsB.length;
        }).map(entry => ({ name: entry[0], rootCID: entry[1].versions[0].cid }));
        // console.log('Sorted names:', sortedNames);
        return sortedNames;
        // await fs.promises.writeFile('./sorted-names.json', JSON.stringify(sortedNames, null, 2));
        // console.log('Sorted names saved to sorted-names.json');
    } catch (error) {
        console.error('Failed to load, sort, or save names:', error);
    }
}

async function loadRootCIDsInBatches() {
    const { create } = await import('kubo-rpc-client');
    const kubo = create({ url: 'http://localhost:5001' });
    const fs = await import('fs');

    const sortedNames = await loadAndSortNames();
    const rootCIDs = sortedNames.map(name => name.rootCID);
    const batchSize = 100;
    // const max = 30;
    const max = rootCIDs.length;
    console.log(`Loading ${max} root CIDs in batches of ${batchSize}`);
    let liveNames = [];
    for (let i = 0; i < max; i += batchSize) {
        console.log(`Loading names until ${i + batchSize}`);
        const batch = rootCIDs.slice(i, i + batchSize);
        let successfulLoads = 0;
        await Promise.all(batch.map(async (cid, index) => {
            try {
                const data = [];
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                try {
                    for await (const chunk of kubo.cat(cid, { signal: controller.signal })) {
                        data.push(chunk);
                    }
                } finally {
                    clearTimeout(timeoutId);
                }
                successfulLoads++;
                liveNames.push(sortedNames[i + index].name); // Store the name of the successfully loaded CID
            } catch (error) {
                // console.error(`Failed to load data for CID ${cid}`);
            }
        }));
        console.log(`Successfully loaded ${successfulLoads}.`);
    }
    // Write the names of successfully loaded CIDs to a file
    await fs.promises.writeFile('./live-names.json', JSON.stringify(liveNames, null, 2));
    console.log('Live names saved to live-names.json');
}


loadRootCIDsInBatches()