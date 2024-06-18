import { generateSummarizedReport, SummarizedReport } from "./reports";

import { CID } from 'multiformats/cid';

export async function createRiskChart(siteRoot: CID): Promise<HTMLDivElement> {
    const report = await generateSummarizedReport(siteRoot);
    const pieColors = getPieColors(report);
    const reportContent = renderReportText(report);
    return createThreePiecePieChart(siteRoot, pieColors, reportContent);
}

function renderReportText(report: SummarizedReport) {
    const container = document.createElement('div');

    if (report) {
        const distributionContainer = createSectionContainer(container, 'Distribution', 'External resources on page load:');
        addSubText(distributionContainer, 'media', report.distributionPurity.externalMedia);
        addSubText(distributionContainer, 'scripts', report.distributionPurity.externalScripts);

        const networkingContainer = createSectionContainer(container, 'Networking', 'External APIs used by the dapp:');
        addSubText(networkingContainer, 'http', report.networkingPurity.http);
        addSubText(networkingContainer, 'websocket', report.networkingPurity.websocket);
        addSubText(networkingContainer, 'webrtc', report.networkingPurity.webrtc);

        let web3 = determineWeb3Status(report);
        createSectionContainer(container, 'Web3', web3);
    } else {
        createSectionContainer(container, 'Distribution', 'No report available');
        createSectionContainer(container, 'Networking', 'No report available');
        createSectionContainer(container, 'Web3', 'No report available');
    }

    return container;
}

function determineWeb3Status(report: SummarizedReport): string {
    if (report.web3.high + report.web3.fair > 0) {
        return 'Risky access of web3 apis';
    } else if (report.web3.none > 0) {
        return 'Safe access to web3 apis';
    } else {
        return `Doesn't use web3 apis`;
    }
}

function createSectionContainer(parent: HTMLElement, headerText: string, textContent: string): HTMLElement {
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'report-container';
    parent.appendChild(sectionContainer);

    const header = document.createElement('div');
    header.className = 'report-header';
    header.textContent = headerText;
    sectionContainer.appendChild(header);

    const text = document.createElement('div');
    text.className = 'report-text';
    text.textContent = textContent;
    sectionContainer.appendChild(text);

    return sectionContainer;
}

function addSubText(container: HTMLElement, label: string, value: number): void {
    const subText = document.createElement('div');
    subText.className = 'report-sub-text';
    subText.innerHTML = `${label}: <span>${value}</span>`;
    container.appendChild(subText);
}

function getPieColors(report: SummarizedReport): string[] {
    const COLORS = {
        'red': '#FF6347', // Tomato
        'green': '#3CB371', // Medium Sea Green
        'yellow': '#FFD700', // Gold
        'gray': '#A9A9A9' // Dark Gray
    };
    if (!report) {
        return [COLORS.gray, COLORS.gray, COLORS.gray]
    }
    const colors = [];

    // Color for Networking Purity
    if (report.networkingPurity.http + report.networkingPurity.websocket + report.networkingPurity.webrtc > 0) {
        colors.push(COLORS.red);
    } else {
        colors.push(COLORS.green);
    }

    // Color for Distribution Purity
    if (report.distributionPurity.externalScripts > 0) {
        colors.push(COLORS.red);
    } else if (report.distributionPurity.externalMedia > 0) {
        colors.push(COLORS.yellow);
    } else {
        colors.push(COLORS.green);
    }

    // Color for web3
    if (report.web3.high > 0) {
        colors.push(COLORS.red);
    } else if (report.web3.fair > 0) {
        colors.push(COLORS.yellow);
    } else if (report.web3.none > 0) {
        colors.push(COLORS.green);
    } else {
        colors.push(COLORS.gray);
    }

    return colors;
}

