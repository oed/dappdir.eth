async function resolveENSName(kubo, ensName) {
  const { base32 } = await import("multiformats/bases/base32");
  const { CID } = await import("multiformats/cid");
    try {
        for await (const name of kubo.name.resolve(ensName)) {
            const cleanedName = name.replace(/^\/ipfs\//, ''); // Remove /ipfs/ from the beginning before parsing CID
            const cidV1 = CID.parse(cleanedName).toV1().toString(base32); // Ensure CIDv1 is returned
            return cidV1;
        }
        return '';
    } catch (error) {
        console.log(`Error resolving ENS name ${ensName}: ${error}`);
        return '';
    }
}

async function loadCuratedNames() {
    const fs = await import('fs');
    const path = await import('path');

    const curatedNamesPath = path.join(__dirname, '../curated-names.json');
    let curatedNames = {};

    try {
        if (fs.existsSync(curatedNamesPath)) {
            curatedNames = JSON.parse(fs.readFileSync(curatedNamesPath, 'utf8'));
            return curatedNames.names;
        } else {
            console.error('curated-names.json file does not exist.');
        }
    } catch (error) {
        console.error('Error reading curated-names.json:', error);
    }
    return [];
}

async function resolveCIDsForNames(kubo, names) {
    const resolvedCIDs = [];
    for (const name of names) {
        const cid = await resolveENSName(kubo, name);
        if (cid) {
            resolvedCIDs.push({ name, cid });
        } else {
            console.log(`No CID found for ${name}`);
        }
    }
    return resolvedCIDs;
}

async function writeFaviconFromCID(kubo, cid) {
    console.log('writing favicon from CID', cid);
    const fs = await import('fs');
    const path = await import('path');
    try {
        const faviconPath = `/ipfs/${cid}/favicon.ico`;
        const faviconData = [];
        for await (const chunk of kubo.cat(faviconPath)) {
            console.log(`Received chunk of size: ${chunk.length}`);
            faviconData.push(chunk);
        }
        console.log('Total chunks received:', faviconData.length);
        const completeData = Buffer.concat(faviconData);
        console.log('Complete data size:', completeData.length);
        const publicPath = path.join(__dirname, '../public/reports', cid, 'favicon.ico');
        await fs.promises.mkdir(path.dirname(publicPath), { recursive: true });
        await fs.promises.writeFile(publicPath, completeData);
        console.log('File written to:', publicPath);
        return publicPath;
    } catch (error) {
        // console.error(`Error loading favicon from CID ${cid}:`, error);
        return '';
    }
}


async function writeNamesToPublic(namesData) {
    const timestamp = Math.floor(Date.now() / 1000);
    const fs = await import('fs');
    const path = await import('path');

    const namesPath = path.join(__dirname, '../public/names.json');
    let namesJson = {};

    try {
        // Load existing names from file
        if (fs.existsSync(namesPath)) {
            namesJson = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
        }

        // Update names with new data
        namesData.forEach(item => {
            if (namesJson[item.name]) {
                // Check if the most recent CID is the same as the new CID
                if (namesJson[item.name][0].cid !== item.cid) {
                    // Append the new entry to the beginning of the array if different
                    namesJson[item.name].unshift({
                        cid: item.cid,
                        timestamp
                    });
                }
            } else {
                // Add new name with its CID and timestamp
                namesJson[item.name] = [{
                    cid: item.cid,
                    timestamp
                }];
            }
        });

        // Write updated names back to file
        fs.writeFileSync(namesPath, JSON.stringify(namesJson, null, 2), 'utf8');
        console.log('Updated names.json successfully.');
    } catch (error) {
        console.error('Error writing to names.json:', error);
    }
}



async function main() {
    const { create } = await import("kubo-rpc-client");
    const kubo = create({ url: "http://127.0.0.1:5001/api/v0" });
    const curatedNames = await loadCuratedNames();
    console.log(`\nUpdating names:\n${curatedNames.join('\n')}\n`);
    const resolvedNames = await resolveCIDsForNames(kubo, curatedNames);
    await writeNamesToPublic(resolvedNames);
    // resolvedNames.forEach(async (name) => {
    //     await writeFaviconFromCID(kubo, name.cid);
    // });
}

main();
