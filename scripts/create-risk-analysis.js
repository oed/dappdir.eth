const WEB3_APIs = [
    { url: 'http://localhost:5001', service: 'ipfs', risk: 'none' },
    { url: 'http://127.0.0.1:5001', service: 'ipfs', risk: 'none' },
    { url: 'http://localhost:8545', service: 'ethereum', risk: 'none' },
    { url: 'http://127.0.0.1:8545', service: 'ethereum', risk: 'none' },
]
const LINK_NON_FETCHING_REL_VALUES = [
    'alternate',
    'author',
    'help',
    'license',
    'next',
    'prev',
    'nofollow',
    'noopener',
    'noreferrer',
    'bookmark',
    'tag',
    'external',
    'no-follow',
    'canonical'
];
const ANALYSIS_VERSION = 1

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

async function writeFaviconFromCID(kubo, cid) {
    console.log('Writing favicon from CID', cid);
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
        return true;
    } catch (error) {
        console.log('No favicon written')
        return false
    }
}

async function saveReport(kubo, ensName, report) {
    const fs = await import('fs');
    const path = await import('path');
    report.ensName = ensName;
    const { rootCID } = report;
    const reportVersion = report.version;
    const reportDirPath = path.join(__dirname, `../public/reports/${rootCID}`);
    const reportFilePath = path.join(reportDirPath, `report-v${reportVersion}.json`);
    const indexFilePath = path.join(__dirname, '../public/reports/index.json');
    const namesFilePath = path.join(__dirname, '../public/names.json');

    // Ensure the directory exists
    if (!fs.existsSync(reportDirPath)) {
        fs.mkdirSync(reportDirPath, { recursive: true });
    }

    // Check if the report already exists
    if (fs.existsSync(reportFilePath)) {
        console.error(`Error: Report for version ${reportVersion} already exists at ${reportFilePath}`);
        return;
    }

    // Write the report to the file
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));

    // Update the index.json file
    let indexData;
    if (fs.existsSync(indexFilePath)) {
        indexData = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
    } else {
        indexData = {};
    }

    if (!indexData[rootCID]) {
        indexData[rootCID] = {
            favicon: false,
            reports: []
        };
    }

    indexData[rootCID].favicon = await writeFaviconFromCID(kubo, rootCID);

    indexData[rootCID].reports.push(`report-v${reportVersion}.json`);
    fs.writeFileSync(indexFilePath, JSON.stringify(indexData, null, 2));

    // Update the names.json file
    let namesData;
    if (fs.existsSync(namesFilePath)) {
        namesData = JSON.parse(fs.readFileSync(namesFilePath, 'utf8'));
    } else {
        namesData = {};
    }

    if (!namesData[ensName]) {
        namesData[ensName] = [];
    }

    const nameEntry = { cid: rootCID, timestamp: Math.floor(Date.now() / 1000) };
    if (namesData[ensName].length === 0 || namesData[ensName][0].cid !== rootCID) {
        namesData[ensName].unshift(nameEntry);
    }
    fs.writeFileSync(namesFilePath, JSON.stringify(namesData, null, 2));
}




async function getFilesFromCID(kubo, cid, result = [], pathCarry = '') {
    console.log(`Listing files from /${pathCarry}`)
    for await (const item of kubo.ls(cid)) {
        const currentPath = pathCarry ? `${pathCarry}/${item.name}` : item.name;
        if (item.type === 'dir') {
            await getFilesFromCID(kubo, item.cid, result, currentPath);
        } else if (item.type === 'file' && item.size !== undefined) {
            result.push({ ...item, path: currentPath });
        } else if (item.type === 'file' && pathCarry === '') {
            // This is likely an html file as the root CID
            result.push({ ...item, path: 'index.html' });
        }
    }
    return result;
}

async function analyzeFile(kubo, cid, filePath) {
    console.log('analyzing', filePath)
    const fileType = filePath.split('.').pop();
    if (!['html', 'htm', 'js', 'svg'].some(ext => fileType === ext)) {
        // console.log(`Skipping non-target file type: ${filePath}`);
        return {};
    }

    const fileContentChunks = [];
    for await (const chunk of kubo.cat(cid)) {
        fileContentChunks.push(chunk);
    }
    const fileContent = Buffer.concat(fileContentChunks).toString();
    let scriptContent = []
    if (filePath.endsWith('js')) {
        scriptContent.push(fileContent)
    } else {
        const scriptTagRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = scriptTagRegex.exec(fileContent)) !== null) {
            scriptContent.push(match[1]);
        }
    }

    // Analyze the file content for external resources loaded as the file is loaded
    const analysis = {
        distributionPurity: analyzeDistributionPurity(fileContent),
        networkingPurity: analyzeNetworkingPurity(scriptContent)
    }
    return analysis;
}

