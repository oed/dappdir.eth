const WEB3_APIs = [
    { url: 'http://localhost:5001', service: 'ipfs', risk: 'none' },
    { url: 'http://127.0.0.1:5001', service: 'ipfs', risk: 'none' },
    { url: 'http://localhost:8545', service: 'ethereum', risk: 'none' },
    { url: 'http://127.0.0.1:8545', service: 'ethereum', risk: 'none' },
]
const ANALYSIS_VERSION = 1

async function getRootCID(ensName) {
    const fs = await import('fs');
    const path = await import('path');
    const knownNamesFilePath = path.join(__dirname, '../known-names.json');
    const knownNames = JSON.parse(fs.readFileSync(knownNamesFilePath, 'utf8'));
    if (knownNames[ensName] && knownNames[ensName].versions && knownNames[ensName].versions.length > 0) {
        return knownNames[ensName].versions[0].cid;
    }
    throw new Error(`ENS name ${ensName} not found in known-names.json`);
}

async function saveReport(ensName, report) {
    const fs = await import('fs');
    const path = await import('path');
    const { rootCID } = report;
    delete report.ensName;
    delete report.rootCID;
    const knownNamesFilePath = path.join(__dirname, '../known-names.json');
    const knownNamesData = fs.readFileSync(knownNamesFilePath, 'utf8');
    const knownNames = JSON.parse(knownNamesData);

    if (!knownNames[ensName]) {
        throw new Error(`ENS name ${ensName} not found in known-names.json`);
    }

    const versions = knownNames[ensName].versions;
    const versionIndex = versions.findIndex(version => version.cid === rootCID);

    if (versionIndex === -1) {
        throw new Error(`CID ${rootCID} not found for ${ensName} in known-names.json`);
    }

    if (!versions[versionIndex].reports) {
        versions[versionIndex].reports = [report]
    } else if (versions[versionIndex].reports[0].version !== ANALYSIS_VERSION) {
        versions[versionIndex].reports.unshift(report)
    } else {
        throw new Error(`Report already exists for CID ${rootCID} of ${ensName}`);
    }

    fs.writeFileSync(knownNamesFilePath, JSON.stringify(knownNames, null, 2));
}

async function getFilesFromCID(kubo, cid, result = [], pathCarry = '') {
    console.log(`Listing files from /${pathCarry}`)
    for await (const item of kubo.ls(cid)) {
        const currentPath = pathCarry ? `${pathCarry}/${item.name}` : item.name;
        if (item.type === 'dir') {
            await getFilesFromCID(kubo, item.cid, result, currentPath);
        } else if (item.type === 'file' && item.size !== undefined) {
            result.push({ ...item, path: currentPath });
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
            // scriptContent.push(match[1]);
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
        let [_, type, attr, url] = match;
        if (url.startsWith('http')) {
            if (type === 'iframe' || type === 'script' || attr === 'href') {
                analysis.externalScripts.push({ type, url });
            } else {
                analysis.externalMedia.push({ type, url });
            }
        }
    }
    return analysis;
}

async function generateReport(rootCID) {
    const { create } = await import('kubo-rpc-client');
    const kubo = create({ url: 'http://localhost:5001' });
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
    const input = process.argv[2];
    if (!input) {
        console.error('Please provide an ENS name or CID as a parameter.');
        process.exit(1);
    } 
    let rootCID;
    let ensName = input.endsWith('.eth') ? input : undefined;
    if (ensName) {
        console.log(`Analyzing ${ensName}`);
        rootCID = await getRootCID(ensName);
    } else {
        rootCID = input;
    }

    console.log(`Analyzing ${rootCID}`);
    const report = await generateReport(rootCID);

    if (ensName && process.argv.includes('--save')) {
        console.log(`Saving report for ${ensName}`);
        await saveReport(ensName, report);
    } else {
        console.log('Report:')
        console.log(JSON.stringify(report, null, 2));
    }
}

main();

