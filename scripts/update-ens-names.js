
async function loadENSNamesAndHashes(batchSize, maxQueries = Infinity) {
    const fetch = (await import('node-fetch')).default;
    const { readFileSync } = await import('fs');
    const apiKey = readFileSync('.thegraph-apikey', 'utf8').trim();
    const endpoint = `https://gateway-arbitrum.network.thegraph.com/api/${apiKey}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;

    const query = (skip) => ({
        query: `{
            domains(first: ${batchSize}, skip: ${skip}, where: { resolver_: { contentHash_not: null } }) {
                name
                resolver {
                    contentHash
                }
            }
        }`
    });

    let allResults = [];
    let skip = 0;
    let hasMore = true;

    try {
        while (hasMore && (allResults.length / batchSize) < maxQueries) {
            console.log(`Fetching ENS names and hashes, progress: ${skip}`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(query(skip))
            });

            const data = await response.json();
            const result = data.data.domains.map(domain => ({
                name: domain.name,
                contentHash: domain.resolver.contentHash
            }));

            allResults = allResults.concat(result);
            skip += batchSize;
            hasMore = result.length === batchSize; // If we received less than 100 results, we are done
        }
        return allResults.filter(result => result.name.endsWith('.eth'));
    } catch (error) {
        console.error('Failed to load ENS names and hashes:', error);
        return [];
    }
}

async function convertHashesToCIDv1(ensData) {
    const { CID } = await import('multiformats/cid');
    const { base16 } = await import('multiformats/bases/base16');
    
    console.log('\nConverting ENS content hashes to CIDs')

    let stats = {
        cids: 0,
        nonCids: 0,
        errors: 0
    };

    const convertedData = ensData.map(item => {
        try {
            if (item.contentHash.startsWith('0xe301')) {
                const hex = item.contentHash.slice(6);
                const cid = CID.parse(`f${hex}`, base16);
                stats.cids++;
                return {
                    name: item.name,
                    contentHash: cid.toString()
                };
            } else {
                // console.log(`Skipping non-IPFS hash for ${item.name}`);
                stats.nonCids++;
                return null;
            }
        } catch (error) {
            // console.error(`Malformed content hash for ${item.name}:`, error);
            stats.errors++;
            return null
        }
    }).filter(item => item !== null);

    console.log(`CIDs converted: ${stats.cids}`);
    console.log(`Non-CID entries skipped: ${stats.nonCids}`);
    console.log(`Errors encountered: ${stats.errors}\n`);
    return convertedData;
}


async function storeKnownNames(ensDataCIDv1, timestamp) {
    const fs = await import('fs');
    const path = await import('path');

    const knownNamesPath = path.join(__dirname, '../known-names.json');
    let knownNames = {};

    try {
        // Load existing known names from file
        if (fs.existsSync(knownNamesPath)) {
            knownNames = JSON.parse(fs.readFileSync(knownNamesPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading known-names.json:', error);
    }

    // Update known names with new data
    ensDataCIDv1.forEach(item => {
        if (knownNames[item.name]) {
            // Check if the new CID is different from the first item in the versions array
            if (knownNames[item.name].versions[0].cid !== item.contentHash) {
                knownNames[item.name].versions.unshift({
                    cid: item.contentHash,
                    timestamp
                });
            }
        } else {
            // Add new name with its CID
            knownNames[item.name] = {
                versions: [{ cid: item.contentHash, timestamp }]
            };
        }
    });

    try {
        // Write updated known names back to file
        fs.writeFileSync(knownNamesPath, JSON.stringify(knownNames, null, 2), 'utf8');
        console.log('Updated known-names.json successfully.');
    } catch (error) {
        console.error('Error writing to known-names.json:', error);
    }
}



async function main() {
    const ensData = await loadENSNamesAndHashes(500)
    const ensDataCIDv1 = await convertHashesToCIDv1(ensData)
    const timestamp = Math.floor(Date.now() / 1000)
    await storeKnownNames(ensDataCIDv1, timestamp)
}

main()

