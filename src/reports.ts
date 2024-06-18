import { CID } from 'multiformats/cid';

interface ReportsIndex {
    [key: string]: {
        favicon: boolean;
        reports: string[];
    };
}

let reportsIndex: ReportsIndex;

interface Offender {
    type: string;
    url: string;
    risk?: string;
}

interface Offenders {
    file: string;
    offenders: Offender[];
}

interface DistributionPurity {
    externalScripts: Offenders[];
    externalMedia: Offenders[];
}

interface NetworkingPurity {
    http: Offenders[];
    websocket: Offenders[];
    webrtc: Offenders[];
}

interface Web3 {
    file: string;
    offenders: Offender[];
}

export interface Report {
    version: number;
    rootCID: string;
    timestamp: number;
    totalSize: number;
    distributionPurity: DistributionPurity;
    networkingPurity: NetworkingPurity;
    web3: Web3[];
    ensName: string;
}

export async function getFaviconUrl(siteRoot: CID): Promise<string> {
    if (!reportsIndex) {
        reportsIndex = await fetch('./reports/index.json').then(response => response.json());
    }
    const cid = siteRoot.toString();
    if (reportsIndex[cid]?.favicon) {
        return `./reports/${cid}/favicon.ico`;
    }
    return `./favicon.ico`;
}

export async function getReport(siteRoot: CID): Promise<Report> {
    if (!reportsIndex) {
        reportsIndex = await fetch('./reports/index.json').then(response => response.json());
    }
    const cid = siteRoot.toString();
    if (reportsIndex[cid]) {
        const fileName = reportsIndex[cid].reports.pop();
        const report = await fetch(`./reports/${cid}/${fileName}`).then(response => response.json());
        return report;
    }
}

interface DistributionPuritySummary {
    externalScripts: number;
    externalMedia: number;
}

interface NetworkingPuritySummary {
    http: number;
    websocket: number;
    webrtc: number;
}

interface Web3Summary {
    none: number;
    fair: number;
    high: number;
}

export interface SummarizedReport {
    distributionPurity: DistributionPuritySummary;
    networkingPurity: NetworkingPuritySummary;
    web3: Web3Summary;
}

export async function generateSummarizedReport(siteRoot: CID): Promise<SummarizedReport> {
    const report = await getReport(siteRoot);
    if (!report) {
        return null;
    }
    return {
        distributionPurity: {
            externalScripts: report.distributionPurity.externalScripts.length,
            externalMedia: report.distributionPurity.externalMedia.length
        },
        networkingPurity: {
            http: report.networkingPurity.http.length,
            websocket: report.networkingPurity.websocket.length,
            webrtc: report.networkingPurity.webrtc.length
        },
        web3: {
            none: report.web3.map(web3 => web3.offenders.filter(offender => offender.risk === 'none').length).reduce((a, b) => a + b, 0),
            fair: report.web3.map(web3 => web3.offenders.filter(offender => offender.risk === 'fair').length).reduce((a, b) => a + b, 0),
            high: report.web3.map(web3 => web3.offenders.filter(offender => offender.risk === 'high').length).reduce((a, b) => a + b, 0)
        }
    };
}