function analyzeNetworkingPurity(scriptContents) {
    const analysis = {
        http: [],
        websocket: [],
        webrtc: [],
        web3: []
    };
    const webrtcRegex = /\b(RTCPeerConnection|RTCDataChannel)\b/gi;
    const websocketRegex = /(wss:\/\/|ws:\/\/)[^\s'"]+/gi;
    const httpResourceRegex = /(?<!href.{0,20})(?<=["'`])(https|http):\/\/[^\s"'`]+/gi;
    const ethereumRegex = /window\.ethereum\b/;
    let match;

    scriptContents.forEach(content => {
        // http apis
        while ((match = httpResourceRegex.exec(content)) !== null) {
            // ignore w3.org svg
            const url = match[0];
            const { service, risk } = WEB3_APIs.find(api => url.includes(api.url)) || {};
            if (service) {
                analysis.web3.push({ service, url, risk });
            } else if (!url.includes('w3.org') && !url.includes('svg')) {
                analysis.http.push(url);
            }
        }
        
        // Find WebSocket calls
        while ((match = websocketRegex.exec(content)) !== null) {
            analysis.websocket.push( match[0] );
        }

        // // Find WebRTC calls
        while ((match = webrtcRegex.exec(content)) !== null) {
            analysis.webrtc.push(match[0]);
        }

        // // find Ethereum usage
        if (ethereumRegex.test(content)) {
            analysis.web3.push({ service: 'ethereum', url: 'window.ethereum', risk: 'none' });
        }
    })
    return analysis;
}






function analyzeDistributionPurity(fileContent) {
    const analysis = {
        externalMedia: [],
        externalScripts: []
    };
    const tagRegex = /<(img|video|iframe|audio|source|object|embed|track|link|script)\s+[^>]*?\b(src|href)=["']([^"']*)["'][^>]*>/gi;
    let match;
    while ((match = tagRegex.exec(fileContent)) !== null) {
        let [fullMatch, type, attr, url] = match;
        if (url.startsWith('http')) {
            if (type === 'link') {
                const relRegex = /\brel=["']([^"']*)["']/i;
                const match = relRegex.exec(fullMatch);
                const rel = match ? match[1] : null
                if (rel && LINK_NON_FETCHING_REL_VALUES.includes(rel.toLowerCase())) {
                    continue
                }
            }
            if (type === 'iframe' || type === 'script' || attr === 'href') {
                analysis.externalScripts.push({ type, url });
            } else {
                analysis.externalMedia.push({ type, url });
            }
        }
    }
    return analysis;
}

async function generateReport(kubo, rootCID) {
    try {
        const files = await getFilesFromCID(kubo, rootCID);

        const report = {
            version: ANALYSIS_VERSION,
            rootCID,
            timestamp: Math.floor(Date.now() / 1000),
            totalSize: 0,
            distributionPurity: {
                externalScripts: [],
                externalMedia: [],
            },
            networkingPurity: {
                http: [],
                websocket: [],
                webrtc: [],
            },
            web3: []
        };

        console.log(`Analyzing ${files.length} files`)
        for (const file of files) {
            const analysis = await analyzeFile(kubo, file.cid, file.path);
            report.totalSize += file.size;
            addToReportIfNotEmpty(report.distributionPurity.externalScripts, analysis.distributionPurity?.externalScripts, file.path);
            addToReportIfNotEmpty(report.distributionPurity.externalMedia, analysis.distributionPurity?.externalMedia, file.path);
            addToReportIfNotEmpty(report.networkingPurity.http, analysis.networkingPurity?.http, file.path);
            addToReportIfNotEmpty(report.networkingPurity.websocket, analysis.networkingPurity?.websocket, file.path);
            addToReportIfNotEmpty(report.networkingPurity.webrtc, analysis.networkingPurity?.webrtc, file.path);
            addToReportIfNotEmpty(report.web3, analysis.networkingPurity?.web3, file.path);
        }

        console.log(`Total size: ${ (report.totalSize / 1024 / 1024).toFixed(2) } MB`);
        return report;
    } catch (error) {
        console.error(`Error generating report: ${error.message}`);
        console.log(error)
    }

    function addToReportIfNotEmpty(report, analysis, filePath) {
        if (analysis && analysis.length > 0) {
            report.push({ file: filePath, offenders: analysis });
        }
    }
}



async function main() {
    const { create } = await import('kubo-rpc-client');
    const kubo = create({ url: 'http://localhost:5001' });

    const input = process.argv[2];
    if (!input) {
        console.error('Please provide an ENS name or CID as a parameter.');
        process.exit(1);
    } 
    let rootCID;
    let ensName = input.endsWith('.eth') ? input : undefined;
    if (ensName) {
        console.log(`Analyzing ${ensName}`);
        rootCID = await resolveENSName(kubo, ensName);
    } else {
        rootCID = input;
    }

    console.log(`Analyzing ${rootCID}`);
    const report = await generateReport(kubo, rootCID);

    if (ensName && process.argv.includes('--save')) {
        console.log(`Saving report for ${ensName}`);
        await saveReport(kubo, ensName, report);
    } else {
        console.log('Report:')
        console.log(JSON.stringify(report, null, 2));
    }
}

main();

