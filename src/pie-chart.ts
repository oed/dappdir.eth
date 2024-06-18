import { generateSummarizedReport, SummarizedReport } from "./reports";

import { CID } from 'multiformats/cid';

export async function createRiskChart(siteRoot: CID): Promise<HTMLDivElement> {
    const report = await generateSummarizedReport(siteRoot);
    const pieColors = getPieColors(report);
    return createThreePiecePieChart(siteRoot, pieColors);
}

function getPieColors(report: SummarizedReport): string[] {
    const COLORS = {
        'red': '#FF6347', // Tomato
        'green': '#3CB371', // Medium Sea Green
        'yellow': '#FFD700', // Gold
        'gray': '#A9A9A9' // Dark Gray
    };
    const colors = [];

    // Color for Networking Purity
    if (report.networkingPurity.http + report.networkingPurity.websocket + report.networkingPurity.webrtc > 0) {
        colors.push(COLORS.red);
    } else {
        colors.push(COLORS.green);
    }
    console.log('networking', colors)

    // Color for Distribution Purity
    if (report.distributionPurity.externalScripts > 0) {
        colors.push(COLORS.red);
    } else if (report.distributionPurity.externalMedia > 0) {
        colors.push(COLORS.yellow);
    } else {
        colors.push(COLORS.green);
    }
    console.log('distribution', colors)

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
    console.log('web3', colors)

    return colors;
}

function createPieChartWithPieces(pieSize: number, pieceSizePercentage: number, colors: string[]) {
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
    const lineWidth = pieceSizePercentage == 100 ? 1 : 2;
    const lineColor = '#fff'; // White color for the line

    for (let i = 0; i < 3; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'absolute';
        piece.style.width = `${pieceSizePercentage}%`;
        piece.style.height = `${pieceSizePercentage}%`;
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
        line.style.width = `${lineWidth}px`;
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


export function createThreePiecePieChart(siteRoot: CID, colors: string[]) {
    const size = 2
    const pieContainer = document.createElement('div');
    pieContainer.className = 'pie-container';
    pieContainer.style.position = 'relative';


    const pieChart = createPieChartWithPieces(size, 100, colors); // Example usage with 80% piece size

    const popup = document.createElement('div');
    popup.style.position = 'absolute'
    // popup.style.top = `${size}em`; // Position right below the pie chart
    popup.style.left = '3em';
    popup.style.width = '20em'; // Width enough to fit pie chart and text
    // popup.style.height = '100px';
    popup.style.display = 'none'; // Initially hidden
    popup.style.alignItems = 'center'
    popup.style.backgroundColor = '#f9f9f9';
    popup.style.border = '1px solid #d3d3d3';
    popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    popup.style.padding = '2em'
    popup.style.paddingLeft = '1em'
    popup.style.borderRadius = '8px'
    popup.style.zIndex = '1000';

    const popupPieContainer = document.createElement('div')
    popupPieContainer.className = 'popup-pie-container'
    popupPieContainer.style.display = 'flex'
    popupPieContainer.style.height = '100%'
    // popupPieContainer.style.width = '20%';

    const popupPieChart = createPieChartWithPieces(size*4, 80, colors)
    popupPieChart.style.marginRight = '2em'
    popupPieContainer.appendChild(popupPieChart)

    const popupText = document.createElement('div');
    popupText.innerHTML = '<b>Distribution</b><br>Each slice represents a critical aspect of the system.'
                        + '<br><br><b>Networking</b><br>Each slice represents a critical aspect of the system.'
                        + '<br><br><b>Web3</b><br>Each slice represents a critical aspect of the system.'
    // popupText.style.position = 'relative'
    popupText.style.display = 'inline-grid'
    popupPieChart.style.float = 'left'
    // popupText.style.paddingLeft = '3em'

    popup.appendChild(popupPieContainer);
    popup.appendChild(popupText);

     // Add labels around the popupPieChart
    const popupLabels = ['DISTRIBUTION', 'NETWORKING', 'WEB3'];
    const labelPositions = [
        { top: '20%', left: '35%', transform: 'rotate(30deg)' },
        { top: '70%', left: '35%', transform: 'rotate(-30deg)' },
        { top: '50%', left: '8%', transform: 'rotate(-90deg)' },
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