function createPieChartWithPieces(pieSize: number, colors: string[]) {
    const pieChart = document.createElement('div');
    pieChart.style.position = 'relative';
    pieChart.style.width = `${pieSize}em`;
    pieChart.style.height = `${pieSize}em`;
    pieChart.style.overflow = 'hidden';
    pieChart.style.display = 'flex';
    pieChart.style.alignItems = 'center';
    pieChart.style.justifyContent = 'center';

    const angles = [120, 120, 120]; // 120 degrees each for three pieces
    let startAngle = 0;
    const lineWidth = pieSize / 25
    const lineColor = '#fff'; // White color for the line

    for (let i = 0; i < 3; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'absolute';
        piece.style.width = `100%`;
        piece.style.height = `100%`;
        piece.style.clipPath = `polygon(50% 50%, ${50 + 50 * Math.cos(Math.PI * startAngle / 180)}% ${50 + 50 * Math.sin(Math.PI * startAngle / 180)}%, ${50 + 50 * Math.cos(Math.PI * (startAngle + angles[i]) / 180)}% ${50 + 50 * Math.sin(Math.PI * (startAngle + angles[i]) / 180)}%)`;
        piece.style.backgroundColor = colors[i];
        piece.style.transform = `rotate(${startAngle}deg)`;
        piece.style.transformOrigin = '50% 50%';

        pieChart.appendChild(piece);

        startAngle += angles[i];

        // Add line after placing a piece, except after the last piece
    }
    startAngle = -30
    for (let i = 0; i < 3; i++) {
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.width = `${lineWidth}em`;
        line.style.height = `50%`;
        line.style.top = `0%`;
        line.style.backgroundColor = lineColor;
        line.style.transform = `rotate(${startAngle}deg)`;
        line.style.transformOrigin = '50% 100%'; // Adjust origin to left to center the line on the edge
        startAngle += angles[i];

        pieChart.appendChild(line);
    }
    return pieChart;
}


export function createThreePiecePieChart(siteRoot: CID, colors: string[], reportContent: HTMLDivElement) {
    const size = 2
    const pieContainer = document.createElement('div');
    pieContainer.className = 'pie-container';
    pieContainer.style.position = 'relative';


    const pieChart = createPieChartWithPieces(size, colors); // Example usage with 80% piece size

    const popup = document.createElement('div');
    popup.className = 'popup'

    const popupPieContainer = document.createElement('div')
    popupPieContainer.className = 'popup-pie-container'
    popupPieContainer.style.marginRight = '1.2em'

    const popupPieChart = createPieChartWithPieces(size*4, colors)
    popupPieContainer.appendChild(popupPieChart)

    const popupText = document.createElement('div');
    popupText.appendChild(reportContent)
    // popupText.style.position = 'relative'
    popupText.style.display = 'inline-grid'
    popupPieChart.style.float = 'left'
    // popupText.style.paddingLeft = '3em'

    popup.appendChild(popupPieContainer);
    // popup.appendChild(popupText);
    popup.appendChild(reportContent);

     // Add labels around the popupPieChart
    const popupLabels = ['DISTRIBUTION', 'NETWORKING', 'WEB3'];
    const labelPositions = [
        { top: '16%', left: '35%', transform: 'rotate(30deg)' },
        { top: '74%', left: '35%', transform: 'rotate(-30deg)' },
        { top: '50%', left: '4%', transform: 'rotate(-90deg)' },
    ];

    popupLabels.forEach((text, index) => {
        const label = document.createElement('div');
        label.innerText = text;
        label.style.fontSize = '0.7em'
        label.style.fontWeight = 'bold'
        label.style.position = 'absolute';
        label.style.whiteSpace = 'nowrap';
        Object.assign(label.style, labelPositions[index]);
        popupPieChart.appendChild(label);
    });

    pieChart.addEventListener('mouseover', () => {
        popup.style.display = 'flex';
    });

    pieChart.addEventListener('mouseout', () => {
        popup.style.display = 'none';
    });

    pieContainer.appendChild(pieChart);
    pieContainer.appendChild(popup);

    return pieContainer;
}
